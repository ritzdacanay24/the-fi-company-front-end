import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  standalone: true,
  selector: 'app-pm-task-actions-renderer',
  imports: [CommonModule, NgbDropdownModule],
  template: `
    <div
      *ngIf="showActions"
      class="btn-group btn-group-sm"
      ngbDropdown
      container="body"
      placement="bottom-end"
      (click)="$event.stopPropagation()"
    >
      <button
        type="button"
        class="btn btn-sm btn-outline-primary py-0 px-2 dropdown-toggle"
        style="font-size:11px;white-space:nowrap"
        ngbDropdownToggle
      >
        Actions
      </button>
      <div ngbDropdownMenu>
        <button type="button" ngbDropdownItem (click)="onDuplicate($event)">Duplicate</button>
        <button type="button" ngbDropdownItem (click)="onMoveProject($event)">Copy to Project...</button>
        <button type="button" ngbDropdownItem (click)="onArchive($event)">Archive</button>
        <button type="button" ngbDropdownItem (click)="onDelete($event)">Delete</button>
        <div class="dropdown-divider" *ngIf="isTaskRow"></div>
        <button type="button" ngbDropdownItem *ngIf="isTaskRow" (click)="onComment($event)">Comment ({{ commentCount }})</button>
        <button type="button" ngbDropdownItem *ngIf="isTaskRow" (click)="onAttachment($event)">Attachment ({{ attachmentCount }})</button>
      </div>
    </div>
  `,
})
export class PmTaskActionsRendererComponent implements ICellRendererAngularComp {
  private params!: ICellRendererParams & {
    onDuplicate?: (params: ICellRendererParams) => void;
    onMoveProject?: (params: ICellRendererParams) => void;
    onArchive?: (params: ICellRendererParams) => void;
    onDelete?: (params: ICellRendererParams) => void;
    onComment?: (params: ICellRendererParams) => void;
    onAttachment?: (params: ICellRendererParams) => void;
  };
  showActions = true;
  isTaskRow = false;
  commentCount = 0;
  attachmentCount = 0;

  agInit(params: ICellRendererParams & {
    onDuplicate?: (params: ICellRendererParams) => void;
    onMoveProject?: (params: ICellRendererParams) => void;
    onArchive?: (params: ICellRendererParams) => void;
    onDelete?: (params: ICellRendererParams) => void;
    onComment?: (params: ICellRendererParams) => void;
    onAttachment?: (params: ICellRendererParams) => void;
  }): void {
    this.params = params;
    this.showActions = params?.data?.rowType !== 'add-item';
    this.isTaskRow = params?.data?.rowType === 'task';
    this.commentCount = Number(params?.data?._commentCount ?? 0) || 0;
    this.attachmentCount = Number(params?.data?._attachmentCount ?? 0) || 0;
  }

  refresh(params: ICellRendererParams & {
    onDuplicate?: (params: ICellRendererParams) => void;
    onMoveProject?: (params: ICellRendererParams) => void;
    onArchive?: (params: ICellRendererParams) => void;
    onDelete?: (params: ICellRendererParams) => void;
    onComment?: (params: ICellRendererParams) => void;
    onAttachment?: (params: ICellRendererParams) => void;
  }): boolean {
    this.agInit(params);
    return true;
  }

  onDuplicate(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.params?.onDuplicate instanceof Function) {
      this.params.onDuplicate(this.params);
    }
  }

  onArchive(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.params?.onArchive instanceof Function) {
      this.params.onArchive(this.params);
    }
  }

  onMoveProject(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.params?.onMoveProject instanceof Function) {
      this.params.onMoveProject(this.params);
    }
  }

  onDelete(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.params?.onDelete instanceof Function) {
      this.params.onDelete(this.params);
    }
  }

  onComment(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.params?.onComment instanceof Function) {
      this.params.onComment(this.params);
    }
  }

  onAttachment(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.params?.onAttachment instanceof Function) {
      this.params.onAttachment(this.params);
    }
  }
}
