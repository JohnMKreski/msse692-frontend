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
        loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
        
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
