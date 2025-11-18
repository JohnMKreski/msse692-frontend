import { CommonModule } from '@angular/common';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { Component, OnDestroy, OnInit, computed, signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged, User, getIdTokenResult, signOut } from 'firebase/auth';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormControl } from '@angular/forms';
import { EventsService } from '../events/events.service';
import { EventDto, EventAudit } from '../events/event.model';
import { ProfileService } from '../../shared/services/profile.service';
import { ProfileResponse } from '../../shared/models/profile.model';
import { AppUserService } from '../../shared/services/app-user.service';
import { AppUserDto } from '../../shared/models/app-user.model';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { formatApiError } from '../../shared/models/api-error';
import { RoleRequestService } from '../../shared/services/role-request.service';
import { RoleRequest } from '../../shared/models/role-request';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, RouterLink, ReactiveFormsModule, MatSnackBarModule, LoadingSkeletonComponent],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
    })
export class ProfileComponent implements OnInit, OnDestroy {
    user = signal<User | null>(null);
    roles = signal<string[] | null>(null);
    claims = signal<Record<string, any> | null>(null);
    rolesSource = signal<'firebase-claims' | 'backend-fallback' | null>(null);
    //TODO: Remove token from DOM
    idTokenHeader = signal<Record<string, any> | null>(null);
    idTokenPayload = signal<Record<string, any> | null>(null);
    loading = signal<boolean>(true);
    myEvents = signal<EventDto[] | null>(null);
    allEvents = signal<any[] | null>(null);
    appUser = signal<AppUserDto | null>(null);

    // Admin-only audit section state
    audits = signal<EventAudit[] | null>(null);
    auditsLoading = signal<boolean>(false);
    auditsError = signal<string | null>(null);
    selectedEventId = signal<string | null>(null);
    // Admin event list: prefer my events, else fall back to all events
    adminSelectableEvents = computed(() => {
        const mine = this.myEvents();
        if (Array.isArray(mine) && mine.length) return mine;
        const all = this.allEvents();
        return Array.isArray(all) ? all : [];
    });
    // If Firebase token claims don't include roles, fall back to backend AppUser.roles
    effectiveRoles = computed(() => {
        const claimRoles = this.roles();
        if (Array.isArray(claimRoles) && claimRoles.length) return claimRoles;
        const au = this.appUser();
        const appUserRoles = (au && Array.isArray((au as any).roles) && (au as any).roles.length)
            ? (au as any).roles as string[]
            : null;
        return appUserRoles;
    });
    isAdmin = computed(() => {
        const r = this.effectiveRoles();
        return Array.isArray(r) && r.includes('ADMIN');
    });

    // Firebase user as a comprehensive JSON with nulls for missing fields
    firebaseInfo = computed<Record<string, any> | null>(() => {
        const u = this.user();
        if (!u) return null;
        const anyU: any = u as any;
        return {
            uid: u.uid ?? null,
            email: u.email ?? null,
            emailVerified: u.emailVerified ?? null,
            displayName: u.displayName ?? null,
            photoURL: u.photoURL ?? null,
            phoneNumber: anyU.phoneNumber ?? null,
            isAnonymous: anyU.isAnonymous ?? null,
            providerId: u.providerId ?? null,
            tenantId: anyU.tenantId ?? null,
            refreshToken: anyU.refreshToken ?? null,
            providerData: Array.isArray(u.providerData) ? u.providerData : (u.providerData ?? null),
            metadata: u.metadata
                ? {
                      creationTime: u.metadata.creationTime ?? null,
                      lastSignInTime: u.metadata.lastSignInTime ?? null,
                  }
                : null,
        };
    });

    canCrud = computed(() => {
        const r = this.roles();
        const profile = this.existingProfile();
        return !!profile?.completed && Array.isArray(r) && (r.includes('ADMIN') || r.includes('EDITOR'));
    });

    createForm!: FormGroup;
    createBusy = signal<boolean>(false);
    createError = signal<string | null>(null);
    createSuccess = signal<string | null>(null);

    // Profile upsert UI state
    profileSaving = signal<boolean>(false);
    profileName!: FormControl<string>;

    private unsub: (() => void) | null = null;

    existingProfile = signal<ProfileResponse | null>(null);
    // Role Request (Editor) UI state
    roleReqLoading: WritableSignal<boolean> = signal(false);
    roleReqError: WritableSignal<string | null> = signal(null);
    latestRoleRequest: WritableSignal<RoleRequest | null> = signal(null);
    roleReason!: FormControl<string>;

    constructor(private auth: Auth, private fb: FormBuilder, private events: EventsService, private profiles: ProfileService, private appUsers: AppUserService, private snack: MatSnackBar, private roleRequests: RoleRequestService) {
        this.createForm = this.fb.nonNullable.group({
            eventName: ['', [Validators.required, Validators.maxLength(120)]],
            type: ['', [Validators.required, Validators.maxLength(60)]],
            startAt: ['', Validators.required],
            endAt: [''],
            eventLocation: [''],
            eventDescription: [''],
        });
        this.profileName = this.fb.nonNullable.control('', { validators: [Validators.required, Validators.minLength(2), Validators.maxLength(200)] });
    }

    ngOnInit(): void {
        this.roleReason = this.fb.nonNullable.control('', { validators: [Validators.maxLength(500)] });
        this.unsub = onAuthStateChanged(this.auth, async (u) => {
        this.user.set(u);
        this.roles.set(null);
        this.claims.set(null);
        if (u) {
            try {
            const tokenResult = await getIdTokenResult(u, /*forceRefresh*/ false);
            const c = tokenResult.claims || {};
            const r = Array.isArray(c['roles']) ? (c['roles'] as string[]) : (typeof c['roles'] === 'string' ? [c['roles']] : []);
            this.claims.set(c);
            if (r.length) {
                this.roles.set(r);
                this.rolesSource.set('firebase-claims');
            } else {
                this.roles.set(null);
                this.rolesSource.set(null); // might become backend fallback later
            }
            // Decode JWT header/payload (omit signature) for visibility
            this.decodeAndSetIdTokenParts(tokenResult.token);
            } catch {
            // ignore claim fetch errors; show basic profile
            }

            // Load backend AppUser & profile (404 -> ignore)
            this.fetchAppUser();
            this.fetchProfile();
            // Initialize role request state
            this.refreshRoleRequestState();
        }
        // Load events
        this.events.list({ page: 0, size: 100, sort: 'startAt,asc' }).subscribe({
            next: (resp) => {
                const items: any[] = Array.isArray((resp as any)) ? (resp as any as any[]) : (resp?.items ?? []);
                const normalized = (items ?? []).map((e: any) => {
                    // const id = e?.id ?? e?.eventId ?? e?.slug ?? null;
                    // const title = e?.title ?? e?.eventName ?? '(no title)';
                    // const start = e?.start ?? e?.startAt ?? '';
                    // const end = e?.end ?? e?.endAt ?? '';
                    // const location = e?.location ?? e?.eventLocation ?? undefined;
                    return { ...e };
                });
                this.allEvents.set(normalized);
                this.updateMyEventsFilter();
                if (normalized.length && !this.selectedEventId()) {
                    const first = normalized.find((x: any) => x?.eventId != null || x?.id != null);
                    const sel = first?.eventId ?? first?.id;
                    if (sel != null) {
                        this.selectedEventId.set(String(sel));
                        this.loadAudits();
                    }
                }
            },
            error: () => { this.allEvents.set([]); this.myEvents.set([]); },
        });
        this.loading.set(false);
        });
    }

    // ===== Role Request (Editor) =====
    private refreshRoleRequestState(): void {
        const r = this.effectiveRoles();
        if (Array.isArray(r) && (r.includes('ADMIN') || r.includes('EDITOR'))) {
            this.latestRoleRequest.set(null);
            return;
        }
        this.roleReqLoading.set(true);
        this.roleReqError.set(null);
        this.roleRequests.listMy({ status: 'Pending', page: 0, size: 1, sort: 'createdAt,desc' }).subscribe({
            next: (page) => {
                const item = (page as any)?.content?.[0] ?? null;
                this.latestRoleRequest.set(item ?? null);
            },
            error: (err) => {
                this.roleReqError.set(formatApiError(err));
            },
            complete: () => this.roleReqLoading.set(false),
        });
    }

    submitRoleRequest(): void {
        const r = this.effectiveRoles();
        if (Array.isArray(r) && (r.includes('ADMIN') || r.includes('EDITOR'))) return;
        const reason = (this.roleReason.value || '').trim();
        this.roleReqLoading.set(true);
        this.roleReqError.set(null);
        this.roleRequests.create({ requestedRoles: ['EDITOR'], reason: reason || undefined }).subscribe({
            next: (req) => {
                this.latestRoleRequest.set(req);
                this.snack.open('Role request submitted', 'Dismiss', { duration: 2500, horizontalPosition: 'right' });
            },
            error: (err) => {
                this.roleReqError.set(formatApiError(err));
            },
            complete: () => this.roleReqLoading.set(false),
        });
    }

    cancelPendingRoleRequest(): void {
        const cur = this.latestRoleRequest();
        if (!cur) return;
        this.roleReqLoading.set(true);
        this.roleReqError.set(null);
        this.roleRequests.cancel(cur.id).subscribe({
            next: (updated) => {
                this.latestRoleRequest.set(updated);
                this.snack.open('Role request canceled', 'Dismiss', { duration: 2500, horizontalPosition: 'right' });
            },
            error: (err) => {
                this.roleReqError.set(formatApiError(err));
            },
            complete: () => this.roleReqLoading.set(false),
        });
    }

    private fetchProfile() {
        this.profiles.getMe().subscribe({
            next: (p) => {
                this.existingProfile.set(p);
                // Initialize editable display name from existing profile
                try {
                    if (p?.displayName) this.profileName.setValue(p.displayName);
                } catch {}
            },
            error: (err) => {
                if (err?.status === 404) {
                    // no profile yet
                    this.existingProfile.set(null);
                    // Seed editable display name from Firebase or email if available
                    const u = this.user();
                    const fallback = (u?.displayName && u.displayName.trim()) || u?.email || '';
                    try { this.profileName.setValue(fallback); } catch {}
                } else {
                    this.existingProfile.set(null);
                }
            }
        });
    }

    private fetchAppUser() {
        this.appUsers.getMe().subscribe({
            next: (u) => {
                this.appUser.set(u);
                // If roles signal is still empty, hydrate from backend AppUser
                if (!this.roles() && (u as any)?.roles?.length) {
                    this.roles.set([ ...(u as any).roles ]);
                    if (!this.rolesSource()) this.rolesSource.set('backend-fallback');
                } else if (this.roles() && !this.rolesSource()) {
                    // If roles already set but source not recorded, assume firebase
                    this.rolesSource.set('firebase-claims');
                }
                // Recompute my events once we know our AppUser ID
                this.updateMyEventsFilter();
            },
            error: (err) => { console.error(err); this.appUser.set(null); },
        });
    }

    private updateMyEventsFilter() {
        const all = this.allEvents();
        const au = this.appUser();
        if (!Array.isArray(all)) { this.myEvents.set([]); return; }
        const id = au?.id;
        if (id == null) { this.myEvents.set([]); return; }
        const filtered = all.filter((e: any) => {
            const creator = e?.createdByUserId ?? e?.created_by ?? e?.createdBy ?? null;
            return creator != null && String(creator) === String(id);
        });
        this.myEvents.set(filtered);
    }


    ngOnDestroy(): void {
        if (this.unsub) this.unsub();
    }

    async logout(): Promise<void> {
        await signOut(this.auth);
    }

    async forceRefreshTokenAndClaims(): Promise<void> {
        const current = this.user();
        if (!current) return;
        try {
            const tokenResult = await getIdTokenResult(current, /*force*/ true);
            const c = tokenResult.claims || {};
            this.claims.set(c);
            const r = Array.isArray(c['roles']) ? (c['roles'] as string[]) : (typeof c['roles'] === 'string' ? [c['roles']] : []);
            if (r.length) {
                this.roles.set(r);
                this.rolesSource.set('firebase-claims');
            } else {
                // keep existing fallback if present
                if (!this.roles() || this.rolesSource() === 'firebase-claims') {
                    this.roles.set(null);
                    this.rolesSource.set(null);
                }
            }
            this.decodeAndSetIdTokenParts(tokenResult.token);
        } catch (e) {
            // silent
        }
    }

    upsertProfileWithCurrentDisplayName(): void {
        const u = this.user();
        if (!u) { return; }
        const name = (u.displayName && u.displayName.trim()) || u.email || 'Unnamed';
        this.profileSaving.set(true);
        this.profiles.upsert({ displayName: name }).subscribe({
            next: (resp) => {
                this.existingProfile.set(resp);
                this.snack.open('Profile saved', 'Dismiss', { duration: 2500, horizontalPosition: 'right' });
                try { if (resp?.displayName) this.profileName.setValue(resp.displayName); } catch {}
            },
            error: (err) => {
                const msg = formatApiError(err) || 'Failed to save profile';
                this.snack.open(msg, 'Dismiss', { duration: 3500, horizontalPosition: 'right' });
            },
            complete: () => this.profileSaving.set(false)
        });
    }

    saveProfileName(): void {
        const raw = this.profileName.value ?? '';
        const name = String(raw).trim();
        if (!name || this.profileName.invalid) {
            this.profileName.markAsTouched();
            this.snack.open('Please enter a valid display name.', 'Dismiss', { duration: 2500, horizontalPosition: 'right' });
            return;
        }
        this.profileSaving.set(true);
        this.profiles.upsert({ displayName: name }).subscribe({
            next: (resp) => {
                this.existingProfile.set(resp);
                this.snack.open('Profile updated', 'Dismiss', { duration: 2500, horizontalPosition: 'right' });
            },
            error: (err) => {
                const msg = formatApiError(err) || 'Failed to update profile';
                this.snack.open(msg, 'Dismiss', { duration: 3500, horizontalPosition: 'right' });
            },
            complete: () => this.profileSaving.set(false)
        });
    }

    // TODO: move to utility service?
    //TODO: Remove token from DOM
    private decodeAndSetIdTokenParts(token: string | null | undefined): void {
        if (!token) { this.idTokenHeader.set(null); this.idTokenPayload.set(null); return; }
        const parts = token.split('.');
        if (parts.length !== 3) { this.idTokenHeader.set(null); this.idTokenPayload.set(null); return; }
        try {
            if (typeof window === 'undefined') return; // SSR guard
            const decode = (s: string) => JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')));
            this.idTokenHeader.set(decode(parts[0]));
            this.idTokenPayload.set(decode(parts[1]));
        } catch {
            this.idTokenHeader.set(null);
            this.idTokenPayload.set(null);
        }
    }

    async submitCreate(): Promise<void> {
        this.createError.set(null);
        this.createSuccess.set(null);
        if (this.createForm.invalid) {
            this.createError.set('Please fill out required fields.');
            return;
        }
        this.createBusy.set(true);
        const payload = this.createForm.getRawValue();
        this.events.createRaw(payload as any).subscribe({
            next: (created) => {
                this.createSuccess.set(`Created event: ${created.eventName ?? created.eventId}`);
                // refresh list
                this.events.list({ page: 0, size: 100, sort: 'startAt,asc' }).subscribe({
                    next: (resp) => this.myEvents.set((resp as any)?.items ?? []),
                    error: () => {},
                });
                this.createForm.reset();
                // optionally refresh audits if selected event changed
                if (this.selectedEventId()) this.loadAudits();
            },
            error: (err) => {
                this.createError.set(err?.error?.message || 'Failed to create event.');
            },
            complete: () => this.createBusy.set(false),
        });
    }

    // Temporary: show toast instead of inline CRUD UI 
    showCrudComingSoon(): void {
        this.snack.open('Event management is moving to its own page soon.', 'Dismiss', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'bottom',
        });
    }

    // ===== Admin audit utilities =====
    loadAudits(limit: number = 10): void {
        if (!this.isAdmin()) return; // guard
        const id = this.selectedEventId();
        if (!id) { this.audits.set([]); return; }
        this.auditsLoading.set(true);
        this.auditsError.set(null);
        this.events.getAudits(id, limit).subscribe({
            next: (rows) => this.audits.set(rows || []),
            error: (err) => this.auditsError.set(err?.error?.message || 'Failed to load audits'),
            complete: () => this.auditsLoading.set(false),
        });
    }

    relTime(iso: string): string {
        if (!iso) return '';
        try {
            const then = new Date(iso).getTime();
            const diffSec = Math.floor((Date.now() - then) / 1000);
            if (diffSec < 60) return `${diffSec}s ago`;
            const mins = Math.floor(diffSec / 60);
            if (mins < 60) return `${mins}m ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            const days = Math.floor(hrs / 24);
            return `${days}d ago`;
        } catch { return iso; }
    }
}
