import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShippingAnalyticsComponent } from '../shipping-analytics/shipping-analytics.component';
import { ShippingDataService } from '../../services/shipping-data.service';
import { MasterSchedulingService } from '@app/core/api/operations/master-scheduling/master-scheduling.service';

@Component({
  selector: 'app-shipping-dashboard',
  standalone: true,
  imports: [CommonModule, ShippingAnalyticsComponent],
  template: `
    <div class="shipping-dashboard-container">
      <div class="dashboard-header">
        <h2><i class="las la-shipping-fast"></i> Shipping Operations Dashboard</h2>
        <div class="header-actions">
          <button 
            class="btn btn-primary" 
            (click)="refreshData()"
            [disabled]="isLoading">
            <i class="las la-sync-alt" [class.la-spin]="isLoading"></i>
            {{ isLoading ? 'Refreshing...' : 'Refresh Data' }}
          </button>
          <button 
            class="btn btn-outline-secondary" 
            (click)="toggleView()">
            <i class="las" [ngClass]="showAnalytics ? 'la-table' : 'la-chart-area'"></i>
            {{ showAnalytics ? 'Show Grid' : 'Show Analytics' }}
          </button>
        </div>
      </div>

      <!-- Analytics View -->
      <div *ngIf="showAnalytics" class="analytics-section">
        <app-shipping-analytics 
          [refreshTrigger]="refreshTrigger">
        </app-shipping-analytics>
      </div>

      <!-- Grid View Placeholder -->
      <div *ngIf="!showAnalytics" class="grid-section">
        <div class="card">
          <div class="card-header">
            <h5><i class="las la-table"></i> Shipping Orders Grid</h5>
          </div>
          <div class="card-body">
            <div class="alert alert-info">
              <i class="las la-info-circle"></i>
              <strong>Integration Point:</strong> 
              This is where your existing shipping grid component would be integrated.
              The analytics component above provides visual insights for the same data.
            </div>
            
            <div class="table-responsive">
              <table class="table table-hover">
                <thead class="table-dark">
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Ship Date</th>
                    <th>Est. Delivery</th>
                    <th>Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let order of sampleOrders">
                    <td>
                      <strong>{{ order.order_id }}</strong>
                    </td>
                    <td>
                      <div>{{ order.customer_name }}</div>
                      <small class="text-muted">{{ order.customer_tier }}</small>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="getStatusClass(order.status)">
                        {{ order.status }}
                      </span>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="getPriorityClass(order.priority)">
                        {{ order.priority }}
                      </span>
                    </td>
                    <td>{{ order.ship_date | date:'short' }}</td>
                    <td>{{ order.estimated_delivery | date:'short' }}</td>
                    <td>{{ order.order_value | currency }}</td>
                    <td>
                      <button class="btn btn-sm btn-outline-primary me-1">
                        <i class="las la-eye"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-secondary">
                        <i class="las la-edit"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions Panel -->
      <div class="quick-actions-panel mt-4">
        <div class="row">
          <div class="col-md-3">
            <div class="card bg-primary text-white">
              <div class="card-body text-center">
                <i class="las la-plus-circle fa-2x mb-2"></i>
                <h6>New Order</h6>
                <button class="btn btn-light btn-sm">Create</button>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-warning text-white">
              <div class="card-body text-center">
                <i class="las la-exclamation-triangle fa-2x mb-2"></i>
                <h6>Past Due</h6>
                <button class="btn btn-light btn-sm">Review</button>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-info text-white">
              <div class="card-body text-center">
                <i class="las la-shipping-fast fa-2x mb-2"></i>
                <h6>Track Orders</h6>
                <button class="btn btn-light btn-sm">Track</button>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-success text-white">
              <div class="card-body text-center">
                <i class="las la-file-export fa-2x mb-2"></i>
                <h6>Export Report</h6>
                <button class="btn btn-light btn-sm">Export</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .shipping-dashboard-container {
      padding: 20px;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e9ecef;
    }

    .dashboard-header h2 {
      margin: 0;
      color: #495057;
      font-weight: 600;
    }

    .dashboard-header i {
      color: #007bff;
      margin-right: 10px;
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }

    .btn {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .analytics-section {
      margin-bottom: 30px;
    }

    .grid-section .table {
      margin-bottom: 0;
    }

    .quick-actions-panel .card {
      transition: transform 0.2s ease;
      cursor: pointer;
    }

    .quick-actions-panel .card:hover {
      transform: translateY(-3px);
    }

    .badge.bg-delivered { 
      background-color: #28a745 !important; 
    }
    .badge.bg-in-transit { 
      background-color: #17a2b8 !important; 
    }
    .badge.bg-processing { 
      background-color: #ffc107 !important; 
      color: #212529 !important;
    }
    .badge.bg-pending { 
      background-color: #6c757d !important; 
    }

    .badge.bg-high { 
      background-color: #dc3545 !important; 
    }
    .badge.bg-medium { 
      background-color: #fd7e14 !important; 
    }
    .badge.bg-low { 
      background-color: #198754 !important; 
    }
    .badge.bg-critical { 
      background-color: #6f42c1 !important; 
    }

    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        gap: 15px;
        align-items: stretch;
      }

      .header-actions {
        justify-content: center;
      }

      .shipping-dashboard-container {
        padding: 10px;
      }
    }
  `]
})
export class ShippingDashboardComponent implements OnInit {
  showAnalytics = true;
  isLoading = false;
  refreshTrigger = 0;
  sampleOrders: any[] = [];

  constructor(private shippingDataService: ShippingDataService, private api: MasterSchedulingService) {}

  ngOnInit(): void {
    this.loadSampleData();
  }

  refreshData(): void {
    this.isLoading = true;
    this.refreshTrigger++;
    
    // Call the analytics component to refresh its data
    setTimeout(() => {
      this.isLoading = false;
    }, 1500);
  }

  toggleView(): void {
    this.showAnalytics = !this.showAnalytics;
  }

  private loadSampleData(): void {
    this.sampleOrders = this.shippingDataService.getSampleData();
  }

  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase().replace(/\s+/g, '-');
    return `badge bg-${statusLower}`;
  }

  getPriorityClass(priority: string): string {
    const priorityLower = priority.toLowerCase();
    return `badge bg-${priorityLower}`;
  }
}