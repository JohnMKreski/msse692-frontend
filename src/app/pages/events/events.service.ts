import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../shared/api-tokens';
import { Observable } from 'rxjs';
import { CreateEventRequest, EventDto, UpdateEventRequest, EventAudit } from './event.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = inject(API_URL);
    private readonly baseUrl = `${this.apiUrl}`;

    list(params?: { from?: string; to?: string }): Observable<EventDto[]> {
        return this.http.get<EventDto[]>(`${this.baseUrl}/events`, { params: params as any });
    }

    get(id: string): Observable<EventDto> {
        return this.http.get<EventDto>(`${this.baseUrl}/events/${encodeURIComponent(id)}`);
    }

    create(event: Omit<EventDto, 'id'>): Observable<EventDto> {
        return this.http.post<EventDto>(`${this.baseUrl}/events`, event);
    }

    // Methods aligned to backend request schema
    createRaw(payload: CreateEventRequest): Observable<EventDto> {
        return this.http.post<EventDto>(`${this.baseUrl}/events`, payload);
    }

    update(id: string, event: Partial<Omit<EventDto, 'id'>>): Observable<EventDto> {
        return this.http.put<EventDto>(`${this.baseUrl}/events/${encodeURIComponent(id)}`, event);
    }

    updateRaw(id: string, payload: UpdateEventRequest): Observable<EventDto> {
        return this.http.put<EventDto>(`${this.baseUrl}/events/${encodeURIComponent(id)}`, payload);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/events/${encodeURIComponent(id)}`);
    }

    // Read-only: fetch recent audit entries for an event
    getAudits(eventId: string, limit: number = 10): Observable<EventAudit[]> {
        return this.http.get<EventAudit[]>(`${this.baseUrl}/events/${encodeURIComponent(eventId)}/audits`, { params: { limit } });
    }
}
