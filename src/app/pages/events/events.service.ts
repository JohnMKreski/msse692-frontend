import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../shared/api-tokens';
import { Observable, Subject } from 'rxjs';
import { CreateEventRequest, EventDto, UpdateEventRequest, EventAudit, EventPageResponse } from './event.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = inject(API_URL);
    private readonly baseUrl = `${this.apiUrl}`;
    // UI event bus (merged from EventsUiService)
    private readonly _changed = new Subject<void>();
    readonly changed$ = this._changed.asObservable();

    notifyChanged() { this._changed.next(); }

    list(params?: { page?: number; size?: number; sort?: string; eventType?: string }): Observable<EventPageResponse> {
        // Backend enforces size 1..100 (@Min/@Max); clamp here to avoid 400s on oversized requests.
        const sizeRaw = params?.size ?? 50;
        const size = Math.min(Math.max(sizeRaw, 1), 100);
        const safeParams: any = {
            page: params?.page ?? 0,
            size,
            sort: this.normalizeSort(params?.sort),
        };
        if (params?.eventType) safeParams.eventType = params.eventType;
        return this.http.get<EventPageResponse>(`${this.baseUrl}/events`, { params: safeParams });
    }

    // Enforce backend-allowed sort fields and produce a stable format
    private normalizeSort(input?: string | null): string {
        const DEFAULT = 'startAt,asc';
        const allowed = new Set(['startAt', 'eventName', 'eventType']);
        if (!input || !input.trim()) return DEFAULT;
        const s = input.trim();
        // Accept forms: "-field", "field,desc", "field,asc", or plain "field"
        let field = s;
        let dir: 'asc' | 'desc' | '' = '';
        if (s.startsWith('-')) {
            field = s.substring(1);
            dir = 'desc';
        } else if (/,\s*asc$/i.test(s)) {
            field = s.replace(/,\s*asc$/i, '');
            dir = 'asc';
        } else if (/,\s*desc$/i.test(s)) {
            field = s.replace(/,\s*desc$/i, '');
            dir = 'desc';
        }
        field = field.trim();
        if (!allowed.has(field)) return DEFAULT;
        // Default direction to asc when unspecified
        return `${field},${dir || 'asc'}`;
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
