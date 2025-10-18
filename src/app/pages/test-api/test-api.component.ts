import { ChangeDetectionStrategy, Component, signal, WritableSignal } from '@angular/core';
import { NgIf, NgFor, JsonPipe } from '@angular/common';
import {
    ReactiveFormsModule,
    NonNullableFormBuilder,
    Validators,
    FormGroup,
    FormControl,
} from '@angular/forms';
import { EventsService } from '../events/events.service';
import { EventDto, CreateEventRequest } from '../events/event.model';

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
                        <input type="text" formControlName="type" placeholder="Concert" />
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
                        <input type="text" formControlName="type" />
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
                <ul>
                    <li *ngFor="let e of events()">{{ e.title }} — {{ e.start }}</li>
                </ul>
            </div>

            <div *ngIf="lastResponse()">
                <h3>Last Response</h3>
                <pre>{{ lastResponse() | json }}</pre>
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
        `,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestApiComponent {
    loading: WritableSignal<boolean> = signal(false);
    error: WritableSignal<string | null> = signal(null);
    events: WritableSignal<EventDto[]> = signal([]);
    lastResponse: WritableSignal<any> = signal(null);

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

    constructor(
        private readonly eventsService: EventsService,
        private readonly fb: NonNullableFormBuilder,
    ) {
        const now = new Date();
        const plusHour = new Date(now.getTime() + 60 * 60 * 1000);
        this.form = this.fb.group(
            {
                eventName: this.fb.control('Sample Event', { validators: [Validators.required] }),
                type: this.fb.control('Concert', { validators: [Validators.required] }),
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
                type: this.fb.control('Concert', { validators: [Validators.required] }),
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
    }

    pingList() {
        this.loading.set(true);
        this.error.set(null);
        this.eventsService.list().subscribe({
            next: (data) => {
                this.events.set(data ?? []);
                this.lastResponse.set({ ok: true, count: data?.length ?? 0 });
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(this.stringifyError(err));
                this.loading.set(false);
            },
        });
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
                const type = data.type ?? 'Concert';
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

    createSample() {
        this.loading.set(true);
        this.error.set(null);
        const sample: CreateEventRequest = {
            eventName: 'Sample Event',
            type: 'Concert',
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
        try {
            if (err?.error) {
                return typeof err.error === 'string'
                    ? err.error
                    : JSON.stringify(err.error, null, 2);
            }
            return JSON.stringify(err, null, 2);
        } catch {
            return String(err);
        }
    }
}
