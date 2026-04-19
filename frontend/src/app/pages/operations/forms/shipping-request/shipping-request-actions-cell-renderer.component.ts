import { Component } from "@angular/core";
import { ICellRendererAngularComp } from "ag-grid-angular";
import { ICellRendererParams } from "ag-grid-community";

@Component({
  standalone: true,
  template: `
    <div class="d-flex align-items-center justify-content-center gap-1 h-100">
      <button
        class="btn btn-sm btn-outline-primary"
        (click)="onEditClick()"
        title="View Shipping Request">
        SELECT
      </button>
    </div>
  `,
})
export class ShippingRequestActionsCellRendererComponent implements ICellRendererAngularComp {
  params: any;

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(params: ICellRendererParams): boolean {
    return false;
  }

  onEditClick(): void {
    if (this.params?.onEdit) {
      this.params.onEdit(this.params.data);
    }
  }
}
