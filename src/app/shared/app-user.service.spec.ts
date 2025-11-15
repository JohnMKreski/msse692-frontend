import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AppUserService } from './app-user.service';
import { API_URL } from './api-tokens';

describe('AppUserService', () => {
  let svc: AppUserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    svc = TestBed.inject(AppUserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getMe should GET /app-users/me', () => {
    const mock = { id: 1, email: 'a@b.com', roles: ['USER'] } as any;
    let result: any;
    svc.getMe().subscribe(r => (result = r));
    const req = http.expectOne('/api/app-users/me');
    expect(req.request.method).toBe('GET');
    req.flush(mock);
    expect(result).toEqual(mock);
  });

  it('getMe should propagate 404 errors', () => {
    let error: any;
    svc.getMe().subscribe({ error: e => (error = e) });
    const req = http.expectOne('/api/app-users/me');
    req.flush({ code: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    expect(error.status).toBe(404);
  });
});
