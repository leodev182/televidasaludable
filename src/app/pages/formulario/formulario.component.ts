import { Component, signal, computed, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Bienvenida } from './sections/bienvenida/bienvenida';
import { DatosPersonalesComponent } from './sections/datos-personales/datos-personales';
import { FormularioDataService, FormularioCompleto } from '../../services/formulario-data.service';
import { LoggerService } from '../../shared/services/logger.service';
import { RestoreDraftDialogComponent } from '../../shared/restore-draft-dialog/restore-draft-dialog.component';
import { InformacionEmpleadorComponent } from './sections/informacion-empleador/informacion-empleador';
import { InformacionMedicaComponent } from './sections/informacion-medica/informacion-medica';
import { DeclaracionJuradaComponent } from './sections/declaracion-jurada/declaracion-jurada';
import { FirmaComponent } from './sections/firma/firma';

import { EmailService } from '../../shared/services/email.service';
import { PdfGeneratorService } from '../../services/pdf-generator.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    Bienvenida,
    DatosPersonalesComponent,
    InformacionEmpleadorComponent,
    InformacionMedicaComponent,
    DeclaracionJuradaComponent,
    FirmaComponent,
  ],
  templateUrl: './formulario.component.html',
  styleUrls: ['./formulario.component.scss'],
})
export class FormularioComponent implements OnInit {
  private logger = inject(LoggerService);
  private dataService = inject(FormularioDataService);
  private dialog = inject(MatDialog);
  private emailService = inject(EmailService);
  private pdfGenerator = inject(PdfGeneratorService);

  pasoActual = signal(0);
  readonly totalPasos = 6;

  stepValid = signal<Record<number, boolean>>({
    0: true,
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  });

  triggerValidation = signal(false);

  submitState = signal<{
    status: 'idle' | 'generating-pdf' | 'sending-email' | 'success' | 'error';
    progress?: number;
    error?: string;
  }>({ status: 'idle' });

  canGoNext = computed(() => this.stepValid()[this.pasoActual()]);
  canSubmit = computed(() => Object.values(this.stepValid()).every((v) => v));

  ngOnInit(): void {
    this.logger.info('FormularioComponent', 'Componente inicializado');

    if (this.dataService.hasDraft()) {
      this.showRestoreDraftDialog();
    }
  }

  // Guard para prevenir cierre accidental
  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      this.logger.warn('FormularioComponent', 'Intentando cerrar con cambios sin guardar');

      $event.preventDefault();
      $event.returnValue = '';
    }
  }

  private hasUnsavedChanges(): boolean {
    const validSteps = Object.entries(this.stepValid()).filter(
      ([step, valid]) => Number(step) > 0 && valid
    ).length;

    const hasChanges = validSteps > 0 && this.submitState().status !== 'success';

    this.logger.debug('FormularioComponent', `hasUnsavedChanges: ${hasChanges}`, {
      validSteps,
      submitStatus: this.submitState().status,
    });

    return hasChanges;
  }

  private showRestoreDraftDialog(): void {
    const dialogRef = this.dialog.open(RestoreDraftDialogComponent, {
      disableClose: true,
      width: '450px',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'restore-draft-dialog',
    });

    dialogRef.afterClosed().subscribe((shouldRestore: boolean) => {
      if (shouldRestore) {
        this.restoreDraft();
      } else {
        this.dataService.clearDraft();
        this.logger.info('FormularioComponent', 'Usuario decidió empezar de nuevo');
      }
    });
  }

  private restoreDraft(): void {
    this.logger.info('FormularioComponent', 'Restaurando draft...');

    const draft = this.dataService.restoreDraft();

    if (!draft) {
      this.logger.warn('FormularioComponent', 'No hay draft para restaurar');
      return;
    }

    const lastStep = this.dataService.getLastCompletedStep();
    const bienvenidaCompletada = draft.metadata?.bienvenidaCompletada;

    this.logger.debug('FormularioComponent', 'Draft info', {
      lastStep,
      bienvenidaCompletada,
      pasoActual: this.pasoActual(),
    });

    if (bienvenidaCompletada && lastStep >= 1) {
      // Marcar pasos anteriores como válidos
      for (let i = 1; i <= lastStep; i++) {
        this.stepValid.update((current) => ({
          ...current,
          [i]: true,
        }));
      }

      // CRÍTICO: Usar setTimeout para que Angular actualice después del diálogo
      setTimeout(() => {
        this.pasoActual.set(lastStep);
        this.logger.success('FormularioComponent', `Navegando al paso ${lastStep}`);
      }, 100);
    } else {
      this.logger.info('FormularioComponent', 'Bienvenida no completada, iniciando desde paso 0');
      this.pasoActual.set(0);
    }
  }

  avanzarPaso(): void {
    if (!this.canGoNext()) {
      this.logger.warn('FormularioComponent', 'Paso inválido, solicitando validación');
      this.triggerValidation.set(true);
      setTimeout(() => this.triggerValidation.set(false), 100);
      return;
    }

    const nuevo = Math.min(this.pasoActual() + 1, this.totalPasos - 1);
    this.logger.info('FormularioComponent', `Avanzando de paso ${this.pasoActual()} a ${nuevo}`);
    this.pasoActual.set(nuevo);
  }

  retrocederPaso(): void {
    const nuevo = Math.max(this.pasoActual() - 1, 0);
    this.pasoActual.set(nuevo);
  }

  onStepValidChange(stepIndex: number, isValid: boolean): void {
    this.stepValid.update((current) => ({
      ...current,
      [stepIndex]: isValid,
    }));
  }

  onStepDataChange(stepIndex: number, data: any): void {
    const keyMap: Record<number, keyof FormularioCompleto> = {
      1: 'datosPersonales',
      2: 'informacionEmpleador',
      3: 'informacionMedica',
      4: 'declaracionJurada',
      5: 'firma',
    };

    const key = keyMap[stepIndex];
    if (key) {
      this.dataService.set(key, data);
      this.logger.debug('FormularioComponent', `Guardado en service: ${String(key)}`, data);
    }
  }

  async enviar(): Promise<void> {
    if (!this.canSubmit()) {
      this.logger.warn('FormularioComponent', 'Formulario incompleto');
      return;
    }

    this.logger.info('FormularioComponent', '🚀 Proceso de envío iniciado');
    this.logger.time('Envío total');

    try {
      // 1. Obtener snapshot completo
      this.submitState.set({ status: 'generating-pdf', progress: 10 });
      const snapshot = this.dataService.snapshot();
      this.logger.info('FormularioComponent', 'Snapshot obtenido', snapshot);

      // 2. Validar que tengamos todos los datos necesarios
      if (!snapshot.datosPersonales?.email) {
        throw new Error('Email del paciente no encontrado');
      }

      // 3. Generar PDFs
      this.submitState.set({ status: 'generating-pdf', progress: 30 });
      this.logger.info('FormularioComponent', 'Generando PDFs...');

      const clinicaPdfBlob = await this.pdfGenerator.generateCompletePDF(snapshot);
      const pacientePdfBlob = await this.pdfGenerator.generateConsentPDF(snapshot);

      this.logger.success('FormularioComponent', 'PDFs generados', {
        clinicaSize: (clinicaPdfBlob.size / 1024).toFixed(2) + ' KB',
        pacienteSize: (pacientePdfBlob.size / 1024).toFixed(2) + ' KB',
      });

      // 4. Convertir Blobs a Base64
      this.submitState.set({ status: 'generating-pdf', progress: 50 });
      this.logger.debug('FormularioComponent', 'Convirtiendo PDFs a Base64...');

      const clinicaPdf = await this.blobToBase64(clinicaPdfBlob);
      const pacientePdf = await this.blobToBase64(pacientePdfBlob);

      // 5. Enviar email
      this.submitState.set({ status: 'sending-email', progress: 70 });
      this.logger.info('FormularioComponent', 'Enviando email a Resend...');

      const emailRequest = {
        clinicaPdf,
        pacientePdf,
        datosPersonales: {
          nombres: snapshot.datosPersonales.nombres,
          apellidos: snapshot.datosPersonales.apellidos,
          email: snapshot.datosPersonales.email,
          run: snapshot.datosPersonales.run,
        },
      };

      // Llamada al servicio (observable convertido a Promise)
      const response = await new Promise<any>((resolve, reject) => {
        this.emailService.sendForm(emailRequest).subscribe({
          next: (res) => resolve(res),
          error: (err) => reject(err),
        });
      });

      // 6. Éxito
      this.submitState.set({ status: 'success', progress: 100 });
      this.logger.success('FormularioComponent', '✅ Formulario enviado exitosamente', {
        messageId: response.messageId,
      });

      // 7. Limpiar después de 3 segundos
      setTimeout(() => {
        this.dataService.reset();
        this.submitState.set({ status: 'idle' });
      }, 3000);
    } catch (error: any) {
      this.logger.error('FormularioComponent', '❌ Error al enviar formulario', error);

      this.submitState.set({
        status: 'error',
        error:
          error.message ||
          'Ocurrió un error al enviar el formulario. Por favor intenta nuevamente.',
      });

      setTimeout(() => {
        if (this.submitState().status === 'error') {
          this.submitState.set({ status: 'idle' });
        }
      }, 5000);
    } finally {
      this.logger.timeEnd('Envío total');
      this.logger.info('FormularioComponent', 'Proceso finalizado');
    }
  }

  /**
   * Convierte un Blob a Base64 (sin el prefijo data:)
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remover el prefijo "data:application/pdf;base64,"
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };

      reader.onerror = () => {
        reject(new Error('Error al convertir PDF a Base64'));
      };

      reader.readAsDataURL(blob);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
