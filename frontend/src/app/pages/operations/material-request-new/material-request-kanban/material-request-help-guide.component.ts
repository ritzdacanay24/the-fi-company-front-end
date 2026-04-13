import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveOffcanvas, NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-material-request-help-guide',
  standalone: true,
  imports: [CommonModule, NgbAccordionModule],
  template: `
    <div class="offcanvas-header border-bottom">
      <h4 class="offcanvas-title fw-bold text-primary">
        <i class="mdi mdi-help-circle-outline me-2"></i>
        Material Request Process Guide
      </h4>
      <button type="button" class="btn-close" aria-label="Close" (click)="close()"></button>
    </div>
    
    <div class="offcanvas-body">
      <!-- Quick Overview -->
      <div class="alert alert-info border-0 mb-4">
        <h5 class="alert-heading mb-3">
          <i class="mdi mdi-information-outline me-2"></i>
          Quick Overview
        </h5>
        <p class="mb-0">
          The Material Request Kanban board shows the flow of requests through four main stages: 
          <strong>Validation</strong>, <strong>Reviews</strong>, <strong>Fulfillment</strong>, and <strong>Complete</strong>.
        </p>
      </div>

      <!-- Process Flow Steps -->
      <div class="process-flow mb-4">
        <h5 class="mb-3 text-dark fw-bold">
          <i class="mdi mdi-timeline-outline me-2"></i>
          Process Flow
        </h5>

        <!-- Step 1: Validation -->
        <div class="step-card mb-3">
          <div class="d-flex align-items-start">
            <div class="step-number bg-warning text-dark">1</div>
            <div class="step-content">
              <h6 class="mb-2 text-warning fw-bold">
                <i class="mdi mdi-clipboard-check me-2"></i>
                Pending Validation
              </h6>
              <p class="text-muted mb-2">
                New requests start here for initial validation and setup.
              </p>
              <ul class="list-unstyled mb-0">
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Validate request details</li>
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Assign departments/reviewers</li>
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Set up review requirements</li>
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Initial quality checks</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Step 2: Reviews -->
        <div class="step-card mb-3">
          <div class="d-flex align-items-start">
            <div class="step-number bg-info text-white">2</div>
            <div class="step-content">
              <h6 class="mb-2 text-info fw-bold">
                <i class="mdi mdi-account-clock me-2"></i>
                Pending Reviews
              </h6>
              <p class="text-muted mb-2">
                Items requiring specialist or department reviews.
              </p>
              <ul class="list-unstyled mb-0">
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Technical reviews by specialists</li>
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Department approval process</li>
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Budget/cost validation</li>
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Compliance checks</li>
              </ul>
              <div class="alert alert-light border mt-2 mb-0">
                <small class="text-muted">
                  <i class="mdi mdi-lightbulb-outline me-1"></i>
                  <strong>Note:</strong> Requests stay here until ALL required reviews are complete.
                </small>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Fulfillment -->
        <div class="step-card mb-3">
          <div class="d-flex align-items-start">
            <div class="step-number bg-success text-white">3</div>
            <div class="step-content">
              <h6 class="mb-2 text-success fw-bold">
                <i class="mdi mdi-package-variant-closed me-2"></i>
                Ready for Fulfillment
              </h6>
              <p class="text-muted mb-2">
                Approved items ready for picking and fulfillment.
              </p>
              <ul class="list-unstyled mb-0">
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Final approval and authorization</li>
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Inventory picking</li>
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Quality control checks</li>
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Packaging and preparation</li>
              </ul>
              <div class="alert alert-success border-0 mt-2 mb-0">
                <small class="text-dark">
                  <i class="mdi mdi-information-outline me-1"></i>
                  <strong>Partial Approval:</strong> Items can be partially approved and picked while others await review.
                </small>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Complete -->
        <div class="step-card mb-3">
          <div class="d-flex align-items-start">
            <div class="step-number bg-dark text-white">4</div>
            <div class="step-content">
              <h6 class="mb-2 text-dark fw-bold">
                <i class="mdi mdi-check-all me-2"></i>
                Complete
              </h6>
              <p class="text-muted mb-2">
                Fully processed and delivered requests.
              </p>
              <ul class="list-unstyled mb-0">
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Items delivered to requestor</li>
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Documentation completed</li>
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Inventory updated</li>
                <li><i class="mdi mdi-check-circle text-success me-2"></i>Request closed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Automatic Queue Management -->
      <div class="alert alert-primary border-0 mb-4">
        <h5 class="alert-heading mb-3">
          <i class="mdi mdi-auto-fix me-2"></i>
          Automatic Queue Management
        </h5>
        <p class="mb-2">The system automatically moves requests between queues based on their actual state:</p>
        <ul class="mb-0">
          <li><strong>Pending Reviews:</strong> Automatically moved to Reviews queue</li>
          <li><strong>Approved Items:</strong> Automatically moved to Fulfillment queue</li>
          <li><strong>Validated Items:</strong> Automatically moved to Fulfillment for final approval</li>
          <li><strong>Completed Items:</strong> Automatically moved to Complete queue</li>
        </ul>
      </div>

      <!-- Card Actions -->
      <div class="mb-4">
        <h5 class="mb-3 text-dark fw-bold">
          <i class="mdi mdi-gesture-tap me-2"></i>
          Available Actions
        </h5>

        <div class="row g-3">
          <div class="col-md-6">
            <div class="action-card">
              <h6 class="text-primary mb-2">
                <i class="mdi mdi-eye me-2"></i>View Request
              </h6>
              <p class="text-muted small mb-0">View detailed request information in read-only mode</p>
            </div>
          </div>
          <div class="col-md-6">
            <div class="action-card">
              <h6 class="text-warning mb-2">
                <i class="mdi mdi-clipboard-edit me-2"></i>Validate
              </h6>
              <p class="text-muted small mb-0">Validate request details and assign reviewers</p>
            </div>
          </div>
          <div class="col-md-6">
            <div class="action-card">
              <h6 class="text-info mb-2">
                <i class="mdi mdi-account-check me-2"></i>Review
              </h6>
              <p class="text-muted small mb-0">Provide specialist or department review</p>
            </div>
          </div>
          <div class="col-md-6">
            <div class="action-card">
              <h6 class="text-success mb-2">
                <i class="mdi mdi-package-variant me-2"></i>Picking
              </h6>
              <p class="text-muted small mb-0">Manage inventory picking and fulfillment</p>
            </div>
          </div>
          <div class="col-md-6">
            <div class="action-card">
              <h6 class="text-secondary mb-2">
                <i class="mdi mdi-pencil me-2"></i>Edit
              </h6>
              <p class="text-muted small mb-0">Modify request details (if permissions allow)</p>
            </div>
          </div>
          <div class="col-md-6">
            <div class="action-card">
              <h6 class="text-secondary mb-2">
                <i class="mdi mdi-content-duplicate me-2"></i>Duplicate
              </h6>
              <p class="text-muted small mb-0">Create a copy of the request</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Status Indicators -->
      <div class="mb-4">
        <h5 class="mb-3 text-dark fw-bold">
          <i class="mdi mdi-traffic-light me-2"></i>
          Status Indicators
        </h5>

        <div class="row g-3">
          <div class="col-md-6">
            <div class="d-flex align-items-center mb-2">
              <span class="badge bg-danger me-2">High Priority</span>
              <span class="text-muted small">Urgent requests requiring immediate attention</span>
            </div>
          </div>
          <div class="col-md-6">
            <div class="d-flex align-items-center mb-2">
              <span class="badge bg-warning text-dark me-2">2 pending (1 done)</span>
              <span class="text-muted small">Review progress indicator</span>
            </div>
          </div>
          <div class="col-md-6">
            <div class="d-flex align-items-center mb-2">
              <span class="badge bg-success me-2">Approved</span>
              <span class="text-muted small">Items ready for picking</span>
            </div>
          </div>
          <div class="col-md-6">
            <div class="d-flex align-items-center mb-2">
              <span class="badge bg-primary me-2">In Picking</span>
              <span class="text-muted small">Currently being picked</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Best Practices -->
      <div class="alert alert-success border-0 mb-4">
        <h5 class="alert-heading mb-3">
          <i class="mdi mdi-lightbulb-outline me-2"></i>
          Best Practices
        </h5>
        <ul class="mb-0">
          <li><strong>Regular Review:</strong> Check your assigned reviews daily</li>
          <li><strong>Priority Handling:</strong> Address high-priority items first</li>
          <li><strong>Clear Communication:</strong> Add detailed notes when reviewing</li>
          <li><strong>Timely Action:</strong> Complete reviews within SLA timeframes</li>
          <li><strong>Collaboration:</strong> Communicate with team members on complex requests</li>
        </ul>
      </div>

      <!-- Troubleshooting -->
      <div class="mb-4">
        <h5 class="mb-3 text-dark fw-bold">
          <i class="mdi mdi-help-circle me-2"></i>
          Troubleshooting
        </h5>

        <div ngbAccordion>
          <div ngbAccordionItem>
            <h2 ngbAccordionHeader>
              <button ngbAccordionButton>Request not moving to next stage</button>
            </h2>
            <div ngbAccordionCollapse>
              <div ngbAccordionBody>
                <ng-template>
                  <p>Check if all required reviews are complete. Items will only move to fulfillment when all pending reviews are finished.</p>
                </ng-template>
              </div>
            </div>
          </div>

          <div ngbAccordionItem>
            <h2 ngbAccordionHeader>
              <button ngbAccordionButton>Cannot see review options</button>
            </h2>
            <div ngbAccordionCollapse>
              <div ngbAccordionBody>
                <ng-template>
                  <p>Ensure you have the appropriate permissions for the request type and department. Contact your administrator if needed.</p>
                </ng-template>
              </div>
            </div>
          </div>

          <div ngbAccordionItem>
            <h2 ngbAccordionHeader>
              <button ngbAccordionButton>Partial approval not working</button>
            </h2>
            <div ngbAccordionCollapse>
              <div ngbAccordionBody>
                <ng-template>
                  <p>Partial approval allows picking approved items while others await review. Check that individual items are marked as approved in the validation screen.</p>
                </ng-template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center pt-3 border-top">
        <p class="text-muted small mb-0">
          <i class="mdi mdi-information-outline me-1"></i>
          For additional support, contact your system administrator
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .offcanvas-body {
      overflow-y: auto;
      overflow-x: hidden;
      height: calc(100vh - 80px);
      padding: 1.5rem;
    }

    .step-card {
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 1rem;
      background: #f8f9fa;
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.875rem;
      margin-right: 1rem;
      flex-shrink: 0;
    }

    .step-content {
      flex: 1;
    }

    .action-card {
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 0.75rem;
      background: white;
      height: 100%;
    }

    .accordion-button {
      font-size: 0.875rem;
      padding: 0.75rem 1rem;
    }

    .accordion-body {
      font-size: 0.875rem;
    }

    ::ng-deep .faq-panel {
      .card-header {
        background-color: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
      }
      
      .btn-link {
        color: #495057;
        font-weight: 500;
        text-decoration: none;
        font-size: 0.875rem;
        
        &:hover {
          color: #0d6efd;
        }
      }
      
      .card-body {
        font-size: 0.875rem;
        color: #6c757d;
      }
    }

    ::ng-deep [ngbAccordion] {
      .accordion-item {
        border: 1px solid #dee2e6;
        border-radius: 0.375rem;
        margin-bottom: 0.5rem;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
      
      [ngbAccordionButton] {
        font-size: 0.875rem;
        font-weight: 500;
        color: #495057;
        background-color: #f8f9fa;
        border: none;
        padding: 0.75rem 1rem;
        width: 100%;
        text-align: left;
        
        &:hover {
          color: #0d6efd;
          background-color: #e9ecef;
        }
        
        &[aria-expanded="true"] {
          background-color: #e9ecef;
          color: #0d6efd;
        }
      }
      
      [ngbAccordionBody] {
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        color: #6c757d;
        background-color: white;
      }
    }
  `]
})
export class MaterialRequestHelpGuideComponent {
  constructor(public activeOffcanvas: NgbActiveOffcanvas) {}

  close() {
    this.activeOffcanvas.dismiss();
  }
}
