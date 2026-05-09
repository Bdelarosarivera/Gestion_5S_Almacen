import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import helmet from 'helmet';

// ─────────────────────────────────────────────────────────────────────────────
// VARIABLES DE ENTORNO — Configurar en el panel de Render:
//
//   RESEND_API_KEY  → Tu API Key de resend.com
//   ADMIN_PASSWORD  → Contraseña para proteger la API del servidor
//
// ─────────────────────────────────────────────────────────────────────────────

const GMAIL_FROM = 'bartolodelarosarivera@gmail.com';

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

  // Seguridad: cabeceras HTTP (optimizado para Firebase Auth)
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }));

  // Límite ampliado para imágenes base64 grandes
  app.use(express.json({ limit: '50mb' }));

  // Middleware de autenticación
  const verifyAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';
    if (authHeader === `Bearer ${ADMIN_PASS}`) {
      next();
    } else {
      res.status(401).json({ error: 'No autorizado' });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/send-report
  // Envía el reporte por correo usando Resend API (HTTP puro, sin SMTP).
  // Funciona en Render porque no usa los puertos 465 ni 587.
  // ─────────────────────────────────────────────────────────────────────────
  app.post('/api/send-report', verifyAuth, async (req, res) => {
    console.log('Solicitud de envío de reporte recibida');

    const { to, subject, message, attachments, images, auditorName } = req.body;
    const { RESEND_API_KEY } = process.env;

    // Validar variables de entorno
    if (!RESEND_API_KEY) {
      console.error('Falta RESEND_API_KEY');
      return res.status(500).json({
        error: 'Configuración incompleta',
        details: 'Falta la variable RESEND_API_KEY. Agréguela en Environment Variables de Render.'
      });
    }

    console.log(`--- ENVIANDO VÍA RESEND API ---`);
    console.log(`De: ${GMAIL_FROM}  →  Para: ${to}`);

    const resend = new Resend(RESEND_API_KEY);

    try {
      const { data, error } = await resend.emails.send({
        from: `AuditCheck Pro <${GMAIL_FROM}>`,
        to: [to],
        reply_to: GMAIL_FROM,
        subject: subject,
        html: generateHtmlBody(message, 'dashboard_image', 'performance_image', auditorName),
        attachments: [
          // Archivo Excel adjunto
          {
            filename: attachments[0].filename,
            content: Buffer.from(attachments[0].content, 'base64'),
          },
          // Imagen del Dashboard incrustada en el HTML
          {
            filename: 'dashboard.jpg',
            content: Buffer.from(images.chart.split(',')[1] || images.chart, 'base64'),
            content_id: 'dashboard_image',
            disposition: 'inline'
          },
          // Imagen de Desempeño incrustada en el HTML
          {
            filename: 'performance.jpg',
            content: Buffer.from(images.consolidated.split(',')[1] || images.consolidated, 'base64'),
            content_id: 'performance_image',
            disposition: 'inline'
          }
        ]
      });

      if (error) {
        console.error('Error de Resend API:', error);
        const errorMsg  = (error as any).message || 'Error desconocido';
        const errorName = (error as any).name    || '';

        const isSandbox =
          errorMsg.includes('unverified') ||
          errorName === 'forbidden'       ||
          errorName === 'validation_error';

        if (isSandbox) {
          return res.status(403).json({
            error: 'Gmail no verificado en Resend',
            details: `El correo "${GMAIL_FROM}" no está verificado como remitente. Ingrese a resend.com/settings/emails, agréguelo y confirme el link que Resend le enviará.`
          });
        }

        return res.status(500).json({
          error: 'Error al enviar el correo',
          details: errorMsg
        });
      }

      console.log('✅ Correo enviado exitosamente:', data);
      return res.json({
        success: true,
        via: 'resend',
        message: `Reporte enviado con éxito desde ${GMAIL_FROM}`
      });

    } catch (err: any) {
      console.error('Excepción inesperada:', err);
      return res.status(500).json({
        error: 'Error inesperado',
        details: err.message || 'Error desconocido.'
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Genera el cuerpo HTML del correo con imágenes incrustadas (Content-ID)
  // ─────────────────────────────────────────────────────────────────────────
  function generateHtmlBody(
    message: string,
    chartCid: string,
    consolidatedCid: string,
    auditorName?: string
  ) {
    const signature = auditorName
      ? `Auditoría realizada por ${auditorName}`
      : 'Hecho por Bartolo de la Rosa';

    return `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
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

  // ─────────────────────────────────────────────────────────────────────────
  // Integración con Vite
  // ─────────────────────────────────────────────────────────────────────────
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
    console.log('=========================================');
    console.log(`Servidor activo en: http://0.0.0.0:${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log('=========================================');
  });
}

console.log('Cargando servidor...');
startServer().catch(err => {
  console.error('ERROR FATAL AL INICIAR EL SERVIDOR:', err);
  process.exit(1);
});
