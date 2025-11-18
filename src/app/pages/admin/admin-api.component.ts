import { ChangeDetectionStrategy, Component, WritableSignal, signal } from '@angular/core';
import { CommonModule, JsonPipe, NgFor, NgIf, DatePipe } from '@angular/common';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators, FormControl, FormGroup } from '@angular/forms';
import { EventsService } from '../events/events.service';
import { EnumsService, EnumOption } from '../events/enums.service';
import { AppUserService } from '../../shared/services/app-user.service';
import { ProfileService } from '../../shared/services/profile.service';
import { CreateEventRequest, EventDto, EventAudit } from '../events/event.model';
import { HttpClient } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { getIdToken } from 'firebase/auth';
import { formatApiError } from '../../shared/models/api-error';

@Component({
  selector: 'app-admin-api',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, JsonPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './admin-api.component.html',
  styleUrls: ['./admin-api.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminApiComponent {
  // Shared state
  loading: WritableSignal<boolean> = signal(false);
  error: WritableSignal<string | null> = signal(null);
  last: WritableSignal<any | null> = signal(null);

  // Events
  events: WritableSignal<EventDto[]> = signal([]);
  typeOptions: EnumOption[] = [];
  listParams = { page: 0, size: 25, sort: 'startAt,asc' };
  getForm!: FormGroup<{ id: FormControl<string> }>;
  deleteForm!: FormGroup<{ id: FormControl<string> }>;
  publishForm!: FormGroup<{ id: FormControl<string> }>;
  unpublishForm!: FormGroup<{ id: FormControl<string> }>;
  cancelForm!: FormGroup<{ id: FormControl<string> }>;
  auditsForm!: FormGroup<{ id: FormControl<string>; limit: FormControl<number> }>;
  createForm!: FormGroup<{
    eventName: FormControl<string>;
    type: FormControl<string>;
    startAt: FormControl<string>;
    endAt: FormControl<string>;
    eventLocation: FormControl<string | null>;
    eventDescription: FormControl<string | null>;
  }>;
  updateForm!: FormGroup<{
    id: FormControl<string>;
    eventName: FormControl<string>;
    type: FormControl<string>;
    startAt: FormControl<string>;
    endAt: FormControl<string>;
    eventLocation: FormControl<string | null>;
    eventDescription: FormControl<string | null>;
  }>;
  audits: WritableSignal<EventAudit[]> = signal([]);

  // AppUsers
  meAppUser = signal<any | null>(null);

  // Profile
  meProfile = signal<any | null>(null);
  profileForm!: FormGroup<{ displayName: FormControl<string> }>;

  // Enums
  eventStatuses = signal<any[]>([]);

  // Auth/Admin Users
  adminForm!: FormGroup<{ uid: FormControl<string> }>;
  tokenPreview = signal<string | null>(null);
  adminRoles = signal<any | null>(null);

  constructor(
    private readonly fb: NonNullableFormBuilder,
    private readonly eventsSvc: EventsService,
    private readonly enumsSvc: EnumsService,
    private readonly appUsers: AppUserService,
    private readonly profiles: ProfileService,
    private readonly http: HttpClient,
    private readonly auth: Auth,
  ) {
    const now = new Date();
    const plusHour = new Date(now.getTime() + 60 * 60 * 1000);

    this.getForm = this.fb.group({ id: this.fb.control('', { validators: [Validators.required] }) });
    this.deleteForm = this.fb.group({ id: this.fb.control('', { validators: [Validators.required] }) });
    this.publishForm = this.fb.group({ id: this.fb.control('', { validators: [Validators.required] }) });
    this.unpublishForm = this.fb.group({ id: this.fb.control('', { validators: [Validators.required] }) });
    this.cancelForm = this.fb.group({ id: this.fb.control('', { validators: [Validators.required] }) });
    this.auditsForm = this.fb.group({ id: this.fb.control('', { validators: [Validators.required] }), limit: this.fb.control(10) });

    this.createForm = this.fb.group({
      eventName: this.fb.control('Sample Event', { validators: [Validators.required] }),
      type: this.fb.control('CONCERT', { validators: [Validators.required] }),
      startAt: this.fb.control(this.toLocalInput(now), { validators: [Validators.required] }),
      endAt: this.fb.control(this.toLocalInput(plusHour), { validators: [Validators.required] }),
      eventLocation: this.fb.control<string | null>(''),
      eventDescription: this.fb.control<string | null>('Created from Admin API'),
    });
    this.updateForm = this.fb.group({
      id: this.fb.control('', { validators: [Validators.required] }),
      eventName: this.fb.control('Updated Event', { validators: [Validators.required] }),
      type: this.fb.control('CONCERT', { validators: [Validators.required] }),
      startAt: this.fb.control(this.toLocalInput(now), { validators: [Validators.required] }),
      endAt: this.fb.control(this.toLocalInput(plusHour), { validators: [Validators.required] }),
      eventLocation: this.fb.control<string | null>(''),
      eventDescription: this.fb.control<string | null>(''),
    });

    // Prefetch enums
    this.enumsSvc.getEventTypes().subscribe((opts) => (this.typeOptions = opts && opts.length ? opts : this.typeOptions));
    this.enumsSvc.getEventStatuses().subscribe((opts) => this.eventStatuses.set(opts || []));
  }

  // ===== Events =====
  listEvents() {
    this.loading.set(true); this.error.set(null);
    this.eventsSvc.list(this.listParams).subscribe({
      next: (resp: any) => {
        const items: EventDto[] = Array.isArray(resp) ? resp : (resp?.items ?? []);
        this.events.set(items || []);
        this.last.set({ ok: true, count: items?.length ?? 0 });
        this.loading.set(false);
      },
      error: (err) => { this.error.set(formatApiError(err)); this.loading.set(false); }
    });
  }
  getEvent() {
    if (this.getForm.invalid) return;
    const id = this.getForm.controls.id.value;
    this.loading.set(true); this.error.set(null);
    this.eventsSvc.get(id).subscribe({
      next: (data) => { this.last.set(data); this.loading.set(false); },
      error: (err) => { this.error.set(formatApiError(err)); this.loading.set(false); }
    });
  }
  createEvent() {
    if (this.createForm.invalid) return;
    const v = this.createForm.getRawValue();
    const payload: CreateEventRequest = {
      eventName: v.eventName,
      type: v.type,
      startAt: this.toIso(v.startAt),
      endAt: this.toIso(v.endAt),
      eventLocation: v.eventLocation || undefined,
      eventDescription: v.eventDescription || undefined,
    };
    this.loading.set(true); this.error.set(null);
    this.eventsSvc.createRaw(payload).subscribe({
      next: (res) => { this.last.set(res); this.loading.set(false); },
      error: (err) => { this.error.set(formatApiError(err)); this.loading.set(false); }
    });
  }
  updateEvent() {
    if (this.updateForm.invalid) return;
    const v = this.updateForm.getRawValue();
    const payload: CreateEventRequest = {
      eventName: v.eventName,
      type: v.type,
      startAt: this.toIso(v.startAt),
      endAt: this.toIso(v.endAt),
      eventLocation: v.eventLocation || undefined,
      eventDescription: v.eventDescription || undefined,
    };
    this.loading.set(true); this.error.set(null);
    this.eventsSvc.updateRaw(v.id, payload).subscribe({
      next: (res) => { this.last.set(res); this.loading.set(false); },
      error: (err) => { this.error.set(formatApiError(err)); this.loading.set(false); }
    });
  }
  deleteEvent() {
    if (this.deleteForm.invalid) return;
    const id = this.deleteForm.controls.id.value;
    this.loading.set(true); this.error.set(null);
    this.eventsSvc.delete(id).subscribe({
      next: () => { this.last.set({ deleted: id }); this.loading.set(false); },
      error: (err) => { this.error.set(formatApiError(err)); this.loading.set(false); }
    });
  }
  publishEvent() { this.transition('publish', this.publishForm); }
  unpublishEvent() { this.transition('unpublish', this.unpublishForm); }
  cancelEvent() { this.transition('cancel', this.cancelForm); }
  private transition(kind: 'publish'|'unpublish'|'cancel', form: FormGroup<{ id: FormControl<string> }>) {
    if (form.invalid) return; const id = form.controls.id.value;
    this.loading.set(true); this.error.set(null);
    const call = kind === 'publish' ? this.eventsSvc.publishEvent(id)
      : kind === 'unpublish' ? this.eventsSvc.unpublishEvent(id)
      : this.eventsSvc.cancelEvent(id);
    call.subscribe({ next: (res) => { this.last.set(res); this.loading.set(false); }, error: (err) => { this.error.set(formatApiError(err)); this.loading.set(false); } });
  }
  getAudits() {
    if (this.auditsForm.invalid) return;
    const v = this.auditsForm.getRawValue();
    this.loading.set(true); this.error.set(null);
    this.eventsSvc.getAudits(v.id, v.limit ?? 10).subscribe({
      next: (rows) => { this.audits.set(rows || []); this.loading.set(false); },
      error: (err) => { this.error.set(formatApiError(err)); this.loading.set(false); }
    });
  }

  // ===== AppUsers =====
  loadMeAppUser() {
    this.appUsers.getMe().subscribe({ next: (me) => this.meAppUser.set(me), error: (e) => this.error.set(formatApiError(e)) });
  }

  // ===== Profile =====
  loadMeProfile() {
    this.profiles.getMe().subscribe({ next: (p) => this.meProfile.set(p), error: (e) => this.error.set(formatApiError(e)) });
  }
  upsertProfile() {
    if (this.profileForm.invalid) return;
    const name = this.profileForm.controls.displayName.value;
    this.profiles.upsert({ displayName: name }).subscribe({ next: (p) => this.meProfile.set(p), error: (e) => this.error.set(formatApiError(e)) });
  }

  // ===== Auth / Admin Users =====
  async refreshToken() {
    try {
      const user = this.auth.currentUser; if (!user) { this.error.set('Not signed in'); return; }
      const token = await getIdToken(user, true);
      this.tokenPreview.set(token.slice(0, 16) + '...');
      this.last.set({ tokenRefreshed: true, preview: this.tokenPreview() });
    } catch (e) { this.error.set(formatApiError(e)); }
  }
  getAdminRoles() {
    if (this.adminForm.invalid) return; const uid = this.adminForm.controls.uid.value;
    this.http.get(`/api/admin/users/${encodeURIComponent(uid)}/roles`).subscribe({
      next: (res) => this.adminRoles.set(res),
      error: (e) => this.error.set(formatApiError(e))
    });
  }

  // ===== Utilities =====
  ngOnInit() {
    this.profileForm = this.fb.group({ displayName: this.fb.control('', { validators: [Validators.required] }) });
    this.adminForm = this.fb.group({ uid: this.fb.control('', { validators: [Validators.required] }) });
  }
  private toLocalInput(d: Date): string { const pad = (n: number) => `${n}`.padStart(2, '0'); const yyyy = d.getFullYear(); const mm = pad(d.getMonth() + 1); const dd = pad(d.getDate()); const hh = pad(d.getHours()); const mi = pad(d.getMinutes()); return `${yyyy}-${mm}-${dd}T${hh}:${mi}`; }
  private toIso(local: string): string { return new Date(local).toISOString(); }
}
