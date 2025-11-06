import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { EventsComponent } from './pages/events/events.component';
import { TestApiComponent } from './pages/test-api/test-api.component';
import { LoginComponent } from './pages/login/login.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { requireAuthGuard } from './guards/require-auth.guard';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'home', component: HomeComponent },
    { path: 'events', component: EventsComponent },
    { path: 'test-api', component: TestApiComponent },
    { path: 'login', component: LoginComponent },
    { path: 'profile', component: ProfileComponent, canActivate: [requireAuthGuard] },
    // { path: 'about', component: AboutComponent }
];
