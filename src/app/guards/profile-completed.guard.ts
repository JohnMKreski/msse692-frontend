import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { ProfileService } from '../shared/services/profile.service';
import { catchError, map, of, switchMap } from 'rxjs';

/**
 * Guard that requires a signed-in user and a completed profile.
 * If missing or incomplete, redirects to /profile.
 */
export const profileCompletedGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const profiles = inject(ProfileService);
  const user = auth.currentUser;
  if (!user) {
    // Not signed in; reuse other guards or go to login
    router.navigateByUrl('/login');
    return of(false);
  }

  return profiles.getMe().pipe(
    map((p) => {
      if (p?.completed) return true;
      router.navigateByUrl('/profile');
      return false;
    }),
    catchError(() => {
      router.navigateByUrl('/profile');
      return of(false);
    })
  );
};
