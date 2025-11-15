export type EventStatusCode = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'CANCELLED';

export interface EventDto {
    eventId: number; // align with backend eventId
    slug?: string;
    eventName: string;
    type?: string; // backend enum value
    typeDisplayName?: string;
    startAt: string; // ISO date-time
    endAt?: string; // ISO date-time
    status?: EventStatusCode;
    statusDisplayName?: string;
    eventLocation?: string;
    eventDescription?: string;
    createdByUserId?: number;
    lastModifiedByUserId?: number;
}

// Backend POST/PUT request schema
export interface CreateEventRequest {
    eventName: string;
    type?: string; // enum code
    startAt: string; // ISO date-time
    endAt: string; // ISO date-time
    eventLocation?: string;
    eventDescription?: string;
}

export type UpdateEventRequest = Partial<CreateEventRequest>;

// Read-only audit entry as returned by backend GET /api/v1/events/{id}/audits
export interface EventAudit {
    id: number;
    eventId: number;
    actorUserId: number;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
    at: string; // ISO date-time
}

export interface EventStatusOption {
    value: EventStatusCode;
    label: string;
}

// Typed sort options aligned with backend whitelist
export type EventSortField = 'startAt' | 'eventName';
export type SortDir = 'asc' | 'desc';

// Pagination metadata returned by backend for page-wrapped lists
export interface PageMetadata {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

// Page-wrapped events list
export interface EventPageResponse {
    items: EventDto[];
    page: PageMetadata;
}
