import { bootstrapApplication } from '@angular/platform-browser';
import { FormularioComponent } from './app/pages/formulario/formulario.component';
import { appConfig } from './app/app.config';

bootstrapApplication(FormularioComponent, appConfig).catch((err) => console.error(err));
