import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  // 🎯 Configuración por ambiente
  private currentLevel: LogLevel = environment.production ? LogLevel.WARN : LogLevel.DEBUG;

  // Colores para consola
  private readonly colors = {
    debug: '#9E9E9E',
    info: '#2196F3',
    warn: '#FF9800',
    error: '#F44336',
    success: '#4CAF50',
  };

  // Emojis para mejor visualización
  private readonly emojis = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    success: '✅',
    save: '💾',
    restore: '📦',
    send: '🚀',
    time: '⏱️',
  };

  /**
   * Log de debug (solo desarrollo)
   */
  debug(context: string, message: string, data?: any): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      this.log('debug', context, message, data);
    }
  }

  /**
   * Log informativo
   */
  info(context: string, message: string, data?: any): void {
    if (this.currentLevel <= LogLevel.INFO) {
      this.log('info', context, message, data);
    }
  }

  /**
   * Advertencias
   */
  warn(context: string, message: string, data?: any): void {
    if (this.currentLevel <= LogLevel.WARN) {
      this.log('warn', context, message, data);
    }
  }

  /**
   * Errores
   */
  error(context: string, message: string, error?: any): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      this.log('error', context, message, error);

      // En producción, aquí conectarías con Sentry/LogRocket
      if (environment.production) {
        // this.sendToErrorTracking(context, message, error);
      }
    }
  }

  /**
   * Log de éxito (verde)
   */
  success(context: string, message: string, data?: any): void {
    if (this.currentLevel <= LogLevel.INFO) {
      this.logSuccess(context, message, data);
    }
  }

  /**
   * Grupo de logs relacionados
   */
  group(title: string, callback: () => void): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.group(`📂 ${title}`);
      callback();
      console.groupEnd();
    }
  }

  /**
   * Medir tiempo de ejecución
   */
  time(label: string): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.time(`${this.emojis.time} ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.timeEnd(`${this.emojis.time} ${label}`);
    }
  }

  /**
   * Log con tabla (útil para arrays de objetos)
   */
  table(context: string, data: any[]): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.log(`%c[${context}]`, `color: ${this.colors.debug}`, 'Tabla de datos:');
      console.table(data);
    }
  }

  // ========================================
  // MÉTODOS PRIVADOS
  // ========================================

  private log(level: keyof typeof this.colors, context: string, message: string, data?: any): void {
    const timestamp = new Date().toLocaleTimeString('es-CL', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });

    const emoji = this.emojis[level as keyof typeof this.emojis] || '';
    const color = this.colors[level];
    const badge = level.toUpperCase().padEnd(5);

    const style = `
      color: ${color}; 
      font-weight: bold; 
      background: ${color}22; 
      padding: 2px 6px; 
      border-radius: 3px;
    `;

    console.log(
      `%c${badge}%c ${emoji} [${context}] ${timestamp}`,
      style,
      'color: inherit',
      message,
      data !== undefined ? data : ''
    );
  }

  private logSuccess(context: string, message: string, data?: any): void {
    const timestamp = new Date().toLocaleTimeString('es-CL', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });

    const style = `
      color: ${this.colors.success}; 
      font-weight: bold; 
      background: ${this.colors.success}22; 
      padding: 2px 6px; 
      border-radius: 3px;
    `;

    console.log(
      `%c✓ OK %c ${this.emojis.success} [${context}] ${timestamp}`,
      style,
      'color: inherit',
      message,
      data !== undefined ? data : ''
    );
  }

  /**
   * Cambiar nivel de log en runtime
   */
  setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
    this.info('Logger', `Nivel de log cambiado a: ${LogLevel[level]}`);
  }

  /**
   * Deshabilitar todos los logs
   */
  disableAll(): void {
    this.currentLevel = LogLevel.NONE;
  }
}
