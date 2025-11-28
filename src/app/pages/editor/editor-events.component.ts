import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { materialImports } from '../../shared/material';
import { EventsService } from '../events/events.service';
import { EnumsService } from '../events/enums.service';
import { EventDto, CreateEventRequest, EventStatusOption, EventStatusCode } from '../events/event.model';
import { formatApiError } from '../../shared/models/api-error';
import { take } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { CancelConfirmDialogComponent } from '../../components/cancel-confirm-dialog/cancel-confirm-dialog.component';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';
import { EnumOption } from '../events/enums.service';

@Component({
  selector: 'app-editor-events',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, materialImports, StatusBadgeComponent, RouterLink],
  templateUrl: './editor-events.component.html',
  styleUrls: ['./editor-events.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorEventsComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly events = inject(EventsService);
  private readonly enums = inject(EnumsService);
  private readonly router = inject(Router);
  // UI change bus merged into EventsService
  private readonly dialog = inject(MatDialog);

  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly items = signal<EventDto[]>([]);
  readonly error = signal<string | null>(null);
  readonly statusOptions = signal<EventStatusOption[]>([]);
  readonly typeOptions = signal<EnumOption[]>([]);
  readonly durationPreview = signal<{ hours: number; minutes: number } | null>(null);
  readonly timeOptions = signal<string[]>([]);
  timeError: boolean = false;

  readonly form = this.fb.group({
    eventName: ['', [Validators.required, Validators.maxLength(200)]],
    type: [''],
    dateStart: ['', Validators.required],
    dateEnd: ['', Validators.required],
    timeStart: ['', Validators.required],
    periodStart: ['AM'],
    timeEnd: ['', Validators.required],
    periodEnd: ['AM'],
    eventLocation: [''],
    eventDescription: [''],
  });

  editId: number | null = null;
  // Status colors for calendar legend + mapping (Mine view uses status emphasis)
  readonly statusColors: Record<string,string> = {
    PUBLISHED: '#58a6ff',
    DRAFT: '#e2c76e',
    UNPUBLISHED: '#a08fe0',
    CANCELLED: '#ff6b6b'
  };

  constructor() {
    this.load();
    this.enums.getEventStatuses().pipe(take(1)).subscribe({
      next: (opts) => this.statusOptions.set(opts),
      error: () => this.statusOptions.set([])
    });
    this.enums.getEventTypes().pipe(take(1)).subscribe({
      next: (opts) => this.typeOptions.set(opts),
      error: () => this.typeOptions.set([])
    });
    // Build 12-hour time options in 15-min increments (hh:mm)
    const opts: string[] = [];
    for (let h = 1; h <= 12; h++) {
      for (let m = 0; m < 60; m += 15) {
        opts.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      }
    }
    this.timeOptions.set(opts);
    this.form.valueChanges.subscribe(() => {
      this.updateDurationPreview();
      const v = this.form.value as any;
      this.timeError = !!v.dateStart && !!v.timeStart && !!v.dateEnd && !!v.timeEnd && !this.isEndAfterStart(v.dateStart, v.timeStart, v.dateEnd, v.timeEnd);
    });
  }

  ngOnDestroy(): void {}

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
        if (err?.status === 401 || err?.status === 403) {
          this.error.set('You do not have permission to view your events.');
        } else {
          this.error.set(formatApiError(err) || 'Failed to load events.');
        }
        this.loading.set(false);
      }
    });
  }

  resetForm() {
    this.form.reset();
    this.editId = null;
    this.durationPreview.set(null);
    this.timeError = false;
  }

  private toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  private toLocalTimeString(d: Date): string {
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }

  private to12HourParts(time24: string): { time: string; period: 'AM'|'PM' } {
    if (!time24) return { time: '', period: 'AM' };
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const period: 'AM'|'PM' = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h = h - 12;
    const time = `${String(h).padStart(2,'0')}:${mStr}`;
    return { time, period };
  }

  private from12To24(time12: string, period: 'AM'|'PM'): string {
    if (!time12) return '';
    const [hStr, mStr] = time12.split(':');
    let h = parseInt(hStr, 10);
    if (period === 'AM') {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h = h + 12;
    }
    return `${String(h).padStart(2,'0')}:${mStr}`;
  }

  edit(item: EventDto) {
    this.router.navigate(['/editor/create', item.eventId]);
  }

  onCalendarEventClick(id: number) {
    this.router.navigate(['/editor/create', id]);
  }

  onCalendarRange(range: { start: string; end: string }) {
    // Reload events scoped to visible calendar range (optional enhancement)
    this.load(range);
  }

  delete(item: EventDto) {
    if (!confirm(`Delete "${item.eventName}"? This cannot be undone.`)) return;
    this.saving.set(true);
    this.events.delete(item.eventId).pipe(take(1)).subscribe({
  next: () => { this.saving.set(false); this.load(); this.events.notifyChanged(); },
      error: (err) => { console.error(err); this.saving.set(false); this.error.set(formatApiError(err)); }
    });
  }

  submit() {
    if (this.form.invalid) return;
    const v = this.form.value as any;
    // Compose local date+time into ISO
    const toIsoFromParts = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();
    if (!this.isEndAfterStart(v.dateStart, v.timeStart, v.dateEnd, v.timeEnd)) {
      this.timeError = true;
      return;
    }
    this.timeError = false;
    const start24 = this.from12To24(v.timeStart, v.periodStart);
    const end24 = this.from12To24(v.timeEnd, v.periodEnd);
    const payload: CreateEventRequest = {
      eventName: v.eventName,
      type: v.type ? String(v.type).toUpperCase() : undefined,
      startAt: toIsoFromParts(v.dateStart, start24),
      endAt: toIsoFromParts(v.dateEnd, end24),
      eventLocation: v.eventLocation || undefined,
      eventDescription: v.eventDescription || undefined,
    };

    this.saving.set(true);
    const req$ = this.editId
      ? this.events.updateRaw(this.editId, payload)
      : this.events.createRaw(payload);

    req$.pipe(take(1)).subscribe({
  next: () => { this.saving.set(false); this.resetForm(); this.load(); this.events.notifyChanged(); },
      error: (err) => { console.error(err); this.saving.set(false); this.error.set(formatApiError(err)); }
    });
  }

  onStatusChange(item: EventDto, target: EventStatusCode) {
    if (target === item.status) return;
    if (target === 'PUBLISHED') {
      this.saving.set(true);
      this.events.publishEvent(item.eventId).pipe(take(1)).subscribe({
  next: () => { this.saving.set(false); this.load(); this.events.notifyChanged(); },
        error: (err) => { console.error(err); this.saving.set(false); this.error.set(formatApiError(err)); }
      });
      return;
    }
    if (target === 'UNPUBLISHED') {
      this.saving.set(true);
      this.events.unpublishEvent(item.eventId).pipe(take(1)).subscribe({
  next: () => { this.saving.set(false); this.load(); this.events.notifyChanged(); },
        error: (err) => { console.error(err); this.saving.set(false); this.error.set(formatApiError(err)); }
      });
      return;
    }
    if (target === 'CANCELLED') {
      const ref = this.dialog.open(CancelConfirmDialogComponent, { data: { eventName: item.eventName } });
      ref.afterClosed().pipe(take(1)).subscribe((ok: boolean) => {
        if (!ok) return;
        this.saving.set(true);
        this.events.cancelEvent(item.eventId).pipe(take(1)).subscribe({
          next: () => { this.saving.set(false); this.load(); this.events.notifyChanged(); },
          error: (err) => { console.error(err); this.saving.set(false); this.error.set(formatApiError(err)); }
        });
      });
    }
  }

  private parseParts(date: string, time: string): Date | null {
    if (!date || !time) return null;
    const d = new Date(`${date}T${time}`);
    return isNaN(d.getTime()) ? null : d;
  }

  private isEndAfterStart(ds: string, ts: string, de: string, te: string): boolean {
    const v = this.form.value as any;
    const ts24 = this.from12To24(ts, v.periodStart);
    const te24 = this.from12To24(te, v.periodEnd);
    const start = this.parseParts(ds, ts24);
    const end = this.parseParts(de, te24);
    if (!start || !end) return false;
    return end.getTime() > start.getTime();
  }

  setDurationMinutes(minutes: number) {
    const v = this.form.value as any;
    const ts24 = this.from12To24(v.timeStart, v.periodStart);
    const start = this.parseParts(v.dateStart, ts24);
    if (!start) return;
    const end = new Date(start.getTime() + minutes * 60_000);
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, '0');
    const day = String(end.getDate()).padStart(2, '0');
    const h = String(end.getHours()).padStart(2, '0');
    const min = String(end.getMinutes()).padStart(2, '0');
    const { time, period } = this.to12HourParts(`${h}:${min}`);
    this.form.patchValue({
      dateEnd: `${y}-${m}-${day}`,
      timeEnd: time,
      periodEnd: period
    }, { emitEvent: true });
    this.form.markAsDirty();
    this.form.updateValueAndValidity();
    this.updateDurationPreview();
    this.timeError = false;
  }

  private updateDurationPreview() {
    const v = this.form.value as any;
    const s24 = this.from12To24(v.timeStart, v.periodStart);
    const e24 = this.from12To24(v.timeEnd, v.periodEnd);
    const start = this.parseParts(v.dateStart, s24);
    const end = this.parseParts(v.dateEnd, e24);
    if (!start || !end) { this.durationPreview.set(null); return; }
    const diff = Math.max(0, end.getTime() - start.getTime());
    const minutes = Math.round(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    this.durationPreview.set({ hours, minutes: mins });
  }
}
