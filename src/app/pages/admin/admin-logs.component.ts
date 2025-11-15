import { CommonModule, DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { EventsService } from '../events/events.service';

@Component({
  selector: 'app-admin-logs',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './admin-logs.component.html',
  styleUrls: ['./admin-logs.component.scss']
})
export class AdminLogsComponent {
  events = signal<any[]>([]);
  audits = signal<any[]>([]);
  auditsLoading = signal<boolean>(false);
  auditsError = signal<string | null>(null);
  selectedEventId = signal<string | null>(null);
  limit = signal<number>(10);

  constructor(private eventsSvc: EventsService) {
    this.loadEvents();
  }

  loadEvents(): void {
    this.eventsSvc.list({ page: 0, size: 100, sort: 'startAt,desc' }).subscribe({
      next: (resp: any) => {
        const items: any[] = Array.isArray(resp) ? resp : (resp?.items ?? []);
        this.events.set(items || []);
        if (!this.selectedEventId() && items?.length) {
          const first = items[0];
          const id = first?.eventId ?? first?.id;
          if (id != null) { this.selectedEventId.set(String(id)); this.loadAudits(); }
        }
      },
      error: () => { this.events.set([]); }
    });
  }

  loadAudits(): void {
    const id = this.selectedEventId();
    if (!id) { this.audits.set([]); return; }
    this.auditsLoading.set(true);
    this.auditsError.set(null);
    this.eventsSvc.getAudits(id, this.limit()).subscribe({
      next: (rows) => this.audits.set(rows || []),
      error: (err) => this.auditsError.set(err?.error?.message || 'Failed to load audits'),
      complete: () => this.auditsLoading.set(false)
    });
  }

  onEventChange(val: string) {
    this.selectedEventId.set(val || null);
    this.loadAudits();
  }

  onLimitChange(n: number) {
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(Math.max(n, 1), 100);
    this.limit.set(clamped);
    this.loadAudits();
  }
}
