import { Component } from "@angular/core";
import { ICellRendererAngularComp } from "ag-grid-angular";
import { ICellRendererParams } from "ag-grid-community";
import { CommonModule } from "@angular/common";
import { NgbPopoverModule } from "@ng-bootstrap/ng-bootstrap";

@Component({
  standalone: true,
  selector: "app-customer-notification-emails-renderer",
  imports: [CommonModule, NgbPopoverModule],
  template: `
    <ng-container *ngIf="emails.length > 0; else emptyValue">
      <span>{{ previewText }}</span>
      <button
        *ngIf="remainingEmails.length > 0"
        type="button"
        class="btn btn-link btn-sm p-0 ms-1 align-baseline"
        [ngbPopover]="remainingText"
        popoverTitle="More Emails"
        popoverClass="customer-email-popover"
        triggers="hover focus"
        placement="auto"
        container="body">
        +{{ remainingEmails.length }} more
      </button>
    </ng-container>

    <ng-template #emptyValue>
      <span>-</span>
    </ng-template>
  `,
  styles: [
    `.customer-email-popover .popover-body { white-space: pre-line; }`,
  ],
})
export class CustomerNotificationEmailsRendererComponent implements ICellRendererAngularComp {
  emails: string[] = [];
  previewEmails: string[] = [];
  remainingEmails: string[] = [];
  previewText = "";
  remainingText = "";

  agInit(params: ICellRendererParams): void {
    this.setValue(params.value);
  }

  refresh(params: ICellRendererParams): boolean {
    this.setValue(params.value);
    return true;
  }

  private setValue(value: unknown): void {
    this.emails = String(value ?? "")
      .split(/[;,\r\n]+/)
      .map((email) => email.trim())
      .filter(Boolean);

    this.previewEmails = this.emails.slice(0, 3);
    this.remainingEmails = this.emails.slice(3);
    this.previewText = this.previewEmails.join(", ");
    this.remainingText = this.remainingEmails.join("\n");
  }
}
