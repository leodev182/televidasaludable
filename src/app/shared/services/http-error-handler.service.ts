import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { LoggerService } from './logger.service';

export interface AppError {
  message: string;
  statusCode?: number;
  originalError?: any;
}

@Injectable({
  providedIn: 'root',
})
export class HttpErrorHandlerService {
  private logger = inject(LoggerService);

  /**
   * Maneja errores HTTP y los convierte en errores de aplicación
   */
  handleError(error: HttpErrorResponse, context: string = 'HTTP'): Observable<never> {
    const appError: AppError = {
      message: 'Error desconocido',
      statusCode: error.status,
      originalError: error,
    };

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente (red, timeout, etc.)
      appError.message = `Error de red: ${error.error.message}`;

      this.logger.error('Error de red', context, {
        message: error.error.message,
        type: 'ClientError',
      });
    } else {
      // Error del lado del servidor (4xx, 5xx)
      appError.message = this.getServerErrorMessage(error);

      this.logger.error('Error del servidor', context, {
        status: error.status,
        statusText: error.statusText,
        message: appError.message,
        body: error.error,
      });
    }

    return throwError(() => appError);
  }

  /**
   * Genera mensaje de error amigable según el status code
   */
  private getServerErrorMessage(error: HttpErrorResponse): string {
    const statusMessages: Record<number, string> = {
      400: 'Datos inválidos en la solicitud',
      401: 'No autorizado - verifica tus credenciales',
      403: 'Acceso prohibido',
      404: 'Recurso no encontrado',
      408: 'Tiempo de espera agotado',
      429: 'Demasiadas solicitudes - intenta más tarde',
      500: 'Error interno del servidor',
      502: 'Servidor no disponible temporalmente',
      503: 'Servicio no disponible',
      504: 'Tiempo de espera del servidor agotado',
    };

    const customMessage = statusMessages[error.status];
    const serverMessage = error.error?.message || error.error?.error;

    if (customMessage && serverMessage) {
      return `${customMessage}: ${serverMessage}`;
    }

    if (customMessage) {
      return customMessage;
    }

    if (serverMessage) {
      return `Error del servidor (${error.status}): ${serverMessage}`;
    }

    return `Error del servidor (${error.status}): ${error.statusText}`;
  }

  /**
   * Verifica si un error es de red (sin conexión)
   */
  isNetworkError(error: any): boolean {
    return error instanceof HttpErrorResponse && error.status === 0;
  }

  /**
   * Verifica si un error es recuperable (puede reintentarse)
   */
  isRetryableError(error: any): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;

    // Errores 5xx y timeouts son recuperables
    return error.status >= 500 || error.status === 408 || error.status === 0;
  }
}
