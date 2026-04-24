import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

type RequestAction = 'edit' | 'approve' | 'deny' | 'delete';

interface PermissionOption {
  id: number;
  name: string;
}

interface RequestRow {
  id: number;
  requester_name: string;
  permission_id: number;
  permission_name: string;
  domain: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'denied' | 'revoked' | 'expired';
}

export interface PermissionRequestActionModalData {
  request: RequestRow;
  permissions: PermissionOption[];
  domains: string[];
  allowedActions: RequestAction[];
  initialAction?: RequestAction;
}

@Component({
  selector: 'app-permission-request-action-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-request-action.component.html',
  styleUrl: './permission-request-action.component.scss',
})
export class PermissionRequestActionModalComponent implements OnInit {
  data!: PermissionRequestActionModalData;

  selectedAction: RequestAction = 'edit';

  editPermissionId: number | null = null;
  editDomain = '';
  editReason = '';

  reviewNotes = '';
  expiresAt: string | null = null;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    this.selectedAction = this.data?.initialAction || this.data?.allowedActions?.[0] || 'edit';
    this.editPermissionId = this.data?.request?.permission_id ?? null;
    this.editDomain = this.data?.request?.domain || '';
    this.editReason = this.data?.request?.reason || '';
  }

  onCancel(): void {
    this.activeModal.dismiss('cancel');
  }

  confirm(): void {
    if (this.selectedAction === 'edit') {
      if (!this.editPermissionId || !this.editDomain.trim()) {
        return;
      }

      this.activeModal.close({
        action: 'edit',
        payload: {
          permissionId: this.editPermissionId,
          domain: this.editDomain.trim(),
          reason: this.editReason.trim() || null,
        },
      });
      return;
    }

    if (this.selectedAction === 'approve') {
      this.activeModal.close({
        action: 'approve',
        payload: {
          expiresAt: this.expiresAt || null,
          reviewNotes: this.reviewNotes.trim() || null,
        },
      });
      return;
    }

    if (this.selectedAction === 'deny') {
      this.activeModal.close({
        action: 'deny',
        payload: {
          reviewNotes: this.reviewNotes.trim() || null,
        },
      });
      return;
    }

    this.activeModal.close({
      action: 'delete',
      payload: {},
    });
  }

  getConfirmLabel(): string {
    if (this.selectedAction === 'approve') return 'Approve & Grant';
    if (this.selectedAction === 'deny') return 'Deny Request';
    if (this.selectedAction === 'delete') return 'Delete Request';
    return 'Save Changes';
  }

  isDangerAction(): boolean {
    return this.selectedAction === 'deny' || this.selectedAction === 'delete';
  }
}
