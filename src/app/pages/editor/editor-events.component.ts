import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { materialImports } from '../../shared/material';
import { EventsService } from '../events/events.service';
import { EnumsService } from '../events/enums.service';
import { EventDto, CreateEventRequest, EventStatusOption, EventStatusCode } from '../events/event.model';
import { formatApiError } from '../../shared/models/api-error';
import { take } from 'rxjs/operators';
import { AppUserService } from '../../shared/services/app-user.service';
import { MatDialog } from '@angular/material/dialog';
import { CancelConfirmDialogComponent } from '../../components/cancel-confirm-dialog/cancel-confirm-dialog.component';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';
import { EnumOption } from '../events/enums.service';

@Component({
  selector: 'app-editor-events',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, materialImports, StatusBadgeComponent],
  templateUrl: './editor-events.component.html',
  styleUrls: ['./editor-events.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorEventsComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly events = inject(EventsService);
  private readonly enums = inject(EnumsService);
  // UI change bus merged into EventsService
  private readonly users = inject(AppUserService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly items = signal<EventDto[]>([]);
  readonly error = signal<string | null>(null);
  readonly statusOptions = signal<EventStatusOption[]>([]);
  readonly typeOptions = signal<EnumOption[]>([]);
  private meId: number | null = null;

  readonly form = this.fb.group({
    eventName: ['', [Validators.required, Validators.maxLength(200)]],
    type: [''],
    dateStart: ['', Validators.required],
    dateEnd: ['', Validators.required],
    timeStart: ['', Validators.required],
    timeEnd: ['', Validators.required],
    eventLocation: [''],
    eventDescription: [''],
  });

  editId: number | null = null;

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
  }

  ngOnDestroy(): void {}

  load() {
    this.loading.set(true);
    // Load current user then filter events by createdByUserId === me.id
    this.users.getMe().pipe(take(1)).subscribe({
      next: (me) => {
        this.meId = me?.id ?? null;
        this.events.list({ page: 0, size: 100, sort: 'startAt,asc' }).pipe(take(1)).subscribe({
          next: (resp) => {
            const rows: EventDto[] = Array.isArray((resp as any)) ? (resp as any as EventDto[]) : (resp?.items ?? []);
            const mine = this.meId != null ? rows.filter((r: EventDto) => r.createdByUserId === this.meId) : rows;
            this.items.set(mine as EventDto[]);
            this.loading.set(false);
          },
          error: (err) => { console.error(err); this.error.set(formatApiError(err)); this.loading.set(false); }
        });
      },
      error: (err) => { console.error(err); this.error.set('Failed to load user'); this.loading.set(false); }
    });
  }

  resetForm() {
    this.form.reset();
    this.editId = null;
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

  edit(item: EventDto) {
    this.editId = item.eventId;
    const start = item.startAt ? new Date(item.startAt) : null;
    const end = item.endAt ? new Date(item.endAt) : null;
    this.form.patchValue({
      eventName: item.eventName,
      type: item.type ? String(item.type).toUpperCase() : '',
      dateStart: start ? this.toLocalDateString(start) : '',
      dateEnd: end ? this.toLocalDateString(end) : '',
      timeStart: start ? this.toLocalTimeString(start) : '',
      timeEnd: end ? this.toLocalTimeString(end) : '',
      eventLocation: item.eventLocation ?? '',
      eventDescription: item.eventDescription ?? '',
    });
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
    const payload: CreateEventRequest = {
      eventName: v.eventName,
      type: v.type ? String(v.type).toUpperCase() : undefined,
      startAt: toIsoFromParts(v.dateStart, v.timeStart),
      endAt: toIsoFromParts(v.dateEnd, v.timeEnd),
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
}
