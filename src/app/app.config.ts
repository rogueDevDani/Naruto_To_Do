import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TodoComponent } from './todo/todo.component';

export const API_URL = 'https://naruto-backend.onrender.com';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter([{ path: '', component: TodoComponent }]),
    provideHttpClient(),
    importProvidersFrom(FormsModule, CommonModule)
  ]
};
