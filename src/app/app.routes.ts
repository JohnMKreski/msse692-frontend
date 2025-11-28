import { Routes } from '@angular/router';
import { requireAuthGuard } from './guards/require-auth.guard';
import { adminRoleGuard } from './guards/admin-role.guard';
import { adminRoleMatchGuard } from './guards/admin-role.match-guard';
// All feature pages are lazy-loaded via loadComponent

export const routes: Routes = [
    { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
    { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
    { path: 'events', loadComponent: () => import('./pages/events/events.component').then(m => m.EventsComponent) },
    { path: 'events/:id', loadComponent: () => import('./pages/events/event-detail.component').then(m => m.EventDetailComponent) },
    { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
    { path: 'signup', loadComponent: () => import('./pages/signup/signup.component').then(m => m.SignupComponent) },
    { path: 'create-profile', canActivate: [requireAuthGuard], loadComponent: () => import('./pages/create-profile/create-profile.component').then(m => m.CreateProfileComponent) },
    {
        path: 'profile',
        canActivate: [requireAuthGuard],
        loadComponent: () => import('./pages/profile/profile-shell/profile-shell.component').then(m => m.ProfileShellComponent),
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'info' },
            { path: 'info', loadComponent: () => import('./pages/profile/profile-info/profile-info.component').then(m => m.ProfileInfoComponent) },
            { path: 'requests', loadComponent: () => import('./pages/profile/profile-requests/profile-requests.component').then(m => m.ProfileRequestsComponent) },
            { path: 'events', loadComponent: () => import('./pages/profile/profile-events/profile-events.component').then(m => m.ProfileEventsComponent) },
            { path: 'edit', loadComponent: () => import('./pages/profile/profile-edit/profile-edit.component').then(m => m.ProfileEditComponent) },
        ],
    },
    { path: 'settings', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
    {
        path: 'admin',
        loadComponent: () => import('./pages/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        canMatch: [adminRoleMatchGuard],
        canActivate: [requireAuthGuard, adminRoleGuard],
        canActivateChild: [requireAuthGuard, adminRoleGuard],
        children: [
            // { path: '', pathMatch: 'full', loadComponent: () => import('./pages/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
            { path: 'events', loadComponent: () => import('./pages/admin/admin-events/admin-events-list.component').then(m => m.AdminEventsListComponent) },
            { path: 'role-requests', loadComponent: () => import('./pages/admin/admin-role-requests-list/admin-role-requests-list.component').then(m => m.AdminRoleRequestsListComponent) },
            { path: 'users', loadComponent: () => import('./pages/admin/admin-users-list/admin-users-list.component').then(m => m.AdminUsersListComponent) },
            { path: 'api', loadComponent: () => import('./pages/admin/admin-api/admin-api.component').then(m => m.AdminApiComponent) },
            { path: 'logs', loadComponent: () => import('./pages/admin/admin-logs/admin-logs.component').then(m => m.AdminLogsComponent) },
        ],
    },
    {
        path: 'editor',
        loadComponent: () => import('./pages/editor/editor-dashboard/editor-dashboard.component').then(m => m.EditorDashboardComponent),
        canActivate: [
            () => import('./guards/require-auth.guard').then(m => m.requireAuthGuard),
            () => import('./guards/editor-role.guard').then(m => m.editorRoleGuard),
        ],
        canActivateChild: [
            () => import('./guards/require-auth.guard').then(m => m.requireAuthGuard),
            () => import('./guards/editor-role.guard').then(m => m.editorRoleGuard),
        ],
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'manage' },
            { path: 'manage', loadComponent: () => import('./pages/editor/editor-events.component').then(m => m.EditorEventsComponent) },
            { path: 'create', loadComponent: () => import('./pages/editor/create-event/editor-create-event.component').then(m => m.EditorCreateEventComponent) },
            { path: 'create/:id', loadComponent: () => import('./pages/editor/create-event/editor-create-event.component').then(m => m.EditorCreateEventComponent) },
            { path: 'calendar', loadComponent: () => import('./pages/editor/my-events-calendar/editor-my-events-calendar.component').then(m => m.EditorMyEventsCalendarComponent) },
        ]
    },
    { path: 'editor/events', redirectTo: 'editor/manage' },
    { path: 'error/:code', loadComponent: () => import('./pages/error/error-page.component').then(m => m.ErrorPageComponent) },
    { path: '**', redirectTo: 'error/404' },
    // { path: 'about', component: AboutComponent }
];
