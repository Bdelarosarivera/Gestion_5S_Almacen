import express from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import dns from 'dns';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import helmet from 'helmet';

// ======================================================
// FORZAR IPV4
// ======================================================

if (dns && (dns as any).setDefaultResultOrder) {
  (dns as any).setDefaultResultOrder('ipv4first');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');

// ======================================================
// START SERVER
// ======================================================

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // ======================================================
  // CREAR DATA.JSON SI NO EXISTE
  // ======================================================

  try {
    await fs.access(DATA_FILE);
  } catch {
    console.log('Creando archivo data.json...');

    await fs.writeFile(
      DATA_FILE,
      JSON.stringify({
        records: [],
        actions: [],
        config: null,
      })
    );
  }

  // ======================================================
  // HELMET
  // ======================================================

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginOpenerPolicy: {
        policy: 'same-origin-allow-popups',
      },
    })
  );

  // ======================================================
  // JSON LIMIT
  // ======================================================

  app.use(express.json({ limit: '50mb' }));

  // ======================================================
  // AUTH SIMPLE
  // ======================================================

  const verifyAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

    if (authHeader === `Bearer ${ADMIN_PASS}`) {
      next();
    } else {
      res.status(401).json({
        error: 'No autorizado',
      });
    }
  };

  // ======================================================
  // API SEND REPORT
  // ======================================================

  app.post('/api/send-report', verifyAuth, async (req, res) => {
    console.log('======================================');
    console.log('SOLICITUD DE ENVÍO RECIBIDA');
    console.log('======================================');

    const { to, subject, message, attachments, images } = req.body;

    const { SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT } = process.env;

    // ======================================================
    // VALIDAR SMTP
    // ======================================================

    if (!SMTP_USER || !SMTP_PASS) {
      return res.status(500).json({
        error: 'Configuración SMTP incompleta',
        details: 'Faltan SMTP_USER o SMTP_PASS',
      });
    }

    try {
      const targetHost = SMTP_HOST || 'smtp.gmail.com';
      const targetPort = parseInt(SMTP_PORT || '587');

      console.log('======================================');
      console.log('CONFIG SMTP');
      console.log('======================================');
      console.log('HOST:', targetHost);
      console.log('PORT:', targetPort);
      console.log('USER:', SMTP_USER);
      console.log('======================================');

      // ======================================================
      // SMTP CONFIG
      // ======================================================

      const transporter = nodemailer.createTransport({
        host: targetHost,
        port: targetPort,

        secure: targetPort === 465,

        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },

        tls: {
          rejectUnauthorized: false,
          family: 4,
          minVersion: 'TLSv1.2',
        },

        connectionTimeout: 60000,
        greetingTimeout: 60000,
        socketTimeout: 60000,
        dnsTimeout: 30000,
      });

      // ======================================================
      // VERIFY SMTP
      // ======================================================

      console.log('======================================');
      console.log('VERIFICANDO SMTP...');
      console.log('======================================');

      const transporterVerify = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            success: false,
            error: {
              message:
                'Timeout en verificación SMTP (60s)',
            },
          });
        }, 60000);

        transporter.verify((error, success) => {
          clearTimeout(timeout);

          if (error) {
            console.error('ERROR SMTP VERIFY');
            console.error(error);

            resolve({
              success: false,
              error,
            });
          } else {
            console.log('SMTP VERIFICADO');

            resolve({
              success: true,
            });
          }
        });
      });

      if (!(transporterVerify as any).success) {
        throw new Error(
          `Fallo SMTP: ${
            (transporterVerify as any).error.message
          }`
        );
      }

      // ======================================================
      // HTML
      // ======================================================

      const htmlBody = `
      <div style="
        font-family: Arial, sans-serif;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        background: #f8fafc;
        padding: 20px;
        border-radius: 12px;
      ">

        <h2 style="
          color: #1e293b;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 10px;
        ">
          Reporte de Auditoría 5S
        </h2>

        <p style="
          font-size: 16px;
          line-height: 1.5;
        ">
          ${message.replace(/\n/g, '<br>')}
        </p>

        <div style="margin-top: 30px;">
          <h3 style="
            color: #1e293b;
            font-size: 18px;
            margin-bottom: 15px;
          ">
            Captura Dashboard
          </h3>

          <div style="
            background: #0f172a;
            padding: 15px;
            border-radius: 12px;
            border: 1px solid #334155;
          ">
            <img
              src="cid:dashboard_image"
              style="
                max-width: 100%;
                height: auto;
                border-radius: 8px;
              "
            />
          </div>
        </div>

        <div style="margin-top: 40px;">
          <h3 style="
            color: #1e293b;
            font-size: 18px;
            margin-bottom: 15px;
          ">
            Resumen Áreas
          </h3>

          <div style="
            background: #0f172a;
            padding: 15px;
            border-radius: 12px;
            border: 1px solid #334155;
          ">
            <img
              src="cid:performance_image"
              style="
                max-width: 100%;
                height: auto;
                border-radius: 8px;
              "
            />
          </div>
        </div>

        <div style="
          margin-top: 30px;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
          font-size: 12px;
          color: #64748b;
          text-align: center;
        ">
          <p>
            Correo automático generado por
            <strong>AuditCheck Pro AI Engine</strong>
          </p>

          <p>
            Archivo Excel incluido.
          </p>
        </div>
      </div>
      `;

      // ======================================================
      // MAIL OPTIONS
      // ======================================================

      const mailOptions = {
        from: SMTP_USER,
        to,
        subject,
        html: htmlBody,

        attachments: [
          {
            filename: attachments[0].filename,
            content: Buffer.from(
              attachments[0].content,
              'base64'
            ),
          },

          {
            filename: 'dashboard_capture.jpg',
            content: Buffer.from(
              images.chart.includes(',')
                ? images.chart.split(',')[1]
                : images.chart,
              'base64'
            ),
            cid: 'dashboard_image',
          },

          {
            filename: 'performance_summary.jpg',
            content: Buffer.from(
              images.consolidated.includes(',')
                ? images.consolidated.split(',')[1]
                : images.consolidated,
              'base64'
            ),
            cid: 'performance_image',
          },
        ],
      };

      // ======================================================
      // SEND EMAIL
      // ======================================================

      console.log('======================================');
      console.log('ENVIANDO CORREO...');
      console.log('======================================');

      const info = await transporter.sendMail(mailOptions);

      console.log('======================================');
      console.log('CORREO ENVIADO');
      console.log(info.response);
      console.log('======================================');

      res.json({
        success: true,
        message: 'Correo enviado correctamente',
      });
    } catch (error: any) {
      console.error('======================================');
      console.error('ERROR GENERAL');
      console.error('======================================');
      console.error(error);

      res.status(500).json({
        error: 'Error al enviar correo',
        details: error.message,
      });
    }
  });

  // ======================================================
  // VITE
  // ======================================================

  console.log(
    `Verificando entorno NODE_ENV: ${process.env.NODE_ENV}`
  );

  if (process.env.NODE_ENV !== 'production') {
    console.log('Modo desarrollo con Vite');

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');

    console.log(`Modo producción. Dist: ${distPath}`);

    app.use(express.static(distPath));

    // ======================================================
    // FIX EXPRESS 5
    // ======================================================

    app.get('/*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ======================================================
  // LISTEN
  // ======================================================

  app.listen(PORT, '0.0.0.0', () => {
    console.log('======================================');
    console.log(`Servidor activo en puerto ${PORT}`);
    console.log(`http://0.0.0.0:${PORT}`);
    console.log('======================================');
  });
}

// ======================================================
// START
// ======================================================

console.log('Iniciando servidor...');

startServer().catch((err) => {
  console.error('ERROR FATAL');
  console.error(err);

  process.exit(1);
});
