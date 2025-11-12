import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';

export interface RuntimeConfig {
  apiBaseUrl?: string;
  apiPathPrefix?: string; // e.g., "/api"
  apiVersion?: string;    // e.g., "v1" or empty for none
}

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private config: RuntimeConfig | null = null;

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    try {
        const cfg = await firstValueFrom(this.http
            .get<RuntimeConfig>('/config.json', { withCredentials: false })
            .pipe(timeout(3000), 
            catchError(() => of({}))) // swallow timeout or 404 into empty config
        );
        this.config = cfg ?? {};
    } catch {
      // If missing, proceed with defaults from environment
      this.config = {};
    }
  }

  get<T extends keyof RuntimeConfig>(key: T): RuntimeConfig[T] | undefined {
    return this.config?.[key];
  }
}
