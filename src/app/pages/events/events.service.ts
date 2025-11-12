import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../shared/api-tokens';
import { Observable, Subject } from 'rxjs';
import { CreateEventRequest, EventDto, UpdateEventRequest, EventAudit } from './event.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = inject(API_URL);
    private readonly baseUrl = `${this.apiUrl}`;
    // UI event bus (merged from EventsUiService)
    private readonly _changed = new Subject<void>();
    readonly changed$ = this._changed.asObservable();

    notifyChanged() { this._changed.next(); }

    list(params?: { page?: number; size?: number; sort?: string }): Observable<EventDto[]> {
        return this.http.get<EventDto[]>(`${this.baseUrl}/events`, { params: params as any });
    }

    listPublicUpcoming(from?: Date, limit: number = 10): Observable<EventDto[]> {
        const clamped = Math.min(Math.max(limit, 1), 100);
        const params: any = { limit: clamped };
        if (from) params.from = from.toISOString();
        return this.http.get<EventDto[]>(`${this.baseUrl}/events/public-upcoming`, { params });
    }

    get(id: number | string): Observable<EventDto> {
        return this.http.get<EventDto>(`${this.baseUrl}/events/${encodeURIComponent(String(id))}`);
    }

    createRaw(payload: CreateEventRequest): Observable<EventDto> {
        return this.http.post<EventDto>(`${this.baseUrl}/events`, payload);
    }

    updateRaw(id: number | string, payload: UpdateEventRequest): Observable<EventDto> {
        return this.http.put<EventDto>(`${this.baseUrl}/events/${encodeURIComponent(String(id))}`, payload);
    }

    delete(id: number | string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/events/${encodeURIComponent(String(id))}`);
    }

    // Read-only: fetch recent audit entries for an event
    getAudits(eventId: number | string, limit: number = 10): Observable<EventAudit[]> {
        return this.http.get<EventAudit[]>(`${this.baseUrl}/events/${encodeURIComponent(String(eventId))}/audits`, { params: { limit } });
    }

    // ===== Status transitions =====
    publishEvent(id: number | string): Observable<EventDto> {
        return this.http.post<EventDto>(`${this.baseUrl}/events/${encodeURIComponent(String(id))}/publish`, {});
    }
    unpublishEvent(id: number | string): Observable<EventDto> {
        return this.http.post<EventDto>(`${this.baseUrl}/events/${encodeURIComponent(String(id))}/unpublish`, {});
    }
    cancelEvent(id: number | string): Observable<EventDto> {
        return this.http.post<EventDto>(`${this.baseUrl}/events/${encodeURIComponent(String(id))}/cancel`, {});
    }
}
