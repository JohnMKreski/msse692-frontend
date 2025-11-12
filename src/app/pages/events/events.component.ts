import { ChangeDetectionStrategy, Component, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, NgForOf, NgIf, DatePipe } from '@angular/common';
import { EventsService } from './events.service';
import { EventDto } from './event.model';
import { take, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { RouterLink } from '@angular/router';
import { EventsUiService } from '../../shared/events-ui.service';

// FullCalendar Angular wrapper
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

// Note: some versions of @fullcalendar/angular auto-wire plugins from options.plugins.
// Passing plugins through calendarOptions directly to avoid relying on static registration APIs.

@Component({
    selector: 'app-events',
    standalone: true,
    imports: [NgIf, NgForOf, DatePipe, RouterLink, FullCalendarModule],
    templateUrl: './events.component.html',
    styleUrls: ['./events.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent implements OnDestroy {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly eventsService = inject(EventsService);
    private readonly ui = inject(EventsUiService);
    private readonly destroy$ = new Subject<void>();
    upcomingLoading = false;
    upcomingError: string | null = null;
    upcoming: EventDto[] = [];
    allLoading = false;
    allError: string | null = null;
    allEvents: EventDto[] = [];

    // Calendar options (updated when events load)
    calendarOptions: CalendarOptions = {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        },
        weekends: true,
        nowIndicator: true,
        navLinks: true,
        eventClick: (arg) => this.onEventClick(arg),
        datesSet: (arg) => this.onDatesSet(arg as any),
        dayMaxEvents: true,
        contentHeight: 'auto',
        expandRows: true,
        windowResize: () => this.applyResponsiveOptions(),
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    };

    isBrowser(): boolean {
        return isPlatformBrowser(this.platformId);
    }

    constructor() {
        // Initial load (client only)
        if (this.isBrowser()) {
            this.applyResponsiveOptions();
            this.loadEvents();
            this.ui.changed$.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadEvents());
            this.loadUpcoming();
            this.loadAllEvents();
        }
    }

    onDatesSet(arg: any): void {
        if (!this.isBrowser()) return;
        this.loadEvents({ from: arg.startStr, to: arg.endStr });
    }

    onEventClick(arg: any): void {
        const title = arg?.event?.title ?? 'Event';
        alert(title);
    }

    private loadEvents(window?: { from?: string; to?: string }) {
        // Use public endpoint so page stays public; map EventDto → FullCalendar event
        this.eventsService
            .listPublicUpcoming(new Date(), 200)
            .pipe(take(1))
            .subscribe({
                next: (items: EventDto[]) => {
                    const fcEvents = items.map(e => ({
                        id: String(e.eventId),
                        title: e.eventName,
                        start: e.startAt,
                        end: e.endAt,
                        allDay: false,
                        extendedProps: { location: e.eventLocation, status: e.status }
                    }));
                    this.calendarOptions = { ...this.calendarOptions, events: fcEvents };
                },
                error: (err) => {
                    console.error('Failed to load public upcoming events', err);
                    this.calendarOptions = { ...this.calendarOptions, events: [] };
                },
            });
    }

    private loadUpcoming() {
        this.upcomingLoading = true;
        this.upcomingError = null;
        this.eventsService.listPublicUpcoming(new Date(), 20).pipe(take(1)).subscribe({
            next: (rows) => { this.upcoming = rows; this.upcomingLoading = false; },
            error: (err) => { console.error(err); this.upcoming = []; this.upcomingError = 'Failed to load'; this.upcomingLoading = false; }
        });
    }

    private loadAllEvents() {
        this.allLoading = true;
        this.allError = null;
        this.eventsService.list().pipe(take(1)).subscribe({
            next: (rows) => {
                // sort chronologically by startAt ascending
                this.allEvents = [...rows].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
                this.allLoading = false;
            },
            error: (err) => { console.error(err); this.allEvents = []; this.allError = 'Failed to load all events'; this.allLoading = false; }
        });
    }

    private applyResponsiveOptions() {
        if (!this.isBrowser()) return;
        const narrow = window.matchMedia('(max-width: 600px)').matches;
        const headerToolbar = narrow
            ? { left: 'prev,next', center: 'title', right: 'today' }
            : {
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
              };
        const initialView = narrow ? 'listWeek' : 'dayGridMonth';
        this.calendarOptions = {
            ...this.calendarOptions,
            headerToolbar,
            initialView,
        };
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
