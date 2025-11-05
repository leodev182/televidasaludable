import { Injectable, inject } from '@angular/core';
import { FormularioCompleto } from './formulario-data.service';
import { LoggerService } from '../shared/services/logger.service';

@Injectable({
  providedIn: 'root',
})
export class PdfGeneratorService {
  private logger = inject(LoggerService);

  /**
   * Genera PDF completo para la clínica (ficha técnica completa)
   */
  async generateCompletePDF(data: FormularioCompleto): Promise<Blob> {
    this.logger.info('PDFGenerator', 'Generando PDF completo para clínica');

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let yPosition = 20;

    // ==========================================
    // DISCLAIMER LEGAL
    // ==========================================
    yPosition = this.addLegalDisclaimer(doc, yPosition);

    // ==========================================
    // INFORMACIÓN PERSONAL
    // ==========================================
    yPosition = this.addDatosPersonales(doc, yPosition, data.datosPersonales);

    // ==========================================
    // INFORMACIÓN EMPLEADOR (solo 2 campos)
    // ==========================================
    yPosition = this.addInformacionEmpleador(doc, yPosition, data.informacionEmpleador);

    // ==========================================
    // INFORMACIÓN MÉDICA
    // ==========================================
    yPosition = this.addInformacionMedica(doc, yPosition, data.informacionMedica);

    // ==========================================
    // CONSENTIMIENTO
    // ==========================================
    yPosition = this.addConsentimiento(doc, yPosition, data.declaracionJurada);

    // ==========================================
    // FIRMA
    // ==========================================
    yPosition = this.addFirma(doc, yPosition, data.firma, data.datosPersonales?.run);

    // Footer en todas las páginas
    this.addFooters(doc);

    return doc.output('blob');
  }

  /**
   * Genera PDF solo con declaración jurada para el paciente
   */
  async generateConsentPDF(data: FormularioCompleto): Promise<Blob> {
    this.logger.info('PDFGenerator', 'Generando PDF de consentimiento para paciente');

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let yPosition = 20;

    // Header
    doc.setFontSize(16);
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

  // ==========================================
  // MÉTODOS AUXILIARES
  // ==========================================

  private addLegalDisclaimer(doc: any, yPosition: number): number {
    yPosition = this.checkPageBreak(doc, yPosition, 60);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    const disclaimer = [
      'Este LINK es una herramienta tecnológica que contribuye al desarrollo de la atención médica a través de la',
      'metodología de telemedicina siendo permitida Ley 21.541 de Chile.',
      '',
      'Según normativa vigente Ley 21.746 de Chile que modifica la Ley 20.585 de Chile, esta encuesta ha sido',
      'elaborada garantizando la veracidad de los antecedentes clínicos de los pacientes y su alineación con las',
      'normativas vigentes para la fiscalización de licencias médicas/compin.',
      '',
      'La información suministrada por usted, son datos básicos e importantes para que el médico desempeñe mejor',
      'su atención (informe/ficha clínica). Es de vital importancia responder las siguientes preguntas a consciencia,',
      'con honestidad y responsabilidad. Sus datos son confidenciales y serán protegidos Ley 19.628 de Chile.',
    ];

    disclaimer.forEach((line) => {
      doc.text(line, 20, yPosition, { maxWidth: 170 });
      yPosition += 5;
    });

    yPosition += 10;
    return yPosition;
  }

  private addDatosPersonales(doc: any, yPosition: number, datos: any): number {
    if (!datos) return yPosition;

    yPosition = this.checkPageBreak(doc, yPosition, 30);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('INFORMACIÓN PERSONAL', 20, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text('Recuerde siempre actualizar sus DATOS PERSONALES.', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const preguntas = [
      { num: 1, label: 'Nombres Completos', value: datos.nombres },
      { num: 2, label: 'Apellidos Completos', value: datos.apellidos },
      { num: 3, label: 'RUN', value: datos.run },
      { num: 4, label: 'Género', value: datos.genero },
      { num: 5, label: 'Fecha de Nacimiento', value: this.formatDate(datos.fechaNacimiento) },
      { num: 6, label: 'Teléfono / Celular', value: datos.telefono },
      { num: 7, label: 'Email', value: datos.email },
      { num: 8, label: 'Nacionalidad', value: datos.nacionalidad },
      { num: 9, label: 'Dirección', value: datos.direccion },
      { num: 10, label: 'Región', value: datos.region },
      { num: 11, label: 'Ciudad', value: datos.ciudad },
      { num: 12, label: 'Comuna', value: datos.comuna },
      { num: 13, label: 'Previsión', value: datos.prevision },
    ];

    preguntas.forEach((p) => {
      if (p.value) {
        yPosition = this.checkPageBreak(doc, yPosition, 12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${p.num}. ${p.label}`, 20, yPosition);
        yPosition += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(String(p.value), 20, yPosition, { maxWidth: 170 });
        yPosition += 7;
      }
    });

    yPosition += 5;
    return yPosition;
  }

  private addInformacionEmpleador(doc: any, yPosition: number, datos: any): number {
    if (!datos) return yPosition;

    yPosition = this.checkPageBreak(doc, yPosition, 30);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('INFORMACIÓN EMPLEADOR', 20, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text('Recuerde siempre actualizar los DATOS DE LOS EMPLEADORES.', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    // ✅ SOLO 2 CAMPOS ACTIVOS
    const preguntas = [
      { num: 1, label: 'Nombre de la Empresa', value: datos.empresaNombre },
      { num: 2, label: 'RUT de la Empresa', value: datos.empresaRut },
    ];

    preguntas.forEach((p) => {
      if (p.value) {
        yPosition = this.checkPageBreak(doc, yPosition, 12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${p.num}. ${p.label}`, 20, yPosition);
        yPosition += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(String(p.value), 20, yPosition, { maxWidth: 170 });
        yPosition += 7;
      }
    });

    yPosition += 5;
    return yPosition;
  }

  private addInformacionMedica(doc: any, yPosition: number, datos: any): number {
    if (!datos) return yPosition;

    yPosition = this.checkPageBreak(doc, yPosition, 30);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('INFORMACIÓN MÉDICA', 20, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text(
      'Recuerde siempre actualizar los DATOS DE LA ATENCIÓN MÉDICA (INFORME).',
      20,
      yPosition
    );
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    let questionNum = 1;

    // Mapeo de todas las preguntas médicas
    const preguntas: Array<{ label: string; value: any; detalle?: any }> = [];

    if (datos.sintomas) {
      preguntas.push({ label: '¿Cuáles son los síntomas que presenta?', value: datos.sintomas });
    }
    if (datos.cuandoInicioSintomas) {
      preguntas.push({
        label: '¿Desde cuándo iniciaron esos síntomas?',
        value: datos.cuandoInicioSintomas,
      });
    }
    if (datos.enfermedadCronica) {
      preguntas.push({
        label: '¿Usted sufre de alguna enfermedad crónica?',
        value: datos.enfermedadCronica === 'si' ? 'Sí' : 'No',
        detalle: datos.enfermedadCronica === 'si' ? datos.detalleEnfermedadCronica : undefined,
      });
    }
    if (datos.enfermedadMental) {
      preguntas.push({
        label: '¿Usted sufre de alguna enfermedad mental?',
        value: datos.enfermedadMental === 'si' ? 'Sí' : 'No',
        detalle: datos.enfermedadMental === 'si' ? datos.detalleEnfermedadMental : undefined,
      });
    }
    if (datos.cirugiaPrevia) {
      preguntas.push({
        label: '¿Le han realizado alguna cirugía?',
        value: datos.cirugiaPrevia === 'si' ? 'Sí' : 'No',
      });
    }
    if (datos.reaccionAlergica) {
      preguntas.push({
        label: '¿Ha tenido reacción alérgica a algún medicamento?',
        value: datos.reaccionAlergica === 'si' ? 'Sí' : 'No',
        detalle:
          datos.reaccionAlergica === 'si'
            ? `Medicamento: ${datos.detalleReaccionAlergica}`
            : undefined,
      });
    }
    if (datos.antecedenteFamiliar) {
      preguntas.push({
        label: '¿Tiene antecedentes familiares?',
        value: datos.antecedenteFamiliar === 'si' ? 'Sí' : 'No',
        detalle: datos.antecedenteFamiliar === 'si' ? datos.detalleAntecedenteFamiliar : undefined,
      });
    }
    if (datos.estadoCivil) {
      preguntas.push({ label: '¿Cuál es su estado civil?', value: datos.estadoCivil });
    }
    if (datos.tieneHijos) {
      let hijoValue = datos.tieneHijos === 'si' ? 'Sí' : 'No';
      if (datos.tieneHijos === 'si' && datos.cuantosHijos) {
        hijoValue += ` (Cantidad: ${datos.cuantosHijos})`;
      }
      preguntas.push({ label: '¿Usted tiene hijos?', value: hijoValue });
    }
    if (datos.cuantasPersonasViven) {
      preguntas.push({
        label: '¿Cuántas personas viven con usted?',
        value: datos.cuantasPersonasViven,
      });
    }
    if (datos.fuma) {
      preguntas.push({ label: '¿Usted fuma?', value: datos.fuma === 'si' ? 'Sí' : 'No' });
    }
    if (datos.consumeAlcohol) {
      preguntas.push({
        label: '¿Usted consume bebidas alcohólicas?',
        value: datos.consumeAlcohol === 'si' ? 'Sí' : 'No',
      });
    }
    if (datos.tieneLicenciaMedica) {
      preguntas.push({
        label: '¿Tiene actualmente licencia médica?',
        value: datos.tieneLicenciaMedica === 'si' ? 'Sí' : 'No',
      });
    }
    if (datos.pesoKilos) {
      preguntas.push({ label: '¿Cuál es su peso en Kilos?', value: datos.pesoKilos });
    }
    if (datos.estaturaMetros) {
      preguntas.push({ label: '¿Cuánto mide / cuál es su estatura?', value: datos.estaturaMetros });
    }
    if (datos.puedeComerBien) {
      preguntas.push({
        label: '¿Puede comer bien?',
        value: datos.puedeComerBien === 'si' ? 'Sí' : 'No',
      });
    }
    if (datos.haceEjercicio) {
      preguntas.push({
        label: '¿Está haciendo ejercicio?',
        value: datos.haceEjercicio === 'si' ? 'Sí' : 'No',
      });
    }
    if (datos.problemasParaDormir) {
      preguntas.push({
        label: '¿Tiene problemas para dormir?',
        value: datos.problemasParaDormir === 'si' ? 'Sí' : 'No',
      });
    }
    if (datos.fechaAtencion) {
      preguntas.push({
        label: '¿Cuál es la fecha de atención?',
        value: this.formatDate(datos.fechaAtencion),
      });
    }
    if (datos.fechaInicioLM) {
      preguntas.push({
        label: '¿Fecha de inicio de la LM?',
        value: this.formatDate(datos.fechaInicioLM),
      });
    }
    if (datos.diasLicencia) {
      preguntas.push({ label: '¿Cuántos días?', value: datos.diasLicencia });
    }
    if (datos.tieneEstudiosLaboratorio) {
      preguntas.push({
        label: '¿Ha realizado estudios de laboratorio?',
        value: datos.tieneEstudiosLaboratorio === 'si' ? 'Sí' : 'No',
      });
    }
    if (datos.tieneValoracionEspecialista) {
      preguntas.push({
        label: '¿Tiene valoración de especialista?',
        value: datos.tieneValoracionEspecialista === 'si' ? 'Sí' : 'No',
      });
    }

    // Renderizar todas las preguntas
    preguntas.forEach((p) => {
      yPosition = this.checkPageBreak(doc, yPosition, 15);
      doc.setFont('helvetica', 'bold');
      doc.text(`${questionNum}. ${p.label}`, 20, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(String(p.value), 20, yPosition, { maxWidth: 170 });
      yPosition += 5;

      if (p.detalle) {
        doc.text(`Detalle: ${p.detalle}`, 20, yPosition, { maxWidth: 170 });
        yPosition += 5;
      }

      yPosition += 2;
      questionNum++;
    });

    yPosition += 5;
    return yPosition;
  }

  private addConsentimiento(doc: any, yPosition: number, datos: any): number {
    if (!datos) return yPosition;

    yPosition = this.checkPageBreak(doc, yPosition, 40);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CONSENTIMIENTO', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const consentText = [
      'He sido informado e invitado a diligenciar la información depositada en el presente documento de',
      'manera clara y honesta. Entiendo que la información registrada será confidencial. Acepto',
      'voluntariamente diligenciar el presente documento y declaro que toda la información por mi',
      'suministrada es absolutamente cierta.',
    ];

    consentText.forEach((line) => {
      doc.text(line, 20, yPosition, { maxWidth: 170 });
      yPosition += 5;
    });

    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('1. Acepto', 20, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('✓ checked', 20, yPosition);
    yPosition += 10;

    return yPosition;
  }

  private addFirma(doc: any, yPosition: number, firma: any, run?: string): number {
    if (!firma?.base64) return yPosition;

    yPosition = this.checkPageBreak(doc, yPosition, 60);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CONSENTIMIENTO JURADO', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Firma', 20, yPosition);
    yPosition += 8;

    try {
      doc.addImage(firma.base64, 'PNG', 20, yPosition, 80, 40);
      yPosition += 45;
    } catch (error) {
      this.logger.error('PDFGenerator', 'Error al agregar firma', error);
      yPosition += 45;
    }

    if (run) {
      doc.setFont('helvetica', 'bold');
      doc.text('2. RUN', 20, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(run, 20, yPosition);
    }

    return yPosition;
  }

  private addFooters(doc: any): void {
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
  }

  private checkPageBreak(doc: any, yPosition: number, requiredSpace: number): number {
    if (yPosition + requiredSpace > 280) {
      doc.addPage();
      return 20;
    }
    return yPosition;
  }

  private formatDate(value: any): string {
    if (!value) return '';
    if (value instanceof Date) {
      return value.toLocaleDateString('es-CL');
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('es-CL');
  }
}
