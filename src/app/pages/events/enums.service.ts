// Service to retrieve enum options from the backend. Results are memoized.
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, shareReplay } from 'rxjs';

export interface EnumOption {
  value: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class EnumsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/enums';

  private _eventTypes$?: Observable<EnumOption[]>;

  getEventTypes(): Observable<EnumOption[]> {
    if (!this._eventTypes$) {
      this._eventTypes$ = this.http
        .get<EnumOption[]>(`${this.baseUrl}/event-types`)
        .pipe(
          map((opts) => opts ?? []),
          catchError(() => of([])),
          shareReplay({ bufferSize: 1, refCount: false })
        );
    }
    return this._eventTypes$;
  }
}
