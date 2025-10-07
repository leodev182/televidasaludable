import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import { FormularioCompleto } from './formulario-data.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root',
})
export class PdfGeneratorService {
  private logger = inject(LoggerService);

  /**
   * Genera PDF completo para la clínica (ficha técnica completa)
   */
  generateCompletePDF(data: FormularioCompleto): Blob {
    this.logger.info('PDFGenerator', 'Generando PDF completo para clínica');

    const doc = new jsPDF();
    let yPosition = 20;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(17, 94, 94); // Verde de la clínica
    doc.text('FORMULARIO PRE-OCUPACIONAL', 105, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Alma Nova Clinic', 105, yPosition, { align: 'center' });
    yPosition += 15;

    // Línea separadora
    doc.setDrawColor(17, 94, 94);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    // DATOS PERSONALES
    yPosition = this.addSection(doc, yPosition, 'DATOS PERSONALES', data.datosPersonales);

    // INFORMACIÓN DEL EMPLEADOR
    yPosition = this.addSection(
      doc,
      yPosition,
      'INFORMACIÓN DEL EMPLEADOR',
      data.informacionEmpleador
    );

    // INFORMACIÓN MÉDICA
    yPosition = this.addSection(doc, yPosition, 'INFORMACIÓN MÉDICA', data.informacionMedica);

    // DECLARACIÓN JURADA
    if (data.declaracionJurada) {
      yPosition = this.checkPageBreak(doc, yPosition, 40);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DECLARACIÓN JURADA', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('✓ Declara veracidad de información', 20, yPosition);
      yPosition += 6;
      doc.text('✓ Autoriza tratamiento de datos personales', 20, yPosition);
      yPosition += 6;
      doc.text('✓ Consiente envío por email cifrado', 20, yPosition);
      yPosition += 6;
      doc.text(`Versión: ${data.declaracionJurada.versionConsentimiento}`, 20, yPosition);
      yPosition += 6;
      doc.text(
        `Fecha: ${new Date(data.declaracionJurada.timestamp).toLocaleString('es-CL')}`,
        20,
        yPosition
      );
      yPosition += 15;
    }

    // FIRMA
    if (data.firma?.base64) {
      yPosition = this.checkPageBreak(doc, yPosition, 60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('FIRMA DIGITAL', 20, yPosition);
      yPosition += 8;

      // Agregar imagen de la firma
      try {
        doc.addImage(data.firma.base64, 'PNG', 20, yPosition, 80, 40);
        yPosition += 45;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(
          `Firmado el: ${new Date(data.firma.timestamp).toLocaleString('es-CL')}`,
          20,
          yPosition
        );
      } catch (error) {
        this.logger.error('PDFGenerator', 'Error al agregar firma', error);
      }
    }

    // Footer en última página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Página ${i} de ${pageCount} | Generado: ${new Date().toLocaleString('es-CL')}`,
        105,
        290,
        { align: 'center' }
      );
    }

    return doc.output('blob');
  }

  /**
   * Genera PDF solo con declaración jurada para el paciente
   */
  generateConsentPDF(data: FormularioCompleto): Blob {
    this.logger.info('PDFGenerator', 'Generando PDF de consentimiento para paciente');

    const doc = new jsPDF();
    let yPosition = 20;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(17, 94, 94);
    doc.text('DECLARACIÓN JURADA Y CONSENTIMIENTO INFORMADO', 105, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Alma Nova Clinic', 105, yPosition, { align: 'center' });
    yPosition += 15;

    // Datos del paciente
    if (data.datosPersonales) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Paciente:', 20, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(`${data.datosPersonales.nombres} ${data.datosPersonales.apellidos}`, 50, yPosition);
      yPosition += 7;

      doc.setFont('helvetica', 'bold');
      doc.text('RUN:', 20, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(data.datosPersonales.run, 50, yPosition);
      yPosition += 15;
    }

    // Texto legal
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Marco Legal:', 20, yPosition);
    yPosition += 7;

    doc.setFont('helvetica', 'normal');
    const legalText = [
      'Este formulario cumple con la normativa vigente sobre atención médica y telemedicina',
      'en Chile, amparado en la Ley 21.541 (Telemedicina) y la Ley 21.746 (Atención Médica Virtual).',
      '',
      'Protección de Datos Personales:',
      'Toda la información proporcionada será tratada conforme a la Ley 19.628 sobre protección',
      'de la vida privada y la Ley 20.584 sobre derechos y deberes de los pacientes.',
      '',
      'Tratamiento de la Información:',
      'Sus datos serán enviados de forma segura mediante cifrado TLS por correo electrónico',
      'directamente a Alma Nova Clinic. No almacenamos sus datos en servidores externos.',
    ];

    legalText.forEach((line) => {
      yPosition = this.checkPageBreak(doc, yPosition, 7);
      doc.text(line, 20, yPosition, { maxWidth: 170 });
      yPosition += 6;
    });

    yPosition += 10;

    // Declaraciones aceptadas
    doc.setFont('helvetica', 'bold');
    doc.text('El paciente declara:', 20, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.text('✓ Que toda la información proporcionada es verídica y completa', 20, yPosition);
    yPosition += 6;
    doc.text(
      '✓ Autoriza el tratamiento de sus datos personales según la Ley 19.628',
      20,
      yPosition
    );
    yPosition += 6;
    doc.text('✓ Consiente el envío de sus datos mediante email cifrado (TLS)', 20, yPosition);
    yPosition += 15;

    // Firma
    if (data.firma?.base64) {
      yPosition = this.checkPageBreak(doc, yPosition, 60);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Firma del Paciente:', 20, yPosition);
      yPosition += 8;

      try {
        doc.addImage(data.firma.base64, 'PNG', 20, yPosition, 80, 40);
        yPosition += 45;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(
          `Firmado digitalmente el: ${new Date(data.firma.timestamp).toLocaleString('es-CL')}`,
          20,
          yPosition
        );
        yPosition += 5;
        doc.text(
          `Versión del documento: ${data.declaracionJurada?.versionConsentimiento}`,
          20,
          yPosition
        );
      } catch (error) {
        this.logger.error('PDFGenerator', 'Error al agregar firma', error);
      }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Documento generado el ${new Date().toLocaleString('es-CL')}`, 105, 290, {
      align: 'center',
    });

    return doc.output('blob');
  }

  // Métodos auxiliares
  private addSection(doc: jsPDF, yPosition: number, title: string, data: any): number {
    if (!data) return yPosition;

    yPosition = this.checkPageBreak(doc, yPosition, 30);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;

      yPosition = this.checkPageBreak(doc, yPosition, 10);

      const label = this.formatLabel(key);
      const formattedValue = this.formatValue(value);

      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 20, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(formattedValue, 80, yPosition, { maxWidth: 110 });
      yPosition += 6;
    });

    yPosition += 10;
    return yPosition;
  }

  private checkPageBreak(doc: jsPDF, yPosition: number, requiredSpace: number): number {
    if (yPosition + requiredSpace > 280) {
      doc.addPage();
      return 20;
    }
    return yPosition;
  }

  private formatLabel(key: string): string {
    const labels: Record<string, string> = {
      nombres: 'Nombres',
      apellidos: 'Apellidos',
      run: 'RUN',
      fechaNacimiento: 'Fecha de Nacimiento',
      telefono: 'Teléfono',
      email: 'Email',
      nacionalidad: 'Nacionalidad',
      direccion: 'Dirección',
      region: 'Región',
      ciudad: 'Ciudad',
      comuna: 'Comuna',
      prevision: 'Previsión',
      empresaNombre: 'Empresa',
      empresaRut: 'RUT Empresa',
      cargo: 'Cargo',
    };
    return labels[key] || key;
  }

  private formatValue(value: any): string {
    if (value instanceof Date) {
      return value.toLocaleDateString('es-CL');
    }
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}
