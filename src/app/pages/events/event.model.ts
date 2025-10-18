export interface EventDto {
    id: string;
    title: string;
    start: string; // ISO date-time
    end?: string; // ISO date-time
    allDay?: boolean;
    location?: string;
}

// Backend POST/PUT request schema
export interface CreateEventRequest {
    eventName: string;
    type: string; // e.g., "Concert"
    startAt: string; // ISO date-time
    endAt: string; // ISO date-time
    eventLocation?: string;
    eventDescription?: string;
}

export type UpdateEventRequest = Partial<CreateEventRequest>;
