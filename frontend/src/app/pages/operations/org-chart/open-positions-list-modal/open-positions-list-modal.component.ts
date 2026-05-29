import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { UserService } from '@app/core/api/field-service/user.service';
import { UserModalService } from '@app/pages/maintenance/user/user-modal/user-modal.component';

export interface OpenPositionsListModalResult {
  action: 'create' | 'manage';
  position?: any;
}

@Component({
  standalone: true,
  selector: 'app-open-positions-list-modal',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-header">
      <div>
        <h5 class="modal-title mb-0">Open Positions</h5>
        <small class="text-muted">View, fill, close, or create vacancies from one place.</small>
      </div>
      <button type="button" class="btn-close" (click)="dismiss()" aria-label="Close"></button>
    </div>

    <div class="modal-body">
      <div class="d-flex align-items-center justify-content-between gap-3 mb-3">
        <div class="input-group" style="max-width: 360px;">
          <span class="input-group-text"><i class="mdi mdi-magnify"></i></span>
          <input class="form-control" [(ngModel)]="searchTerm" placeholder="Search open positions..." />
        </div>

        <div class="btn-group">
          <button type="button" class="btn btn-outline-secondary" (click)="createUser()">
            <i class="mdi mdi-account-plus me-1"></i>New User
          </button>
          <button type="button" class="btn btn-primary" (click)="createPosition()">
            <i class="mdi mdi-plus me-1"></i>New Position
          </button>
        </div>
      </div>

      <div *ngIf="isLoading" class="text-muted py-4 text-center">Loading open positions...</div>

      <div *ngIf="!isLoading && filteredPositions.length === 0" class="alert alert-light border mb-0">
        No open positions found.
      </div>

      <div *ngIf="!isLoading && filteredPositions.length > 0" class="list-group">
        <div
          class="list-group-item list-group-item-action d-flex align-items-start justify-content-between gap-3"
          *ngFor="let position of filteredPositions"
          role="button"
          tabindex="0"
          (click)="managePosition(position)">
          <div class="text-start flex-grow-1">
            <div class="fw-semibold d-flex align-items-center gap-2">
              <span>{{ position.title || 'Untitled Position' }}</span>
              <span class="badge" [ngClass]="getStatusBadgeClass(position)">{{ getStatusLabel(position) }}</span>
            </div>
            <div class="small text-muted">
              {{ position.department || 'Unassigned department' }}
              <span *ngIf="getLocationLabel(position)"> · {{ getLocationLabel(position) }}</span>
            </div>
            <div class="small text-muted">
              Reports to: {{ position.manager_name || 'No manager' }}
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="createUser(position); $event.stopPropagation()">
              <i class="mdi mdi-account-plus me-1"></i>New User
            </button>
            <i class="mdi mdi-chevron-right text-muted align-self-center"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="dismiss()">Close</button>
    </div>
  `,
})
export class OpenPositionsListModalComponent implements OnInit {
  searchTerm = '';
  isLoading = false;
  positions: any[] = [];

  constructor(
    private readonly userService: UserService,
    private readonly userModalService: UserModalService,
    private readonly activeModal: NgbActiveModal,
  ) {}

  ngOnInit(): void {
    void this.loadPositions();
  }

  get filteredPositions(): any[] {
    const term = String(this.searchTerm || '').trim().toLowerCase();
    if (!term) {
      return this.positions;
    }

    return this.positions.filter((position) => {
      const searchable = [
        position?.title,
        position?.department,
        position?.city,
        position?.state,
        position?.manager_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  }

  getLocationLabel(position: any): string {
    return [position?.city, position?.state].filter((value) => !!value).join(', ');
  }

  async loadPositions(): Promise<void> {
    this.isLoading = true;
    try {
      const rows = await this.userService.listOpenPositions();
      this.positions = (rows || []).filter((position) => this.isPositionOpen(position));
    } catch (error) {
      this.positions = [];
    } finally {
      this.isLoading = false;
    }
  }

  private getStatusValue(position: any): string {
    const rawStatus = String(position?.status ?? position?.hire_status ?? '').trim().toLowerCase();
    if (rawStatus === 'open' || rawStatus === 'filled' || rawStatus === 'closed') {
      return rawStatus;
    }

    if (Number(position?.openPosition ?? 0) === 1) {
      return 'open';
    }

    if (Number(position?.active ?? 1) === 0) {
      return 'closed';
    }

    return rawStatus || 'open';
  }

  private isPositionOpen(position: any): boolean {
    return this.getStatusValue(position) === 'open';
  }

  getStatusLabel(position: any): string {
    const status = this.getStatusValue(position);
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getStatusBadgeClass(position: any): string {
    const status = this.getStatusValue(position);
    if (status === 'closed') {
      return 'bg-secondary-subtle text-secondary';
    }
    if (status === 'filled') {
      return 'bg-success-subtle text-success';
    }
    return 'bg-warning-subtle text-warning';
  }

  createPosition(): void {
    this.activeModal.close({ action: 'create' } satisfies OpenPositionsListModalResult);
  }

  createUser(position?: any): void {
    const hasPositionContext = !!position;
    const today = new Date().toISOString().slice(0, 10);
    this.userModalService.open(null, {
      title: hasPositionContext ? 'Create User from Vacancy' : 'Create User',
      presetData: {
        first: '',
        last: '',
        title: position?.title || '',
        email: '',
        area: position?.department || '',
        workArea: '',
        parentId: position?.reports_to_user_id ?? null,
        active: 1,
        access: hasPositionContext ? 0 : 1,
        employeeType: 0,
        enableTwostep: 0,
        isEmployee: 1,
        org_chart_expand: 0,
        orgChartPlaceHolder: 0,
        openPosition: 0,
        showImage: 1,
        hire_date: today,
        createdDate: new Date().toISOString(),
      },
    });
  }

  managePosition(position: any): void {
    this.activeModal.close({ action: 'manage', position } satisfies OpenPositionsListModalResult);
  }

  dismiss(): void {
    this.activeModal.dismiss('dismiss');
  }
}