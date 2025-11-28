import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { materialImports } from '../../../shared/material';

@Component({
  selector: 'app-editor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, materialImports],
  templateUrl: './editor-dashboard.component.html',
  styleUrls: ['./editor-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorDashboardComponent {}
