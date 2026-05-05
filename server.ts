import express from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';

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
    const { password } = req.body;
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

    if (password === ADMIN_PASS) {
      res.json({ success: true, token: ADMIN_PASS }); // En un entorno real usaríamos JWT
    } else {
      res.status(401).json({ error: 'Contraseña incorrecta' });
    }
  });

  // API para enviar el reporte (PROTEGIDA)
  app.post('/api/send-report', verifyAuth, async (req, res) => {
    const { to, subject, message, attachments, images } = req.body;

    // Verificar configuración SMTP
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return res.status(500).json({ 
        error: 'Configuración SMTP incompleta en las variables de entorno.',
        details: 'Se requieren SMTP_HOST, SMTP_USER y SMTP_PASS.' 
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || '587'),
        secure: SMTP_PORT === '465',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

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
            filename: 'dashboard_capture.png',
            content: Buffer.from(images.chart.split(',')[1], 'base64'),
            cid: 'dashboard_image'
          },
          {
            filename: 'performance_summary.png',
            content: Buffer.from(images.consolidated.split(',')[1], 'base64'),
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
    console.log(`Servidor activo y escuchando en: http://0.0.0.0:${PORT}`);
  });
}

console.log('Cargando servidor...');
startServer().catch(err => {
  console.error('ERROR FATAL AL INICIAR EL SERVIDOR:', err);
  process.exit(1);
});
