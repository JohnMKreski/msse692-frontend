import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private mode$ = new BehaviorSubject<ThemeMode>('light');
  private highContrast$ = new BehaviorSubject<boolean>(false);
  private memoryStore: Record<string, string> = {};
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    const stored = this.safeGet('theme');
    if (stored === 'dark') this.mode$.next('dark');
    const hc = this.safeGet('contrast');
    if (hc === 'high') this.highContrast$.next(true);
    this.apply();
  }

  getThemeMode() { return this.mode$.asObservable(); }
  getHighContrast() { return this.highContrast$.asObservable(); }
  isDark(): boolean { return this.mode$.value === 'dark'; }
  isHighContrast(): boolean { return this.highContrast$.value; }

  setMode(mode: ThemeMode) {
    this.mode$.next(mode);
    this.safeSet('theme', mode);
    this.apply();
  }

  toggleMode() { this.setMode(this.isDark() ? 'light' : 'dark'); }

  setHighContrast(enable: boolean) {
    this.highContrast$.next(enable);
    this.safeSet('contrast', enable ? 'high' : 'normal');
    this.apply();
  }

  toggleHighContrast() { this.setHighContrast(!this.isHighContrast()); }

  private apply() {
    if (!this.isBrowser) return;
    const root = document.documentElement;
    root.classList.toggle('theme-dark', this.isDark());
    root.classList.toggle('theme-hc', this.isHighContrast());
  }

  private safeGet(key: string): string | null {
    if (!this.isBrowser) return this.memoryStore[key] ?? null;
    try { return window.localStorage.getItem(key); } catch { return null; }
  }

  private safeSet(key: string, value: string): void {
    if (!this.isBrowser) { this.memoryStore[key] = value; return; }
    try { window.localStorage.setItem(key, value); } catch { }
  }
}
