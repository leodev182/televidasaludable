import { Component, signal, computed, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Bienvenida } from './sections/bienvenida/bienvenida';
import { DatosPersonalesComponent } from './sections/datos-personales/datos-personales';
import { FormularioDataService, FormularioCompleto } from '../../services/formulario-data.service';
import { LoggerService } from '../../services/logger.service';
import { RestoreDraftDialogComponent } from '../../shared/restore-draft-dialog/restore-draft-dialog.component';
import { InformacionEmpleadorComponent } from './sections/informacion-empleador/informacion-empleador';
import { InformacionMedicaComponent } from './sections/informacion-medica/informacion-medica';
import { DeclaracionJuradaComponent } from './sections/declaracion-jurada/declaracion-jurada';
import { FirmaComponent } from './sections/firma/firma';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
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
    const draft = this.dataService.restoreDraft();

    if (!draft) return;

    const lastStep = this.dataService.getLastCompletedStep();
    const bienvenidaCompletada = draft.metadata?.bienvenidaCompletada;

    if (bienvenidaCompletada && lastStep >= 1) {
      this.pasoActual.set(lastStep);

      for (let i = 1; i <= lastStep; i++) {
        this.stepValid.update((current) => ({
          ...current,
          [i]: true,
        }));
      }

      this.logger.info('FormularioComponent', `Continuando en el paso ${lastStep}`);
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

    try {
      this.submitState.set({ status: 'generating-pdf', progress: 0 });
      this.logger.info('FormularioComponent', 'Iniciando generación de PDF...');

      const snapshot = this.dataService.snapshot();

      await this.delay(2000);
      this.submitState.set({ status: 'generating-pdf', progress: 50 });

      this.submitState.set({ status: 'sending-email', progress: 75 });
      this.logger.info('FormularioComponent', 'Enviando email...');

      await this.delay(2000);

      this.submitState.set({ status: 'success', progress: 100 });
      this.logger.success('FormularioComponent', 'Formulario enviado exitosamente');

      setTimeout(() => {
        this.dataService.reset();
        this.submitState.set({ status: 'idle' });
      }, 3000);
    } catch (error) {
      this.logger.error('FormularioComponent', 'Error al enviar formulario', error);
      this.submitState.set({
        status: 'error',
        error: 'Ocurrió un error al enviar el formulario. Por favor intenta nuevamente.',
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
