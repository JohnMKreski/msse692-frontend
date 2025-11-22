import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { EnumsService } from './enums.service';
import { API_URL } from '../../shared/models/api-tokens';

describe('EnumsService', () => {
  let svc: EnumsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' },
      ],
    });
    svc = TestBed.inject(EnumsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getEventTypes should memoize and return [] on error', () => {
    let res1: any, res2: any;
    svc.getEventTypes().subscribe(r => (res1 = r));
    svc.getEventTypes().subscribe(r => (res2 = r));
    const req = http.expectOne('/api/v1/enums/event-types');
    req.flush(null, { status: 500, statusText: 'Server Error' });
    expect(res1).toEqual([]);
    expect(res2).toEqual([]);
    http.expectNone('/api/v1/enums/event-types');
  });

  it('getEventStatuses should memoize and return values on success', () => {
    const payload = [{ value: 'PUBLISHED', label: 'Published' }];
    let a: any, b: any;
    svc.getEventStatuses().subscribe(r => (a = r));
    svc.getEventStatuses().subscribe(r => (b = r));
    const req = http.expectOne('/api/v1/enums/event-statuses');
    req.flush(payload);
    expect(a).toEqual(payload);
    expect(b).toEqual(payload);
    http.expectNone('/api/v1/enums/event-statuses');
  });
});
