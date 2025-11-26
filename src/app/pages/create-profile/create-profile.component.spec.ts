import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateProfileComponent } from './create-profile.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../../shared/models/api-tokens';
import { ProfileService } from '../../shared/services/profile.service';
import { of, throwError } from 'rxjs';

class MockProfileService {
  upsertCalls = 0;
  lastReq: any = null;
  upsert(req: any) { this.upsertCalls++; this.lastReq = req; return of({ id:1, userId:1, displayName:req.displayName, completed:true, verified:false, createdAt:'', updatedAt:'' }); }
}

describe('CreateProfileComponent', () => {
  let fixture: ComponentFixture<CreateProfileComponent>;
  let component: CreateProfileComponent;
  let service: MockProfileService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateProfileComponent],
      providers: [
        { provide: ProfileService, useClass: MockProfileService },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' },
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(CreateProfileComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(ProfileService) as any as MockProfileService;
    fixture.detectChanges();
  });

  it('renders required fields and initializes defaults', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('input#displayName')).toBeTruthy();
    expect(el.querySelector('select#profileType')).toBeTruthy();
  });

  it('requires displayName and profileType', () => {
    component.profileForm.get('displayName')!.setValue('');
    component.profileForm.get('profileType')!.setValue('');
    component.submit();
    expect(service.upsertCalls).toBe(0);
    component.profileForm.get('displayName')!.setValue('Test User');
    component.profileForm.get('profileType')!.setValue('ARTIST');
    component.submit();
    expect(service.upsertCalls).toBe(1);
    expect(service.lastReq.displayName).toBe('Test User');
  });

  it('adds and removes socials and websites', () => {
    component.addSocial();
    component.addWebsite();
    expect(component.socialsArray.length).toBe(1);
    expect(component.websitesArray.length).toBe(1);
    component.removeSocial(0);
    component.removeWebsite(0);
    expect(component.socialsArray.length).toBe(0);
    expect(component.websitesArray.length).toBe(0);
  });

  it('enforces location required when profileType=VENUE', () => {
    component.profileForm.get('profileType')!.setValue('VENUE');
    fixture.detectChanges();
    component.profileForm.get('displayName')!.setValue('My Venue');
    component.profileForm.get('location')!.setValue('');
    component.submit();
    expect(service.upsertCalls).toBe(0);
    component.profileForm.get('location')!.setValue('Denver, CO');
    component.submit();
    expect(service.upsertCalls).toBe(1);
    expect(service.lastReq.location).toBe('Denver, CO');
  });

  it('captures error on failed submit', () => {
    // Replace upsert with erroring observable
    (service as any).upsert = () => throwError(() => ({ message: 'fail' }));
    component.profileForm.get('displayName')!.setValue('User');
    component.profileForm.get('profileType')!.setValue('ARTIST');
    component.submit();
    expect(component.submitError).toBe('fail');
  });
});
