import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../shared/models/api-tokens';
import { Auth } from '@angular/fire/auth';
import { RouterTestingModule } from '@angular/router/testing';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, RouterTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' },
        {
          provide: Auth,
          useValue: {
            currentUser: null,
            // Compat-style method to satisfy internal getModularInstance(...).onAuthStateChanged access
            onAuthStateChanged: (callback: any) => { callback(null); return () => {}; }
          } as unknown as Auth
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    // Trigger change detection to ensure template links render without ActivatedRoute errors
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has a primary nav with aria-label', () => {
    const el: HTMLElement = fixture.nativeElement;
    const nav = el.querySelector('nav.primary-nav');
    expect(nav).toBeTruthy();
    expect(nav?.getAttribute('aria-label')).toBe('Primary');
  });

  it('user menu button toggles aria-expanded and reveals menu', () => {
    // Simulate logged-in user
    component.user = { displayName: 'Tester' } as any;
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('button.user-menu__button');
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute('aria-expanded')).toBe('false');
    (btn as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(btn?.getAttribute('aria-expanded')).toBe('true');
    const panel = el.querySelector('.user-menu__panel[role="menu"]');
    expect(panel).toBeTruthy();
  });

  it('exposes menu items with role="menuitem" when open', () => {
    component.user = { displayName: 'Tester' } as any;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button.user-menu__button');
    (btn as HTMLButtonElement).click();
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.user-menu__panel [role="menuitem"]');
    // Expect at least the static entries Profile, Settings, Logout
    expect(items.length).toBeGreaterThanOrEqual(3);
  });
});
