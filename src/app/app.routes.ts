import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { EventsComponent } from './pages/events/events.component';
import { EventDetailComponent } from './pages/events/event-detail.component';
import { TestApiComponent } from './pages/test-api/test-api.component';
import { LoginComponent } from './pages/login/login.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { SignupComponent } from './pages/signup/signup.component';
import { requireAuthGuard } from './guards/require-auth.guard';
import { editorRoleGuard } from './guards/editor-role.guard';
import { EditorEventsComponent } from './pages/editor/editor-events.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'home', component: HomeComponent },
    { path: 'events', component: EventsComponent },
    { path: 'events/:id', component: EventDetailComponent },
    { path: 'test-api', component: TestApiComponent },
    { path: 'login', component: LoginComponent },
    { path: 'signup', component: SignupComponent },
    { path: 'profile', component: ProfileComponent, canActivate: [requireAuthGuard] },
    { path: 'editor/events', component: EditorEventsComponent, canActivate: [requireAuthGuard, editorRoleGuard] },
    // { path: 'about', component: AboutComponent }
];
