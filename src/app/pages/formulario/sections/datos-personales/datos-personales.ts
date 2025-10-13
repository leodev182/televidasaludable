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
import { debounceTime } from 'rxjs/operators';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';

import {
  FormularioDataService,
  DatosPersonalesDTO,
} from '../../../../services/formulario-data.service';
import { LoggerService } from '../../../../shared/services/logger.service';

@Component({
  selector: 'app-datos-personales',
  standalone: true,
  templateUrl: './datos-personales.html',
  styleUrls: ['./datos-personales.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    MatIconModule,
  ],
  providers: [provideNativeDateAdapter()],
})
export class DatosPersonalesComponent implements OnInit, OnDestroy {
  @Output() validChange = new EventEmitter<boolean>();
  @Output() dataChange = new EventEmitter<DatosPersonalesDTO>();

  requestValidate = input<boolean>(false);

  private fb = inject(FormBuilder);
  private dataService = inject(FormularioDataService);
  private logger = inject(LoggerService); // ← FALTABA ESTO

  form!: FormGroup;
  private subs: Subscription[] = [];

  constructor() {
    // Escuchar cuando el padre solicite validación
    effect(() => {
      if (this.requestValidate()) {
        this.validateForm();
      }
    });
  }

  ngOnInit(): void {
    const existingData = this.dataService.get('datosPersonales');

    this.form = this.fb.group({
      nombres: [existingData?.nombres || '', Validators.required],
      apellidos: [existingData?.apellidos || '', Validators.required],
      run: [existingData?.run || '', Validators.required],
      genero: [existingData?.genero || '', Validators.required],
      fechaNacimiento: [existingData?.fechaNacimiento || '', Validators.required],
      telefono: [existingData?.telefono || '', Validators.required],
      email: [existingData?.email || '', [Validators.required, Validators.email]],
      nacionalidad: [existingData?.nacionalidad || '', Validators.required],
      direccion: [existingData?.direccion || '', Validators.required],
      region: [existingData?.region || '', Validators.required],
      ciudad: [existingData?.ciudad || '', Validators.required],
      comuna: [existingData?.comuna || '', Validators.required],
      prevision: [existingData?.prevision || '', Validators.required],
    });

    this.validChange.emit(this.form.valid);

    this.subs.push(
      this.form.statusChanges.subscribe(() => {
        this.validChange.emit(this.form.valid);
      })
    );

    this.subs.push(
      this.form.valueChanges.pipe(debounceTime(500)).subscribe(() => {
        const dto: DatosPersonalesDTO = this.form.value;
        this.dataChange.emit(dto);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  validateForm(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.logger.warn('DatosPersonales', 'Formulario inválido, mostrando errores');
      this.scrollToFirstError();
    }
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      const firstError = document.querySelector('.mat-mdc-form-field-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }
}
