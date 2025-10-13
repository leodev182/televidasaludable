import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfClinicaBase64, pdfPacienteBase64, datosPersonales } = req.body;

    if (!pdfClinicaBase64 || !pdfPacienteBase64 || !datosPersonales) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const timestamp = Date.now();
    const nombreArchivo = `Formulario_${datosPersonales.run}_${timestamp}`;

    // Email a la clínica
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: process.env.CLINICA_EMAIL!,
      subject: `Formulario Pre-Ocupacional - ${datosPersonales.nombres} ${datosPersonales.run}`,
      html: `
        <h2>Nuevo Formulario Pre-Ocupacional</h2>
        <p><strong>Paciente:</strong> ${datosPersonales.nombres} ${datosPersonales.apellidos}</p>
        <p><strong>RUN:</strong> ${datosPersonales.run}</p>
        <p><strong>Email:</strong> ${datosPersonales.email}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</p>
      `,
      attachments: [
        {
          filename: `${nombreArchivo}_Completo.pdf`,
          content: Buffer.from(pdfClinicaBase64, 'base64'),
        },
      ],
    });

    // Email al paciente
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: datosPersonales.email,
      subject: 'Copia de su Declaración Jurada - Alma Nova Clinic',
      html: `
        <h2>Formulario Recibido</h2>
        <p>Estimado/a <strong>${datosPersonales.nombres}</strong>,</p>
        <p>Hemos recibido su formulario correctamente.</p>
        <p>Adjunto encontrará su declaración jurada firmada.</p>
      `,
      attachments: [
        {
          filename: `${nombreArchivo}_DeclaracionJurada.pdf`,
          content: Buffer.from(pdfPacienteBase64, 'base64'),
        },
      ],
    });

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
