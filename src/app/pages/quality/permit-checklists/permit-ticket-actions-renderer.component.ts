import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ICellRendererAngularComp } from "ag-grid-angular";
import { ICellRendererParams } from "ag-grid-community";

interface PermitTicketActionRendererParams extends ICellRendererParams {
  onOpen?: (ticketId: string) => void;
  onDelete?: (ticketId: string) => void;
}

@Component({
  selector: "app-permit-ticket-actions-renderer",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./permit-ticket-actions-renderer.component.html",
})
export class PermitTicketActionsRendererComponent implements ICellRendererAngularComp {
  params!: PermitTicketActionRendererParams;

  agInit(params: PermitTicketActionRendererParams): void {
    this.params = params;
  }

  refresh(params: PermitTicketActionRendererParams): boolean {
    this.params = params;
    return true;
  }

  onOpen(event: Event): void {
    event.stopPropagation();
    const ticketId = this.params?.data?.ticketId;
    if (ticketId) {
      this.params.onOpen?.(ticketId);
    }
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    const ticketId = this.params?.data?.ticketId;
    if (ticketId) {
      this.params.onDelete?.(ticketId);
    }
  }
}
