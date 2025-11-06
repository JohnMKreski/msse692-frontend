import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Guard that requires a signed-in Firebase user; otherwise redirects to /login.
 */
export const requireAuthGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const auth = inject(Auth);
  const router = inject(Router);

  const isAuthed = await new Promise<boolean>((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(!!user);
    });
  });

  return isAuthed || router.parseUrl('/login');
};
