import { ApplicationConfig, provideZoneChangeDetection, inject, provideAppInitializer, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { environment } from '../environments/environment';
import { RuntimeConfigService } from './shared/runtime-config.service';
import { API_BASE_URL, API_PATH_PREFIX, API_VERSION, API_URL, buildApiUrl } from './shared/models/api-tokens';
import { firebaseAuthInterceptor } from './interceptors/firebase-auth.interceptor';
import { httpErrorInterceptor } from './interceptors/http-error.interceptor';
import { MatSnackBarModule } from '@angular/material/snack-bar';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(
            withFetch(),
            withInterceptors([firebaseAuthInterceptor, httpErrorInterceptor])
        ),
        // Provide global MatSnackBar for NotificationService
        importProvidersFrom(MatSnackBarModule),
    // Simplify hydration to avoid NG0506 (stability timeout) during refresh
    provideClientHydration(),
        provideFirebaseApp(() => initializeApp(environment.firebase)),
        provideAuth(() => getAuth()),
        // Load runtime config before app bootstrap using modern provideAppInitializer API
        provideAppInitializer(() => inject(RuntimeConfigService).load()),
        // Provide API tokens driven by runtime config with environment fallbacks
        { provide: API_BASE_URL, deps: [RuntimeConfigService], useFactory: (svc: RuntimeConfigService) => svc.get('apiBaseUrl') ?? environment.apiBaseUrl },
        { provide: API_PATH_PREFIX, deps: [RuntimeConfigService], useFactory: (svc: RuntimeConfigService) => svc.get('apiPathPrefix') ?? environment.apiPathPrefix },
        { provide: API_VERSION, deps: [RuntimeConfigService], useFactory: (svc: RuntimeConfigService) => svc.get('apiVersion') ?? environment.apiVersion },
        { provide: API_URL, deps: [RuntimeConfigService], useFactory: (svc: RuntimeConfigService) => buildApiUrl(
            svc.get('apiBaseUrl') ?? environment.apiBaseUrl,
            svc.get('apiPathPrefix') ?? environment.apiPathPrefix,
            svc.get('apiVersion') ?? environment.apiVersion,
        )},
    ],
};
