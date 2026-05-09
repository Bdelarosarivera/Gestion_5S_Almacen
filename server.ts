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

  // API para cargar todos los datos sincronizados (DEPRECATED - Moved to Firestore)
  // app.get('/api/data', verifyAuth, ...)
  // app.post('/api/data', verifyAuth, ...)
  // app.post('/api/login', ...)

  // API para enviar el reporte (PROTEGIDA)
  app.post('/api/send-report', verifyAuth, async (req, res) => {
    console.log('Solicitud de envío de reporte recibida');
    const { to, subject, message, attachments, images, auditorName } = req.body;
    
    // --- NUEVA LÓGICA HIBRIDAS ---
    const { RESEND_API_KEY, SMTP_USER: ENV_USER, SMTP_PASS: ENV_PASS, SMTP_HOST: ENV_HOST, SMTP_PORT: ENV_PORT } = process.env;
    const { smtpConfig } = req.body;

    // Determinar qué credenciales usar (Prioridad: Configuración en App > Variables de Entorno)
    const SMTP_USER = smtpConfig?.user || ENV_USER;
    const SMTP_PASS = smtpConfig?.pass || ENV_PASS;
    const SMTP_HOST = smtpConfig?.host || ENV_HOST || 'smtp.gmail.com';
    const SMTP_PORT = smtpConfig?.port || ENV_PORT || '587';

    // NUEVA PRIORIDAD: Si el usuario envió configuración SMTP MANUAL en el cuerpo de la petición, 
    // intentamos SMTP PRIMERO para respetar su elección explícita.
    const isManualSmtp = !!(smtpConfig?.user && smtpConfig?.pass);

    // Prioridad 1: RESEND API (Solo si no es una configuración manual explícita y hay API KEY)
    if (RESEND_API_KEY && !isManualSmtp) {
      console.log('--- INTENTO DE ENVÍO VÍA RESEND API ---');
      const resend = new Resend(RESEND_API_KEY);
      
      try {
        const { data, error } = await resend.emails.send({
          from: 'AuditCheck Pro <onboarding@resend.dev>', 
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
          const isRestriction = errorMsg.includes('unverified') || (error as any).name === 'forbidden' || (error as any).name === 'validation_error';
          
          if (isRestriction && (SMTP_USER && SMTP_PASS)) {
            console.log('Resend restringido (Sandbox). Intentando FALLBACK a SMTP...');
            // Fallsthrough to SMTP
          } else if (isRestriction) {
            return res.status(403).json({
              error: 'Error de Restricción (Resend Sandbox)',
              details: `RESTRICCIÓN: Resend en modo gratuito solo permite enviar correos a la dirección verificada en su cuenta. Para enviar a "${to}", debe verificar ese email en Resend, o configurar correctamente sus credenciales SMTP en los Ajustes.`
            });
          } else {
            throw error;
          }
        } else {
          console.log('Correo enviado exitosamente vía Resend API:', data);
          return res.json({ 
            success: true, 
            via: 'resend', 
            message: 'Reporte enviado con éxito vía Resend' 
          });
        }
      } catch (resendError: any) {
        console.error('Fallo Resend API:', resendError);
        if (!SMTP_USER || !SMTP_PASS) {
          return res.status(500).json({ 
            error: 'Fallo al enviar vía Resend',
            details: resendError.message || 'Error inesperado.' 
          });
        }
      }
    }

    // Prioridad 2: SMTP MANUAL (Fallback o si no hay Resend)
    if (!SMTP_USER || !SMTP_PASS) {
      console.error('Configuración de correo incompleta');
      return res.status(500).json({ 
        error: 'Configuración incompleta',
        details: 'Faltan credenciales SMTP. Por favor ingrese su Usuario (Gmail) y Contraseña de Aplicación en los Ajustes de la App.' 
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
        connectionTimeout: 15000, // 15s timeout para conexión inicial
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
      // Intento 1: Puerto 465 (Seguro por defecto - TLS)
      // A menudo funciona mejor en entornos restringidos como Render
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
      console.error('TODOS LOS INTENTOS SMTP FALLARON EN RENDER:', finalError);
      
      let errorMsg = finalError.message || 'Error de conexión desconocido';
      let details = 'No se pudo establecer conexión con el servidor SMTP. ';
      
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
