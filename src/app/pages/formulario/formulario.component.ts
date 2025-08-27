import { Component } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Bienvenida } from './sections/bienvenida/bienvenida';
import { DatosPersonales } from './sections/datos-personales/datos-personales';
import { InformacionEmpleador } from './sections/informacion-empleador/informacion-empleador';
import { InformacionMedica } from './sections/informacion-medica/informacion-medica';
import { DeclaracionJurada } from './sections/declaracion-jurada/declaracion-jurada';
import { Firma } from './sections/firma/firma';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    Bienvenida,
    DatosPersonales,
    InformacionEmpleador,
    InformacionMedica,
    DeclaracionJurada,
    Firma,
  ],
  templateUrl: './formulario.component.html',
  styleUrls: ['./formulario.component.scss'],
})
export class FormularioComponent {
  pasoActual = 0;

  pasos = [
    'Bienvenida',
    'Datos Personales',
    'Información del Empleador',
    'Información Médica',
    'Declaración Jurada',
    'Firma',
  ];

  avanzarPaso() {
    if (this.pasoActual < this.pasos.length - 1) {
      this.pasoActual++;
    }
  }

  retrocederPaso() {
    if (this.pasoActual > 0) {
      this.pasoActual--;
    }
  }
}
