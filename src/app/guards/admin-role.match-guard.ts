import { inject } from '@angular/core';
import { CanMatchFn, Route, Router, UrlSegment } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AppUserService } from '../shared/services/app-user.service';
import { catchError, map, of } from 'rxjs';

/**
 * CanMatch guard for admin-only routes. Runs at route matching time.
 * Blocks non-authenticated (401) and non-admin users (403) early and logs decisions.
 */
export const adminRoleMatchGuard: CanMatchFn = (_route: Route, segments: UrlSegment[]) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const users = inject(AppUserService);
  const url = '/' + (segments?.map((s) => s.path).join('/') || '');
  const user = auth.currentUser;
  if (!user) {
    return router.parseUrl(`/error/401?from=${encodeURIComponent(url)}`);
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
