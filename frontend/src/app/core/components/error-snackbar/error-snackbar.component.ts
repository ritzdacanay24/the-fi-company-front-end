import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';

export interface ErrorSnackbarData {
  message: string;
  showReportIssue: boolean;
}

/**
 * Custom error snackbar component with "Report Issue" and "Dismiss" buttons
 */
@Component({
  selector: 'app-error-snackbar',
  standalone: true,
  imports: [CommonModule, NgbTooltip],
  template: `
    <div class="error-snackbar-container">
      <span
        class="message"
        [ngbTooltip]="data.message"
        placement="top"
        container="body"
        triggers="hover">
        {{ data.message }}
      </span>
      <div class="actions">
        <button
          *ngIf="data.showReportIssue"
          type="button"
          class="mat-button report-btn"
          (click)="onReportIssue()">
          REPORT ISSUE
        </button>
        <button
          type="button"
          class="mat-button close-btn"
          (click)="onClose()">
          DISMISS
        </button>
      </div>
    </div>
  `,
  styles: [`
    .error-snackbar-container {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .message {
      flex: 1;
      color: white;
      font-size: 14px;
      line-height: 20px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 300px;
      cursor: help;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }

    .mat-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      padding: 6px 12px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
      font-family: inherit;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .mat-button:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .mat-button:active {
      transform: scale(0.98);
    }

    .report-btn {
      background: rgba(255, 255, 255, 0.15);
    }

    .close-btn {
      opacity: 0.9;
    }

    @media (max-width: 767.98px) {
      .error-snackbar-container {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
        width: 100%;
      }

      .message {
        max-width: none;
        width: 100%;
        white-space: normal;
        overflow: visible;
        text-overflow: clip;
      }

      .actions {
        width: 100%;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
    }
  `]
})
export class ErrorSnackbarComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: ErrorSnackbarData,
    public snackBarRef: MatSnackBarRef<ErrorSnackbarComponent>
  ) {}

  onReportIssue(): void {
    this.snackBarRef.dismissWithAction();
  }

  onClose(): void {
    this.snackBarRef.dismiss();
  }
}
