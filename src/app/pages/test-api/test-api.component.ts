import { ChangeDetectionStrategy, Component, signal, WritableSignal } from '@angular/core';
import { NgIf, NgFor, JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { formatApiError } from '../../shared/api-error';
import {
    ReactiveFormsModule,
    NonNullableFormBuilder,
    Validators,
    FormGroup,
    FormControl,
} from '@angular/forms';
import { EventsService } from '../events/events.service';
import { EnumsService, EnumOption } from '../events/enums.service';
import { CreateEventRequest } from '../events/event.model';
import { Auth } from '@angular/fire/auth';
import { getIdToken } from 'firebase/auth';

@Component({
    selector: 'app-test-api',
    standalone: true,
    imports: [NgIf, NgFor, JsonPipe, ReactiveFormsModule],
    template: `
        <section class="test-api">
            <h2>API Connectivity Test</h2>
            <div class="actions">
                <button (click)="pingList()">GET /api/events</button>
                <button (click)="createSample()">POST /api/events</button>
            </div>

            <!-- ADMIN: Get Roles by UID -->
            <form [formGroup]="adminForm" (ngSubmit)="getAdminRoles()" class="card">
                <h3>Admin: Get Roles by UID</h3>
                <div class="grid">
                    <label class="span-2">
                        UID
                        <input type="text" formControlName="uid" placeholder="Firebase UID" />
                    </label>
                </div>
                <div class="actions">
                    <button type="submit" [disabled]="adminForm.invalid || loading()">Get Roles</button>
                    <button type="button" (click)="forceRefreshToken()" [disabled]="refreshing()">Refresh Token</button>
                </div>
            </form>

            <!-- GET by ID -->
            <form [formGroup]="getForm" (ngSubmit)="getById()" class="card">
                <h3>Get Event by ID</h3>
                <div class="grid">
                    <label class="span-2">
                        ID
                        <input type="text" formControlName="id" placeholder="event id" />
                    </label>
                </div>
                <button type="submit" [disabled]="getForm.invalid || loading()">Get</button>
                <button
                    type="button"
                    (click)="loadUpdateFromBackend()"
                    [disabled]="getForm.invalid"
                >
                    Load into Update Form
                </button>
            </form>

            <form [formGroup]="form" (ngSubmit)="submitForm()" class="card">
                <h3>Create Event (Form)</h3>
                <div class="grid">
                    <label>
                        Event Name
                        <input type="text" formControlName="eventName" />
                    </label>
                    <label>
                        Type
                        <select formControlName="type">
                            <option *ngFor="let t of typeOptions" [value]="t.value">{{ t.label }}</option>
                        </select>
                    </label>
                    <label>
                        Start At
                        <input type="datetime-local" formControlName="startAt" />
                    </label>
                    <label>
                        End At
                        <input type="datetime-local" formControlName="endAt" />
                    </label>
                    <label>
                        Location
                        <input type="text" formControlName="eventLocation" />
                    </label>
                    <label class="span-2">
                        Description
                        <textarea rows="3" formControlName="eventDescription"></textarea>
                    </label>
                </div>
                <div class="errors" *ngIf="form.invalid && (form.dirty || form.touched)">
                    <div *ngIf="form.controls.endAt.errors?.['required']">endAt is required.</div>
                    <div *ngIf="form.errors?.['dateOrder']">endAt must be after startAt.</div>
                </div>
                <button type="submit" [disabled]="form.invalid || loading()">Submit</button>
            </form>

            <!-- UPDATE by ID -->
            <form [formGroup]="updateForm" (ngSubmit)="submitUpdate()" class="card">
                <h3>Update Event by ID (Full Payload)</h3>
                <div class="grid">
                    <label class="span-2">
                        ID
                        <input type="text" formControlName="id" placeholder="event id" />
                    </label>
                    <label>
                        Event Name
                        <input type="text" formControlName="eventName" />
                    </label>
                    <label>
                        Type
                        <select formControlName="type">
                            <option *ngFor="let t of typeOptions" [value]="t.value">{{ t.label }}</option>
                        </select>
                    </label>
                    <label>
                        Start At
                        <input type="datetime-local" formControlName="startAt" />
                    </label>
                    <label>
                        End At
                        <input type="datetime-local" formControlName="endAt" />
                    </label>
                    <label>
                        Location
                        <input type="text" formControlName="eventLocation" />
                    </label>
                    <label class="span-2">
                        Description
                        <textarea rows="3" formControlName="eventDescription"></textarea>
                    </label>
                </div>
                <div
                    class="errors"
                    *ngIf="updateForm.invalid && (updateForm.dirty || updateForm.touched)"
                >
                    <div *ngIf="updateForm.controls.endAt.errors?.['required']">
                        endAt is required.
                    </div>
                    <div *ngIf="updateForm.errors?.['dateOrder']">endAt must be after startAt.</div>
                </div>
                <button type="submit" [disabled]="updateForm.invalid || loading()">Update</button>
            </form>

            <!-- DELETE by ID -->
            <form [formGroup]="deleteForm" (ngSubmit)="deleteById()" class="card">
                <h3>Delete Event by ID</h3>
                <div class="grid">
                    <label class="span-2">
                        ID
                        <input type="text" formControlName="id" placeholder="event id" />
                    </label>
                </div>
                <button type="submit" [disabled]="deleteForm.invalid || loading()" class="danger">
                    Delete
                </button>
            </form>

            <div *ngIf="loading()">Loading...</div>

            <div *ngIf="error()" class="error">
                <strong>Error:</strong>
                <pre>{{ error() }}</pre>
            </div>

            <div *ngIf="events().length">
                <h3>Events ({{ events().length }})</h3>
                <div class="events-json-list">
                    <article class="event-json" *ngFor="let e of events(); let i = index">
                        <header class="event-json-header">
                            <span class="index-badge">Frontend Index: [{{ i }}]</span>
                            <strong>{{ e.eventName || 'Event' }}</strong>
                            <span class="muted" *ngIf="e.id">ID: #{{ e.id }}</span>
                            <!-- <button type="button" (click)="toggleExpand(i)">
                                {{ expanded()[i] ? 'Collapse' : 'Expand' }}
                            </button> -->
                        </header>
                        <pre *ngIf="expanded()[i]">{{ e | json }}</pre>
                    </article>
                </div>
            </div>

            <div *ngIf="lastResponse()">
                <h3>Last Response</h3>
                <pre>{{ lastResponse() | json }}</pre>
            </div>

            <div *ngIf="adminRoles()">
                <h3>Admin Roles Result</h3>
                <pre>{{ adminRoles() | json }}</pre>
            </div>
        </section>
    `,
    styles: [
        `
            .test-api {
                padding: 1rem;
                display: grid;
                gap: 1rem;
            }
            .actions {
                display: flex;
                gap: 0.5rem;
            }
            .card {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 1rem;
            }
            .grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 0.75rem;
            }
            .span-2 {
                grid-column: span 2;
            }
            label {
                display: grid;
                gap: 0.25rem;
                font-size: 0.9rem;
            }
            input,
            textarea {
                padding: 0.5rem;
                border: 1px solid #ccc;
                border-radius: 4px;
            }
            .error {
                color: #b00020;
                white-space: pre-wrap;
            }
            .errors {
                color: #b00020;
                margin-top: 0.5rem;
            }
            button {
                padding: 0.5rem 0.75rem;
            }
            .danger {
                background: #ffe5e5;
                border-color: #ffcccc;
            }
            .events-json-list {
                display: grid;
                gap: 0.75rem;
            }
            .event-json {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 0.75rem;
                background: #fff;
            }
            .event-json-header {
                display: flex;
                gap: 0.5rem;
                align-items: center;
                justify-content: flex-start;
                margin-bottom: 0.5rem;
            }
            .index-badge {
                font-family: monospace;
                background: #f3f4f6;
                padding: 0 0.4rem;
                border-radius: 4px;
            }
            .muted {
                color: #6b7280;
                font-size: 0.85rem;
            }
        `,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestApiComponent {
    loading: WritableSignal<boolean> = signal(false);
    refreshing: WritableSignal<boolean> = signal(false);
    error: WritableSignal<string | null> = signal(null);
    events: WritableSignal<any[]> = signal([]);
    expanded: WritableSignal<boolean[]> = signal([]);
    lastResponse: WritableSignal<any> = signal(null);
    adminRoles: WritableSignal<any | null> = signal(null);
    // Enum-backed options for EventType. Hydrated from backend on init with static fallback.
    typeOptions: EnumOption[] = [
        { value: 'CONCERT', label: 'Concert' },
        { value: 'FESTIVAL', label: 'Festival' },
        { value: 'PARTY', label: 'Party' },
        { value: 'OTHER', label: 'Other' },
    ];

    form!: FormGroup<{
        eventName: FormControl<string>;
        type: FormControl<string>;
        startAt: FormControl<string>;
        endAt: FormControl<string>;
        eventLocation: FormControl<string | null>;
        eventDescription: FormControl<string | null>;
    }>;

    getForm!: FormGroup<{ id: FormControl<string> }>;
    updateForm!: FormGroup<{
        id: FormControl<string>;
        eventName: FormControl<string>;
        type: FormControl<string>;
        startAt: FormControl<string>;
        endAt: FormControl<string>;
        eventLocation: FormControl<string | null>;
        eventDescription: FormControl<string | null>;
    }>;
    deleteForm!: FormGroup<{ id: FormControl<string> }>;
    adminForm!: FormGroup<{ uid: FormControl<string> }>;

    constructor(
        private readonly eventsService: EventsService,
        private readonly enumsService: EnumsService,
        private readonly fb: NonNullableFormBuilder,
        private readonly http: HttpClient,
        private readonly auth: Auth,
    ) {
        // Load enum options from backend. If empty/error, keep default list.
        this.enumsService.getEventTypes().subscribe((opts) => {
            if (opts && opts.length) {
                const currentCreate = this.form?.controls.type.value;
                const currentUpdate = this.updateForm?.controls.type.value;

                // Start with backend options
                let merged = [...opts];

                // Ensure current form values remain selectable even if not in fetched list
                if (currentCreate && !merged.some((o) => o.value === currentCreate)) {
                    merged = [...merged, { value: currentCreate, label: this.labelFromValue(currentCreate) }];
                }
                if (currentUpdate && !merged.some((o) => o.value === currentUpdate)) {
                    merged = [...merged, { value: currentUpdate, label: this.labelFromValue(currentUpdate) }];
                }

                this.typeOptions = merged;
            }
        });
        const now = new Date();
        const plusHour = new Date(now.getTime() + 60 * 60 * 1000);
        this.form = this.fb.group(
            {
                eventName: this.fb.control('Sample Event', { validators: [Validators.required] }),
                // Use enum constant values for payload compatibility; display shows labels
                type: this.fb.control(this.typeOptions[0].value, { validators: [Validators.required] }),
                startAt: this.fb.control(this.toLocalInput(now), {
                    validators: [Validators.required],
                }),
                endAt: this.fb.control(this.toLocalInput(plusHour), {
                    validators: [Validators.required],
                }),
                eventLocation: this.fb.control<string | null>('Test Runner'),
                eventDescription: this.fb.control<string | null>(
                    'Created from Test API component form',
                ),
            },
            { validators: [this.dateOrderValidator] },
        );

        this.getForm = this.fb.group({
            id: this.fb.control('', { validators: [Validators.required] }),
        });

        this.updateForm = this.fb.group(
            {
                id: this.fb.control('', { validators: [Validators.required] }),
                eventName: this.fb.control('Updated Event', { validators: [Validators.required] }),
                type: this.fb.control(this.typeOptions[0].value, { validators: [Validators.required] }),
                startAt: this.fb.control(this.toLocalInput(now), {
                    validators: [Validators.required],
                }),
                endAt: this.fb.control(this.toLocalInput(plusHour), {
                    validators: [Validators.required],
                }),
                eventLocation: this.fb.control<string | null>(''),
                eventDescription: this.fb.control<string | null>(''),
            },
            { validators: [this.dateOrderValidator] },
        );

        this.deleteForm = this.fb.group({
            id: this.fb.control('', { validators: [Validators.required] }),
        });

        this.adminForm = this.fb.group({
            uid: this.fb.control('', { validators: [Validators.required] }),
        });
    }

    pingList() {
        this.loading.set(true);
        this.error.set(null);
        this.eventsService.list({ page: 0, size: 25, sort: 'startAt,asc' }).subscribe({
            next: (resp) => {
                const items: any[] = Array.isArray((resp as any)) ? (resp as any as any[]) : (resp?.items ?? []);
                const normalized = (items ?? []).map((e: any) => ({
                    ...e, // <-- brings in eventId, eventName, startAt, endAt, eventLocation, etc.
                }));
                this.events.set(normalized);
                this.expanded.set(new Array(normalized.length).fill(true));
                this.lastResponse.set({ ok: true, count: items?.length ?? 0 });
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(this.stringifyError(err));
                this.loading.set(false);
            },
        });
    }

    toggleExpand(index: number) {
        const current = this.expanded();
        if (!current[index] && typeof current[index] === 'undefined') return;
        const next = [...current];
        next[index] = !next[index];
        this.expanded.set(next);
    }

    getById() {
        if (this.getForm.invalid) return;
        this.loading.set(true);
        this.error.set(null);
        const id = this.getForm.controls.id.value;
        this.eventsService.get(id).subscribe({
            next: (data) => {
                this.lastResponse.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(this.stringifyError(err));
                this.loading.set(false);
            },
        });
    }

    loadUpdateFromBackend() {
        if (this.getForm.invalid) return;
        const id = this.getForm.controls.id.value;
        this.eventsService.get(id).subscribe({
            next: (data: any) => {
                const eventName = data.eventName ?? data.title ?? 'Updated Event';
                const type = this.toEnumValue(data.type ?? data.typeDisplayName ?? 'Concert');
                const startAtIso = data.startAt ?? data.start ?? new Date().toISOString();
                const endAtIso =
                    data.endAt ?? data.end ?? new Date(Date.now() + 3600000).toISOString();
                const eventLocation = data.eventLocation ?? data.location ?? '';
                const eventDescription = data.eventDescription ?? '';

                this.updateForm.setValue({
                    id,
                    eventName,
                    type,
                    startAt: this.fromIsoToLocalInput(startAtIso),
                    endAt: this.fromIsoToLocalInput(endAtIso),
                    eventLocation,
                    eventDescription,
                });
            },
            error: (err) => this.error.set(this.stringifyError(err)),
        });
    }

    submitUpdate() {
        if (this.updateForm.invalid) return;
        this.loading.set(true);
        this.error.set(null);
        const v = this.updateForm.getRawValue();
        const payload: CreateEventRequest = {
            eventName: v.eventName,
            type: v.type,
            startAt: this.toIso(v.startAt),
            endAt: this.toIso(v.endAt),
            eventLocation: v.eventLocation || undefined,
            eventDescription: v.eventDescription || undefined,
        };
        this.eventsService.updateRaw(v.id, payload).subscribe({
            next: (updated) => {
                this.lastResponse.set(updated);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(this.stringifyError(err));
                this.loading.set(false);
            },
        });
    }

    deleteById() {
        if (this.deleteForm.invalid) return;
        this.loading.set(true);
        this.error.set(null);
        const id = this.deleteForm.controls.id.value;
        this.eventsService.delete(id).subscribe({
            next: () => {
                this.lastResponse.set({ deleted: id });
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(this.stringifyError(err));
                this.loading.set(false);
            },
        });
    }

    // ADMIN: Get Roles by UID using the browser token via interceptor
    getAdminRoles() {
        if (this.adminForm.invalid) return;
        this.loading.set(true);
        this.error.set(null);
        this.adminRoles.set(null);
        const uid = this.adminForm.controls.uid.value;
        this.http
            .get(`/api/admin/users/${encodeURIComponent(uid)}/roles`)
            .subscribe({
                next: (res) => {
                    this.adminRoles.set(res);
                    this.loading.set(false);
                },
                error: (err) => {
                    this.error.set(this.stringifyError(err));
                    this.loading.set(false);
                },
            });
    }

    // Optionally force-refresh the Firebase ID token to pick up updated custom claims
    async forceRefreshToken() {
        try {
            this.refreshing.set(true);
            this.error.set(null);
            const user = this.auth.currentUser;
            if (!user) {
                this.error.set('Not signed in.');
                return;
            }
            const token = await getIdToken(user, true);
            // Provide a small confirmation of success without exposing the whole token
            this.lastResponse.set({ tokenRefreshed: true, tokenPreview: token?.slice(0, 16) + '...' });
        } catch (e) {
            this.error.set(this.stringifyError(e));
        } finally {
            this.refreshing.set(false);
        }
    }

    createSample() {
        this.loading.set(true);
        this.error.set(null);
        const sample: CreateEventRequest = {
            eventName: 'Sample Event',
            type: 'CONCERT',
            startAt: new Date().toISOString(),
            endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            eventLocation: 'Test Runner',
            eventDescription: 'Created from Test API component',
        };
        this.eventsService.createRaw(sample).subscribe({
            next: (created) => {
                this.lastResponse.set(created);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(this.stringifyError(err));
                this.loading.set(false);
            },
        });
    }

    submitForm() {
        if (this.form.invalid) return;
        this.loading.set(true);
        this.error.set(null);
        const v = this.form.getRawValue();
        const payload: CreateEventRequest = {
            eventName: v.eventName,
            type: v.type,
            startAt: this.toIso(v.startAt),
            endAt: this.toIso(v.endAt),
            eventLocation: v.eventLocation || undefined,
            eventDescription: v.eventDescription || undefined,
        };
        this.eventsService.createRaw(payload).subscribe({
            next: (created) => {
                this.lastResponse.set(created);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(this.stringifyError(err));
                this.loading.set(false);
            },
        });
    }

    private dateOrderValidator = (group: any) => {
        const start = group.get('startAt')?.value;
        const end = group.get('endAt')?.value;
        if (!start || !end) return null;
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        return e > s ? null : { dateOrder: true };
    };

    private toLocalInput(d: Date): string {
        // yyyy-MM-ddTHH:mm for datetime-local
        const pad = (n: number) => `${n}`.padStart(2, '0');
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mi = pad(d.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    }

    private toIso(local: string): string {
        // interpret local datetime (without timezone) as local time and convert to ISO string
        const d = new Date(local);
        return d.toISOString();
    }

    private fromIsoToLocalInput(iso: string): string {
        return this.toLocalInput(new Date(iso));
    }

    private stringifyError(err: any): string {
        return formatApiError(err);
    }

    // Helpers to convert between backend display names and enum constants
    private toEnumValue(input: string): string {
        if (!input) return this.typeOptions[0].value;
        // Prefer exact label match first
        const byLabel = this.typeOptions.find((t) => t.label.toLowerCase() === input.toLowerCase());
        if (byLabel) return byLabel.value;
        // Fallback: assume already a constant or upper-case it
        const normalized = input.trim().toUpperCase();
        const byValue = this.typeOptions.find((t) => t.value === normalized);
        return byValue ? byValue.value : this.typeOptions[this.typeOptions.length - 1].value; // default OTHER
    }

    // Returns a display label for a given enum value using current options or a title-cased fallback.
    private labelFromValue(value: string): string {
        const found = this.typeOptions.find((t) => t.value === value);
        if (found) return found.label;
        const lower = value?.toLowerCase() ?? '';
        return lower.charAt(0).toUpperCase() + lower.slice(1).toLowerCase();
    }
}
