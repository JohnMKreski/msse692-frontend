import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { materialImports } from '../../shared/material';

export interface CancelConfirmData { eventName?: string; }

@Component({
  selector: 'app-cancel-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, materialImports],
  templateUrl: './cancel-confirm-dialog.component.html',
  styleUrls: ['./cancel-confirm-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CancelConfirmDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<CancelConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CancelConfirmData
  ) {}

  close(result: boolean) { this.dialogRef.close(result); }
}
