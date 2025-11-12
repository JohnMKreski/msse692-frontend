import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { materialImports } from '../../shared/material';
import { EventsService } from '../events/events.service';
import { EnumsService } from '../events/enums.service';
import { EventDto, CreateEventRequest, EventStatusOption } from '../events/event.model';
import { take } from 'rxjs/operators';
import { EventsUiService } from '../../shared/events-ui.service';

@Component({
  selector: 'app-editor-events',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, materialImports],
  templateUrl: './editor-events.component.html',
  styleUrls: ['./editor-events.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorEventsComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly events = inject(EventsService);
  private readonly enums = inject(EnumsService);
  private readonly ui = inject(EventsUiService);

  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly items = signal<EventDto[]>([]);
  readonly error = signal<string | null>(null);
  readonly statusOptions = signal<EventStatusOption[]>([]);

  readonly form = this.fb.group({
    eventName: ['', [Validators.required, Validators.maxLength(200)]],
    type: [''],
    startAt: ['', Validators.required],
    endAt: ['', Validators.required],
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
  }

  ngOnDestroy(): void {}

  load() {
    this.loading.set(true);
    this.events.list().pipe(take(1)).subscribe({
      next: (rows) => { this.items.set(rows); this.loading.set(false); },
      error: (err) => { console.error(err); this.error.set('Failed to load events'); this.loading.set(false); }
    });
  }

  resetForm() {
    this.form.reset();
    this.editId = null;
  }

  edit(item: EventDto) {
    this.editId = item.eventId;
    this.form.patchValue({
      eventName: item.eventName,
      type: item.type ?? '',
      startAt: item.startAt?.slice(0,16),
      endAt: item.endAt?.slice(0,16),
      eventLocation: item.eventLocation ?? '',
      eventDescription: item.eventDescription ?? '',
    });
  }

  delete(item: EventDto) {
    if (!confirm(`Delete "${item.eventName}"? This cannot be undone.`)) return;
    this.saving.set(true);
    this.events.delete(item.eventId).pipe(take(1)).subscribe({
      next: () => { this.saving.set(false); this.load(); this.ui.notifyChanged(); },
      error: (err) => { console.error(err); this.saving.set(false); this.error.set('Delete failed'); }
    });
  }

  submit() {
    if (this.form.invalid) return;
    const v = this.form.value as unknown as CreateEventRequest;
    // Convert datetime-local to ISO if needed
    const toIso = (s?: string) => s ? new Date(s).toISOString() : '';
    const payload: CreateEventRequest = {
      eventName: v.eventName,
      type: v.type || undefined,
      startAt: toIso(v.startAt as unknown as string),
      endAt: toIso(v.endAt as unknown as string),
      eventLocation: v.eventLocation || undefined,
      eventDescription: v.eventDescription || undefined,
    };

    this.saving.set(true);
    const req$ = this.editId
      ? this.events.updateRaw(this.editId, payload)
      : this.events.createRaw(payload);

    req$.pipe(take(1)).subscribe({
      next: () => { this.saving.set(false); this.resetForm(); this.load(); this.ui.notifyChanged(); },
      error: (err) => { console.error(err); this.saving.set(false); this.error.set('Save failed'); }
    });
  }
}
