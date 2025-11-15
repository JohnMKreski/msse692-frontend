import { Routes } from '@angular/router';
// All feature pages are lazy-loaded via loadComponent

export const routes: Routes = [
    { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
    { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
    { path: 'events', loadComponent: () => import('./pages/events/events.component').then(m => m.EventsComponent) },
    { path: 'events/:id', loadComponent: () => import('./pages/events/event-detail.component').then(m => m.EventDetailComponent) },
    { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
    { path: 'signup', loadComponent: () => import('./pages/signup/signup.component').then(m => m.SignupComponent) },
    {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
        canActivate: [() => import('./guards/require-auth.guard').then(m => m.requireAuthGuard)],
    },
    { path: 'settings', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
    {
        path: 'admin',
        loadComponent: () => import('./pages/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        canActivate: [
            () => import('./guards/require-auth.guard').then(m => m.requireAuthGuard),
            () => import('./guards/admin-role.guard').then(m => m.adminRoleGuard),
        ],
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'events' },
            { path: 'events', loadComponent: () => import('./pages/admin/admin-events-list.component').then(m => m.AdminEventsListComponent) },
            { path: 'api', loadComponent: () => import('./pages/admin/admin-api.component').then(m => m.AdminApiComponent) },
            { path: 'logs', loadComponent: () => import('./pages/admin/admin-logs.component').then(m => m.AdminLogsComponent) },
        ],
    },
    {
        path: 'editor/events',
        loadComponent: () => import('./pages/editor/editor-events.component').then(m => m.EditorEventsComponent),
        canActivate: [
            () => import('./guards/require-auth.guard').then(m => m.requireAuthGuard),
            () => import('./guards/editor-role.guard').then(m => m.editorRoleGuard),
        ],
    },
    { path: 'error/:code', loadComponent: () => import('./pages/error/error-page.component').then(m => m.ErrorPageComponent) },
    { path: '**', redirectTo: 'error/404' },
    // { path: 'about', component: AboutComponent }
];
