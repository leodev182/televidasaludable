import { Injectable, signal, effect, inject } from '@angular/core';
import { LoggerService } from './logger.service';

// ========================================
// INTERFACES (las mismas que antes)
// ========================================
export interface DatosPersonalesDTO {
  nombres: string;
  apellidos: string;
  run: string;
  genero: string;
  fechaNacimiento: Date;
  telefono: string;
  email: string;
  nacionalidad: string;
  direccion: string;
  region: string;
  ciudad: string;
  comuna: string;
  prevision: string;
}

export interface InformacionEmpleadorDTO {
  empresaNombre?: string;
  cargo?: string;
}

export interface InformacionMedicaDTO {
  alergias?: string;
  medicamentos?: string;
}

export interface DeclaracionJuradaDTO {
  consentimiento: boolean;
  version: string;
  timestamp: number;
}

export interface FirmaDTO {
  base64: string;
  timestamp: number;
}

export interface FormularioCompleto {
  datosPersonales?: DatosPersonalesDTO;
  informacionEmpleador?: InformacionEmpleadorDTO;
  informacionMedica?: InformacionMedicaDTO;
  declaracionJurada?: DeclaracionJuradaDTO;
  firma?: FirmaDTO;
  metadata?: {
    inicioTimestamp: number;
    finTimestamp?: number;
    bienvenidaCompletada?: boolean;
  };
}

// ========================================
// SERVICE MEJORADO
// ========================================
@Injectable({
  providedIn: 'root',
})
export class FormularioDataService {
  private readonly STORAGE_KEY = 'formulario_draft_v1';
  private readonly AUTO_SAVE_DELAY = 3000; // ← CAMBIADO A 3 SEGUNDOS PARA TESTING
  private logger = inject(LoggerService);

  private data = signal<FormularioCompleto>({
    metadata: {
      inicioTimestamp: Date.now(),
    },
  });

  private autoSaveTimeout?: number;

  constructor() {
    this.logger.info('DataService', 'Servicio inicializado');

    // Effect que escucha cambios en data
    effect(() => {
      const currentData = this.data();
      const keys = Object.keys(currentData);

      this.logger.debug('DataService', 'Effect ejecutado', { keys });

      // Auto-guardar si hay más datos que solo metadata
      if (keys.length > 1 || (keys.length === 1 && !keys.includes('metadata'))) {
        this.logger.debug('DataService', 'Programando auto-save en 3 segundos...');
        this.scheduleAutoSave();
      }
    });
  }

  private scheduleAutoSave(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.logger.debug('DataService', 'Auto-save anterior cancelado');
    }

    this.autoSaveTimeout = window.setTimeout(() => {
      this.autoSave();
    }, this.AUTO_SAVE_DELAY);

    this.logger.debug('DataService', `Auto-save programado para ${this.AUTO_SAVE_DELAY}ms`);
  }

  private autoSave(): void {
    this.logger.time('auto-save');
    try {
      const snapshot = this.snapshot();
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(snapshot));
      this.logger.info('DataService', 'Auto-guardado exitoso', snapshot);
    } catch (error) {
      this.logger.error('DataService', 'Error al auto-guardar', error);
    } finally {
      this.logger.timeEnd('auto-save');
    }
  }

  // ========================================
  // MÉTODOS PÚBLICOS
  // ========================================

  set<K extends keyof FormularioCompleto>(key: K, value: FormularioCompleto[K]): void {
    this.logger.debug('DataService', `set("${String(key)}")`, value);

    this.data.update((current) => ({
      ...current,
      [key]: value,
    }));
  }

  get<K extends keyof FormularioCompleto>(key: K): FormularioCompleto[K] | undefined {
    const value = this.data()[key];
    this.logger.debug('DataService', `get("${String(key)}")`, value);
    return value;
  }

  snapshot(): Readonly<FormularioCompleto> {
    return { ...this.data() };
  }

  dataSignal() {
    return this.data.asReadonly();
  }

  restoreDraft(): FormularioCompleto | null {
    this.logger.info('DataService', 'Buscando draft en sessionStorage...');
    try {
      const draft = sessionStorage.getItem(this.STORAGE_KEY);

      if (draft) {
        const parsed = JSON.parse(draft);
        this.data.set(parsed);
        this.logger.success('DataService', 'Draft restaurado', parsed);
        return parsed;
      } else {
        this.logger.info('DataService', 'No hay draft guardado');
      }
    } catch (error) {
      this.logger.error('DataService', 'Error al restaurar draft', error);
    }
    return null;
  }

  hasDraft(): boolean {
    const exists = !!sessionStorage.getItem(this.STORAGE_KEY);
    this.logger.debug('DataService', `¿Existe draft? ${exists}`);
    return exists;
  }

  clearDraft(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.logger.info('DataService', 'Draft eliminado');
  }

  reset(): void {
    this.data.set({
      metadata: {
        inicioTimestamp: Date.now(),
      },
    });
    this.clearDraft();
    this.logger.info('DataService', 'Service reseteado');
  }

  isComplete(): boolean {
    const current = this.snapshot();
    return !!(
      current.datosPersonales &&
      current.informacionEmpleador &&
      current.informacionMedica &&
      current.declaracionJurada &&
      current.firma
    );
  }

  getLastCompletedStep(): number {
    const current = this.snapshot();

    if (current.firma) return 5;
    if (current.declaracionJurada) return 4;
    if (current.informacionMedica) return 3;
    if (current.informacionEmpleador) return 2;
    if (current.datosPersonales) return 1;

    return 0;
  }
}
