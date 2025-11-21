import { ChangeDetectionStrategy, Component, OnDestroy, PLATFORM_ID, ChangeDetectorRef, inject, OnInit, NgZone, AfterViewInit } from '@angular/core';
import { isPlatformBrowser, NgForOf, NgIf, DatePipe } from '@angular/common';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { FormsModule } from '@angular/forms';
import { EventsService } from './events.service';
import { EnumsService } from './enums.service';
import { EventDto, EventPageResponse, EventSortField, SortDir } from './event.model';
import { take, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { formatApiError, parseApiError } from '../../shared/models/api-error';
import { ErrorBannerComponent } from '../../components/error-banner/error-banner.component';

// FullCalendar Angular wrapper
// https://github.com/fullcalendar/fullcalendar-angular
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
    private readonly enumsService = inject(EnumsService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly zone = inject(NgZone);
    private readonly router = inject(Router);
    // UI change bus merged into EventsService
    private readonly destroy$ = new Subject<void>();
    upcomingLoading = false;
    upcomingError: string | null = null;
    upcomingErrObj: any = null;
    upcomingStatus: number | null = null;
    upcoming: EventDto[] = [];
    allLoading = false;
    allError: string | null = null;
    allErrObj: any = null;
    allStatus: number | null = null;
    allEvents: EventDto[] = [];
    // Sort state (typed to backend whitelist)
    sortField: EventSortField = 'startAt';
    sortDir: SortDir = 'asc';
    typeOptions$ = this.enumsService.getEventTypes();
    selectedType: string | null = null;
    // View mode toggle: 'PUBLISHED' (public feed) vs 'MINE' (owned events all statuses)
    viewMode: 'PUBLISHED' | 'MINE' = 'PUBLISHED';
    // Caches keyed by filter signature (mode|sort|type|range)
    private publishedCache = new Map<string, EventDto[]>();
    private mineCache = new Map<string, EventDto[]>();
    // Permission fallback message when mine unauthorized
    minePermissionMessage: string | null = null;
    // Flag to disable Mine mode after authorization failure
    mineDisabled = false;

    // Exposed color maps for template legends (hoisted from applyCalendarEvents)
    readonly statusColors: Record<string,string> = {
        PUBLISHED: '#58a6ff',
        DRAFT: '#e2c76e',
        UNPUBLISHED: '#a08fe0',
        CANCELLED: '#ff6b6b'
    };
    readonly typeColors: Record<string,string> = {
        CONCERT: '#d97706',
        FESTIVAL: '#2563eb',
        PARTY: '#059669',
        OTHER: '#7c3aed'
    };

    // Legend helper arrays (built once)
    readonly statusLegend = Object.entries(this.statusColors).map(([key,color]) => ({ key, color, label: key.charAt(0) + key.slice(1).toLowerCase() }));
    readonly typeLegend = Object.entries(this.typeColors).map(([key,color]) => ({ key, color, label: key.charAt(0) + key.slice(1).toLowerCase() }));
    
    // Tooltip label constants to control line breaks/labels
    private readonly tooltipLabels = {
        title: 'Title',
        location: 'Location',
        type: 'Type',
        start: 'Start',
        end: 'End',
    } as const;

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
        eventDidMount: (arg) => this.onEventDidMount(arg),
        datesSet: (arg) => this.onDatesSet(arg as any),
        dayMaxEvents: true,
        contentHeight: 'auto',
        expandRows: true,
        windowResize: () => this.applyResponsiveOptions(),
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]
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
                // Clear caches on underlying data change
                this.publishedCache.clear();
                this.mineCache.clear();
                // Allow re-attempt of mine mode after changes
                this.mineDisabled = false;
                this.minePermissionMessage = null;
                this.loadEvents();
            });
            this.loadUpcoming();
            // this.loadAllEvents();
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
        if (!this.isBrowser()) return;
        const id = arg?.event?.id ?? arg?.event?.extendedProps?.eventId;
        if (!id) {
            return;
        }
        // Ensure navigation runs inside Angular zone
        this.zone.run(() => {
            this.router.navigate(['/events', String(id)]);
        });
    }

    // Attach a styled tooltip via data attribute (CSS renders it)
    onEventDidMount(arg: any): void {
        if (!this.isBrowser() || !arg?.el || !arg?.event) return;
        const e = arg.event;
        const title = e.title as string | undefined;
        const loc = e.extendedProps?.location as string | undefined;
        const type = (e.extendedProps?.typeDisplayName || e.extendedProps?.type) as string | undefined;
        const start: Date | null = e.start ?? null;
        const end: Date | null = e.end ?? null;
        const timeFmt: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };
        const startStr = start ? new Date(start).toLocaleString(undefined, timeFmt) : '';
        const endStr = end ? new Date(end).toLocaleString(undefined, timeFmt) : '';
        const lines: string[] = [];
        if (title) lines.push(`${this.tooltipLabels.title}: ${title}`);
        if (loc) lines.push(`${this.tooltipLabels.location}: ${loc}`);
        if (type) lines.push(`${this.tooltipLabels.type}: ${type}`);
        if (startStr) lines.push(`${this.tooltipLabels.start}: ${startStr}`);
        if (endStr) lines.push(`${this.tooltipLabels.end}: ${endStr}`);
        if (lines.length) {
            // Use data-tooltip for CSS-driven tooltip; avoid native title delay
            arg.el.removeAttribute('title');
            arg.el.setAttribute('data-tooltip', lines.join('\n'));
        }
    }

    private loadEvents(window?: { from?: string; to?: string }) {
        const sort = `${this.sortField},${this.sortDir}`;
        const key = `${this.viewMode}|${sort}|${this.selectedType || ''}|${window?.from || ''}|${window?.to || ''}`;
        const cache = this.viewMode === 'PUBLISHED' ? this.publishedCache : this.mineCache;
        const cached = cache.get(key);
        if (cached) {
            this.applyCalendarEvents(cached);
            return;
        }
        const common = { page: 0, size: 200, sort, eventType: this.selectedType || undefined, from: window?.from, to: window?.to };
        const obs = this.viewMode === 'PUBLISHED'
            ? this.eventsService.list({ ...common, status: 'PUBLISHED' })
            : this.eventsService.listMine({ ...common });
        obs.pipe(take(1)).subscribe({
            next: (resp: EventPageResponse) => {
                this.zone.run(() => {
                    const items = Array.isArray((resp as any)) ? (resp as any as EventDto[]) : (resp?.items ?? []);
                    cache.set(key, items);
                    this.minePermissionMessage = null;
                    if (this.viewMode === 'MINE') {
                        this.mineDisabled = false; // successful access
                    }
                    this.applyCalendarEvents(items);
                });
            },
            error: (err) => {
                this.zone.run(() => {
                    if (this.viewMode === 'MINE' && (err?.status === 401 || err?.status === 403)) {
                        this.minePermissionMessage = 'Not authorized for My Events. Showing published events.';
                        this.mineDisabled = true; // disable further attempts until refresh or data change
                        this.viewMode = 'PUBLISHED';
                        this.loadEvents(window); // retry with published mode
                        return;
                    }
                    this.applyCalendarEvents([]);
                });
            }
        });
    }

    private applyCalendarEvents(items: EventDto[]) {
        const fcEvents = items.map(e => {
            const statusColor = this.statusColors[e.status?.toUpperCase() || ''] || '#58a6ff';
            const typeColor = e.type ? this.typeColors[e.type.toUpperCase()] : undefined;
            // Published view: prefer typeColor for quick categorization.
            // Mine view: emphasize lifecycle/status; ignore type override.
            const finalColor = this.viewMode === 'MINE' ? statusColor : (typeColor || statusColor);
            return {
                id: String(e.eventId),
                title: e.eventName,
                start: e.startAt,
                end: e.endAt,
                allDay: false,
                color: finalColor,
                extendedProps: {
                    location: e.eventLocation,
                    status: e.status,
                    type: e.type,
                    typeDisplayName: e.typeDisplayName
                }
            };
        });
        this.calendarOptions = { ...this.calendarOptions, events: fcEvents };
        this.cdr.markForCheck();
    }

    loadUpcoming() {
        // For debugging: show all events (no status/owner filter) to validate visibility
        this.upcomingLoading = true;
        this.upcomingError = null;
        this.upcomingErrObj = null;
        this.upcomingStatus = null;
        this.cdr.markForCheck();
        // Use public-upcoming endpoint: PUBLISHED only, future events, ascending, limited
        this.eventsService.listPublicUpcoming(new Date(), 20).pipe(take(1)).subscribe({
            next: (rows) => {
                this.zone.run(() => {
                    this.upcoming = rows ?? [];
                    this.upcomingLoading = false;
                    this.upcomingStatus = null;
                    this.cdr.markForCheck();
                });
            },
            error: (err) => {
                this.zone.run(() => {
                    this.upcoming = [];
                    this.upcomingError = formatApiError(err);
                    this.upcomingErrObj = err;
                    this.upcomingStatus = this.extractStatus(err);
                    this.upcomingLoading = false;
                    this.cdr.markForCheck();
                });
            }
        });
    }

    // loadAllEvents() {
    //     this.allLoading = true;
    //     this.allError = null;
    //     this.allErrObj = null;
    //     this.allStatus = null;
    //     this.cdr.markForCheck();
    //     const sort = `${this.sortField},${this.sortDir}`;
    //     const obs = this.viewMode === 'PUBLISHED'
    //         ? this.eventsService.list({ page: 0, size: 200, sort, eventType: this.selectedType || undefined, status: 'PUBLISHED' })
    //         : this.eventsService.listMine({ page: 0, size: 200, sort, eventType: this.selectedType || undefined });
    //     obs.pipe(take(1)).subscribe({
    //         next: (resp) => {
    //             this.zone.run(() => {
    //                 const rows = Array.isArray((resp as any)) ? (resp as any as EventDto[]) : (resp?.items ?? []);
    //                 // sort chronologically by startAt ascending
    //                 // We rely on backend sort; keep a secondary stable sort for startAt asc
    //                 if (this.sortField === 'startAt') {
    //                     this.allEvents = [...rows].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    //                 } else {
    //                     this.allEvents = rows;
    //                 }
    //                 this.allLoading = false;
    //                 this.allStatus = null;
    //                 this.cdr.markForCheck();
    //             });
    //         },
    //         error: (err) => {
    //             this.zone.run(() => {
    //                 this.allEvents = [];
    //                 this.allError = formatApiError(err);
    //                 this.allErrObj = err;
    //                 this.allStatus = this.extractStatus(err);
    //                 this.allLoading = false;
    //                 this.cdr.markForCheck();
    //             });
    //         }
    //     });
    // }

    onTypeChange(v: string | null) { 
        this.selectedType = v;
        // Reload both calendar and list when type filter changes
        this.loadEvents();
        // this.loadAllEvents();
    }

    onSortChange() {
        // Reload both calendar and list to reflect new sort
        this.loadEvents();
        // this.loadAllEvents();
    }

    onViewModeChange(mode: 'PUBLISHED' | 'MINE') {
        if (this.viewMode === mode) return;
        if (mode === 'MINE' && this.mineDisabled) {
            // Ignore switch when disabled, keep permission message
            return;
        }
        this.viewMode = mode;
        this.loadEvents();
        // this.loadAllEvents();
    }

    private applyResponsiveOptions() {
        if (!this.isBrowser()) return;
        const narrow = window.matchMedia('(max-width: 600px)').matches;
        const headerToolbar = narrow
            ? { left: 'prev,next', center: 'title', right: 'today' }
            :  {
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

    // Private method to extract HTTP status from error response
    private extractStatus(err: any): number {
        const fromHttp = typeof err?.status === 'number' ? err.status : undefined;
        if (typeof fromHttp === 'number' && fromHttp > 0) return fromHttp;
        const parsed = parseApiError(err);
        return (parsed?.status && parsed.status > 0 ? parsed.status : 500);
    }
}
