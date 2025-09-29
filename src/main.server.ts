import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

import type { BootstrapContext } from '@angular/platform-browser';

export default (context: unknown) =>
  bootstrapApplication(AppComponent, config, context as BootstrapContext);
