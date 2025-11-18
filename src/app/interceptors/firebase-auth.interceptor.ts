import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { getIdToken } from 'firebase/auth';
import { from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { API_URL } from '../shared/models/api-tokens';

/**
 * Appends Authorization: Bearer <id_token> for requests when a user is signed in.
 * Falls back to the original request if no user or token is available.
 */
export const firebaseAuthInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(Auth) as Auth;
    const platformId = inject(PLATFORM_ID);
    const apiUrl = inject(API_URL);

    // Only attach in the browser
    if (!isPlatformBrowser(platformId)) {
        return next(req);
    }

    // Only attach to our API base URL
    const url = req.url || '';
    if (!url.startsWith(apiUrl)) {
        return next(req);
    }

    // Keep public GETs unauthenticated when not signed in (natural by returning early)
    const user = auth.currentUser;
    if (!user) {
        return next(req);
    }

    return from(getIdToken(user, /* forceRefresh */ false)).pipe(
        switchMap((token) => {
            if (!token) return next(req);
            const authorized = req.clone({
                setHeaders: { Authorization: `Bearer ${token}` },
            });
            return next(authorized);
        }),
        catchError(() => next(req))
    );
};
