import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EventsService } from '../../events/events.service';
import { EventDto } from '../../events/event.model';
import { take } from 'rxjs/operators';
import { formatApiError } from '../../../shared/models/api-error';
import { EventsCalendarComponent } from '../../../components/events-calendar/events-calendar.component';

@Component({
  selector: 'app-editor-my-events-calendar',
  standalone: true,
  imports: [CommonModule, EventsCalendarComponent],
  templateUrl: './editor-my-events-calendar.component.html',
  styleUrls: ['./editor-my-events-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorMyEventsCalendarComponent {
  private readonly events = inject(EventsService);
  private readonly router = inject(Router);

  readonly loading = signal<boolean>(true);
  readonly items = signal<EventDto[]>([]);
  readonly error = signal<string | null>(null);

  readonly statusColors: Record<string,string> = {
    PUBLISHED: '#58a6ff',
    DRAFT: '#e2c76e',
    UNPUBLISHED: '#a08fe0',
    CANCELLED: '#ff6b6b'
  };

  constructor() {
    this.load();
  }

  load(range?: { start?: string; end?: string }) {
    this.loading.set(true);
    const params: any = { page: 0, size: 100, sort: 'startAt,asc' };
    if (range?.start) params.from = range.start;
    if (range?.end) params.to = range.end;
    this.events.listMine(params).pipe(take(1)).subscribe({
      next: (resp) => {
        const rows: EventDto[] = Array.isArray((resp as any)) ? (resp as any as EventDto[]) : (resp?.items ?? []);
        this.items.set(rows);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        console.error(err);
        this.items.set([]);
        this.error.set(formatApiError(err) || 'Failed to load events.');
        this.loading.set(false);
      }
    });
  }

  onCalendarEventClick(id: number) {
    this.router.navigate(['/editor/create', id]);
  }

  onCalendarRange(range: { start: string; end: string }) {
    this.load(range);
  }
}
