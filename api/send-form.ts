import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env['RESEND_API_KEY']);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse> {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { clinicaPdf, pacientePdf, datosPersonales } = req.body;

    // Validar datos
    if (!clinicaPdf || !pacientePdf || !datosPersonales) {
      return res.status(400).json({ success: false, error: 'Datos incompletos' });
    }

    if (
      !datosPersonales.nombres ||
      !datosPersonales.apellidos ||
      !datosPersonales.email ||
      !datosPersonales.run
    ) {
      return res.status(400).json({ success: false, error: 'Datos personales incompletos' });
    }

    const timestamp = Date.now();
    const nombreArchivo = `Formulario_${datosPersonales.run}_${timestamp}`;

    // Email a la clínica
    const emailClinica = await resend.emails.send({
      from: 'formularios@almanovaclinic.com',
      to: process.env['CLINICA_EMAIL'] || 'televidasaludable@gmail.com',
      subject: `Formulario Pre-Ocupacional - ${datosPersonales.nombres} ${datosPersonales.apellidos} ${datosPersonales.run}`,
      html: `
        <h2>Nuevo Formulario Pre-Ocupacional</h2>
        <p><strong>Paciente:</strong> ${datosPersonales.nombres} ${datosPersonales.apellidos}</p>
        <p><strong>RUN:</strong> ${datosPersonales.run}</p>
        <p><strong>Email:</strong> ${datosPersonales.email}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</p>
        <hr>
        <p><em>Este email fue enviado automáticamente desde el formulario de Alma Nova Clinic.</em></p>
      `,
      attachments: [
        {
          filename: `${nombreArchivo}_Completo.pdf`,
          content: Buffer.from(clinicaPdf, 'base64'),
        },
      ],
    });

    // Email al paciente
    const emailPaciente = await resend.emails.send({
      from: 'noreply@almanovaclinic.com',
      to: datosPersonales.email,
      subject: 'Copia de su Declaración Jurada - Alma Nova Clinic',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #115E5E;">Formulario Recibido</h2>
          <p>Estimado/a <strong>${datosPersonales.nombres} ${datosPersonales.apellidos}</strong>,</p>
          <p>Hemos recibido su formulario pre-ocupacional correctamente.</p>
          <p>Adjunto encontrará una copia de su declaración jurada firmada para sus registros.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            <strong>Alma Nova Clinic</strong><br>
            Este es un correo automático, por favor no responder.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `${nombreArchivo}_DeclaracionJurada.pdf`,
          content: Buffer.from(pacientePdf, 'base64'),
        },
      ],
    });

    console.log('Emails enviados:', {
      clinica: emailClinica.data?.id,
      paciente: emailPaciente.data?.id,
    });

    return res.status(200).json({
      success: true,
      messageId: emailClinica.data?.id,
      message: 'Formulario enviado exitosamente',
    });
  } catch (error: any) {
    console.error('Error al enviar emails:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error al enviar el formulario',
    });
  }
}
