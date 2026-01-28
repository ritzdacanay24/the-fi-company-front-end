import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { OwnersService, Owner } from '@app/core/api/owners/owners.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserSearchV1Component } from '@app/shared/components/user-search-v1/user-search-v1.component';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-owner-management-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, UserSearchV1Component, DragDropModule],
  template: `
    <div class="modal-header bg-primary text-white">
      <h4 class="modal-title text-white">
        <i class="mdi mdi-account-group me-2"></i>
        Manage Owners
      </h4>
      <button type="button" class="btn-close btn-close-white" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>

    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
      <!-- Tab Navigation -->
      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <a class="nav-link" 
             [class.active]="activeTab === 'owners'" 
             (click)="activeTab = 'owners'"
             style="cursor: pointer;">
            <i class="mdi mdi-account-multiple me-1"></i>
            Owners
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" 
             [class.active]="activeTab === 'assignments'" 
             (click)="activeTab = 'assignments'"
             style="cursor: pointer;">
            <i class="mdi mdi-account-switch me-1"></i>
            User Assignments
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" 
             [class.active]="activeTab === 'admins'" 
             (click)="switchToAdminTab()"
             style="cursor: pointer;">
            <i class="mdi mdi-shield-account me-1"></i>
            Admin Users
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" 
             [class.active]="activeTab === 'settings'" 
             (click)="switchToSettingsTab()"
             style="cursor: pointer;">
            <i class="mdi mdi-cog me-1"></i>
            Settings
          </a>
        </li>
      </ul>

      <!-- Owners Tab -->
      <div *ngIf="activeTab === 'owners'">
      <!-- Add New Owner Section -->
      <div class="card mb-3">
        <div class="card-header bg-light">
          <h5 class="mb-0">
            <i class="mdi mdi-plus-circle me-2"></i>
            {{ editingOwner ? 'Edit Owner' : 'Add New Owner' }}
          </h5>
        </div>
        <div class="card-body">
          <form (ngSubmit)="saveOwner()">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Name <span class="text-danger">*</span></label>
                <input type="text" 
                       class="form-control" 
                       [(ngModel)]="formData.name" 
                       name="name"
                       placeholder="e.g., John Doe"
                       required>
              </div>
              <div class="col-md-6">
                <label class="form-label">Email</label>
                <input type="email" 
                       class="form-control" 
                       [(ngModel)]="formData.email" 
                       name="email"
                       placeholder="e.g., john.doe@company.com">
              </div>
              <div class="col-md-6">
                <label class="form-label">Department</label>
                <input type="text" 
                       class="form-control" 
                       [(ngModel)]="formData.department" 
                       name="department"
                       placeholder="e.g., Production">
              </div>
              <div class="col-md-12">
                <label class="form-label">Description</label>
                <textarea class="form-control" 
                          [(ngModel)]="formData.description" 
                          name="description"
                          rows="2"
                          placeholder="Optional notes or description about this owner..."></textarea>
              </div>
              <div class="col-md-3">
                <label class="form-label">Display Order</label>
                <input type="number" 
                       class="form-control" 
                       [(ngModel)]="formData.display_order" 
                       name="display_order"
                       min="0"
                       placeholder="999">
              </div>
              <div class="col-md-3">
                <label class="form-label">Status</label>
                <div class="form-check form-switch mt-2">
                  <input class="form-check-input" 
                         type="checkbox" 
                         [(ngModel)]="formData.is_active" 
                         name="is_active"
                         id="activeSwitch">
                  <label class="form-check-label" for="activeSwitch">
                    {{ formData.is_active ? 'Active' : 'Inactive' }}
                  </label>
                </div>
              </div>
              <div class="col-md-3">
                <label class="form-label">Currently Working</label>
                <div class="form-check form-switch mt-2">
                  <input class="form-check-input" 
                         type="checkbox" 
                         [(ngModel)]="formData.is_production" 
                         name="is_production"
                         id="productionSwitch">
                  <label class="form-check-label" for="productionSwitch">
                    <i class="mdi me-1" [ngClass]="formData.is_production ? 'mdi-hammer-wrench text-success' : 'mdi-pause-circle'"></i>
                    {{ formData.is_production ? 'In Production' : 'Not Working' }}
                  </label>
                </div>
                <small class="text-muted">Show in production board with highlight</small>
              </div>
            </div>
            
            <div class="mt-3 d-flex gap-2">
              <button type="submit" class="btn btn-primary" [disabled]="saving || !formData.name">
                <i class="mdi" [ngClass]="saving ? 'mdi-loading mdi-spin' : 'mdi-content-save'"></i>
                {{ saving ? 'Saving...' : (editingOwner ? 'Update Owner' : 'Add Owner') }}
              </button>
              <button type="button" class="btn btn-outline-secondary" *ngIf="editingOwner" (click)="cancelEdit()">
                <i class="mdi mdi-close"></i>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Search and Filter -->
      <div class="card mb-3">
        <div class="card-body">
          <div class="row g-2">
            <div class="col-md-8">
              <div class="input-group">
                <span class="input-group-text">
                  <i class="mdi mdi-magnify"></i>
                </span>
                <input type="text" 
                       class="form-control" 
                       [(ngModel)]="searchTerm" 
                       (ngModelChange)="filterOwners()"
                       placeholder="Search by name, email, or department...">
              </div>
            </div>
            <div class="col-md-4">
              <select class="form-select" [(ngModel)]="filterStatus" (ngModelChange)="filterOwners()">
                <option value="all">All Owners</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Owners List -->
      <div class="card">
        <div class="card-header bg-light">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-0">
                <i class="mdi mdi-format-list-bulleted me-2"></i>
                Owners List ({{ filteredOwners.length }})
              </h5>
              <small class="text-muted">
                <i class="mdi mdi-drag-vertical me-1"></i>
                Drag rows to reorder
              </small>
            </div>
            <button class="btn btn-sm btn-outline-primary" (click)="refreshOwners()">
              <i class="mdi mdi-refresh" [ngClass]="{'mdi-spin': loading}"></i>
              Refresh
            </button>
          </div>
        </div>
        <div class="card-body p-0">
          <div *ngIf="loading" class="text-center py-4">
            <i class="mdi mdi-loading mdi-spin fs-1 text-primary"></i>
            <p class="text-muted mt-2">Loading owners...</p>
          </div>

          <div *ngIf="!loading && filteredOwners.length === 0" class="text-center py-4">
            <i class="mdi mdi-information-outline fs-1 text-muted"></i>
            <p class="text-muted mt-2">No owners found</p>
          </div>

          <div *ngIf="!loading && filteredOwners.length > 0" class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 50px;">
                    <i class="mdi mdi-drag-vertical text-muted" title="Drag to reorder"></i>
                  </th>
                  <th style="width: 50px;">Order</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Description</th>
                  <th style="width: 120px;">Work Status</th>
                  <th style="width: 100px;">Status</th>
                  <th style="width: 120px;">Actions</th>
                </tr>
              </thead>
              <tbody cdkDropList (cdkDropListDropped)="dropOwner($event)">
                <tr *ngFor="let owner of filteredOwners" 
                    cdkDrag
                    [cdkDragDisabled]="editingOwner !== null"
                    [class.table-secondary]="!owner.is_active"
                    [class.table-warning]="editingOwner?.id === owner.id"
                    style="cursor: move;">
                  <td class="text-center">
                    <i class="mdi mdi-drag-vertical text-muted" cdkDragHandle></i>
                  </td>
                  <td class="text-center">
                    <span class="badge bg-secondary">{{ owner.display_order }}</span>
                  </td>
                  <td>
                    <strong>{{ owner.name }}</strong>
                    <span *ngIf="editingOwner?.id === owner.id" class="badge bg-warning ms-2">
                      Editing
                    </span>
                  </td>
                  <td>
                    <span *ngIf="owner.email" class="text-muted">
                      <i class="mdi mdi-email-outline me-1"></i>
                      {{ owner.email }}
                    </span>
                    <span *ngIf="!owner.email" class="text-muted fst-italic">No email</span>
                  </td>
                  <td>
                    <span *ngIf="owner.department" class="badge bg-info">
                      {{ owner.department }}
                    </span>
                    <span *ngIf="!owner.department" class="text-muted fst-italic">-</span>
                  </td>
                  <td>
                    <span *ngIf="owner.description" class="text-muted small" [title]="owner.description">
                      {{ owner.description.length > 50 ? owner.description.substring(0, 50) + '...' : owner.description }}
                    </span>
                    <span *ngIf="!owner.description" class="text-muted fst-italic">-</span>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="owner.is_production ? 'bg-success' : 'bg-secondary'">
                      <i class="mdi" [ngClass]="owner.is_production ? 'mdi-hammer-wrench' : 'mdi-pause-circle'"></i>
                      {{ owner.is_production ? 'Working Now' : 'Not Working' }}
                    </span>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="owner.is_active ? 'bg-success' : 'bg-secondary'">
                      {{ owner.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" 
                              (click)="editOwner(owner)"
                              title="Edit">
                        <i class="mdi mdi-pencil"></i>
                      </button>
                      <button class="btn btn-outline-danger" 
                              (click)="deleteOwner(owner)"
                              [disabled]="!owner.is_active"
                              title="Deactivate">
                        <i class="mdi mdi-delete"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div><!-- End Owners Tab -->

      <!-- User Assignments Tab -->
      <div *ngIf="activeTab === 'assignments'">
        <!-- User Selection -->
        <div class="card mb-3">
          <div class="card-header bg-light">
            <h5 class="mb-0">
              <i class="mdi mdi-account-search me-2"></i>
              Select User to Manage Assignments
            </h5>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-12">
                <app-user-search-v1
                  [form_label]="'Select User'"
                  [value]="selectedUserId"
                  [placeholder]="'Search users by name or email...'"
                  [minTermLength]="2"
                  [appendToBody]="'body'"
                  (notifyParent)="onUserSelected($event)">
                </app-user-search-v1>
              </div>
            </div>
          </div>
        </div>

        <!-- Assigned Owners List -->
        <div class="card mb-3" *ngIf="selectedUserId">
          <div class="card-header bg-light d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="mdi mdi-check-circle me-2"></i>
              Currently Assigned Owners ({{ userAssignments.length }})
            </h5>
          </div>
          <div class="card-body">
            <div *ngIf="loadingAssignments" class="text-center py-4">
              <i class="mdi mdi-loading mdi-spin fs-1 text-primary"></i>
              <p class="text-muted mt-2">Loading assignments...</p>
            </div>

            <div *ngIf="!loadingAssignments && userAssignments.length === 0" class="alert alert-info mb-0">
              <i class="mdi mdi-information-outline me-2"></i>
              No owners currently assigned to this user. Use the checkboxes below to assign owners.
            </div>

            <div *ngIf="!loadingAssignments && userAssignments.length > 0" class="table-responsive">
              <table class="table table-sm table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Owner Name</th>
                    <th>Department</th>
                    <th>Description</th>
                    <th>Assigned Date</th>
                    <th style="width: 100px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let assignment of userAssignments">
                    <td><strong>{{ assignment.name }}</strong></td>
                    <td>
                      <span *ngIf="assignment.department" class="badge bg-info">{{ assignment.department }}</span>
                      <span *ngIf="!assignment.department" class="text-muted fst-italic">-</span>
                    </td>
                    <td>
                      <span *ngIf="assignment.description" class="text-muted small">
                        {{ assignment.description.length > 40 ? assignment.description.substring(0, 40) + '...' : assignment.description }}
                      </span>
                      <span *ngIf="!assignment.description" class="text-muted fst-italic">-</span>
                    </td>
                    <td class="text-muted small">{{ assignment.created_at | date:'short' }}</td>
                    <td>
                      <button class="btn btn-sm btn-outline-danger" 
                              (click)="removeAssignment(assignment.owner_id || assignment.id)"
                              title="Remove Assignment">
                        <i class="mdi mdi-close"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- All Owners with Checkboxes -->
        <div class="card" *ngIf="selectedUserId">
          <div class="card-header bg-light">
            <h5 class="mb-0">
              <i class="mdi mdi-account-multiple-check me-2"></i>
              All Owners - Check to Assign ({{ allOwnersForAssignment.length }})
            </h5>
            <small class="text-muted">Click checkboxes to assign or remove owners</small>
          </div>
          <div class="card-body">
            <div *ngIf="loadingAssignments" class="text-center py-4">
              <i class="mdi mdi-loading mdi-spin fs-1 text-primary"></i>
              <p class="text-muted mt-2">Loading owners...</p>
            </div>

            <div *ngIf="!loadingAssignments && allOwnersForAssignment.length === 0" class="alert alert-warning mb-0">
              <i class="mdi mdi-alert me-2"></i>
              No active owners found in the system.
            </div>

            <div *ngIf="!loadingAssignments && allOwnersForAssignment.length > 0">
              <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="table table-hover mb-0">
                  <thead class="table-light sticky-top">
                    <tr>
                      <th style="width: 60px;">
                        <i class="mdi mdi-check-box-outline"></i>
                      </th>
                      <th>Owner Name</th>
                      <th>Department</th>
                      <th>Description</th>
                      <th style="width: 100px;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let owner of allOwnersForAssignment" 
                        [class.table-success]="owner.isAssigned"
                        style="cursor: pointer;"
                        (click)="toggleOwnerAssignment(owner)">
                      <td class="text-center">
                        <div class="form-check">
                          <input class="form-check-input" 
                                 type="checkbox" 
                                 [checked]="owner.isAssigned"
                                 (click)="$event.stopPropagation()"
                                 (change)="toggleOwnerAssignment(owner)"
                                 [id]="'owner-' + owner.id">
                        </div>
                      </td>
                      <td>
                        <strong>{{ owner.name }}</strong>
                        <span *ngIf="owner.isAssigned" class="badge bg-success ms-2">
                          <i class="mdi mdi-check"></i> Assigned
                        </span>
                      </td>
                      <td>
                        <span *ngIf="owner.department" class="badge bg-info">{{ owner.department }}</span>
                        <span *ngIf="!owner.department" class="text-muted fst-italic">-</span>
                      </td>
                      <td>
                        <span *ngIf="owner.description" class="text-muted small" [title]="owner.description">
                          {{ owner.description.length > 50 ? owner.description.substring(0, 50) + '...' : owner.description }}
                        </span>
                        <span *ngIf="!owner.description" class="text-muted fst-italic">-</span>
                      </td>
                      <td>
                        <span class="badge" [ngClass]="owner.isAssigned ? 'bg-success' : 'bg-secondary'">
                          {{ owner.isAssigned ? 'Assigned' : 'Not Assigned' }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="mt-3 text-muted small">
                <i class="mdi mdi-information-outline me-1"></i>
                <strong>{{ assignedOwnersCount }}</strong> of 
                <strong>{{ allOwnersForAssignment.length }}</strong> owners assigned
              </div>
            </div>
          </div>
        </div>
      </div><!-- End User Assignments Tab -->

      <!-- Admin Users Tab -->
      <div *ngIf="activeTab === 'admins'">
        <div class="alert alert-info mb-3">
          <i class="mdi mdi-information-outline me-2"></i>
          <strong>Admin Users</strong> have permission to manage owners and assign them to users.
        </div>

        <!-- Add Admin User -->
        <div class="card mb-3">
          <div class="card-header bg-light">
            <h5 class="mb-0">
              <i class="mdi mdi-account-plus me-2"></i>
              Add Admin User
            </h5>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-10">
                <app-user-search-v1
                  [form_label]="'Select User'"
                  [value]="selectedAdminUserId"
                  [placeholder]="'Search users to add as admin...'"
                  [minTermLength]="2"
                  [appendToBody]="'body'"
                  (notifyParent)="onAdminUserSelected($event)">
                </app-user-search-v1>
              </div>
              <div class="col-md-2 d-flex align-items-end">
                <button class="btn btn-success w-100" 
                        (click)="addAdminUser()"
                        [disabled]="!selectedAdminUserId || loadingAdmins">
                  <i class="mdi mdi-plus"></i>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Admin Users List -->
        <div class="card">
          <div class="card-header bg-light d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="mdi mdi-shield-account me-2"></i>
              Current Admin Users ({{ adminUsers.length }})
            </h5>
            <button class="btn btn-sm btn-outline-primary" (click)="loadAdminUsers()">
              <i class="mdi mdi-refresh" [ngClass]="{'mdi-spin': loadingAdmins}"></i>
              Refresh
            </button>
          </div>
          <div class="card-body">
            <div *ngIf="loadingAdmins" class="text-center py-4">
              <i class="mdi mdi-loading mdi-spin fs-1 text-primary"></i>
              <p class="text-muted mt-2">Loading admin users...</p>
            </div>

            <div *ngIf="!loadingAdmins && adminUsers.length === 0" class="alert alert-warning mb-0">
              <i class="mdi mdi-alert me-2"></i>
              No admin users found. Add users above to grant admin permissions.
            </div>

            <div *ngIf="!loadingAdmins && adminUsers.length > 0" class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th>User Name</th>
                    <th>Email</th>
                    <th>Added Date</th>
                    <th>Added By</th>
                    <th style="width: 100px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let admin of adminUsers">
                    <td>
                      <i class="mdi mdi-shield-check text-success me-2"></i>
                      <strong>{{ admin.user_name || admin.first + ' ' + admin.last }}</strong>
                    </td>
                    <td>
                      <span class="text-muted">
                        <i class="mdi mdi-email-outline me-1"></i>
                        {{ admin.email }}
                      </span>
                    </td>
                    <td class="text-muted small">{{ admin.created_at | date:'short' }}</td>
                    <td class="text-muted small">{{ admin.created_by || 'System' }}</td>
                    <td>
                      <button class="btn btn-sm btn-outline-danger" 
                              (click)="removeAdminUser(admin.user_id)"
                              title="Remove Admin Access">
                        <i class="mdi mdi-close"></i>
                        Remove
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div><!-- End Admin Users Tab -->

      <!-- Settings Tab -->
      <div *ngIf="activeTab === 'settings'">
        <div class="card">
          <div class="card-header bg-light">
            <h5 class="mb-0">
              <i class="mdi mdi-cog me-2"></i>
              Owner Feature Settings
            </h5>
          </div>
          <div class="card-body">
            <div class="alert alert-info mb-4">
              <i class="mdi mdi-information-outline me-2"></i>
              Control whether the owner dropdown/input field appears on forms throughout the application.
            </div>

            <div class="row">
              <div class="col-md-12">
                <div class="card border-primary">
                  <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 class="mb-1">
                          <i class="mdi mdi-form-dropdown me-2"></i>
                          Owner Dropdown/Input Field
                        </h6>
                        <p class="text-muted small mb-0">
                          {{ ownerDropdownEnabled ? 'Owner selection is currently ENABLED across all forms' : 'Owner selection is currently DISABLED across all forms' }}
                        </p>
                      </div>
                      <div class="form-check form-switch form-switch-lg">
                        <input class="form-check-input" 
                               type="checkbox" 
                               [(ngModel)]="ownerDropdownEnabled" 
                               (change)="toggleOwnerDropdown()"
                               [disabled]="savingSettings"
                               id="ownerDropdownSwitch"
                               style="width: 3.5rem; height: 1.75rem; cursor: pointer;">
                        <label class="form-check-label ms-2" for="ownerDropdownSwitch" style="cursor: pointer;">
                          <strong [class.text-success]="ownerDropdownEnabled" [class.text-secondary]="!ownerDropdownEnabled">
                            {{ ownerDropdownEnabled ? 'ENABLED' : 'DISABLED' }}
                          </strong>
                        </label>
                      </div>
                    </div>
                    
                    <div class="mt-3 pt-3 border-top" *ngIf="savingSettings">
                      <div class="d-flex align-items-center">
                        <i class="mdi mdi-loading mdi-spin text-primary me-2"></i>
                        <span class="text-muted">Saving setting...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="alert alert-warning mt-4">
              <i class="mdi mdi-alert me-2"></i>
              <strong>Note:</strong> Disabling this feature will hide the owner dropdown/input on all forms. 
              Users will not be able to assign or change owners until this is re-enabled.
            </div>
          </div>
        </div>
      </div><!-- End Settings Tab -->
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" (click)="activeModal.close()">
        <i class="mdi mdi-close me-1"></i>
        Close
      </button>
    </div>
  `,
  styles: [`
    .table-hover tbody tr:hover {
      cursor: default;
    }
    
    .btn-group-sm .btn {
      padding: 0.25rem 0.5rem;
    }
    
    .badge {
      font-size: 0.75rem;
    }

    /* Drag and drop styles */
    .cdk-drag-preview {
      opacity: 0.8;
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    }

    .cdk-drag-placeholder {
      opacity: 0.4;
      background: #f0f0f0;
    }

    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    tbody.cdk-drop-list-dragging tr:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    [cdkDragHandle] {
      cursor: move;
    }

    tr[cdkDrag]:hover {
      background-color: rgba(0, 123, 255, 0.05);
    }
  `]
})
export class OwnerManagementModalComponent implements OnInit, OnDestroy {
  // Tab management
  activeTab: 'owners' | 'assignments' | 'admins' | 'settings' = 'owners';
  
  // Owners tab
  owners: Owner[] = [];
  filteredOwners: Owner[] = [];
  searchTerm = '';
  filterStatus: 'all' | 'active' | 'inactive' = 'all';
  loading = false;
  saving = false;
  editingOwner: Owner | null = null;
  
  formData: Partial<Owner> = {
    name: '',
    email: '',
    department: '',
    description: '',
    display_order: 999,
    is_active: true,
    is_production: false
  };

  // User assignments tab
  selectedUserId: number | null = null;
  userAssignments: any[] = [];
  allOwnersForAssignment: (Owner & { isAssigned: boolean })[] = [];
  loadingAssignments = false;
  assigningOwner = false;

  // Admin users tab
  adminUsers: any[] = [];
  loadingAdmins = false;
  selectedAdminUserId: number | null = null;

  // Settings tab
  ownerDropdownEnabled = true;
  savingSettings = false;

  private destroy$ = new Subject<void>();

  constructor(
    public activeModal: NgbActiveModal,
    private ownersService: OwnersService,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.loadOwners();
    this.loadAdminUsers();
    this.loadOwnerDropdownSetting();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get count of assigned owners for current user
   */
  get assignedOwnersCount(): number {
    return this.allOwnersForAssignment.filter(o => o.isAssigned).length;
  }

  async loadOwners(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.ownersService.getAllOwners();
      if (response.success && Array.isArray(response.data)) {
        // Convert string values to proper booleans
        this.owners = response.data.map(owner => ({
          ...owner,
          is_active: !!(owner.is_active && (owner.is_active === true || (owner.is_active as any) === 1 || (owner.is_active as any) === "1")),
          is_production: !!(owner.is_production && (owner.is_production === true || (owner.is_production as any) === 1 || (owner.is_production as any) === "1"))
        }));
        this.filterOwners();
      }
    } catch (error) {
      console.error('Error loading owners:', error);
    } finally {
      this.loading = false;
    }
  }

  refreshOwners(): void {
    this.loadOwners();
  }

  filterOwners(): void {
    let filtered = [...this.owners];

    // Apply status filter
    if (this.filterStatus === 'active') {
      filtered = filtered.filter(o => o.is_active);
    } else if (this.filterStatus === 'inactive') {
      filtered = filtered.filter(o => !o.is_active);
    }

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.name.toLowerCase().includes(term) ||
        (o.email && o.email.toLowerCase().includes(term)) ||
        (o.department && o.department.toLowerCase().includes(term))
      );
    }

    this.filteredOwners = filtered;
  }

  /**
   * Handle drag and drop reordering
   */
  async dropOwner(event: CdkDragDrop<Owner[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) {
      return; // No change in position
    }

    // Move item in the array
    moveItemInArray(this.filteredOwners, event.previousIndex, event.currentIndex);

    // Update display_order for all affected owners
    const updates: { id: number; display_order: number }[] = [];
    this.filteredOwners.forEach((owner, index) => {
      const newOrder = index + 1;
      if (owner.display_order !== newOrder) {
        owner.display_order = newOrder;
        updates.push({ id: owner.id, display_order: newOrder });
      }
    });

    // Save the new order to the backend
    if (updates.length > 0) {
      try {
        const userId = this.authService.currentUserValue?.id || 'system';
        const response = await this.ownersService.reorderOwners(updates, userId);
        
        if (response.success) {
          console.log('✅ Owner order updated successfully');
          // Refresh to get updated data from server
          await this.loadOwners();
        } else {
          console.error('❌ Failed to update owner order:', response.error);
          alert('Failed to save new order. Please try again.');
          // Reload to reset to server state
          await this.loadOwners();
        }
      } catch (error) {
        console.error('❌ Error updating owner order:', error);
        alert('An error occurred while saving the new order');
        // Reload to reset to server state
        await this.loadOwners();
      }
    }
  }

  async saveOwner(): Promise<void> {
    if (!this.formData.name?.trim()) {
      alert('Owner name is required');
      return;
    }

    // Prevent double submission
    if (this.saving) {
      console.warn('Save already in progress, ignoring duplicate request');
      return;
    }

    this.saving = true;
    const userId = this.authService.currentUserValue?.id || 'system';

    try {
      const response = this.editingOwner
        ? await this.ownersService.updateOwner(this.editingOwner.id, this.formData, userId)
        : await this.ownersService.createOwner(this.formData, userId);

      if (response.success) {
        this.resetForm();
        await this.loadOwners();
      } else {
        alert(response.error || 'Failed to save owner');
      }
    } catch (error) {
      console.error('Error saving owner:', error);
      alert('An error occurred while saving the owner');
    } finally {
      this.saving = false;
    }
  }

  editOwner(owner: Owner): void {
    this.editingOwner = owner;
    this.formData = {
      name: owner.name,
      email: owner.email,
      department: owner.department,
      description: owner.description,
      display_order: owner.display_order,
      is_active: owner.is_active,
      is_production: owner.is_production || false
    };
    
    // Scroll to top
    setTimeout(() => {
      document.querySelector('.modal-body')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }

  cancelEdit(): void {
    this.resetForm();
  }

  async deleteOwner(owner: Owner): Promise<void> {
    if (!confirm(`Are you sure you want to deactivate "${owner.name}"?`)) {
      return;
    }

    const userId = this.authService.currentUserValue?.id || 'system';
    try {
      const response = await this.ownersService.deleteOwner(owner.id, userId);
      if (response.success) {
        await this.loadOwners();
      } else {
        alert(response.error || 'Failed to deactivate owner');
      }
    } catch (error) {
      console.error('Error deleting owner:', error);
      alert('An error occurred while deactivating the owner');
    }
  }

  resetForm(): void {
    this.editingOwner = null;
    this.formData = {
      name: '',
      email: '',
      department: '',
      description: '',
      display_order: 999,
      is_active: true,
      is_production: false
    };
  }

  // ==================== User Assignment Methods ====================
  
  /**
   * Handle user selection from dropdown
   */
  onUserSelected(user: any): void {
    console.log('User selected:', user);
    
    if (user && user.id) {
      this.selectedUserId = user.id;
      this.loadUserAssignments();
    } else {
      this.selectedUserId = null;
      this.userAssignments = [];
      this.allOwnersForAssignment = [];
    }
  }

  /**
   * Handle admin user selection from dropdown
   */
  onAdminUserSelected(user: any): void {
    console.log('Admin user selected:', user);
    
    if (user && user.id) {
      this.selectedAdminUserId = user.id;
    } else {
      this.selectedAdminUserId = null;
    }
  }
  
  /**
   * Load owner assignments for selected user
   */
  async loadUserAssignments(): Promise<void> {
    if (!this.selectedUserId) return;

    this.loadingAssignments = true;
    try {
      const response = await this.ownersService.getOwnerAssignmentsForUser(this.selectedUserId);
      if (response.success && Array.isArray(response.data)) {
        this.userAssignments = response.data;
      }
      
      // Load ALL owners and mark which ones are assigned
      await this.loadAllOwnersForAssignment();
    } catch (error) {
      console.error('Error loading user assignments:', error);
      alert('Failed to load user assignments');
    } finally {
      this.loadingAssignments = false;
    }
  }

  /**
   * Load ALL owners and mark which ones are assigned to the user
   */
  async loadAllOwnersForAssignment(): Promise<void> {
    if (!this.selectedUserId) {
      console.warn('No user selected, cannot load owners');
      this.allOwnersForAssignment = [];
      return;
    }
    
    try {
      // Use getAllOwners instead of getActiveOwners to get all owners
      const allOwnersResponse = await this.ownersService.getAllOwners();
      console.log('Raw owners response:', allOwnersResponse);
      
      if (allOwnersResponse.success && Array.isArray(allOwnersResponse.data)) {
        // Get assigned owner IDs - handle both 'id' and 'owner_id' fields
        const assignedOwnerIds = this.userAssignments.map(a => a.owner_id || a.id);
        console.log('Assigned owner IDs for filtering:', assignedOwnerIds);
        
        // Map all owners and add isAssigned flag (only show active ones)
        // Convert string values to proper booleans
        this.allOwnersForAssignment = allOwnersResponse.data
          .filter(owner => !!(owner.is_active && (owner.is_active === true || (owner.is_active as any) === 1 || (owner.is_active as any) === "1")))
          .map(owner => ({
            ...owner,
            is_active: !!(owner.is_active && (owner.is_active === true || (owner.is_active as any) === 1 || (owner.is_active as any) === "1")),
            is_production: !!(owner.is_production && (owner.is_production === true || (owner.is_production as any) === 1 || (owner.is_production as any) === "1")),
            isAssigned: assignedOwnerIds.includes(owner.id)
          }));
          
        console.log('All owners with assignment status:', this.allOwnersForAssignment);
        console.log('Total active owners:', this.allOwnersForAssignment.length);
      } else {
        console.error('Failed to load owners - Response:', allOwnersResponse);
        this.allOwnersForAssignment = [];
      }
    } catch (error) {
      console.error('Error loading owners for assignment:', error);
      this.allOwnersForAssignment = [];
    }
  }

  /**
   * Toggle owner assignment when checkbox is clicked
   */
  async toggleOwnerAssignment(owner: Owner & { isAssigned: boolean }): Promise<void> {
    if (!this.selectedUserId) return;

    const adminUserId = this.authService.currentUserValue?.id || 'system';
    
    try {
      if (owner.isAssigned) {
        // Remove assignment
        const response = await this.ownersService.removeOwnerFromUser(
          this.selectedUserId,
          owner.id,
          adminUserId
        );

        if (response.success) {
          owner.isAssigned = false;
          await this.loadUserAssignments();
        } else {
          alert(response.error || 'Failed to remove assignment');
        }
      } else {
        // Add assignment
        const response = await this.ownersService.assignOwnerToUser(
          this.selectedUserId,
          owner.id,
          adminUserId
        );

        if (response.success) {
          owner.isAssigned = true;
          await this.loadUserAssignments();
        } else {
          alert(response.error || 'Failed to assign owner');
        }
      }
    } catch (error) {
      console.error('Error toggling owner assignment:', error);
      alert('An error occurred while updating the assignment');
    }
  }

  /**
   * Remove owner assignment from user
   */
  async removeAssignment(ownerId: number): Promise<void> {
    if (!this.selectedUserId) return;

    if (!confirm('Are you sure you want to remove this owner assignment?')) {
      return;
    }

    const adminUserId = this.authService.currentUserValue?.id || 'system';

    try {
      const response = await this.ownersService.removeOwnerFromUser(
        this.selectedUserId,
        ownerId,
        adminUserId
      );

      if (response.success) {
        await this.loadUserAssignments();
      } else {
        alert(response.error || 'Failed to remove assignment');
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      alert('An error occurred while removing the assignment');
    }
  }

  // ==================== Admin Users Methods ====================

  /**
   * Switch to admin tab and load data
   */
  switchToAdminTab(): void {
    this.activeTab = 'admins';
    this.loadAdminUsers();
  }

  /**
   * Load all admin users
   */
  async loadAdminUsers(): Promise<void> {
    this.loadingAdmins = true;
    try {
      const response = await this.ownersService.getAdminUsers();
      if (response.success && Array.isArray(response.data)) {
        this.adminUsers = response.data;
        console.log('✅ Loaded admin users:', this.adminUsers);
      } else {
        console.error('Failed to load admin users:', response);
        this.adminUsers = [];
      }
    } catch (error) {
      console.error('Error loading admin users:', error);
      this.adminUsers = [];
    } finally {
      this.loadingAdmins = false;
    }
  }

  /**
   * Add a user as admin
   */
  async addAdminUser(): Promise<void> {
    if (!this.selectedAdminUserId) {
      alert('Please select a user to add as admin');
      return;
    }

    const currentUserId = this.authService.currentUserValue?.id || 'system';

    try {
      const response = await this.ownersService.addAdminUser(this.selectedAdminUserId, currentUserId);
      
      if (response.success) {
        this.selectedAdminUserId = null;
        await this.loadAdminUsers();
        alert('Admin user added successfully!');
      } else {
        alert(response.error || 'Failed to add admin user');
      }
    } catch (error) {
      console.error('Error adding admin user:', error);
      alert('An error occurred while adding admin user');
    }
  }

  /**
   * Remove admin access from a user
   */
  async removeAdminUser(userId: number): Promise<void> {
    if (!confirm('Are you sure you want to remove admin access from this user?')) {
      return;
    }

    const currentUserId = this.authService.currentUserValue?.id || 'system';

    try {
      const response = await this.ownersService.removeAdminUser(userId, currentUserId);
      
      if (response.success) {
        await this.loadAdminUsers();
        alert('Admin access removed successfully!');
      } else {
        alert(response.error || 'Failed to remove admin user');
      }
    } catch (error) {
      console.error('Error removing admin user:', error);
      alert('An error occurred while removing admin user');
    }
  }

  // ==================== Settings Methods ====================

  /**
   * Switch to settings tab and load data
   */
  switchToSettingsTab(): void {
    this.activeTab = 'settings';
    this.loadOwnerDropdownSetting();
  }

  /**
   * Load owner dropdown feature setting
   */
  async loadOwnerDropdownSetting(): Promise<void> {
    try {
      const response = await this.ownersService.getOwnerDropdownSetting();
      if (response.success && response.data) {
        this.ownerDropdownEnabled = response.data.enabled;
        console.log('✅ Owner dropdown setting loaded:', this.ownerDropdownEnabled);
      }
    } catch (error) {
      console.error('Error loading owner dropdown setting:', error);
      // Default to enabled if error
      this.ownerDropdownEnabled = true;
    }
  }

  /**
   * Toggle owner dropdown feature
   */
  async toggleOwnerDropdown(): Promise<void> {
    this.savingSettings = true;
    const currentUserId = this.authService.currentUserValue?.id || 'system';

    try {
      const response = await this.ownersService.setOwnerDropdownSetting(
        this.ownerDropdownEnabled,
        currentUserId
      );

      if (response.success) {
        console.log('✅ Owner dropdown setting updated:', this.ownerDropdownEnabled);
        // Show a brief success message
        const action = this.ownerDropdownEnabled ? 'enabled' : 'disabled';
        setTimeout(() => {
          alert(`Owner dropdown has been ${action} successfully!`);
        }, 100);
      } else {
        alert(response.error || 'Failed to update setting');
        // Revert the toggle on error
        this.ownerDropdownEnabled = !this.ownerDropdownEnabled;
      }
    } catch (error) {
      console.error('Error updating owner dropdown setting:', error);
      alert('An error occurred while updating the setting');
      // Revert the toggle on error
      this.ownerDropdownEnabled = !this.ownerDropdownEnabled;
    } finally {
      this.savingSettings = false;
    }
  }
}

// Service to open the modal
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Injectable({
  providedIn: 'root'
})
export class OwnerManagementModalService {
  constructor(private modalService: NgbModal) {}

  open() {
    const modalRef = this.modalService.open(OwnerManagementModalComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: true
    });
    return modalRef;
  }
}
