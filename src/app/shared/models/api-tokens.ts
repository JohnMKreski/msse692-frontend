import { InjectionToken } from '@angular/core';
import { RuntimeConfigService } from '../runtime-config.service';
import { environment } from '../../../environments/environment';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => {
    // Fallback to environment if runtime config not yet loaded
    return environment.apiBaseUrl;
  }
});

export const API_PATH_PREFIX = new InjectionToken<string>('API_PATH_PREFIX', {
  providedIn: 'root',
  factory: () => environment.apiPathPrefix ?? '/api'
});

export const API_VERSION = new InjectionToken<string>('API_VERSION', {
  providedIn: 'root',
  factory: () => environment.apiVersion ?? '' // now defaults to 'v1' (environment configured); empty means no version segment
});

export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => buildApiUrl(environment.apiBaseUrl, environment.apiPathPrefix, environment.apiVersion)
});

export const USE_NEW_ADMIN_USERS_API = new InjectionToken<boolean>('USE_NEW_ADMIN_USERS_API', {
  providedIn: 'root',
  factory: () => false // default off unless runtime config overrides
});

export function buildApiUrl(base: string, prefix?: string, version?: string): string {
  const trim = (s?: string) => (s ?? '').replace(/\/+$/g, '');
  const lead = (s?: string) => (s ?? '').replace(/^([^/])/, '/$1');
  const baseClean = trim(base);
  const prefixClean = (prefix ?? '').replace(/\/+$/g, '');
  const versionClean = (version ?? '').replace(/^\/+|\/+$/g, '');
  // Compose prefix + version (if provided). Version now expected as 'v1'.
  const pv = versionClean ? `${prefixClean || ''}/${versionClean}` : (prefixClean || '');
  return pv ? `${baseClean}${lead(pv)}` : baseClean;
}

export function apiProvidersFromRuntime(cfg: RuntimeConfigService) {
  const base = cfg.get('apiBaseUrl') ?? environment.apiBaseUrl;
  const prefix = cfg.get('apiPathPrefix') ?? environment.apiPathPrefix;
  const version = cfg.get('apiVersion') ?? environment.apiVersion;
  return [
    { provide: API_BASE_URL, useValue: base },
    { provide: API_PATH_PREFIX, useValue: prefix },
    { provide: API_VERSION, useValue: version },
    { provide: API_URL, useValue: buildApiUrl(base, prefix, version) },
    { provide: USE_NEW_ADMIN_USERS_API, useValue: !!cfg.get('useNewAdminUsersApi') },
  ];
}
