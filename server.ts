import express from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import dns from 'dns';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';

// SOLUCIÓN DEFINITIVA PARA ENETUNREACH: Forzar IPv4 globalmente en las resoluciones DNS
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Seguridad: Configurar cabeceras de seguridad
  app.use(helmet({
    contentSecurityPolicy: false, // Permitir assets de Vite
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

  // API para verificar contraseña (Login)
  app.post('/api/login', (req, res) => {
    console.log('Intento de login recibido');
    const { password } = req.body;
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

    if (password === ADMIN_PASS) {
      console.log('Login exitoso');
      res.json({ success: true, token: ADMIN_PASS }); // En un entorno real usaríamos JWT
    } else {
      console.warn('Intento de login fallido');
      res.status(401).json({ error: 'Contraseña incorrecta' });
    }
  });

  // API para enviar el reporte (PROTEGIDA)
  app.post('/api/send-report', verifyAuth, async (req, res) => {
    console.log('Solicitud de envío de reporte recibida');
    const { to, subject, message, attachments, images } = req.body;
    
    console.log(`Destinatarios: ${to}`);
    console.log(`Tamaño del mensaje: ${message?.length || 0} caracteres`);
    console.log(`Tamaño de adjuntos: ${attachments?.[0]?.content?.length || 0} bytes`);
    console.log(`Tamaño de imagen 1: ${images?.chart?.length || 0} bytes`);
    console.log(`Tamaño de imagen 2: ${images?.consolidated?.length || 0} bytes`);

    // Verificar configuración SMTP
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error('Configuración SMTP incompleta');
      return res.status(500).json({ 
        error: 'Configuración SMTP incompleta en las variables de entorno.',
        details: 'Se requieren SMTP_HOST, SMTP_USER y SMTP_PASS.' 
      });
    }

    try {
      console.log('--- NUEVO INTENTO DE ENVÍO CON RESOLUCIÓN MANUAL IPv4 ---');
      
      // Resolución manual para esquivar IPv6 en entornos problemáticos como Render
      let resolvedHost = 'smtp.gmail.com';
      try {
        const lookup = await new Promise<{address: string}>((resolve, reject) => {
          dns.lookup('smtp.gmail.com', { family: 4 }, (err, address) => {
            if (err) reject(err);
            else resolve({ address });
          });
        });
        resolvedHost = lookup.address;
        console.log(`Host smtp.gmail.com resuelto a IPv4: ${resolvedHost}`);
      } catch (dnsErr) {
        console.warn('Error en resolución manual de DNS, usando hostname directamente:', dnsErr);
      }

      const transporter = nodemailer.createTransport({
        host: resolvedHost,
        port: 465,
        secure: true, // SSL/TLS
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        // Configuración crítica
        family: 4, 
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
          servername: 'smtp.gmail.com' // Necesario para validar SSL contra la IP
        },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
      });

      console.log('Iniciando envío de correo...');

      // Construir el cuerpo HTML con las imágenes embebidas
      let htmlBody = `<div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
        <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Reporte de Auditoría 5S</h2>
        <p style="font-size: 16px; line-height: 1.5;">${message.replace(/\n/g, '<br>')}</p>
        
        <div style="margin-top: 30px;">
          <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 15px;">Captura del Dashboard General</h3>
          <div style="background: #0f172a; padding: 15px; border-radius: 12px; border: 1px solid #334155;">
            <img src="cid:dashboard_image" style="max-width: 100%; height: auto; border-radius: 8px;" />
          </div>
        </div>

        <div style="margin-top: 40px;">
          <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 15px;">Resumen de Desempeño por Áreas (Top 5)</h3>
          <div style="background: #0f172a; padding: 15px; border-radius: 12px; border: 1px solid #334155;">
            <img src="cid:performance_image" style="max-width: 100%; height: auto; border-radius: 8px;" />
          </div>
        </div>

        <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; text-align: center;">
          <p>Este es un correo automático generado por <strong>AuditCheck Pro AI Engine</strong>.</p>
          <p>Los archivos detallados se encuentran adjuntos en formato Excel.</p>
        </div>
      </div>`;

      const mailOptions = {
        from: SMTP_USER,
        to,
        subject,
        html: htmlBody,
        attachments: [
          // Excel adjunto
          {
            filename: attachments[0].filename,
            content: Buffer.from(attachments[0].content, 'base64'),
          },
          // Imágenes incrustadas (CID)
          {
            filename: 'dashboard_capture.jpg',
            content: Buffer.from(images.chart.includes(',') ? images.chart.split(',')[1] : images.chart, 'base64'),
            cid: 'dashboard_image'
          },
          {
            filename: 'performance_summary.jpg',
            content: Buffer.from(images.consolidated.includes(',') ? images.consolidated.split(',')[1] : images.consolidated, 'base64'),
            cid: 'performance_image'
          }
        ],
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'Correo enviado correctamente' });
    } catch (error: any) {
      console.error('Error al enviar correo:', error);
      res.status(500).json({ error: 'Error al enviar el correo', details: error.message });
    }
  });

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
