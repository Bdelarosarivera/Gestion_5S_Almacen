import express from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import dns from 'dns';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import helmet from 'helmet';

// SOLUCIÓN DEFINITIVA PARA ENETUNREACH: Forzar IPv4 globalmente en las resoluciones DNS
if (dns && (dns as any).setDefaultResultOrder) {
  (dns as any).setDefaultResultOrder('ipv4first');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Inicializar archivo de datos si no existe
  try {
    await fs.access(DATA_FILE);
  } catch {
    console.log('Creando archivo de datos inicial...');
    await fs.writeFile(DATA_FILE, JSON.stringify({ records: [], actions: [], config: null }));
  }

  // Seguridad: Configurar cabeceras de seguridad (Optimizado para Firebase Auth)
  app.use(helmet({
    contentSecurityPolicy: false, // Permitir assets de Vite
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // PERMITIR POPUPS DE AUTH
  }));

  // Aumentar el límite para recibir imágenes base64 grandes
  app.use(express.json({ limit: '50mb' }));

  // Middleware sencillo para verificar la sesión (simulado con un token simple por ahora)
  const verifyAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (authHeader === `Bearer ${ADMIN_PASS}`) {
      next();
    } else {
      res.status(401).json({ error: 'No autorizado' });
    }
  };

  // API para enviar el reporte (PROTEGIDA)
  app.post('/api/send-report', verifyAuth, async (req, res) => {
    console.log('Solicitud de envío de reporte recibida');
    const { to, subject, message, attachments, images, auditorName } = req.body;
    
    // --- LÓGICA DE ENVÍO ---
    const {
      RESEND_API_KEY,
      // ✅ NUEVO: Variable de entorno para el remitente verificado en Resend
      // Agregar en Render: RESEND_FROM = "AuditCheck Pro <reportes@tudominio.com>"
      RESEND_FROM,
      SMTP_USER: ENV_USER,
      SMTP_PASS: ENV_PASS,
      SMTP_HOST: ENV_HOST,
      SMTP_PORT: ENV_PORT
    } = process.env;
    
    const { smtpConfig } = req.body;

    // Determinar qué credenciales SMTP usar (Prioridad: Configuración en App > Variables de Entorno)
    const SMTP_USER = smtpConfig?.user || ENV_USER;
    const SMTP_PASS = smtpConfig?.pass || ENV_PASS;
    const SMTP_HOST = smtpConfig?.host || ENV_HOST || 'smtp.gmail.com';
    const SMTP_PORT = smtpConfig?.port || ENV_PORT || '587';

    // Si el usuario envió configuración SMTP MANUAL en el cuerpo de la petición,
    // intentamos SMTP PRIMERO para respetar su elección explícita.
    const isManualSmtp = !!(smtpConfig?.user && smtpConfig?.pass);

    // ============================================================
    // PRIORIDAD 1: RESEND API HTTP
    // (Funciona en Render. No usa SMTP. No usa puertos bloqueados.)
    // REQUISITO: Verificar tu dominio en resend.com/domains y
    //            configurar la variable RESEND_FROM en Render.
    // ============================================================
    if (RESEND_API_KEY && !isManualSmtp) {
      console.log('--- INTENTO DE ENVÍO VÍA RESEND API ---');
      const resend = new Resend(RESEND_API_KEY);

      // ✅ CORRECCIÓN PRINCIPAL:
      // Antes usaba 'onboarding@resend.dev' (dominio de sandbox = solo envía a tu email).
      // Ahora usa la variable RESEND_FROM con tu dominio verificado.
      // Si no tienes RESEND_FROM configurado, avisa claramente en lugar de fallar en silencio.
      if (!RESEND_FROM) {
        console.error('RESEND_FROM no está configurado en las variables de entorno.');
        return res.status(500).json({
          error: 'Configuración incompleta',
          details: 'Falta la variable de entorno RESEND_FROM. Debe tener el formato: "NombreApp <correo@tudominio.com>". Configúrela en el panel de Render y asegúrese de que el dominio esté verificado en resend.com/domains.'
        });
      }
      
      try {
        const { data, error } = await resend.emails.send({
          // ✅ USA EL REMITENTE VERIFICADO EN TU CUENTA RESEND
          from: RESEND_FROM,
          to: [to],
          subject: subject,
          html: generateHtmlBody(message, 'dashboard_image', 'performance_image', auditorName),
          attachments: [
            // Excel como adjunto normal
            {
              filename: attachments[0].filename,
              content: Buffer.from(attachments[0].content, 'base64'),
            },
            // Imágenes incrustadas con CID para Resend
            {
              filename: 'dashboard.jpg',
              content: Buffer.from(images.chart.split(',')[1] || images.chart, 'base64'),
              content_id: 'dashboard_image',
              disposition: 'inline'
            },
            {
              filename: 'performance.jpg',
              content: Buffer.from(images.consolidated.split(',')[1] || images.consolidated, 'base64'),
              content_id: 'performance_image',
              disposition: 'inline'
            }
          ]
        });

        if (error) {
          console.error('Error reportado por Resend API:', error);
          const errorMsg = (error as any).message || 'Error desconocido';

          // ✅ CORRECCIÓN: Ya NO hay fallback a SMTP porque Render bloquea los puertos 
          //    SMTP (465/587). Devolvemos un error claro con instrucciones de solución.
          const isRestriction =
            errorMsg.includes('unverified') ||
            (error as any).name === 'forbidden' ||
            (error as any).name === 'validation_error';

          if (isRestriction) {
            return res.status(403).json({
              error: 'Resend: Dominio no verificado',
              details: `No se puede enviar a "${to}". Asegúrese de que su dominio esté verificado en resend.com/domains y que RESEND_FROM use ese dominio. En modo sandbox de Resend solo puede enviar al email de su cuenta.`
            });
          }

          return res.status(500).json({
            error: 'Error al enviar vía Resend',
            details: errorMsg
          });

        } else {
          console.log('Correo enviado exitosamente vía Resend API:', data);
          return res.json({ 
            success: true, 
            via: 'resend', 
            message: 'Reporte enviado con éxito vía Resend' 
          });
        }

      } catch (resendError: any) {
        console.error('Fallo Resend API (excepción):', resendError);
        // ✅ Sin SMTP fallback en Render — devolvemos error directo
        return res.status(500).json({ 
          error: 'Fallo al enviar vía Resend',
          details: resendError.message || 'Error inesperado en Resend API.'
        });
      }
    }

    // ============================================================
    // PRIORIDAD 2: SMTP MANUAL
    // Solo se activa si el usuario ingresó credenciales SMTP manualmente
    // en la app (isManualSmtp = true) o si no hay RESEND_API_KEY.
    // NOTA: Esto NO funcionará en Render (plan gratuito) porque bloquea
    //       los puertos 465 y 587. Solo funciona en servidores sin restricciones.
    // ============================================================
    if (!SMTP_USER || !SMTP_PASS) {
      console.error('Configuración de correo incompleta');
      return res.status(500).json({ 
        error: 'Configuración incompleta',
        details: 'Faltan credenciales. Configure RESEND_API_KEY y RESEND_FROM en Render, o ingrese sus credenciales SMTP en los Ajustes de la App.'
      });
    }

    // Intentar envío SMTP con estrategia de reintento/fallback de puertos
    const trySmtpSend = async (port: number, secure: boolean) => {
      const targetHost = SMTP_HOST || 'smtp.gmail.com';
      const isGmail = targetHost.includes('gmail.com');

      console.log(`--- INTENTO SMTP (HOST: ${targetHost}, PORT: ${port}, SECURE: ${secure}) ---`);
      
      let config: any = {
        host: targetHost,
        port: port,
        secure: secure,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
          servername: targetHost,
          minVersion: 'TLSv1.2'
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        family: 4, // Forzar IPv4
        debug: true,
        logger: true
      };

      // Si es Gmail, Nodemailer tiene un transporte optimizado
      if (isGmail) {
        config.service = 'gmail';
      }

      const transporter = nodemailer.createTransport(config);

      const mailOptions = {
        from: `"AuditCheck Pro" <${SMTP_USER}>`,
        to,
        subject,
        html: generateHtmlBody(message, 'dashboard_image', 'performance_image', auditorName),
        attachments: [
          {
            filename: attachments[0].filename,
            content: Buffer.from(attachments[0].content, 'base64'),
          },
          {
            filename: 'dashboard.jpg',
            content: Buffer.from(images.chart.split(',')[1] || images.chart, 'base64'),
            cid: 'dashboard_image',
            disposition: 'inline'
          },
          {
            filename: 'performance.jpg',
            content: Buffer.from(images.consolidated.split(',')[1] || images.consolidated, 'base64'),
            cid: 'performance_image',
            disposition: 'inline'
          }
        ],
      };

      console.log(`Enviando correo vía ${targetHost}:${port}...`);
      await transporter.sendMail(mailOptions);
      console.log(`Correo enviado con éxito vía ${targetHost}:${port}`);
      return true;
    };

    try {
      // Intento 1: Puerto 465 (TLS)
      try {
        console.log('Intentando Puerto 465 (SECURE: TRUE)...');
        await trySmtpSend(465, true);
        return res.json({ success: true, via: 'smtp-465', message: 'Reporte enviado vía SMTP Seguro (465)' });
      } catch (err465) {
        console.warn('Fallo en puerto 465, intentando 587 (STARTTLS)...', (err465 as any).message);
        
        // Intento 2: Puerto 587 (STARTTLS)
        await trySmtpSend(587, false);
        return res.json({ success: true, via: 'smtp-587', message: 'Reporte enviado vía SMTP (587)' });
      }
    } catch (finalError: any) {
      console.error('TODOS LOS INTENTOS SMTP FALLARON:', finalError);
      
      let errorMsg = finalError.message || 'Error de conexión desconocido';
      let details = 'No se pudo establecer conexión con el servidor SMTP. ';
      
      if (errorMsg.includes('ENETUNREACH')) details += 'Red inalcanzable: Render bloquea puertos SMTP en plan gratuito. Use Resend API en su lugar.';
      if (errorMsg.includes('ECONNREFUSED')) details += 'La conexión fue rechazada. Verifique si el puerto está bloqueado.';
      if (errorMsg.includes('ETIMEDOUT')) details += 'Tiempo de espera agotado. El servidor no respondió.';
      if (errorMsg.includes('EAUTH')) details += 'Error de autenticación. Verifique su Gmail y "Contraseña de Aplicación".';

      res.status(500).json({ 
        error: 'Fallo Total de Conexión', 
        details: `${details} (Error: ${errorMsg})`
      });
    }
  });

  // Función auxiliar para generar el HTML con imágenes incrustadas (usando Content-ID)
  function generateHtmlBody(message: string, chartCid: string, consolidatedCid: string, auditorName?: string) {
    const signature = auditorName ? `Auditoría realizada por ${auditorName}` : "Hecho por Bartolo de la Rosa";
    return `<div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
        <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Reporte de Auditoría 5S</h2>
        <p style="font-size: 16px; line-height: 1.5;">${message.replace(/\n/g, '<br>')}</p>
        
        <div style="margin-top: 30px;">
          <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 15px;">Captura del Dashboard General</h3>
          <div style="background: #0f172a; padding: 15px; border-radius: 12px; border: 1px solid #334155;">
            <img src="cid:${chartCid}" style="max-width: 100%; height: auto; border-radius: 8px;" />
          </div>
        </div>

        <div style="margin-top: 40px;">
          <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 15px;">Resumen de Desempeño por Áreas (Top 5)</h3>
          <div style="background: #0f172a; padding: 15px; border-radius: 12px; border: 1px solid #334155;">
            <img src="cid:${consolidatedCid}" style="max-width: 100%; height: auto; border-radius: 8px;" />
          </div>
        </div>

        <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; text-align: center;">
          <p>Este es un correo automático generado por <strong>AuditCheck Pro AI Engine</strong>.</p>
          <p>Los archivos detallados se encuentran adjuntos en formato Excel.</p>
          <p style="margin-top: 10px; font-weight: bold; color: #1e293b;">${signature}</p>
        </div>
      </div>`;
  }

  // Integración con Vite
  console.log(`Verificando modo de ejecución... NODE_ENV: ${process.env.NODE_ENV}`);

  if (process.env.NODE_ENV !== 'production') {
    console.log('Iniciando en modo Desarrollo con Vite Middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    console.log(`Iniciando en modo Producción. Sirviendo archivos desde: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`Servidor activo y escuchando en: http://0.0.0.0:${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=========================================`);
  });
}

console.log('Cargando servidor...');
startServer().catch(err => {
  console.error('ERROR FATAL AL INICIAR EL SERVIDOR:', err);
  process.exit(1);
});
