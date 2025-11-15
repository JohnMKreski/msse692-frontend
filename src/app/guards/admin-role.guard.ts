import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AppUserService } from '../shared/app-user.service';
import { catchError, map, of } from 'rxjs';

/**
 * Guard that requires a signed-in user with the 'ADMIN' role.
 * Redirects to /home if lacking the role, /login if not signed in.
 */
export const adminRoleGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const users = inject(AppUserService);

  const user = auth.currentUser;
  if (!user) {
    return router.parseUrl('/login');
  }

  return users.getMe().pipe(
    map((me) => {
      const roles = me?.roles ?? [];
      const isAdmin = Array.isArray(roles) && roles.includes('ADMIN');
      return isAdmin || router.parseUrl('/home');
    }),
    catchError(() => of(router.parseUrl('/home')))
  );
};
