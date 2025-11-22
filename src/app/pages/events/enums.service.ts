// Service to retrieve enum options from the backend. Results are memoized.
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../shared/models/api-tokens';
import { Observable, of, map, catchError, shareReplay } from 'rxjs';
import { EventStatusOption } from './event.model';

export interface EnumOption {
  value: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class EnumsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly baseUrl = `${this.apiUrl}/enums`;

  private _eventTypes$?: Observable<EnumOption[]>;
  private _eventStatuses$?: Observable<EventStatusOption[]>;

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

  getEventStatuses(): Observable<EventStatusOption[]> {
    if (!this._eventStatuses$) {
      this._eventStatuses$ = this.http
        .get<EventStatusOption[]>(`${this.baseUrl}/event-statuses`)
        .pipe(
          map((opts) => opts ?? []),
          catchError(() => of([])),
          shareReplay({ bufferSize: 1, refCount: false })
        );
    }
    return this._eventStatuses$;
  }
}
