import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { NewUserService } from '@app/core/api/users/users.service';

export interface TransferUser {
  id: number;
  name: string;
  username: string;
}

@Component({
  selector: 'app-transfer-ownership-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title d-flex align-items-center">
        <i class="mdi mdi-account-switch me-2"></i>{{ title }}
      </h5>
      <button type="button" class="btn-close" (click)="activeModal.dismiss()" [disabled]="submitting"></button>
    </div>

    <div class="modal-body">
      <p class="text-muted small mb-3" *ngIf="subtitle">{{ subtitle }}</p>

      <!-- Search -->
      <div class="mb-3">
        <input type="text"
               class="form-control form-control-sm"
               placeholder="Search by name or username..."
               [(ngModel)]="search"
               (ngModelChange)="onSearch()" />
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="text-center py-3">
        <span class="spinner-border spinner-border-sm text-primary me-2"></span>
        <span class="text-muted small">Loading users...</span>
      </div>

      <!-- User list -->
      <div *ngIf="!loading" class="list-group" style="max-height: 280px; overflow-y: auto;">
        <button type="button"
                class="list-group-item list-group-item-action d-flex align-items-center gap-2"
                *ngFor="let user of filteredUsers"
                [class.active]="selected?.id === user.id"
                (click)="selected = user">
          <i class="mdi mdi-account-circle fs-5 flex-shrink-0"></i>
          <div class="flex-grow-1 min-w-0">
            <div class="fw-semibold small text-truncate">{{ user.name }}</div>
            <div class="small text-truncate"
                 [class.text-light]="selected?.id === user.id"
                 [class.text-muted]="selected?.id !== user.id"
                 *ngIf="user.username">&#64;{{ user.username }}</div>
          </div>
          <span *ngIf="user.id === currentUserId" class="badge bg-primary flex-shrink-0">You</span>
          <i class="mdi mdi-check text-white flex-shrink-0" *ngIf="selected?.id === user.id"></i>
        </button>
        <div *ngIf="filteredUsers.length === 0" class="text-center py-3 text-muted small">
          No users found.
        </div>
      </div>

      <!-- Error -->
      <div *ngIf="error" class="alert alert-danger small mt-3 mb-0 py-2">
        <i class="mdi mdi-alert-circle-outline me-1"></i>{{ error }}
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-secondary btn-sm" (click)="activeModal.dismiss()" [disabled]="submitting">Cancel</button>
      <button type="button"
              class="btn btn-primary btn-sm"
              [disabled]="!selected || submitting || loading"
              (click)="onSubmit()">
        <span *ngIf="submitting" class="spinner-border spinner-border-sm me-1"></span>
        <i *ngIf="!submitting" class="mdi mdi-account-switch me-1"></i>
        {{ submitting ? 'Transferring...' : submitLabel }}
      </button>
    </div>
  `
})
export class TransferOwnershipModalComponent implements OnInit {
  /** Modal header title */
  @Input() title = 'Transfer Ownership';
  /** Optional subtitle shown in body */
  @Input() subtitle = '';
  /** Label on the confirm button */
  @Input() submitLabel = 'Transfer';
  /** Current user id — shown with "You" badge, optionally excluded */
  @Input() currentUserId: number | null = null;
  /** When true, the current user is not shown in the list */
  @Input() excludeCurrentUser = false;
  /**
   * Called when the user confirms. Should return an Observable that resolves
   * to `{ success: boolean, message?: string }`. The modal handles spinner +
   * error display internally, and closes automatically on success.
   */
  @Input() transferFn!: (user: TransferUser) => Observable<{ success: boolean; message?: string }>;

  loading = false;
  submitting = false;
  error: string | null = null;
  search = '';
  selected: TransferUser | null = null;

  private allUsers: TransferUser[] = [];
  filteredUsers: TransferUser[] = [];

  constructor(
    public activeModal: NgbActiveModal,
    private userService: NewUserService,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.userService.getActiveUsers().then(users => {
      this.allUsers = (users as any[])
        .filter(u => !this.excludeCurrentUser || Number(u.id) !== Number(this.currentUserId))
        .map(u => ({
          id: Number(u.id),
          name: u.first || u.last ? `${u.first ?? ''} ${u.last ?? ''}`.trim() : (u.name ?? u.username ?? ''),
          username: u.username ?? '',
        }));
      this.filteredUsers = [...this.allUsers];
      this.loading = false;
    }).catch(() => {
      this.loading = false;
      this.error = 'Failed to load users.';
    });
  }

  onSearch(): void {
    const term = this.search.toLowerCase().trim();
    if (!term) {
      this.filteredUsers = [...this.allUsers];
      return;
    }
    this.filteredUsers = this.allUsers.filter(u =>
      u.name.toLowerCase().includes(term) || u.username.toLowerCase().includes(term)
    );
  }

  onSubmit(): void {
    if (!this.selected || !this.transferFn) return;
    this.submitting = true;
    this.error = null;
    this.transferFn(this.selected).subscribe({
      next: (result) => {
        if (result.success) {
          this.activeModal.close(this.selected);
        } else {
          this.error = result.message || 'Transfer failed.';
          this.submitting = false;
        }
      },
      error: (err: any) => {
        this.error = err?.error?.message ?? err?.message ?? 'An error occurred. Please try again.';
        this.submitting = false;
      },
    });
  }
}
