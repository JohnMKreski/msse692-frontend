import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, NgIf } from '@angular/common';
import { EventsService } from './events.service';
import { take } from 'rxjs/operators';

// FullCalendar Angular wrapper
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

// Note: some versions of @fullcalendar/angular auto-wire plugins from options.plugins.
// We'll pass plugins through calendarOptions directly to avoid relying on static registration APIs.

@Component({
    selector: 'app-events',
    standalone: true,
    imports: [NgIf, FullCalendarModule],
    templateUrl: './events.component.html',
    styleUrls: ['./events.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly eventsService = inject(EventsService);

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
        this.eventsService
            .list(window)
            .pipe(take(1))
            .subscribe({
                next: (items) => {
                    const fcEvents = (items as any[]).map((e: any) => ({
                        id: e.id,
                        title: e.title,
                        start: e.start,
                        end: e.end,
                        allDay: e.allDay,
                        extendedProps: { location: e.location },
                    }));
                    this.calendarOptions = { ...this.calendarOptions, events: fcEvents };
                },
                error: (err) => {
                    console.error('Failed to load events', err);
                    this.calendarOptions = { ...this.calendarOptions, events: [] };
                },
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
}
