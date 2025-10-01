import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-restore-draft-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './restore-draft-dialog.component.html',
  styleUrl: './restore-draft-dialog.component.scss',
})
export class RestoreDraftDialogComponent {
  private dialogRef = inject(MatDialogRef<RestoreDraftDialogComponent>);

  restore(): void {
    this.dialogRef.close(true);
  }

  dismiss(): void {
    this.dialogRef.close(false);
  }
}
