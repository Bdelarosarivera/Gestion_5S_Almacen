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
    const { to, subject, message, attachments, images } = req.body;
    
    // --- NUEVA LÓGICA HIBRIDAS ---
    const { RESEND_API_KEY, SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT } = process.env;

    // Prioridad 1: RESEND API (Solución definitiva para Render)
    if (RESEND_API_KEY) {
      console.log('--- INTENTO DE ENVÍO VÍA RESEND API (Prioridad 1) ---');
      const resend = new Resend(RESEND_API_KEY);
      
      try {
        const { data, error } = await resend.emails.send({
          from: 'AuditCheck Pro <onboarding@resend.dev>', 
          to: [to],
          subject: subject,
          html: generateHtmlBody(message, 'dashboard_image', 'performance_image'),
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
          throw error;
        }

        console.log('Correo enviado exitosamente vía Resend API:', data);
        return res.json({ 
          success: true, 
          via: 'resend', 
          message: 'Reporte enviado con éxito vía Resend (Sin contraseñas SMTP)' 
        });
      } catch (resendError: any) {
        console.error('Fallo Resend API:', resendError);
        // Si falla Resend, solo continuamos a SMTP si el usuario explícitamente tiene credenciales
      }
    }

    // Prioridad 2: SMTP MANUAL (Fallback o si no hay Resend)
    if (!SMTP_USER || !SMTP_PASS) {
      console.error('Configuración de correo incompleta (No hay RESEND_API_KEY ni credenciales SMTP)');
      return res.status(500).json({ 
        error: 'Configuración incompleta',
        details: 'Configure RESEND_API_KEY en Render para una solución 100% fiable, o proporcione credenciales SMTP válidas.' 
      });
    }

    try {
      const targetHost = SMTP_HOST || 'smtp.gmail.com';
      const targetPort = parseInt(SMTP_PORT || '587');
      const isGmail = targetHost.includes('gmail.com');

      console.log(`--- INTENTO DE ENVÍO SMTP (HOST: ${targetHost}, PORT: ${targetPort}) ---`);
      
      let transporterConfig: any = {
        host: targetHost,
        port: targetPort,
        secure: targetPort === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 60000,
      };

      // Si es Gmail, usar configuración manual optimizada para Render
      if (isGmail) {
        console.log('Usando configuración manual optimizada para Gmail');
        
        transporterConfig = {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // TLS/STARTTLS usa puerto 587 con secure: false
          family: 4, // Forzar IPv4 al nivel de conexión
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2'
          },
          debug: true, // Mostrar logs de protocolo SMTP
          logger: true, // Habilitar logger interno
          connectionTimeout: 60000,
          greetingTimeout: 60000,
          socketTimeout: 60000,
          dnsTimeout: 30000
        };
      }

      console.log("SMTP_HOST:", transporterConfig.host);
      console.log("SMTP_PORT:", transporterConfig.port);
      console.log("SMTP_SECURE:", transporterConfig.secure);

      const transporter = nodemailer.createTransport(transporterConfig);

      console.log(`Iniciando conexión SMTP...`);

      const transporterVerify = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: { message: 'Timeout en verificación (60s) - El servidor SMTP no responde a tiempo en Render.' } });
        }, 60000);

        transporter.verify((error, success) => {
          clearTimeout(timeout);
          if (error) {
            console.error('Error de verificación SMTP:', error);
            resolve({ success: false, error });
          } else {
            console.log('Servidor SMTP listo para enviar');
            resolve({ success: true });
          }
        });
      });

      if (!(transporterVerify as any).success) {
        throw new Error(`Fallo en la verificación SMTP: ${(transporterVerify as any).error.message}`);
      }

      const mailOptions = {
        from: SMTP_USER,
        to,
        subject,
        html: generateHtmlBody(message, 'dashboard_image', 'performance_image'),
        attachments: [
          // Excel adjunto
          {
            filename: attachments[0].filename,
            content: Buffer.from(attachments[0].content, 'base64'),
          },
          // Imágenes incrustadas con CID para Nodemailer
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

      await transporter.sendMail(mailOptions);
      res.json({ success: true, via: 'smtp', message: 'Correo enviado correctamente vía SMTP' });
    } catch (error: any) {
      console.error('Error al enviar correo:', error);
      res.status(500).json({ error: 'Error al enviar el correo', details: error.message });
    }
  });

  // Función auxiliar para generar el HTML con imágenes incrustadas (usando Content-ID)
  function generateHtmlBody(message: string, chartCid: string, consolidatedCid: string) {
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
          <p style="margin-top: 10px; font-weight: bold; color: #1e293b;">Hecho por Bartolo de la Rosa</p>
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
