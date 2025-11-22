import { ChangeDetectionStrategy, Component, OnDestroy, PLATFORM_ID, ChangeDetectorRef, inject, OnInit, NgZone, AfterViewInit } from '@angular/core';
import { isPlatformBrowser, NgForOf, NgIf, DatePipe } from '@angular/common';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { FormsModule } from '@angular/forms';
import { EventsService } from './events.service';
import { EventDto, EventPageResponse, EventSortField, SortDir } from './event.model';
import { take, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { formatApiError, parseApiError } from '../../shared/models/api-error';
import { ErrorBannerComponent } from '../../components/error-banner/error-banner.component';

import { EventsCalendarComponent } from '../../components/events-calendar/events-calendar.component';

@Component({
    selector: 'app-events',
    standalone: true,
    imports: [NgIf, NgForOf, DatePipe, RouterLink, FormsModule, ErrorBannerComponent, LoadingSkeletonComponent, EventsCalendarComponent],
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
    private readonly router = inject(Router);
    // UI change bus merged into EventsService
    private readonly destroy$ = new Subject<void>();
    upcomingLoading = false;
    upcomingError: string | null = null;
    upcomingErrObj: any = null;
    upcomingStatus: number | null = null;
    upcoming: EventDto[] = [];
    // Removed "all events" debug list state (published-only page)
    // Sort state (typed to backend whitelist)
    sortField: EventSortField = 'startAt';
    sortDir: SortDir = 'asc';
    selectedType: string | null = null;
    // Published-only cache (month-scoped with TTL)
    private publishedCache = new Map<string, { items: EventDto[]; ts: number }>();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    publishedEvents: EventDto[] = [];
    calendarLoading = false;

    readonly typeColors: Record<string,string> = {
        CONCERT: '#d97706',
        FESTIVAL: '#2563eb',
        PARTY: '#059669',
        OTHER: '#7c3aed'
    };

    // Legend helper arrays (built once)
    readonly typeLegend = Object.entries(this.typeColors).map(([key,color]) => ({ key, color, label: key.charAt(0) + key.slice(1).toLowerCase() }));

    // Removed FullCalendarOptions in favor of reusable component inputs/outputs.

    isBrowser(): boolean {
        return isPlatformBrowser(this.platformId);
    }

    constructor() {}

    ngOnInit(): void {
        if (!this.isBrowser()) return;
        // Defer to next tick to ensure hydration is complete before manipulating state
        setTimeout(() => {
            this.loadEvents();
            this.eventsService.changed$.pipe(takeUntil(this.destroy$)).subscribe(() => {
                this.publishedCache.clear();
                this.loadEvents();
            });
            this.loadUpcoming();
            // (debug allEvents list removed)
        }, 0);
    }

    ngAfterViewInit(): void {
        // no-op
    }

    onCalendarRange(range: { start: string; end: string }): void {
        if (!this.isBrowser()) return;
        this.loadEvents({ from: range.start, to: range.end });
    }

    onEventIdClick(id: number): void {
        if (!this.isBrowser()) return;
        this.zone.run(() => this.router.navigate(['/events', String(id)]));
    }

    private loadEvents(window?: { from?: string; to?: string }) {
        const sort = `${this.sortField},${this.sortDir}`;
        // Derive month key from provided range or current date
        const refDateStr = window?.from || window?.to || new Date().toISOString();
        const refDate = new Date(refDateStr);
        const monthKey = `${refDate.getFullYear()}-${String(refDate.getMonth()+1).padStart(2,'0')}`;
        const key = `${monthKey}|${this.selectedType || ''}|${sort}`;
        const now = Date.now();
        const cached = this.publishedCache.get(key);
        if (cached && (now - cached.ts) < this.CACHE_TTL_MS) {
            this.publishedEvents = cached.items;
            this.cdr.markForCheck();
            return;
        }
        this.calendarLoading = true;
        // Expand fetch window to full month boundaries for stable caching
        const monthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
        const monthEnd = new Date(refDate.getFullYear(), refDate.getMonth()+1, 0); // last day prev to next month
        const fromIso = monthStart.toISOString();
        const toIso = monthEnd.toISOString();
        const params = { page: 0, size: 500, sort, eventType: this.selectedType || undefined, from: fromIso, to: toIso };
        this.eventsService.listPublished(params).pipe(take(1)).subscribe({
            next: (resp: EventPageResponse) => {
                this.zone.run(() => {
                    const items = Array.isArray((resp as any)) ? (resp as any as EventDto[]) : (resp?.items ?? []);
                    this.publishedCache.set(key, { items, ts: now });
                    this.publishedEvents = items;
                    this.calendarLoading = false;
                    this.cdr.markForCheck();
                });
            },
            error: () => {
                this.zone.run(() => {
                    this.publishedEvents = [];
                    this.calendarLoading = false;
                    this.cdr.markForCheck();
                });
            }
        });
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

    onTypeChange(v: string | null) { 
        this.selectedType = v;
        this.loadEvents();
    }

    onSortChange() {
        this.loadEvents();
    }

    // Responsive calendar adjustments now handled internally by EventsCalendarComponent.

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
