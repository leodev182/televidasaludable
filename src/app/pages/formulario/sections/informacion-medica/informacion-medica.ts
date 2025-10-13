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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';

import {
  FormularioDataService,
  InformacionMedicaDTO,
} from '../../../../services/formulario-data.service';
import { LoggerService } from '../../../../shared/services/logger.service';

@Component({
  selector: 'app-informacion-medica',
  standalone: true,
  templateUrl: './informacion-medica.html',
  styleUrls: ['./informacion-medica.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatCheckboxModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter()],
})
export class InformacionMedicaComponent implements OnInit, OnDestroy {
  @Output() validChange = new EventEmitter<boolean>();
  @Output() dataChange = new EventEmitter<InformacionMedicaDTO>();

  requestValidate = input<boolean>(false);

  private fb = inject(FormBuilder);
  private dataService = inject(FormularioDataService);
  private logger = inject(LoggerService);

  form!: FormGroup;
  private subs: Subscription[] = [];

  constructor() {
    effect(() => {
      if (this.requestValidate()) {
        this.validateForm();
      }
    });
  }

  ngOnInit(): void {
    const existingData = this.dataService.get('informacionMedica');

    this.form = this.fb.group({
      sintomas: [existingData?.sintomas || '', Validators.required],
      cuandoInicioSintomas: [existingData?.cuandoInicioSintomas || '', Validators.required],

      enfermedadCronica: [existingData?.enfermedadCronica || '', Validators.required],
      detalleEnfermedadCronica: [existingData?.detalleEnfermedadCronica || ''],

      enfermedadMental: [existingData?.enfermedadMental || '', Validators.required],
      detalleEnfermedadMental: [existingData?.detalleEnfermedadMental || ''],

      cirugiaPrevia: [existingData?.cirugiaPrevia || '', Validators.required],

      reaccionAlergica: [existingData?.reaccionAlergica || '', Validators.required],
      detalleReaccionAlergica: [existingData?.detalleReaccionAlergica || ''],

      antecedenteFamiliar: [existingData?.antecedenteFamiliar || '', Validators.required],
      detalleAntecedenteFamiliar: [existingData?.detalleAntecedenteFamiliar || ''],

      estadoCivil: [existingData?.estadoCivil || '', Validators.required],

      tieneHijos: [existingData?.tieneHijos || '', Validators.required],
      cuantosHijos: [existingData?.cuantosHijos || ''],

      cuantasPersonasViven: [existingData?.cuantasPersonasViven || '', Validators.required],
      fuma: [existingData?.fuma || '', Validators.required],
      consumeAlcohol: [existingData?.consumeAlcohol || '', Validators.required],
      tieneLicenciaMedica: [existingData?.tieneLicenciaMedica || '', Validators.required],
      pesoKilos: [existingData?.pesoKilos || '', Validators.required],
      estaturaMetros: [existingData?.estaturaMetros || '', Validators.required],
      puedeComerBien: [existingData?.puedeComerBien || '', Validators.required],
      haceEjercicio: [existingData?.haceEjercicio || '', Validators.required],
      problemasParaDormir: [existingData?.problemasParaDormir || '', Validators.required],

      fechaAtencion: [existingData?.fechaAtencion || '', Validators.required],
      fechaInicioLM: [existingData?.fechaInicioLM || '', Validators.required],
      diasLicencia: [existingData?.diasLicencia || '', Validators.required],

      tieneEstudiosLaboratorio: [existingData?.tieneEstudiosLaboratorio || '', Validators.required],
      tieneValoracionEspecialista: [
        existingData?.tieneValoracionEspecialista || '',
        Validators.required,
      ],

      tieneCondicionPreexistente: [existingData?.tieneCondicionPreexistente || false],
      detalleCondicion: [existingData?.detalleCondicion || ''],
    });

    // Validaciones condicionales
    this.setupConditionalValidations();

    this.validChange.emit(this.form.valid);

    this.subs.push(
      this.form.statusChanges.subscribe(() => {
        this.validChange.emit(this.form.valid);
      })
    );

    this.subs.push(
      this.form.valueChanges.pipe(debounceTime(500)).subscribe(() => {
        const dto: InformacionMedicaDTO = this.form.value;
        this.dataChange.emit(dto);
      })
    );
  }

  private setupConditionalValidations(): void {
    // Pregunta 3: Enfermedad crónica
    this.form.get('enfermedadCronica')?.valueChanges.subscribe((value) => {
      const detalle = this.form.get('detalleEnfermedadCronica');
      if (value === 'si') {
        detalle?.setValidators(Validators.required);
      } else {
        detalle?.clearValidators();
      }
      detalle?.updateValueAndValidity();
    });

    // Pregunta 4: Enfermedad mental
    this.form.get('enfermedadMental')?.valueChanges.subscribe((value) => {
      const detalle = this.form.get('detalleEnfermedadMental');
      if (value === 'si') {
        detalle?.setValidators(Validators.required);
      } else {
        detalle?.clearValidators();
      }
      detalle?.updateValueAndValidity();
    });

    // Pregunta 6: Reacción alérgica
    this.form.get('reaccionAlergica')?.valueChanges.subscribe((value) => {
      const detalle = this.form.get('detalleReaccionAlergica');
      if (value === 'si') {
        detalle?.setValidators(Validators.required);
      } else {
        detalle?.clearValidators();
      }
      detalle?.updateValueAndValidity();
    });

    // Pregunta 7: Antecedentes familiares
    this.form.get('antecedenteFamiliar')?.valueChanges.subscribe((value) => {
      const detalle = this.form.get('detalleAntecedenteFamiliar');
      if (value === 'si') {
        detalle?.setValidators(Validators.required);
      } else {
        detalle?.clearValidators();
      }
      detalle?.updateValueAndValidity();
    });

    // Pregunta 9: Hijos
    this.form.get('tieneHijos')?.valueChanges.subscribe((value) => {
      const cuantos = this.form.get('cuantosHijos');
      if (value === 'si') {
        cuantos?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        cuantos?.clearValidators();
      }
      cuantos?.updateValueAndValidity();
    });

    // Checkbox condición preexistente
    this.form.get('tieneCondicionPreexistente')?.valueChanges.subscribe((tiene) => {
      const detalleControl = this.form.get('detalleCondicion');
      if (tiene) {
        detalleControl?.setValidators(Validators.required);
      } else {
        detalleControl?.clearValidators();
      }
      detalleControl?.updateValueAndValidity();
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  validateForm(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.logger.warn('InformacionMedica', 'Formulario inválido, mostrando errores');
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
