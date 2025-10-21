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

  // Para almacenar la versión original (para redibujar al redimensionar)
  private originalSignatureData: any = null;

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
      this.originalSignatureData = this.signaturePad.toData();
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
      // REDUCIR el ratio para disminuir tamaño de archivo
      // En lugar de usar devicePixelRatio completo, se usa máximo 2
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = container.offsetWidth * ratio;
      canvas.height = container.offsetHeight * ratio;
      canvas.style.width = container.offsetWidth + 'px';
      canvas.style.height = container.offsetHeight + 'px';

      const context = canvas.getContext('2d');
      if (context) {
        context.scale(ratio, ratio);
      }

      // Si ya había una firma, redibujarla usando los datos originales
      if (this.signaturePad && this.originalSignatureData) {
        this.signaturePad.fromData(this.originalSignatureData);
      }
    }
  }

  private onSignatureChange(): void {
    if (this.signaturePad.isEmpty()) {
      this.isSigned = false;
      this.validChange.emit(false);
      this.originalSignatureData = null;
      return;
    }

    // Guardar datos originales para poder redibujar al redimensionar
    this.originalSignatureData = this.signaturePad.toData();

    this.isSigned = true;
    this.validChange.emit(true);

    // COMPRIMIR LA IMAGEN SIGNIFICATIVAMENTE
    // Uso de JPEG con calidad 0.7 en lugar de PNG
    const compressedBase64 = this.compressSignature();

    const dto: FirmaDTO = {
      base64: compressedBase64,
      timestamp: Date.now(),
      deviceInfo: navigator.userAgent,
    };

    this.dataChange.emit(dto);

    // Log del tamaño para debugging
    const sizeKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
    this.logger.info('Firma', `Firma capturada exitosamente (${sizeKB} KB)`);
  }

  /**
   * Comprime la firma creando una versión más pequeña
   * Reduce dimensiones y convierte a JPEG con calidad controlada
   *
   * Dimensiones objetivo basadas en firma.scss:
   * - Canvas real: ~800px x 300px (desktop) o ~mobile x 250px
   * - Con devicePixelRatio 3: hasta 2400px x 900px
   * - Comprimido: máximo 600px x 250px (suficiente para PDF)
   */
  private compressSignature(): string {
    const canvas = this.canvasRef.nativeElement;

    // Crear canvas temporal más pequeño
    const tempCanvas = document.createElement('canvas');

    // Dimensiones optimizadas para firma (más que suficiente para PDF)
    const maxWidth = 600; // 600px de ancho es suficiente
    const maxHeight = 250; // 250px de alto mantiene calidad

    // Calcular dimensiones manteniendo aspecto
    let width = canvas.width;
    let height = canvas.height;

    const aspectRatio = width / height;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    tempCanvas.width = Math.round(width);
    tempCanvas.height = Math.round(height);

    const ctx = tempCanvas.getContext('2d', {
      alpha: false, // Mejora compresión JPEG
    });

    if (!ctx) {
      // Fallback: calidad más baja directamente
      this.logger.warn('Firma', 'No se pudo crear contexto temporal, usando fallback');
      return this.signaturePad.toDataURL('image/jpeg', 0.6);
    }

    // Fondo blanco (importante para JPEG)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Suavizado para mejor calidad al escalar
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Dibujar firma escalada
    ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

    // JPEG con calidad 0.8 (80%) - buen balance calidad/tamaño
    return tempCanvas.toDataURL('image/jpeg', 0.8);
  }

  limpiarFirma(): void {
    this.signaturePad.clear();
    this.isSigned = false;
    this.originalSignatureData = null;
    this.validChange.emit(false);
    this.logger.info('Firma', 'Firma limpiada');
  }

  validateForm(): void {
    if (!this.isSigned || this.signaturePad.isEmpty()) {
      this.logger.warn('Firma', 'Debe firmar antes de continuar');
    }
  }
}
