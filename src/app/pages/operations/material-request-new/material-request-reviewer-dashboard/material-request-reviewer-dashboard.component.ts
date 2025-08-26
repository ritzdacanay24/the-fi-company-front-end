import { Component, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { MaterialRequestValidationService, MaterialRequestValidationItem } from '@app/core/api/operations/material-request/material-request-validation.service';
import { ToastrService } from 'ngx-toastr';
import { AuthenticationService } from '@app/core/services/auth.service';

@Component({
    standalone: true,
    imports: [SharedModule],
    selector: 'app-material-request-reviewer-dashboard',
    template: `
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h4 class="card-title mb-0">
              <i class="ri-task-line me-2"></i>
              Material Request Review Dashboard
            </h4>
          </div>
          <div class="card-body">
            
            <!-- Summary Statistics -->
            <div class="row mb-4" *ngIf="summary">
              <div class="col-md-3">
                <div class="card text-center bg-warning bg-gradient">
                  <div class="card-body">
                    <h3 class="text-white">{{summary.pending_count || 0}}</h3>
                    <p class="text-white mb-0">Pending Review</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card text-center bg-danger bg-gradient">
                  <div class="card-body">
                    <h3 class="text-white">{{summary.urgent_pending || 0}}</h3>
                    <p class="text-white mb-0">Urgent Items</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card text-center bg-info bg-gradient">
                  <div class="card-body">
                    <h3 class="text-white">{{summary.high_pending || 0}}</h3>
                    <p class="text-white mb-0">High Priority</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card text-center bg-success bg-gradient">
                  <div class="card-body">
                    <h3 class="text-white">{{summary.completed_count || 0}}</h3>
                    <p class="text-white mb-0">Completed</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Items for Review -->
            <div *ngIf="items?.length; else noItems">
              <h5>Items Requiring Your Review</h5>
              <div class="table-responsive">
                <table class="table table-bordered">
                  <thead class="table-light">
                    <tr>
                      <th>Request #</th>
                      <th>Part Number</th>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Priority</th>
                      <th>Review Note</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of items">
                      <td>{{item.requestNumber}}</td>
                      <td>{{item.partNumber}}</td>
                      <td>{{item.description}}</td>
                      <td>{{item.qty}}</td>
                      <td>
                        <span class="badge"
                              [ngClass]="{
                                'bg-danger': item.reviewPriority === 'urgent',
                                'bg-warning': item.reviewPriority === 'high',
                                'bg-info': item.reviewPriority === 'normal',
                                'bg-secondary': item.reviewPriority === 'low'
                              }">
                          {{item.reviewPriority | titlecase}}
                        </span>
                      </td>
                      <td>{{item.reviewNote || '-'}}</td>
                      <td>
                        <div class="btn-group">
                          <button class="btn btn-success btn-sm" 
                                  (click)="approveItem(item)">
                            <i class="ri-check-line"></i> Approve
                          </button>
                          <button class="btn btn-danger btn-sm" 
                                  (click)="rejectItem(item)">
                            <i class="ri-close-line"></i> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <ng-template #noItems>
              <div class="text-center py-5">
                <i class="ri-task-line" style="font-size: 3rem; color: #ccc;"></i>
                <h5 class="mt-3">No items require your review</h5>
                <p class="text-muted">All assigned items have been reviewed.</p>
              </div>
            </ng-template>

          </div>
        </div>
      </div>
    </div>
  `
})
export class MaterialRequestReviewerDashboardComponent implements OnInit {
    items: any[] = [];
    summary: any = null;
    isLoading = false;

    constructor(
        private validationService: MaterialRequestValidationService,
        private toastrService: ToastrService,
        private authenticationService: AuthenticationService
    ) { }

    ngOnInit() {
        this.loadReviewItems();
    }

    async loadReviewItems() {
        this.isLoading = true;
        try {
            const currentUserId = this.authenticationService.currentUserValue?.id;
            const response: any = await this.validationService.getItemsForReview(currentUserId).toPromise();

            this.items = response.pendingReviews || [];
            this.summary = response.summary || {};
        } catch (error) {
            this.toastrService.error('Error loading review items');
        } finally {
            this.isLoading = false;
        }
    }

    async approveItem(item: any) {
        const comment = prompt('Add approval comment (optional):', '');

        try {
            await this.validationService.submitReview(item.id, 'approved', comment || '').toPromise();
            this.toastrService.success(`${item.partNumber} approved`);
            this.loadReviewItems(); // Refresh the list
        } catch (error) {
            this.toastrService.error('Error approving item');
        }
    }

    async rejectItem(item: any) {
        const comment = prompt('Enter rejection reason (required):', '');

        if (!comment) {
            this.toastrService.warning('Rejection reason is required');
            return;
        }

        try {
            await this.validationService.submitReview(item.id, 'rejected', comment).toPromise();
            this.toastrService.error(`${item.partNumber} rejected`);
            this.loadReviewItems(); // Refresh the list
        } catch (error) {
            this.toastrService.error('Error rejecting item');
        }
    }
}
