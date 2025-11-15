import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-skeleton.component.html',
  styleUrls: ['./loading-skeleton.component.scss']
})
export class LoadingSkeletonComponent {
  @Input() lines = 3;
  @Input() avatar = false;
  @Input() width: string | null = null;
  get lineArray(): number[] { return Array.from({ length: this.lines }, (_, i) => i); }
}
