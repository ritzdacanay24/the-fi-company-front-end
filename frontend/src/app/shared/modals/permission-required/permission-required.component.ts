import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export interface PermissionRequiredData {
  message: string;
  failedCheck: 'role' | 'permission';
  requiredDomain?: string;
  configuredModuleDomain?: string;
  moduleKey?: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  currentRoles?: string[];
  currentPermissions?: string[];
  currentDomainGrants?: Array<{ permission?: string; domain?: string; expiresAt?: string | null }>;
  userName?: string;
  canRequest?: boolean;
}

@Component({
  selector: 'app-permission-required',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-required.component.html',
  styleUrl: './permission-required.component.scss',
})
export class PermissionRequiredComponent implements OnInit {
  reason = signal('');
  isSubmitting = signal(false);

  // Public property - set by modalRef.componentInstance.data
  data!: PermissionRequiredData;
  showYourRolesDropdown = false;


  constructor(
    public activeModal: NgbActiveModal,
  ) {}

  ngOnInit(): void {
    // Data is set by the interceptor
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }

  onRequestAccess(): void {
    if (!this.data.canRequest) {
      this.activeModal.close();
      return;
    }

    this.activeModal.close({
      action: 'request',
      reason: this.reason() || null,
    });
  }

  hasRequiredRoles(): boolean {
    return Array.isArray(this.data.requiredRoles) && this.data.requiredRoles.length > 0;
  }

  hasRequiredPermissions(): boolean {
    return Array.isArray(this.data.requiredPermissions) && this.data.requiredPermissions.length > 0;
  }

  hasCurrentRoles(): boolean {
    return Array.isArray(this.data.currentRoles) && this.data.currentRoles.length > 0;
  }

  hasCurrentPermissions(): boolean {
    return Array.isArray(this.data.currentPermissions) && this.data.currentPermissions.length > 0;
  }

  hasCurrentGrants(): boolean {
    return Array.isArray(this.data.currentDomainGrants) && this.data.currentDomainGrants.length > 0;
  }
}
