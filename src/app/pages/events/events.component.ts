import {
    ChangeDetectionStrategy, Component, OnDestroy, PLATFORM_ID,
    ChangeDetectorRef, inject, OnInit, NgZone
} from '@angular/core';
import { isPlatformBrowser, NgForOf, NgIf } from '@angular/common';
import { EventsService } from './events.service';
import { EventDto, EventSortField, SortDir } from './event.model';
import { switchMap, takeUntil, catchError, map } from 'rxjs/operators';
import { Observable, Subject, of } from 'rxjs';
import { Router } from '@angular/router';
import { EnumsService } from './enums.service';
import { EventsCalendarComponent } from '../../components/events-calendar/events-calendar.component';
import { EventsCalendarListComponent } from '../../components/events-calendar-list/events-calendar-list.component';

interface FetchResult {
    items: EventDto[];
    key: string | null;
    now: number;
}

@Component({
    selector: 'app-events',
    standalone: true,
    imports: [NgIf, NgForOf, EventsCalendarComponent, EventsCalendarListComponent],
    templateUrl: './events.component.html',
    styleUrls: ['./events.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { ngSkipHydration: '' }
})
export class EventsComponent implements OnInit, OnDestroy {
    private readonly platformId  = inject(PLATFORM_ID);
    private readonly eventsService = inject(EventsService);
    private readonly enumsService  = inject(EnumsService);
    private readonly cdr           = inject(ChangeDetectorRef);
    private readonly zone          = inject(NgZone);
    private readonly router        = inject(Router);

    private readonly destroy$      = new Subject<void>();
    private readonly fetch$        = new Subject<{ from: string; to: string }>();
    private currentWindow: { from: string; to: string } | null = null;

    sortField: EventSortField = 'startAt';
    sortDir:   SortDir        = 'asc';
    selectedType: string | null = null;

    private readonly publishedCache = new Map<string, { items: EventDto[]; ts: number }>();
    private readonly CACHE_TTL_MS   = 5 * 60 * 1000;

    publishedEvents: EventDto[] = [];
    calendarLoading = false;

    private readonly communityTimeZone = 'America/Denver';

    readonly typeColors: Record<string, string> = {
        CONCERT:  '#d97706',
        FESTIVAL: '#2563eb',
        PARTY:    '#059669',
        OTHER:    '#7c3aed'
    };

    readonly typeLegend = Object.entries(this.typeColors).map(([key, color]) => ({
        key, color, label: key.charAt(0) + key.slice(1).toLowerCase()
    }));

    readonly typeOptions$: Observable<Array<{ label: string; value: string | null }>> = (
        isPlatformBrowser(this.platformId) ? this.enumsService.getEventTypes() : of([])
    ).pipe(
        map(opts => [
            { label: 'All', value: null },
            ...(opts ?? []).map(o => ({ label: o.label, value: o.value }))
        ])
    );

    isBrowser(): boolean {
        return isPlatformBrowser(this.platformId);
    }

    ngOnInit(): void {
        if (!this.isBrowser()) return;

        // Single reactive pipeline — switchMap cancels any in-flight HTTP request
        // when a new fetch is triggered, eliminating the race condition.
        this.fetch$.pipe(
            switchMap(range => {
                const sort    = `${this.sortField},${this.sortDir}`;
                const fromMs  = new Date(range.from).getTime();
                const toMs    = new Date(range.to).getTime();
                // Midpoint so a May grid starting Apr 26 still resolves to May.
                const mid     = new Date(isNaN(fromMs) || isNaN(toMs) ? Date.now() : (fromMs + toMs) / 2);
                const ym      = this.getCommunityYearMonth(mid);
                const mm      = String(ym.month).padStart(2, '0');
                const dd      = String(new Date(ym.year, ym.month, 0).getDate()).padStart(2, '0');
                const key     = `${ym.year}-${mm}|${this.selectedType ?? ''}|${sort}`;
                const now     = Date.now();
                const cached  = this.publishedCache.get(key);

                if (cached && now - cached.ts < this.CACHE_TTL_MS) {
                    return of<FetchResult>({ items: cached.items, key: null, now });
                }

                this.calendarLoading = true;
                this.cdr.markForCheck();

                return this.eventsService.listPublished({
                    page: 0, size: 100, sort,
                    eventType: this.selectedType ?? undefined,
                    from: `${ym.year}-${mm}-01T00:00:00`,
                    to:   `${ym.year}-${mm}-${dd}T23:59:59`
                }).pipe(
                    map((resp): FetchResult => {
                        const items: EventDto[] = Array.isArray(resp as any)
                            ? (resp as any)
                            : (resp?.items ?? []);
                        return { items, key, now };
                    }),
                    catchError((): Observable<FetchResult> => of({ items: [], key: null, now }))
                );
            }),
            takeUntil(this.destroy$)
        ).subscribe(({ items, key, now }) => {
            this.zone.run(() => {
                if (key) this.publishedCache.set(key, { items, ts: now });
                this.publishedEvents = items;
                this.calendarLoading = false;
                this.cdr.markForCheck();
            });
        });

        // Reload when an admin action (publish/unpublish/cancel) changes event state.
        this.eventsService.changed$.pipe(takeUntil(this.destroy$)).subscribe(() => {
            this.publishedCache.clear();
            if (this.currentWindow) this.fetch$.next(this.currentWindow);
        });
    }

    // Sole entry point for all fetch triggers: FullCalendar navigation,
    // list month nav buttons, and initial datesSet on mount.
    onCalendarRange(range: { start: string; end: string }): void {
        if (!this.isBrowser()) return;
        this.currentWindow = { from: range.start, to: range.end };
        this.fetch$.next(this.currentWindow);
    }

    onEventIdClick(id: number): void {
        if (!this.isBrowser()) return;
        this.zone.run(() => this.router.navigate(['/events', String(id)]));
    }

    // Re-fetches the currently-viewed month, not always today.
    onTypeChange(v: string | null): void {
        this.selectedType = v;
        if (this.currentWindow) this.fetch$.next(this.currentWindow);
    }

    onRefreshClick(): void {
        if (!this.isBrowser()) return;
        window.location.reload();
    }

    private getCommunityYearMonth(d: Date): { year: number; month: number } {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: this.communityTimeZone,
            year:  'numeric',
            month: '2-digit'
        }).formatToParts(d);
        const year  = Number(parts.find(p => p.type === 'year')?.value  ?? NaN);
        const month = Number(parts.find(p => p.type === 'month')?.value ?? NaN);
        if (!Number.isFinite(year) || !Number.isFinite(month)) {
            return { year: d.getFullYear(), month: d.getMonth() + 1 };
        }
        return { year, month };
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
