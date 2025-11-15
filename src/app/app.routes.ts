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
import { ErrorPageComponent } from './pages/error/error-page.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard.component';
import { AdminLogsComponent } from './pages/admin/admin-logs.component';
import { AdminEventsListComponent } from './pages/admin/admin-events-list.component';
import { AdminApiComponent } from './pages/admin/admin-api.component';
import { adminRoleGuard } from './guards/admin-role.guard';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'home', component: HomeComponent },
    { path: 'events', component: EventsComponent },
    { path: 'events/:id', component: EventDetailComponent },
    { path: 'login', component: LoginComponent },
    { path: 'signup', component: SignupComponent },
    { path: 'profile', component: ProfileComponent, canActivate: [requireAuthGuard] },
    { path: 'settings', component: SettingsComponent },
    {
        path: 'admin',
        component: AdminDashboardComponent,
        canActivate: [requireAuthGuard, adminRoleGuard],
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'events' },
            { path: 'events', component: AdminEventsListComponent },
            { path: 'api', component: AdminApiComponent },
            { path: 'logs', component: AdminLogsComponent },
        ],
    },
    { path: 'editor/events', component: EditorEventsComponent, canActivate: [requireAuthGuard, editorRoleGuard] },
    { path: 'error/:code', component: ErrorPageComponent },
    { path: '**', redirectTo: 'error/404' },
    // { path: 'about', component: AboutComponent }
];
