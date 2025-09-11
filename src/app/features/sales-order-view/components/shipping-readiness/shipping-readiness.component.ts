import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { SalesOrder, ShippingEligibility } from '../../models/sales-order.model';
import { SalesOrderShippingService } from '../../services/sales-order-shipping.service';

interface ShippingReadinessRow {
    salesOrder: SalesOrder;
    eligibility: ShippingEligibility;
    status: 'ready' | 'blocked' | 'warning';
    statusBadge: string;
    criticalIssues: number;
    warningsCount: number;
    blockersText: string;
}

@Component({
    selector: 'app-shipping-readiness',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="container-fluid mt-2">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 class="mb-1">Sales Order Shipping Readiness</h4>
          <p class="text-muted mb-0 small">Scan barcode to check shipping eligibility</p>
        </div>
        <div class="d-flex gap-2">
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="useMockData" [(ngModel)]="useMockData">
            <label class="form-check-label small" for="useMockData">Use Mock Data</label>
          </div>
        </div>
      </div>

      <!-- Barcode Scanner Section -->
      <div class="card mb-3 border-primary">
        <div class="card-header bg-primary text-white py-2">
          <h6 class="mb-0">
            <i class="fas fa-barcode me-2"></i>
            Barcode Scanner
          </h6>
        </div>
        <div class="card-body py-3">
          <div class="row align-items-end">
            <div class="col-md-8">
              <label class="form-label fw-bold small">Scan Sales Order Line:</label>
              <div class="input-group">
                <span class="input-group-text">
                  <i class="fas fa-barcode"></i>
                </span>
                <input 
                  type="text" 
                  class="form-control" 
                  #barcodeInput
                  [(ngModel)]="scannedBarcode" 
                  (keyup.enter)="searchSalesOrder()"
                  (input)="onBarcodeInput()"
                  (blur)="onInputBlur()"
                  placeholder="Scan barcode (e.g., SO123456-1)..."
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false">
                <button class="btn btn-success" type="button" (click)="searchSalesOrder()" [disabled]="!scannedBarcode?.trim()">
                  <i class="fas fa-search me-1"></i>
                  Check
                </button>
              </div>
              <small class="form-text text-muted">
                <i class="fas fa-info-circle me-1"></i>
                Scan the barcode from your placard (SO######-#)
              </small>
            </div>
            <div class="col-md-4">
              <div class="d-flex gap-2">
                <button class="btn btn-outline-secondary btn-sm" (click)="clearSearch()">
                  <i class="fas fa-times me-1"></i>
                  Clear
                </button>
                <button class="btn btn-outline-success btn-sm" (click)="focusBarcodeInput()">
                  <i class="fas fa-crosshairs me-1"></i>
                  📱 Ready
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Search Results Section (shown when barcode is scanned) -->
      <div *ngIf="searchedOrder" class="card mb-3" [ngClass]="getSearchResultCardClass()">
        <div class="card-header d-flex justify-content-between align-items-center py-2" 
             [ngClass]="searchedOrder.status === 'blocked' ? 'bg-danger text-white border-danger' : 
                        searchedOrder.status === 'warning' ? 'bg-warning text-dark border-warning' : 
                        'bg-success text-white border-success'">
          <h6 class="mb-0">
            <i class="fas fa-clipboard-check me-2"></i>
            {{ searchedOrder.salesOrder.sales_order_line_number || searchedOrder.salesOrder.SOD_NBR + '-' + searchedOrder.salesOrder.SOD_LINE }}
          </h6>
          <div class="d-flex align-items-center">
            <span class="badge me-2" [ngClass]="getStatusBadgeClass(searchedOrder.status)">
              {{ getStatusText(searchedOrder.status) }}
            </span>
            <span *ngIf="searchedOrder.status === 'blocked'" class="badge bg-white text-danger fw-bold border border-danger">
              🚫 BLOCKED
            </span>
          </div>
        </div>
        <div class="card-body py-3">
          <!-- Shipping Decision (Most Important - Show First) -->
          <div class="row mb-3">
            <div class="col-12">
              <div class="p-3 rounded border-2" [ngClass]="getShippingDecisionClass()">
                <div class="d-flex align-items-center">
                  <i [class]="getShippingDecisionIcon()" class="me-3" style="font-size: 1.5rem;"></i>
                  <div>
                    <h6 class="mb-1 fw-bold">Shipping Decision</h6>
                    <p class="mb-0 fw-bold">{{ getShippingDecisionText() }}</p>
                  </div>
                </div>
                
                <!-- Blockers for blocked orders -->
                <div *ngIf="searchedOrder.status === 'blocked'" class="mt-2">
                  <small class="fw-bold">Issues to resolve:</small>
                  <ul class="mb-0 mt-1 small">
                    <li *ngFor="let blocker of searchedOrder.eligibility.blockers.slice(0, 2)">{{ blocker }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Compact Details in Two Columns -->
          <div class="row">
            <!-- Essential Order Info -->
            <div class="col-md-6">
              <h6 class="fw-bold text-primary small">Order Information</h6>
              <div class="row small">
                <div class="col-6">
                  <div class="mb-1"><strong>Customer:</strong></div>
                  <div class="mb-1"><strong>Part:</strong></div>
                  <div class="mb-1"><strong>Due Date:</strong></div>
                  <div class="mb-1"><strong>Status:</strong></div>
                  <div class="mb-1"><strong>Price:</strong></div>
                  <div class="mb-1"><strong>Owner:</strong></div>
                </div>
                <div class="col-6">
                  <div class="mb-1">{{ searchedOrder.salesOrder.SO_CUST }}</div>
                  <div class="mb-1">{{ searchedOrder.salesOrder.SOD_PART }}</div>
                  <div class="mb-1" [ngClass]="isPastDue(searchedOrder.salesOrder.SOD_DUE_DATE) ? 'text-danger fw-bold' : 
                                               isFutureOrder(searchedOrder.salesOrder.SOD_DUE_DATE) ? 'text-primary fw-bold' : ''">
                    {{ searchedOrder.salesOrder.SOD_DUE_DATE | date:'shortDate' }}
                    <span *ngIf="isPastDue(searchedOrder.salesOrder.SOD_DUE_DATE)" class="badge bg-danger badge-sm ms-1">PAST DUE</span>
                    <span *ngIf="isFutureOrder(searchedOrder.salesOrder.SOD_DUE_DATE)" class="badge bg-primary badge-sm ms-1">FUTURE</span>
                  </div>
                  <div class="mb-1">{{ searchedOrder.salesOrder.STATUS }}</div>
                  <div class="mb-1" [ngClass]="searchedOrder.salesOrder.SOD_LIST_PR <= 0 ? 'text-danger fw-bold' : ''">
                    {{ searchedOrder.salesOrder.SOD_LIST_PR | currency }}
                    <span *ngIf="searchedOrder.salesOrder.SOD_LIST_PR <= 0" class="badge bg-danger badge-sm ms-1">NO PRICE</span>
                  </div>
                  <div class="mb-1" [ngClass]="searchedOrder.salesOrder.misc?.userName !== 'SHIPPING' ? 'text-warning fw-bold' : 'text-success'">
                    {{ searchedOrder.salesOrder.misc?.userName }}
                    <span *ngIf="searchedOrder.salesOrder.misc?.userName !== 'SHIPPING'" class="badge bg-warning badge-sm ms-1">NOT SHIPPING</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Issues & Warnings -->
            <div class="col-md-6">
              <h6 class="fw-bold text-primary small">Shipping Status</h6>
              
              <!-- Critical Issues -->
              <div *ngIf="searchedOrder.eligibility.issues.length > 0" class="mb-2">
                <div class="text-danger small fw-bold mb-1">
                  <i class="fas fa-exclamation-triangle me-1"></i>
                  Critical Issues ({{ searchedOrder.criticalIssues }})
                </div>
                <div *ngFor="let issue of searchedOrder.eligibility.issues.slice(0, 2)" class="alert alert-danger py-1 mb-1 small">
                  <strong>{{ issue.message }}</strong>
                </div>
                <div *ngIf="searchedOrder.eligibility.issues.length > 2" class="small text-muted">
                  +{{ searchedOrder.eligibility.issues.length - 2 }} more issues...
                </div>
              </div>

              <!-- Warnings -->
              <div *ngIf="searchedOrder.eligibility.warnings.length > 0" class="mb-2">
                <div class="text-warning small fw-bold mb-1">
                  <i class="fas fa-exclamation-circle me-1"></i>
                  Warnings ({{ searchedOrder.warningsCount }})
                </div>
                <div *ngFor="let warning of searchedOrder.eligibility.warnings.slice(0, 2)" class="mb-1">
                  <div class="alert py-1 mb-1 small" 
                       [ngClass]="warning.type === 'date' && warning.message.includes('future') ? 'alert-info' : 'alert-warning'">
                    <strong>{{ warning.message }}</strong>
                    <span class="badge badge-sm ms-1" [ngClass]="warning.impact === 'high' ? 'bg-danger' : warning.impact === 'medium' ? 'bg-warning' : 'bg-info'">
                      {{ warning.impact }}
                    </span>
                  </div>
                </div>
                <div *ngIf="searchedOrder.eligibility.warnings.length > 2" class="small text-muted">
                  +{{ searchedOrder.eligibility.warnings.length - 2 }} more warnings...
                </div>
              </div>

              <!-- Quick Actions -->
              <div class="mt-2">
                <button class="btn btn-outline-primary btn-sm me-2" (click)="showFullDetails = !showFullDetails">
                  <i class="fas fa-eye me-1"></i>
                  {{ showFullDetails ? 'Hide' : 'Show' }} Full Details
                </button>
              </div>
            </div>
          </div>

          <!-- Collapsible Full Details -->
          <div *ngIf="showFullDetails" class="row mt-3 pt-3 border-top">
            <div class="col-12">
              <div class="accordion" id="detailsAccordion">
                <!-- Order Details Accordion -->
                <div class="accordion-item">
                  <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#orderDetails">
                      Complete Order Information
                    </button>
                  </h2>
                  <div id="orderDetails" class="accordion-collapse collapse" data-bs-parent="#detailsAccordion">
                    <div class="accordion-body py-2">
                      <table class="table table-sm small">
                        <tr><td class="fw-bold">Description:</td><td>{{ searchedOrder.salesOrder.FULLDESC }}</td></tr>
                        <tr><td class="fw-bold">Age (Days):</td><td [ngClass]="searchedOrder.salesOrder.AGE > 30 ? 'text-warning fw-bold' : ''">{{ searchedOrder.salesOrder.AGE }}</td></tr>
                        <tr><td class="fw-bold">Qty Open:</td><td>{{ searchedOrder.salesOrder.QTYOPEN }}</td></tr>
                        <tr><td class="fw-bold">Qty On Hand:</td><td>{{ searchedOrder.salesOrder.LD_QTY_OH }}</td></tr>
                        <tr><td class="fw-bold">Work Order:</td><td>{{ searchedOrder.salesOrder.WO_NBR }}</td></tr>
                        <tr><td class="fw-bold">Routing:</td><td>{{ searchedOrder.salesOrder.PT_ROUTING }}</td></tr>
                        <tr><td class="fw-bold">Ship Via:</td><td>{{ searchedOrder.salesOrder.SO_SHIPVIA }}</td></tr>
                        <tr><td class="fw-bold">Ship To:</td><td>{{ searchedOrder.salesOrder.SO_SHIP }}</td></tr>
                      </table>
                    </div>
                  </div>
                </div>

                <!-- Comments Accordion -->
                <div class="accordion-item" *ngIf="searchedOrder.salesOrder.recent_comments?.comments">
                  <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#commentsDetails">
                      Recent Comments
                    </button>
                  </h2>
                  <div id="commentsDetails" class="accordion-collapse collapse" data-bs-parent="#detailsAccordion">
                    <div class="accordion-body py-2">
                      <div class="alert alert-info py-2 small">
                        <div class="fw-bold">{{ searchedOrder.salesOrder.recent_comments.comment_title }}</div>
                        <div [innerHTML]="searchedOrder.salesOrder.recent_comments.comments_html"></div>
                        <div class="text-muted">
                          By {{ searchedOrder.salesOrder.recent_comments.created_by_name }} on 
                          {{ searchedOrder.salesOrder.recent_comments.createdDate | date:'short' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Results Message -->
      <div *ngIf="searchAttempted && !searchedOrder && !loading" class="alert alert-warning py-2">
        <i class="fas fa-search me-2"></i>
        <strong>No Results Found</strong> - Could not find "{{ lastSearchedBarcode }}". Please verify and try again.
      </div>

      <!-- Summary Info -->
      <div class="row mb-2" *ngIf="!searchedOrder">
        <div class="col-12">
          <div class="alert alert-info py-2 small">
            <i class="fas fa-info-circle me-2"></i>
            <strong>How to use:</strong> Scan the barcode from your placard to check shipping eligibility instantly.
          </div>
        </div>
      </div>

      <!-- Loading overlay -->
      <div *ngIf="loading" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
           style="background: rgba(0,0,0,0.1); z-index: 1050;">
        <div class="card p-4">
          <div class="d-flex align-items-center">
            <div class="spinner-border text-primary me-3" role="status"></div>
            <div>Searching for sales order: {{ lastSearchedBarcode }}...</div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .card {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border: 1px solid #e3e6f0;
    }
    
    .badge {
      font-size: 0.75rem;
    }
    
    .badge-sm {
      font-size: 0.65rem;
      padding: 0.2em 0.4em;
    }
    
    .status-ready { color: #28a745; }
    .status-warning { color: #ffc107; }
    .status-blocked { color: #dc3545; }

    /* Compact table styling */
    .table-sm td {
      padding: 0.25rem 0.5rem;
      vertical-align: top;
    }

    /* Enhanced blocked order styling */
    .shipping-blocked {
      background: linear-gradient(45deg, #dc3545, #b02a37) !important;
      animation: pulse-danger 2s infinite;
      border: 3px solid #721c24 !important;
      box-shadow: 0 0 20px rgba(220, 53, 69, 0.5) !important;
    }

    .shipping-warning {
      background: linear-gradient(45deg, #ffc107, #e0a800) !important;
      border: 2px solid #b68900 !important;
    }

    .shipping-ready {
      background: linear-gradient(45deg, #28a745, #20833b) !important;
      border: 2px solid #155724 !important;
    }

    @keyframes pulse-danger {
      0% { box-shadow: 0 0 20px rgba(220, 53, 69, 0.5); }
      50% { box-shadow: 0 0 30px rgba(220, 53, 69, 0.8); }
      100% { box-shadow: 0 0 20px rgba(220, 53, 69, 0.5); }
    }

    /* High visibility blocked warning */
    .blocked-warning {
      animation: blink-red 1s infinite;
      font-weight: 900 !important;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    }

    @keyframes blink-red {
      0% { background-color: #dc3545; }
      50% { background-color: #a71e2a; }
      100% { background-color: #dc3545; }
    }

    /* Enhanced blocked card styling */
    .shipping-blocked-card {
      box-shadow: 0 0 25px rgba(220, 53, 69, 0.6) !important;
      animation: pulse-danger 2s infinite;
    }

    /* Compact responsive design */
    @media (max-height: 800px) {
      .container-fluid {
        padding-top: 0.5rem;
      }
      
      .card-body {
        padding: 1rem;
      }
      
      .alert {
        padding: 0.5rem 0.75rem;
      }
    }
  `]
})
export class ShippingReadinessComponent implements OnInit, OnDestroy {
    @ViewChild('barcodeInput') barcodeInput!: ElementRef;

    loading = false;
    useMockData = false;

    // Barcode scanner properties
    scannedBarcode = '';
    searchedOrder: ShippingReadinessRow | null = null;
    searchAttempted = false;
    lastSearchedBarcode = '';
    searchTimeout: any; // Timer for auto-search functionality
    showFullDetails = false; // Toggle for detailed view

    constructor(
        private http: HttpClient,
        private shippingService: SalesOrderShippingService
    ) { }

    ngOnInit() {
        // Initialize component without loading data
        // Data will be loaded only when user searches for a specific order
        this.focusBarcodeInput();
    }

    private getSalesOrdersFromAPI(): Observable<SalesOrder[]> {
        const apiUrl = 'https://dashboard.eye-fi.com/server/Api/Shipping/index?runOpenShippingReport';

        return this.http.get<any>(apiUrl).pipe(
            map(response => {
                // The API might return data in different formats, adapt as needed
                if (Array.isArray(response)) {
                    return response as SalesOrder[];
                } else if (response.data && Array.isArray(response.data)) {
                    return response.data as SalesOrder[];
                } else if (response.orders && Array.isArray(response.orders)) {
                    return response.orders as SalesOrder[];
                } else {
                    console.warn('Unexpected API response format:', response);
                    return [];
                }
            }),
            catchError(error => {
                console.error('API call failed:', error);
                return of([]); // Return empty array on error
            })
        );
    }

    private getMockSalesOrders(): Observable<SalesOrder[]> {
        // Generate multiple mock orders for testing based on real scenarios
        const mockOrders: SalesOrder[] = [];

        // Ready to ship order (has SHIPPING userName)
        mockOrders.push(this.createMockOrder('SO123001', 'ACME Corp', 'CTO-01234-001', 1500.00, new Date('2025-02-01'), 1, 1, { userName: 'SHIPPING' }));

        // Blocked - no pricing (like the real example)
        mockOrders.push(this.createMockOrder('SO131845', 'ATI', 'CTO-03514-401N', 0, new Date('2025-09-05'), 1, 0, { 
            noPricing: true, 
            userName: 'SALES REVIEW',
            pastDue: true,
            lateReasonCode: 'Customer Delay',
            recentComments: 'AWAITING COST ON YAHAM PANELS',
            lineNumber: 3,
            age: 70,
            status: 'Past Due',
            cmtComment: 'RMA502',
            bolNumber: 'PS127920'
        }));

        // Blocked - not in shipping department
        mockOrders.push(this.createMockOrder('SO123003', 'Systems Ltd', 'CTO-01234-003', 2500.00, new Date('2025-01-20'), 1, 1, { userName: 'PRODUCTION' }));

        // Warning - past due but in shipping
        mockOrders.push(this.createMockOrder('SO123004', 'Solutions Co', 'CTO-01234-004', 1800.00, new Date('2024-12-15'), 1, 1, { 
            pastDue: true, 
            userName: 'SHIPPING',
            lateReasonCode: 'Material Shortage'
        }));

        // Warning - inspection required
        mockOrders.push(this.createMockOrder('SO123005', 'Enterprise LLC', 'CTO-01234-005', 3200.00, new Date('2025-02-10'), 1, 1, { 
            inspectionRequired: true,
            userName: 'SHIPPING'
        }));

        // Warning - future order
        mockOrders.push(this.createMockOrder('SO123006', 'Future Corp', 'CTO-01234-006', 2800.00, new Date('2025-12-15'), 1, 1, { 
            userName: 'SHIPPING',
            status: 'Future Order',
            futureOrder: true,
            leadTime: 180
        }));

        return of(mockOrders);
    }

    private createMockOrder(
        orderNumber: string,
        customer: string,
        partNumber: string,
        price: number,
        dueDate: Date,
        qtyOpen: number,
        qtyOnHand: number,
        options: any = {}
    ): SalesOrder {
        return {
            SOD_NBR: orderNumber,
            SOD_DUE_DATE: dueDate.toISOString().split('T')[0],
            LEADTIME: options.leadTime || 14,
            SOD_PART: partNumber,
            SOD_QTY_ORD: qtyOpen,
            SOD_QTY_SHIP: 0,
            SOD_PRICE: price,
            SOD_CONTR_ID: `PO${Math.floor(Math.random() * 100000)}`,
            SOD_DOMAIN: "EYE",
            SOD_COMPL_STAT: "",
            OPENBALANCE: price,
            QTYOPEN: qtyOpen,
            SOD_QTY_ALL: qtyOpen,
            FULLDESC: `${partNumber} - Mock Description`,
            SO_CUST: customer,
            SOD_LINE: 1,
            SO_ORD_DATE: new Date().toISOString().split('T')[0],
            SO_SHIP: "Default Address",
            STATUS: options.status || (options.pastDue ? "Past Due" : "Open"),
            STATUSCLASS: options.futureOrder ? "badge badge-primary" : (options.pastDue ? "badge badge-danger" : "badge badge-success"),
            SOD_ORDER_CATEGORY: "",
            CP_CUST_PART: Math.floor(Math.random() * 100000),
            LD_QTY_OH: qtyOnHand,
            SO_BOL: "",
            SO_CMTINDX: 0,
            PT_ROUTING: "LINE 1",
            AGE: options.pastDue ? 65 : Math.floor(Math.random() * 30),
            SOD_LIST_PR: price,
            CMT_CMMT: options.recentComments || "",
            WORK_ORDER_ROUTING: partNumber,
            sod_acct: 47000,
            SO_SHIPVIA: "EYEFI",
            SALES_ORDER_LINE_NUMBER: `${orderNumber}-${options.lineNumber || 1}`,
            PT_DESC1: `${partNumber} Mock`,
            PT_DESC2: "Description",
            sod_per_date: dueDate.toISOString().split('T')[0],
            sod_type: "",
            OID_SO_ORDER_DATE: 20250101,
            OID_SO_ORDER_TIME: Date.now(),
            OID_SO_MSTR: Date.now(),
            sod_req_date: dueDate.toISOString().split('T')[0],
            REQ_DUE_DIFF: 0,
            WO_NBR: Math.floor(Math.random() * 50000),
            PT_REV: "A01",
            id: `${orderNumber}${options.lineNumber || 1}`,
            sales_order_line_number: `${orderNumber}-${options.lineNumber || 1}`,
            recent_notes: {},
            recent_comments: options.recentComments ? {
                orderNum: `${orderNumber}-${options.lineNumber || 1}`,
                comments_html: `<p>${options.recentComments}</p>`,
                comments: `<p>${options.recentComments}</p>`,
                createdDate: new Date().toISOString(),
                byDate: new Date().toISOString().split('T')[0],
                color_class_name: "text-info",
                bg_class_name: "bg-info",
                comment_title: `SO#: ${orderNumber}-${options.lineNumber || 1}`,
                created_by_name: "System User"
            } : undefined,
            misc: {
                id: Math.floor(Math.random() * 100000),
                userName: options.userName || "MOCK",
                so: `${orderNumber}-${options.lineNumber || 1}`,
                fs_install: null,
                createdDate: new Date().toISOString(),
                createdBy: 999,
                lastModDate: new Date().toISOString(),
                lastModUser: 999,
                fs_install_date: null,
                arrivalDate: null,
                shipViaAccount: null,
                source_inspection_required: options.inspectionRequired || false,
                source_inspection_completed: false,
                source_inspection_waived: null,
                pallet_count: null,
                container: null,
                container_due_date: null,
                last_mod_info: null,
                tj_po_number: Math.floor(Math.random() * 50000),
                tj_due_date: dueDate.toLocaleDateString(),
                g2e_comments: null,
                shortages_review: null,
                recoveryDate: null,
                lateReasonCode: options.lateReasonCode || null,
                lateReasonCodePerfDate: null,
                recoveryDateComment: null,
                supplyReview: null,
                shipping_db_status: null,
                clear_to_build_status: null,
                hot_order: options.hotOrder || false,
                lateReasonCodeComment: null
            }
        };
    }

    // Barcode Scanner Methods
    searchSalesOrder() {
        if (!this.scannedBarcode?.trim()) {
            return;
        }

        this.lastSearchedBarcode = this.scannedBarcode.trim();
        this.searchAttempted = true;
        this.searchedOrder = null;
        this.loading = true;

        // Clean up the barcode - remove any non-alphanumeric characters except hyphens
        const cleanBarcode = this.lastSearchedBarcode.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase();

        // Clear the input immediately for next scan and refocus
        this.scannedBarcode = '';
        this.focusBarcodeInput();

        // Search for the specific order
        this.searchSpecificOrder(cleanBarcode);
    }

    private searchSpecificOrder(barcode: string) {
        // If using mock data, find the specific order by sales_order_line_number
        if (this.useMockData) {
            this.getMockSalesOrders().subscribe({
                next: (salesOrders) => {
                    const foundSalesOrder = salesOrders.find(order => {
                        // Search by exact sales_order_line_number match first
                        const salesOrderLineNumber = order.sales_order_line_number?.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase();
                        if (salesOrderLineNumber === barcode) {
                            return true;
                        }
                        
                        // Fallback to other matching patterns
                        const orderNum = order.SOD_NBR.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase();
                        const fullOrderNum = `${order.SOD_NBR}-${order.SOD_LINE}`.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase();
                        return orderNum === barcode || fullOrderNum === barcode;
                    });

                    if (foundSalesOrder) {
                        const validationResult = this.shippingService.validateShippingEligibility(foundSalesOrder);
                        this.searchedOrder = this.createShippingReadinessRow(foundSalesOrder, validationResult.eligibility);
                        this.scrollToResult();
                    }
                    this.loading = false;
                },
                error: (error) => {
                    console.error('Error searching mock data:', error);
                    this.loading = false;
                }
            });
        } else {
            // Search in the real API for the specific order by sales_order_line_number
            this.searchInAPISpecific(barcode);
        }
    }

    private searchInAPISpecific(barcode: string) {
        // Call the API to get all orders and filter for the specific sales_order_line_number
        this.getSalesOrdersFromAPI().subscribe({
            next: (salesOrders) => {
                const foundSalesOrder = salesOrders.find(order => {
                    // Search by exact sales_order_line_number match first (this is the primary key)
                    const salesOrderLineNumber = order.sales_order_line_number?.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase();
                    if (salesOrderLineNumber === barcode) {
                        return true;
                    }
                    
                    // Also check SALES_ORDER_LINE_NUMBER field (backup)
                    const altSalesOrderLineNumber = order.SALES_ORDER_LINE_NUMBER?.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase();
                    if (altSalesOrderLineNumber === barcode) {
                        return true;
                    }
                    
                    // Fallback to other matching patterns for backwards compatibility
                    const orderNum = order.SOD_NBR.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase();
                    const fullOrderNum = `${order.SOD_NBR}-${order.SOD_LINE}`.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase();
                    return orderNum === barcode || fullOrderNum === barcode;
                });

                if (foundSalesOrder) {
                    const validationResult = this.shippingService.validateShippingEligibility(foundSalesOrder);
                    this.searchedOrder = this.createShippingReadinessRow(foundSalesOrder, validationResult.eligibility);
                    this.scrollToResult();
                }
                this.loading = false;
            },
            error: (error) => {
                console.error('Error searching for sales order:', error);
                this.loading = false;
            }
        });
    }

    private createShippingReadinessRow(salesOrder: SalesOrder, eligibility: ShippingEligibility): ShippingReadinessRow {
        let status: 'ready' | 'blocked' | 'warning';
        if (!eligibility.canShip || eligibility.blockers.length > 0) {
            status = 'blocked';
        } else if (eligibility.warnings.some(w => w.impact === 'high') || eligibility.warnings.length > 0) {
            status = 'warning';
        } else {
            status = 'ready';
        }

        return {
            salesOrder,
            eligibility,
            status,
            statusBadge: status,
            criticalIssues: eligibility.issues.filter(i => i.type === 'critical').length,
            warningsCount: eligibility.warnings.length,
            blockersText: eligibility.blockers.join(', ')
        };
    }

    onBarcodeInput() {
        // Check if barcode looks complete and auto-trigger search
        if (this.scannedBarcode && this.scannedBarcode.trim().length >= 8) {
            // Auto-search for complete looking barcodes (SO###### format or longer)
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                if (this.scannedBarcode && this.scannedBarcode.trim().length >= 8) {
                    this.searchSalesOrder();
                }
            }, 300); // Short delay to allow for complete barcode entry
        }
    }

    onInputBlur() {
        // Auto-refocus the input after a short delay (unless user is clicking elsewhere)
        setTimeout(() => {
            // Only refocus if no other input or button has focus
            const activeElement = document.activeElement;
            if (!activeElement || 
                (activeElement.tagName !== 'INPUT' && 
                 activeElement.tagName !== 'BUTTON' && 
                 activeElement.tagName !== 'SELECT' && 
                 activeElement.tagName !== 'TEXTAREA')) {
                this.focusBarcodeInput();
            }
        }, 100);
    }

    clearSearch() {
        this.scannedBarcode = '';
        this.searchedOrder = null;
        this.searchAttempted = false;
        this.lastSearchedBarcode = '';
        this.focusBarcodeInput();
    }

    focusBarcodeInput() {
        setTimeout(() => {
            if (this.barcodeInput?.nativeElement) {
                this.barcodeInput.nativeElement.focus();
                this.barcodeInput.nativeElement.select();
                // Add visual feedback to show the input is active
                this.barcodeInput.nativeElement.style.borderColor = '#0d6efd';
                this.barcodeInput.nativeElement.style.boxShadow = '0 0 0 0.25rem rgba(13, 110, 253, 0.25)';
                
                // Remove visual feedback after a short time
                setTimeout(() => {
                    if (this.barcodeInput?.nativeElement) {
                        this.barcodeInput.nativeElement.style.borderColor = '';
                        this.barcodeInput.nativeElement.style.boxShadow = '';
                    }
                }, 2000);
            }
        }, 100);
    }

    private scrollToResult() {
        setTimeout(() => {
            const resultElement = document.querySelector('.card.mb-4[ng-reflect-ng-class]');
            if (resultElement) {
                resultElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    // Helper methods for search results display
    getSearchResultCardClass(): string {
        if (!this.searchedOrder) return '';
        
        switch (this.searchedOrder.status) {
            case 'ready': return 'border-success border-3';
            case 'warning': return 'border-warning border-3';
            case 'blocked': return 'border-danger border-4 shipping-blocked-card';
            default: return '';
        }
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'ready': return 'bg-success';
            case 'warning': return 'bg-warning';
            case 'blocked': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    getStatusText(status: string): string {
        switch (status) {
            case 'ready': return 'READY TO SHIP';
            case 'warning': return 'WARNINGS PRESENT';
            case 'blocked': return 'SHIPPING BLOCKED';
            default: return 'UNKNOWN';
        }
    }

    isPastDue(dueDate: string): boolean {
        if (!dueDate) return false;
        const due = new Date(dueDate);
        const today = new Date();
        return due < today;
    }

    isFutureOrder(dueDate: string): boolean {
        if (!dueDate) return false;
        const due = new Date(dueDate);
        const today = new Date();
        const daysDifference = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
        return daysDifference > 7; // Consider orders more than 7 days in the future as "future orders"
    }

    getShippingDecisionClass(): string {
        if (!this.searchedOrder) return '';
        
        switch (this.searchedOrder.status) {
            case 'ready': return 'shipping-ready text-white';
            case 'warning': return 'shipping-warning text-dark';
            case 'blocked': return 'shipping-blocked text-white';
            default: return 'bg-secondary text-white';
        }
    }

    getShippingDecisionIcon(): string {
        if (!this.searchedOrder) return 'fas fa-question';
        
        switch (this.searchedOrder.status) {
            case 'ready': return 'fas fa-check-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            case 'blocked': return 'fas fa-times-circle';
            default: return 'fas fa-question';
        }
    }

    getShippingDecisionText(): string {
        if (!this.searchedOrder) return 'Unknown Status';
        
        if (this.searchedOrder.status === 'ready') {
            return '✅ APPROVED FOR SHIPPING';
        } else if (this.searchedOrder.status === 'warning') {
            return '⚠️ PROCEED WITH CAUTION - Review warnings before shipping';
        } else {
            return '🚫 DO NOT SHIP - CRITICAL ISSUES MUST BE RESOLVED FIRST';
        }
    }

    ngOnDestroy() {
        // Clean up timeout to prevent memory leaks
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }
}
