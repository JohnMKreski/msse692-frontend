# Events Calendar (Angular + FullCalendar + SSR-safe)

This guide walks you through adding a modern, performant events calendar to your Angular 19 standalone app using FullCalendar. It covers SSR-safe rendering, routing, data loading from a Spring backend, styling, and testing.

## Why FullCalendar

-   Mature, accessible, and feature-rich: month/week/day, lists, drag/drop, timezones, recurring events.
-   Angular wrapper supports standalone components and Ivy.
-   ESM-first and tree-shakable plugins.

## Prerequisites

-   Angular 19 standalone app (no NgModules) with SSR enabled.
-   Global providers include:
    -   `provideRouter(routes)`
    -   `provideHttpClient()`
    -   `provideClientHydration(withEventReplay())` on the client
    -   `provideServerRendering()` on the server
-   Material theming is already set up in `src/styles.scss` (optional but recommended).

## 1) Install dependencies

FullCalendar core + Angular wrapper + view plugins:

```bat
:: Windows CMD
npm i @fullcalendar/core @fullcalendar/angular @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list
```

Optional add-ons you can consider later:

-   `@fullcalendar/rrule` for recurring events
-   `@fullcalendar/multimonth` for a multi-month view

## 2) Add FullCalendar styles

FullCalendar ships its own CSS. Add these to Angular’s global styles so SSR and client both see consistent styles.

Note: For FullCalendar v6+, CSS is typically under `index.css`. If you’re on an older version, paths may use `main.css`. Adjust as needed.

Option A — angular.json (recommended):

1. Open `angular.json` and in the build `styles` array (for your app project), add:

```json
{
  "input": "node_modules/@fullcalendar/core/index.css"
},
{
  "input": "node_modules/@fullcalendar/daygrid/index.css"
},
{
  "input": "node_modules/@fullcalendar/timegrid/index.css"
},
{
  "input": "node_modules/@fullcalendar/list/index.css"
}
```

Option B — import in `styles.scss` (works too but may be less explicit in some setups):

```scss
@import '@fullcalendar/core/index.css';
@import '@fullcalendar/daygrid/index.css';
@import '@fullcalendar/timegrid/index.css';
@import '@fullcalendar/list/index.css';
```

## 3) Define event models

Create a minimal interface for your domain. You can extend later (venue, artists, ticket URLs, etc.).

```ts
// src/app/pages/events/event.model.ts
export interface EventDto {
    id: string;
    title: string;
    start: string; // ISO date-time
    end?: string; // ISO date-time
    allDay?: boolean;
    location?: string;
}
```

## 4) Create a data service

Fetch events from your Spring backend. This example expects an endpoint like `GET /api/events` returning `EventDto[]`.

```ts
// src/app/pages/events/events.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventDto } from './event.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
    private readonly http = inject(HttpClient);
    // TODO: Move baseUrl to a configuration service or environment file when available
    private readonly baseUrl = '/api';

    list(params?: { from?: string; to?: string }): Observable<EventDto[]> {
        return this.http.get<EventDto[]>(`${this.baseUrl}/events`, { params: params as any });
    }
}
```

CORS reminder: if your Angular dev server calls a different origin (e.g., `http://localhost:8080`), enable CORS on Spring or proxy requests via Angular dev-server.

## 5) Implement the EventsComponent (SSR-safe)

We’ll render the calendar only in the browser to avoid SSR “window is not defined” issues. The server will render a lightweight placeholder to keep HTML stable and avoid hydration mismatches.

```ts
// src/app/pages/events/events.component.ts
import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, NgIf } from '@angular/common';
import { EventsService } from './events.service';
import { EventDto } from './event.model';
import { take } from 'rxjs/operators';

// FullCalendar Angular wrapper
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

@Component({
    selector: 'app-events',
    standalone: true,
    imports: [NgIf, FullCalendarModule],
    template: `
        <section class="events-page">
            <h1 class="page-title">Events Calendar</h1>

            <!-- Server-side placeholder to keep SSR markup stable -->
            <div *ngIf="!isBrowser()" class="calendar-placeholder" aria-hidden="true">
                <p>Calendar is available on the client.</p>
            </div>

            <!-- Render FullCalendar only in the browser; skip hydration to avoid mismatches -->
            <div *ngIf="isBrowser()">
                <full-calendar
                    ngSkipHydration
                    [plugins]="plugins"
                    [initialView]="initialView"
                    [headerToolbar]="headerToolbar"
                    [events]="events()"
                    [weekends]="true"
                    [nowIndicator]="true"
                    [navLinks]="true"
                    (eventClick)="onEventClick($event)"
                    (datesSet)="onDatesSet($event)"
                ></full-calendar>
            </div>
        </section>
    `,
    styles: [
        `
            :host {
                display: block;
            }
            .events-page {
                padding: 1rem;
            }
            .page-title {
                margin: 0 0 1rem;
            }
            .calendar-placeholder {
                padding: 1rem;
                color: var(--mat-sys-on-surface-variant, #555);
            }
        `,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly eventsService = inject(EventsService);

    // Calendar setup
    readonly plugins = [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin];
    readonly initialView: string = 'dayGridMonth';
    readonly headerToolbar = {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
    } as const;

    // Store events in a signal for simple, reactive binding
    private readonly _events = signal<any[]>([]);
    events = this._events.asReadonly();

    isBrowser(): boolean {
        return isPlatformBrowser(this.platformId);
    }

    constructor() {
        // Initial load (client only)
        if (this.isBrowser()) {
            this.loadEvents();
        }
    }

    onDatesSet(arg: { startStr: string; endStr: string }): void {
        // Fetch events only when running in the browser
        if (!this.isBrowser()) return;
        this.loadEvents({ from: arg.startStr, to: arg.endStr });
    }

    onEventClick(arg: any): void {
        // Customize: navigate, open details dialog, etc.
        const title = arg?.event?.title ?? 'Event';
        // Placeholder behavior
        alert(title);
    }

    private loadEvents(window?: { from?: string; to?: string }) {
        this.eventsService
            .list(window)
            .pipe(take(1))
            .subscribe({
                next: (items: EventDto[]) => {
                    const fcEvents = items.map((e) => ({
                        id: e.id,
                        title: e.title,
                        start: e.start,
                        end: e.end,
                        allDay: e.allDay,
                        extendedProps: { location: e.location },
                    }));
                    this._events.set(fcEvents);
                },
                error: (err) => {
                    console.error('Failed to load events', err);
                    this._events.set([]);
                },
            });
    }
}
```

Notes:

-   `ngSkipHydration` avoids DOM mismatch warnings if SSR markup/render differs from client.
-   We guard all FullCalendar usage behind `isBrowser()` to be SSR-safe.

## 6) Wire up routing

Add a route for the calendar page.

```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { EventsComponent } from './pages/events/events.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'home', component: HomeComponent },
    { path: 'events', component: EventsComponent },
    // { path: '**', redirectTo: '' }, // optional fallback
];
```

Optionally add a navigation link to your header:

```html
<!-- src/app/components/header/header.component.html -->
<nav>
    <a routerLink="/home" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
        >Home</a
    >
    <a routerLink="/events" routerLinkActive="active">Events</a>
</nav>
```

Ensure the header component imports `RouterLink` and `RouterLinkActive` in its `imports` array.

## 7) Server integration notes (Spring)

-   Endpoint suggestion: `GET /api/events?from=2025-01-01&to=2025-02-01` returns an array of `EventDto`.
-   Timezone: Prefer ISO 8601 with timezone (e.g., `2025-01-01T20:00:00-05:00`).
-   CORS: In dev, enable CORS or configure a proxy in Angular.
-   Paging: For large datasets, implement server-side windowing by date range.

Optional Angular dev proxy example (`proxy.conf.json` in project root):

```json
{
    "/api": {
        "target": "http://localhost:8080",
        "secure": false,
        "changeOrigin": true,
        "logLevel": "debug"
    }
}
```

And update your `package.json` start script to: `ng serve --proxy-config proxy.conf.json`.

## 8) Accessibility & i18n

-   Use meaningful `title` values; include venue in event title or as `extendedProps` for ARIA labeling.
-   Verify keyboard navigation: FullCalendar supports arrow keys and tab flow.
-   For i18n, add locales via `@fullcalendar/core/locales/*` and set the `locale` option.

## 9) Testing

Unit test ideas:

-   Service: mock HttpClient and verify query params and mapping.
-   Component: when `isBrowser()` is false, renders placeholder only; when true, calls service and sets events signal.

E2E smoke:

-   Navigate to `/events`; calendar renders; clicking an event opens details (stubbed alert for now).

SSR check:

-   `npm run build:ssr && npm run serve:ssr` then open `/events`. Verify no `window is not defined` or hydration mismatch warnings.

## 10) Troubleshooting

-   "window is not defined" during SSR:
    -   Ensure calendar renders only in the browser (`*ngIf="isBrowser()"`) and use `ngSkipHydration` on `<full-calendar>`.
-   Calendar appears unstyled:
    -   Confirm FullCalendar CSS files are included (angular.json or `styles.scss`).
-   Hydration mismatch warnings:
    -   Keep server markup minimal and stable; render the real calendar only on client; add `ngSkipHydration`.
-   No events loading:
    -   Check network requests in dev tools; verify proxy/CORS; confirm date window in `datesSet` aligns with your API.
-   Timezone shifts:
    -   Ensure server returns ISO strings with timezone; configure FullCalendar `timeZone` if needed.

## 11) Enhancements (next steps)

-   Add filters (genre, city), and a side panel with chips/selects.
-   Event details drawer/dialog with ticket links and artists.
-   Persist user’s last view (month/week) to localStorage.
-   Support recurring events (RRULE) and multi-month overview.
-   Server pagination and caching; optimistic updates for admin tools.

## Appendix: Minimal CSS touch-ups

You can adjust spacing with your existing global styles. Example:

```scss
/* src/styles/_layout.scss */
.events-page {
    max-width: 1200px;
    margin-inline: auto;
}
```

That’s it—you now have a robust, SSR-safe events calendar page ready to connect to your backend.
