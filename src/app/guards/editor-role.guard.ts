import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AppUserService } from '../shared/app-user.service';
import { catchError, map, of, switchMap } from 'rxjs';

/**
 * Guard that requires a signed-in user with the 'EDITOR' role.
 * Redirects to /login if not signed in, or /home if lacking the role.
 */
export const editorRoleGuard: CanActivateFn = () => {
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
      const isEditor = Array.isArray(roles) && roles.includes('EDITOR');
      return isEditor || router.parseUrl('/home');
    }),
    catchError(() => of(router.parseUrl('/home')))
  );
};
