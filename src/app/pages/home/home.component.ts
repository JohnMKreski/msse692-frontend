import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { materialImports } from '../../shared/material';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [materialImports, RouterLink],
    styleUrls: ['./home.component.scss'],
    templateUrl: './home.component.html',
})
export class HomeComponent {}
