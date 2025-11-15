import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../shared/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  constructor(public theme: ThemeService) {}

  toggleDark() { this.theme.toggleMode(); }
  toggleHighContrast() { this.theme.toggleHighContrast(); }
}
