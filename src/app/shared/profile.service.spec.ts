import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ProfileService } from './profile.service';
import { API_URL } from './api-tokens';

describe('ProfileService', () => {
  let svc: ProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        // Include version segment to mirror backend /api/v1
        { provide: API_URL, useValue: '/api/v1' },
      ],
    });
    svc = TestBed.inject(ProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getMe should GET /profile/me', () => {
    const mock = { id: 10, displayName: 'Jane' } as any;
    let result: any;
    svc.getMe().subscribe(r => (result = r));
    const req = http.expectOne('/api/v1/profile/me');
    expect(req.request.method).toBe('GET');
    req.flush(mock);
    expect(result).toEqual(mock);
  });

  it('upsert should POST /profile with body', () => {
    const body = { displayName: 'John' } as any;
    const mock = { id: 11, displayName: 'John' } as any;
    let result: any;
    svc.upsert(body).subscribe(r => (result = r));
    const req = http.expectOne('/api/v1/profile');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(mock);
    expect(result).toEqual(mock);
  });
});
