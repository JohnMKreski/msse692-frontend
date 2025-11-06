import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { getIdToken } from 'firebase/auth';
import { from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

/**
 * Appends Authorization: Bearer <id_token> for requests when a user is signed in.
 * Falls back to the original request if no user or token is available.
 */
export const firebaseAuthInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(Auth) as Auth;
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
