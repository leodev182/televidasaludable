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
import { MatOptionModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';

import {
  FormularioDataService,
  InformacionEmpleadorDTO,
} from '../../../../services/formulario-data.service';
import { LoggerService } from '../../../../services/logger.service';

@Component({
  selector: 'app-informacion-empleador',
  standalone: true,
  templateUrl: './informacion-empleador.html',
  styleUrls: ['./informacion-empleador.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter()],
})
export class InformacionEmpleadorComponent implements OnInit, OnDestroy {
  @Output() validChange = new EventEmitter<boolean>();
  @Output() dataChange = new EventEmitter<InformacionEmpleadorDTO>();

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
    const existingData = this.dataService.get('informacionEmpleador');

    this.form = this.fb.group({
      empresaNombre: [existingData?.empresaNombre || '', Validators.required],
      empresaRut: [existingData?.empresaRut || '', Validators.required],
      cargo: [existingData?.cargo || '', Validators.required],
      fechaIngreso: [existingData?.fechaIngreso || '', Validators.required],
      tipoContrato: [existingData?.tipoContrato || '', Validators.required],
      telefonoEmpresa: [existingData?.telefonoEmpresa || '', Validators.required],
      direccionEmpresa: [existingData?.direccionEmpresa || '', Validators.required],
      nombreSupervisor: [existingData?.nombreSupervisor || ''],
      telefonoSupervisor: [existingData?.telefonoSupervisor || ''],
    });

    this.validChange.emit(this.form.valid);

    this.subs.push(
      this.form.statusChanges.subscribe(() => {
        this.validChange.emit(this.form.valid);
      })
    );

    this.subs.push(
      this.form.valueChanges.pipe(debounceTime(500)).subscribe(() => {
        const dto: InformacionEmpleadorDTO = this.form.value;
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
      this.logger.warn('InformacionEmpleador', 'Formulario inválido, mostrando errores');
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
