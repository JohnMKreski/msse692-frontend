import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventDto } from './event.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = '/api';

    list(params?: { from?: string; to?: string }): Observable<EventDto[]> {
        return this.http.get<EventDto[]>(`${this.baseUrl}/events`, { params: params as any });
    }
}
