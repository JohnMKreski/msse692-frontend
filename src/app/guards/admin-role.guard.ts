import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AppUserService } from '../shared/app-user.service';
import { catchError, map, of } from 'rxjs';

/**
 * Guard that requires a signed-in user with the 'ADMIN' role.
 * Redirects to /home if lacking the role, /login if not signed in.
 */
export const adminRoleGuard: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const users = inject(AppUserService);

  const user = auth.currentUser;
  if (!user) {
    return router.parseUrl(`/error/401?from=${encodeURIComponent(state.url)}`);
  }

  return users.getMe().pipe(
    map((me) => {
      const roles = me?.roles ?? [];
      const isAdmin = Array.isArray(roles) && roles.includes('ADMIN');
      return isAdmin || router.parseUrl('/error/403');
    }),
    catchError(() => of(router.parseUrl('/error/403')))
  );
};
