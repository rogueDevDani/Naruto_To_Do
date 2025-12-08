import { bootstrapApplication } from '@angular/platform-browser';
import { TodoComponent } from './app/todo/todo.component';
import { appConfig } from './app/app.config';

bootstrapApplication(TodoComponent, appConfig)
  .catch(err => console.error(err));
