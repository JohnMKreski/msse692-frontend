import { CommonModule, DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { EventsService } from '../events/events.service';
import { EventDto } from '../events/event.model';

@Component({
  selector: 'app-admin-events-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './admin-events-list.component.html',
  styleUrls: ['./admin-events-list.component.scss']
})
export class AdminEventsListComponent {
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  items = signal<EventDto[]>([]);

  constructor(private events: EventsService) {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.events.list({ page: 0, size: 100, sort: 'startAt,desc' }).subscribe({
      next: (resp: any) => {
        const rows: EventDto[] = Array.isArray(resp) ? resp : (resp?.items ?? []);
        this.items.set((rows || []) as EventDto[]);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load events');
        this.loading.set(false);
      }
    });
  }
}
