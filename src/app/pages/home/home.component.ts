import { Component, inject, signal } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { materialImports } from '../../shared/material';
import { EventsService } from '../events/events.service';
import { EventDto } from '../events/event.model';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { take } from 'rxjs/operators';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [materialImports, RouterLink, NgFor, NgIf, DatePipe],
    styleUrls: ['./home.component.scss'],
    templateUrl: './home.component.html',
})
export class HomeComponent {
    private readonly events = inject(EventsService);
    private readonly platformId = inject(PLATFORM_ID);

    readonly loading = signal<boolean>(true);
    readonly error = signal<string | null>(null);
    readonly upcoming = signal<EventDto[]>([]);

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            this.events.listPublicUpcoming(new Date(), 6).pipe(take(1)).subscribe({
                next: (items: EventDto[]) => { this.upcoming.set(items); this.loading.set(false); },
                error: (err: unknown) => { console.error(err); this.error.set('Failed to load upcoming events'); this.loading.set(false); }
            });
        } else {
            // Avoid SSR call that may 401; show placeholder until hydrated.
            this.loading.set(false);
        }
    }
}
