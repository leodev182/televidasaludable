import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  inject,
  input,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatCheckboxModule } from '@angular/material/checkbox';

import {
  FormularioDataService,
  DeclaracionJuradaDTO,
} from '../../../../services/formulario-data.service';
import { LoggerService } from '../../../../shared/services/logger.service';

@Component({
  selector: 'app-declaracion-jurada',
  standalone: true,
  templateUrl: './declaracion-jurada.html',
  styleUrls: ['./declaracion-jurada.scss'],
  imports: [CommonModule, ReactiveFormsModule, MatCheckboxModule],
})
export class DeclaracionJuradaComponent implements OnInit, OnDestroy {
  @Output() validChange = new EventEmitter<boolean>();
  @Output() dataChange = new EventEmitter<DeclaracionJuradaDTO>();

  requestValidate = input<boolean>(false);

  private fb = inject(FormBuilder);
  private dataService = inject(FormularioDataService);
  private logger = inject(LoggerService);

  form!: FormGroup;
  private subs: Subscription[] = [];

  readonly VERSION_CONSENTIMIENTO = 'v1.0_2025';

  constructor() {
    effect(() => {
      if (this.requestValidate()) {
        this.validateForm();
      }
    });
  }

  ngOnInit(): void {
    const existingData = this.dataService.get('declaracionJurada');

    this.form = this.fb.group({
      aceptaVeracidadInfo: [existingData?.aceptaVeracidadInfo || false, Validators.requiredTrue],
      aceptaTratamientoDatos: [
        existingData?.aceptaTratamientoDatos || false,
        Validators.requiredTrue,
      ],
      aceptaEnvioPorEmail: [existingData?.aceptaEnvioPorEmail || false, Validators.requiredTrue],
    });

    this.validChange.emit(this.form.valid);

    this.subs.push(
      this.form.statusChanges.subscribe(() => {
        this.validChange.emit(this.form.valid);
      })
    );

    this.subs.push(
      this.form.valueChanges.subscribe(() => {
        if (this.form.valid) {
          const dto: DeclaracionJuradaDTO = {
            ...this.form.value,
            versionConsentimiento: this.VERSION_CONSENTIMIENTO,
            timestamp: Date.now(),
          };
          this.dataChange.emit(dto);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  validateForm(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.logger.warn('DeclaracionJurada', 'Debe aceptar todos los términos');
    }
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
