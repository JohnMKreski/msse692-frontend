export interface EventDto {
    id: string;
    title: string;
    start: string; // ISO date-time
    end?: string; // ISO date-time
    allDay?: boolean;
    location?: string;
}
