import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { materialImports } from '../../../shared/material';
import { EventsService } from '../../events/events.service';
import { EnumsService, EnumOption } from '../../events/enums.service';
import { CreateEventRequest, EventDto } from '../../events/event.model';
import { formatApiError } from '../../../shared/models/api-error';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-editor-create-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, materialImports],
  templateUrl: './editor-create-event.component.html',
  styleUrls: ['./editor-create-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorCreateEventComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly events = inject(EventsService);
  private readonly enums = inject(EnumsService);

  readonly saving = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly typeOptions = signal<EnumOption[]>([]);
  readonly durationPreview = signal<{ hours: number; minutes: number } | null>(null);
  readonly timeOptions = signal<string[]>([]);

  editId: number | null = null;

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

  constructor() {
    // Build 12-hour time options in 15-min increments (hh:mm)
    const opts: string[] = [];
    for (let h = 1; h <= 12; h++) {
      for (let m = 0; m < 60; m += 15) {
        opts.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      }
    }
    this.timeOptions.set(opts);

    this.enums.getEventTypes().pipe(take(1)).subscribe({
      next: (opts) => this.typeOptions.set(opts),
      error: () => this.typeOptions.set([])
    });

    this.form.valueChanges.subscribe(() => {
      this.updateDurationPreview();
    });

    // If editing, load event and patch
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.editId = Number(idParam);
      this.events.get(this.editId).pipe(take(1)).subscribe({
        next: (e) => this.patchFromEvent(e),
        error: (err) => this.error.set(formatApiError(err) || 'Failed to load event')
      });
    }
  }

  private patchFromEvent(item: EventDto) {
    const start = item.startAt ? new Date(item.startAt) : null;
    const end = item.endAt ? new Date(item.endAt) : null;
    this.form.patchValue({
      eventName: item.eventName,
      type: item.type ? String(item.type).toUpperCase() : '',
      dateStart: start ? this.toLocalDateString(start) : '',
      dateEnd: end ? this.toLocalDateString(end) : '',
      ...(start ? (() => { const p = this.to12HourParts(this.toLocalTimeString(start)); return { timeStart: p.time, periodStart: p.period }; })() : { timeStart: '', periodStart: 'AM' }),
      ...(end ? (() => { const p = this.to12HourParts(this.toLocalTimeString(end)); return { timeEnd: p.time, periodEnd: p.period }; })() : { timeEnd: '', periodEnd: 'AM' }),
      eventLocation: item.eventLocation ?? '',
      eventDescription: item.eventDescription ?? '',
    });
    this.updateDurationPreview();
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
    if (h === 0) h = 12; else if (h > 12) h = h - 12;
    const time = `${String(h).padStart(2,'0')}:${mStr}`;
    return { time, period };
  }
  private from12To24(time12: string, period: 'AM'|'PM'): string {
    if (!time12) return '';
    const [hStr, mStr] = time12.split(':');
    let h = parseInt(hStr, 10);
    if (period === 'AM') { if (h === 12) h = 0; } else { if (h !== 12) h = h + 12; }
    return `${String(h).padStart(2,'0')}:${mStr}`;
  }
  private parseParts(date: string, time: string): Date | null {
    if (!date || !time) return null;
    const d = new Date(`${date}T${time}`);
    return isNaN(d.getTime()) ? null : d;
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
  }

  submit() {
    if (this.form.invalid) return;
    const v = this.form.value as any;
    const toIsoFromParts = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();
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
    const req$ = this.editId ? this.events.updateRaw(this.editId, payload) : this.events.createRaw(payload);
    req$.pipe(take(1)).subscribe({
      next: () => { this.saving.set(false); this.router.navigate(['/editor/manage']); this.events.notifyChanged(); },
      error: (err) => { this.saving.set(false); this.error.set(formatApiError(err) || 'Failed to save event'); }
    });
  }

  cancel() {
    this.router.navigate(['/editor/manage']);
  }
}
