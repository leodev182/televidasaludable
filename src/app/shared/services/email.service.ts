import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { LoggerService } from './logger.service';
import { HttpErrorHandlerService } from './http-error-handler.service';

export interface EmailRequest {
  clinicaPdf: string;
  pacientePdf: string;
  datosPersonales: {
    nombres: string;
    apellidos: string;
    email: string;
    run: string;
  };
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private errorHandler = inject(HttpErrorHandlerService);

  private readonly API_URL = 'https://www.almanovaclinic.com/api/send-form';

  /**
   * Envía el formulario completo por email
   */
  sendForm(request: EmailRequest): Observable<EmailResponse> {
    this.logger.info('Enviando formulario a Resend', 'EmailService', {
      email: request.datosPersonales.email,
      pdfSizes: {
        clinica: (request.clinicaPdf.length / 1024).toFixed(2) + ' KB',
        paciente: (request.pacientePdf.length / 1024).toFixed(2) + ' KB',
      },
    });

    return this.http.post<EmailResponse>(this.API_URL, request).pipe(
      tap((response) => {
        if (response.success) {
          this.logger.success('Email enviado exitosamente', 'EmailService', {
            messageId: response.messageId,
          });
        } else {
          this.logger.warn('Email enviado pero con advertencias', 'EmailService', response);
        }
      }),
      catchError((error) => this.errorHandler.handleError(error, 'EmailService'))
    );
  }
}
