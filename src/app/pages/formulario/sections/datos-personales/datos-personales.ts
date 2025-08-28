import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormularioDataService } from '../../../../services/formulario-data.service.js';

@Component({
  selector: 'app-datos-personales',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './datos-personales.html',
  styleUrls: ['./datos-personales.scss'],
})
export class DatosPersonales implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dataService = inject(FormularioDataService);

  personalForm!: FormGroup;

  ngOnInit() {
    const datos = this.dataService.getDatosPersonales();

    this.personalForm = this.fb.group({
      nombres: [datos?.nombres || '', Validators.required],
      apellidos: [datos?.apellidos || '', Validators.required],
      rut: [datos?.rut || '', Validators.required],
      genero: [datos?.genero || '', Validators.required],
      fechaNacimiento: [datos?.fechaNacimiento || '', Validators.required],
      telefono: [datos?.telefono || '', Validators.required],
      email: [datos?.email || '', [Validators.required, Validators.email]],
      nacionalidad: [datos?.nacionalidad || '', Validators.required],
      direccion: [datos?.direccion || '', Validators.required],
      region: [datos?.region || '', Validators.required],
      provincia: [datos?.provincia || '', Validators.required],
      comuna: [datos?.comuna || '', Validators.required],
      prevision: [datos?.prevision || '', Validators.required],
    });

    // Cada vez que el formulario cambie, se guardan los datos en el servicio
    this.personalForm.valueChanges.subscribe((formValues) => {
      this.dataService.setDatosPersonales(formValues);
    });
  }
}
