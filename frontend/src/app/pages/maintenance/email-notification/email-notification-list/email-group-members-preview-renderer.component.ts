import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ICellRendererAngularComp } from "ag-grid-angular";
import { ICellRendererParams } from "ag-grid-community";
import { NgbPopoverModule } from "@ng-bootstrap/ng-bootstrap";

interface MemberPreviewItem {
  label: string;
}

@Component({
  standalone: true,
  selector: "app-email-group-members-preview-renderer",
  imports: [CommonModule, NgbPopoverModule],
  template: `
    <ng-container *ngIf="count > 0; else noMembers">
      <span>{{ count }}</span>
      <button
        type="button"
        class="btn btn-link btn-sm p-0 ms-1 align-baseline"
        [ngbPopover]="membersList"
        popoverTitle="Group Members"
        popoverClass="email-group-members-popover"
        triggers="hover focus"
        placement="auto"
        container="body">
        view
      </button>

      <ng-template #membersList>
        <ul class="mb-0 ps-3">
          <li *ngFor="let member of members">{{ member.label }}</li>
        </ul>
      </ng-template>
    </ng-container>

    <ng-template #noMembers>
      <span class="text-muted">-</span>
    </ng-template>
  `,
  styles: [
    `.email-group-members-popover .popover-body { white-space: pre-line; max-height: 260px; overflow: auto; }`,
  ],
})
export class EmailGroupMembersPreviewRendererComponent implements ICellRendererAngularComp {
  members: MemberPreviewItem[] = [];
  count = 0;

  agInit(params: ICellRendererParams): void {
    this.setValue(params);
  }

  refresh(params: ICellRendererParams): boolean {
    this.setValue(params);
    return true;
  }

  private setValue(params: ICellRendererParams): void {
    this.count = Number(params.value || 0);
    const raw = Array.isArray(params?.data?.members) ? params.data.members : [];
    this.members = raw
      .map((item) => ({ label: String((item as MemberPreviewItem)?.label || "").trim() }))
      .filter((item) => !!item.label);
  }
}
