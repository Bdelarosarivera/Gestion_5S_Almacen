
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
    
    // --- LÓGICA DE ENVÍO EXCLUSIVA PARA RESEND ---
    const { RESEND_API_KEY, GMAIL_FROM } = process.env;

    if (!RESEND_API_KEY) {
      console.error('Configuración incompleta: Falta RESEND_API_KEY en variables de entorno.');
      return res.status(500).json({ 
        error: 'Configuración incompleta',
        details: 'El servidor no tiene configurada la RESEND_API_KEY. Agréguela en los Ajustes de Render.' 
      });
    }

    const resend = new Resend(RESEND_API_KEY);
    // El remitente debe ser onboarding@resend.dev si no hay dominio verificado,
    // o el email verificado si existe GMAIL_FROM.
    const sender = GMAIL_FROM || 'onboarding@resend.dev';

    try {
      console.log(`--- INTENTO DE ENVÍO VÍA RESEND (De: ${sender}, Para: ${to}) ---`);
      
      const { data, error } = await resend.emails.send({
        from: `AuditCheck Pro <${sender}>`, 
        to: [to],
        subject: subject,
        html: generateHtmlBody(message, 'dashboard_image', 'performance_image', auditorName),
        attachments: [
          // Excel como adjunto
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
        const errorMsg = (error as any).message || '';
        
        // Error específico de remitente no verificado
        if (errorMsg.includes('sender') || errorMsg.includes('unverified') || (error as any).name === 'forbidden') {
          return res.status(403).json({
            error: 'Remitente no verificado en Resend',
            details: `El correo "${sender}" no está autorizado para enviar. 
            SOLUCIÓN: 
            1. Verifíquelo en https://resend.com/emails (Single Sender).
            2. O elimine la variable GMAIL_FROM en Render para usar el remitente gratuito por defecto.`
          });
        }

        return res.status(400).json({
          error: 'Error en Resend API',
          details: errorMsg || 'No se pudo enviar el correo.'
        });
      }

      console.log('Correo enviado exitosamente vía Resend:', data);
      return res.json({ 
        success: true, 
        via: 'resend', 
        message: 'Reporte enviado con éxito vía Resend' 
      });

    } catch (err: any) {
      console.error('FALLO CRÍTICO EN ENVÍO RESEND:', err);
      res.status(500).json({ 
        error: 'Fallo de envío', 
        details: `Error inesperado: ${err.message}`
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
