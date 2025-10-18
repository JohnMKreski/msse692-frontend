import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateEventRequest, EventDto, UpdateEventRequest } from './event.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = '/api';

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
}
