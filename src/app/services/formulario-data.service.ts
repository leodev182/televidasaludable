import { Injectable } from '@angular/core';

interface DatosFormulario {
  personales?: any;
  empleador?: any;
  medica?: any;
  jurada?: any;
  firma?: string; // base64 image URL
}

@Injectable({ providedIn: 'root' })
export class FormularioDataService {
  private datos: DatosFormulario = {};

  setDatosPersonales(data: any) {
    this.datos.personales = data;
  }

  setInformacionEmpleador(data: any) {
    this.datos.empleador = data;
  }

  setInformacionMedica(data: any) {
    this.datos.medica = data;
  }

  setDeclaracionJurada(data: any) {
    this.datos.jurada = data;
  }

  setFirma(base64Image: string) {
    this.datos.firma = base64Image;
  }

  getDatosCompletos(): DatosFormulario {
    return this.datos;
  }

  resetFormulario(): void {
    this.datos = {};
  }

  getDatosPersonales(): any {
    return this.datos.personales || {};
  }
}
