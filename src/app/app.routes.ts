import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { EventsComponent } from './pages/events/events.component';
import { TestApiComponent } from './pages/test-api/test-api.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'home', component: HomeComponent },
    { path: 'events', component: EventsComponent },
    { path: 'test-api', component: TestApiComponent },
    // { path: 'about', component: AboutComponent }
];
