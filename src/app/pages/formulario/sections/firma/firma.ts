import {
  Component,
  EventEmitter,
  OnInit,
  OnDestroy,
  Output,
  ViewChild,
  ElementRef,
  AfterViewInit,
  inject,
  input,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import SignaturePad from 'signature_pad';

import { FormularioDataService, FirmaDTO } from '../../../../services/formulario-data.service';
import { LoggerService } from '../../../../shared/services/logger.service';

@Component({
  selector: 'app-firma',
  standalone: true,
  templateUrl: './firma.html',
  styleUrls: ['./firma.scss'],
  imports: [CommonModule, MatButtonModule, MatIconModule],
})
export class FirmaComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('signatureCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Output() validChange = new EventEmitter<boolean>();
  @Output() dataChange = new EventEmitter<FirmaDTO>();

  requestValidate = input<boolean>(false);

  private dataService = inject(FormularioDataService);
  private logger = inject(LoggerService);

  signaturePad!: SignaturePad;
  isSigned = false;

  constructor() {
    effect(() => {
      if (this.requestValidate()) {
        this.validateForm();
      }
    });
  }

  ngOnInit(): void {
    // Intentar restaurar firma existente
    const existingData = this.dataService.get('firma');
    if (existingData?.base64) {
      this.isSigned = true;
      this.validChange.emit(true);
    }
  }

  ngAfterViewInit(): void {
    this.initSignaturePad();

    // Restaurar firma si existe
    const existingData = this.dataService.get('firma');
    if (existingData?.base64) {
      this.signaturePad.fromDataURL(existingData.base64);
    }
  }

  ngOnDestroy(): void {
    if (this.signaturePad) {
      this.signaturePad.off();
    }
  }

  private initSignaturePad(): void {
    const canvas = this.canvasRef.nativeElement;

    // Ajustar el canvas al contenedor
    this.resizeCanvas();

    this.signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
      minWidth: 1,
      maxWidth: 3,
    });

    // Detectar cuando el usuario empieza a firmar
    this.signaturePad.addEventListener('beginStroke', () => {
      this.isSigned = false;
    });

    // Detectar cuando termina de firmar
    this.signaturePad.addEventListener('endStroke', () => {
      this.onSignatureChange();
    });

    // Ajustar canvas al cambiar el tamaño de ventana
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;

    if (container) {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);

      canvas.width = container.offsetWidth * ratio;
      canvas.height = container.offsetHeight * ratio;
      canvas.style.width = container.offsetWidth + 'px';
      canvas.style.height = container.offsetHeight + 'px';

      const context = canvas.getContext('2d');
      if (context) {
        context.scale(ratio, ratio);
      }

      // Si ya había una firma, redibujarla
      if (this.signaturePad && !this.signaturePad.isEmpty()) {
        const data = this.signaturePad.toData();
        this.signaturePad.fromData(data);
      }
    }
  }

  private onSignatureChange(): void {
    if (this.signaturePad.isEmpty()) {
      this.isSigned = false;
      this.validChange.emit(false);
      return;
    }

    this.isSigned = true;
    this.validChange.emit(true);

    const dto: FirmaDTO = {
      base64: this.signaturePad.toDataURL('image/png'),
      timestamp: Date.now(),
      deviceInfo: navigator.userAgent,
    };

    this.dataChange.emit(dto);
    this.logger.info('Firma', 'Firma capturada exitosamente');
  }

  limpiarFirma(): void {
    this.signaturePad.clear();
    this.isSigned = false;
    this.validChange.emit(false);
    this.logger.info('Firma', 'Firma limpiada');
  }

  validateForm(): void {
    if (!this.isSigned || this.signaturePad.isEmpty()) {
      this.logger.warn('Firma', 'Debe firmar antes de continuar');
    }
  }
}
