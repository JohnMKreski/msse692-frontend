import { Component } from '@angular/core';
import { materialImports } from '../../shared/material';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [materialImports],
  styleUrls: ['./home.component.scss'],
  templateUrl: './home.component.html',
})
export class HomeComponent {}
