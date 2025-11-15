import { ChangeDetectionStrategy, Component, OnDestroy, PLATFORM_ID, ChangeDetectorRef, inject, OnInit, NgZone, AfterViewInit } from '@angular/core';
import { isPlatformBrowser, NgForOf, NgIf, DatePipe } from '@angular/common';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { FormsModule } from '@angular/forms';
import { EventsService } from './events.service';
import { EventDto, EventPageResponse, EventSortField, SortDir } from './event.model';
import { take, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { RouterLink } from '@angular/router';
import { formatApiError } from '../../shared/api-error';
import { ErrorBannerComponent } from '../../components/error-banner/error-banner.component';

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
    imports: [NgIf, NgForOf, DatePipe, RouterLink, FullCalendarModule, FormsModule, ErrorBannerComponent, LoadingSkeletonComponent],
    templateUrl: './events.component.html',
    styleUrls: ['./events.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { ngSkipHydration: '' }
})
export class EventsComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly eventsService = inject(EventsService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly zone = inject(NgZone);
    // UI change bus merged into EventsService
    private readonly destroy$ = new Subject<void>();
    upcomingLoading = false;
    upcomingError: string | null = null;
    upcoming: EventDto[] = [];
    allLoading = false;
    allError: string | null = null;
    allEvents: EventDto[] = [];
    // Sort state (typed to backend whitelist)
    sortField: EventSortField = 'startAt';
    sortDir: SortDir = 'asc';

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

    constructor() {}

    ngOnInit(): void {
        if (!this.isBrowser()) return;
        // Defer to next tick to ensure hydration is complete before manipulating state
        setTimeout(() => {
            this.applyResponsiveOptions();
            this.loadEvents();
            this.eventsService.changed$.pipe(takeUntil(this.destroy$)).subscribe(() => {
                this.loadEvents();
            });
            this.loadUpcoming();
            this.loadAllEvents();
        }, 0);
    }

    ngAfterViewInit(): void {
        // no-op
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
        // For debugging: load all events (ignore status/owner) to ensure visibility while unauthenticated
        const sort = `${this.sortField},${this.sortDir}`;
        this.eventsService
            .list({ page: 0, size: 100, sort })
            .pipe(take(1))
            .subscribe({
                next: (resp: EventPageResponse) => {
                    this.zone.run(() => {
                        const items = Array.isArray((resp as any)) ? (resp as any as EventDto[]) : (resp?.items ?? []);
                        const fcEvents = items.map(e => ({
                            id: String(e.eventId),
                            title: e.eventName,
                            start: e.startAt,
                            end: e.endAt,
                            allDay: false,
                            extendedProps: { location: e.eventLocation, status: e.status }
                        }));
                        this.calendarOptions = { ...this.calendarOptions, events: fcEvents };
                        this.cdr.markForCheck();
                    });
                },
                error: (err) => {
                    this.zone.run(() => {
                        this.calendarOptions = { ...this.calendarOptions, events: [] };
                        this.cdr.markForCheck();
                    });
                },
            });
    }

    loadUpcoming() {
        // For debugging: show all events (no status/owner filter) to validate visibility
        this.upcomingLoading = true;
        this.upcomingError = null;
        // Use public-upcoming endpoint: PUBLISHED only, future events, ascending, limited
        this.eventsService.listPublicUpcoming(new Date(), 20).pipe(take(1)).subscribe({
            next: (rows) => {
                this.zone.run(() => {
                    this.upcoming = rows ?? [];
                    this.upcomingLoading = false;
                    this.cdr.markForCheck();
                });
            },
            error: (err) => {
                this.zone.run(() => { this.upcoming = []; this.upcomingError = formatApiError(err); this.upcomingLoading = false; this.cdr.markForCheck(); });
            }
        });
    }

    loadAllEvents() {
        this.allLoading = true;
        this.allError = null;
        const sort = `${this.sortField},${this.sortDir}`;
        this.eventsService.list({ page: 0, size: 100, sort }).pipe(take(1)).subscribe({
            next: (resp) => {
                this.zone.run(() => {
                    const rows = Array.isArray((resp as any)) ? (resp as any as EventDto[]) : (resp?.items ?? []);
                    // sort chronologically by startAt ascending
                    // We rely on backend sort; keep a secondary stable sort for startAt asc
                    this.allEvents = [...rows].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
                    this.allLoading = false;
                    this.cdr.markForCheck();
                });
            },
            error: (err) => {
                this.zone.run(() => { this.allEvents = []; this.allError = formatApiError(err); this.allLoading = false; this.cdr.markForCheck(); });
            }
        });
    }

    onSortChange() {
        // Reload both calendar and list to reflect new sort
        this.loadEvents();
        this.loadAllEvents();
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
