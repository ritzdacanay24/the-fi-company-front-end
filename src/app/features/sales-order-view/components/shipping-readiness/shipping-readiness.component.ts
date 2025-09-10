import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
    <div class="container-fluid mt-4">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="mb-1">Sales Order Shipping Readiness</h2>
          <p class="text-muted mb-0">Scan barcode to check shipping eligibility or review all orders</p>
        </div>
        <div class="d-flex gap-2">
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="useMockData" [(ngModel)]="useMockData">
            <label class="form-check-label" for="useMockData">Use Mock Data</label>
          </div>
        </div>
      </div>

      <!-- Barcode Scanner Section -->
      <div class="card mb-4 border-primary">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">
            <i class="fas fa-barcode me-2"></i>
            Barcode Scanner - Shipping Eligibility Check
          </h5>
        </div>
        <div class="card-body">
          <div class="row align-items-end">
            <div class="col-md-6">
              <label class="form-label fw-bold">Scan or Enter Sales Order Line Number:</label>
              <div class="input-group input-group-lg">
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
                  placeholder="Scan sales order line barcode (e.g., SO123456-1)..."
                  autocomplete="off">
                <button class="btn btn-success" type="button" (click)="searchSalesOrder()" [disabled]="!scannedBarcode?.trim()">
                  <i class="fas fa-search me-1"></i>
                  Check Eligibility
                </button>
              </div>
              <small class="form-text text-muted">
                <i class="fas fa-info-circle me-1"></i>
                Scan the barcode on your shipping paperwork that contains the full sales order line number (SO######-#)
              </small>
            </div>
            <div class="col-md-6">
              <div class="d-flex gap-2">
                <button class="btn btn-outline-secondary" (click)="clearSearch()">
                  <i class="fas fa-times me-1"></i>
                  Clear
                </button>
                <button class="btn btn-outline-info" (click)="focusBarcodeInput()">
                  <i class="fas fa-crosshairs me-1"></i>
                  Focus Scanner
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Search Results Section (shown when barcode is scanned) -->
      <div *ngIf="searchedOrder" class="card mb-4" [ngClass]="getSearchResultCardClass()">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">
            <i class="fas fa-clipboard-check me-2"></i>
            Shipping Eligibility: {{ searchedOrder.salesOrder.sales_order_line_number || searchedOrder.salesOrder.SOD_NBR + '-' + searchedOrder.salesOrder.SOD_LINE }}
          </h5>
          <span class="badge fs-6" [ngClass]="getStatusBadgeClass(searchedOrder.status)">
            {{ getStatusText(searchedOrder.status) }}
          </span>
        </div>
        <div class="card-body">
          <div class="row">
            <!-- Order Details -->
            <div class="col-md-6">
              <h6 class="fw-bold text-primary">Order Information</h6>
              <table class="table table-sm">
                <tr>
                  <td class="fw-bold">Sales Order Line:</td>
                  <td>{{ searchedOrder.salesOrder.sales_order_line_number || searchedOrder.salesOrder.SOD_NBR + '-' + searchedOrder.salesOrder.SOD_LINE }}</td>
                </tr>
                <tr>
                  <td class="fw-bold">Customer:</td>
                  <td>{{ searchedOrder.salesOrder.SO_CUST }}</td>
                </tr>
                <tr>
                  <td class="fw-bold">Part Number:</td>
                  <td>{{ searchedOrder.salesOrder.SOD_PART }}</td>
                </tr>
                <tr>
                  <td class="fw-bold">Description:</td>
                  <td>{{ searchedOrder.salesOrder.FULLDESC }}</td>
                </tr>
                <tr>
                  <td class="fw-bold">Due Date:</td>
                  <td [ngClass]="isPastDue(searchedOrder.salesOrder.SOD_DUE_DATE) ? 'text-danger fw-bold' : ''">
                    {{ searchedOrder.salesOrder.SOD_DUE_DATE | date:'mediumDate' }}
                    <span *ngIf="isPastDue(searchedOrder.salesOrder.SOD_DUE_DATE)" class="badge bg-danger ms-2">PAST DUE</span>
                  </td>
                </tr>
                <tr>
                  <td class="fw-bold">Status:</td>
                  <td>
                    <span [innerHTML]="searchedOrder.salesOrder.STATUSCLASS ? '<span class=&quot;' + searchedOrder.salesOrder.STATUSCLASS + '&quot;>' + searchedOrder.salesOrder.STATUS + '</span>' : searchedOrder.salesOrder.STATUS"></span>
                  </td>
                </tr>
                <tr>
                  <td class="fw-bold">Age (Days):</td>
                  <td [ngClass]="searchedOrder.salesOrder.AGE > 30 ? 'text-warning fw-bold' : ''">
                    {{ searchedOrder.salesOrder.AGE }}
                    <span *ngIf="searchedOrder.salesOrder.AGE > 30" class="badge bg-warning ms-2">OLD ORDER</span>
                  </td>
                </tr>
                <tr>
                  <td class="fw-bold">Qty Open:</td>
                  <td [ngClass]="searchedOrder.salesOrder.QTYOPEN <= 0 ? 'text-danger fw-bold' : ''">
                    {{ searchedOrder.salesOrder.QTYOPEN }}
                  </td>
                </tr>
                <tr>
                  <td class="fw-bold">Qty On Hand:</td>
                  <td [ngClass]="searchedOrder.salesOrder.LD_QTY_OH <= 0 ? 'text-danger fw-bold' : ''">
                    {{ searchedOrder.salesOrder.LD_QTY_OH }}
                  </td>
                </tr>
                <tr>
                  <td class="fw-bold">Price:</td>
                  <td [ngClass]="searchedOrder.salesOrder.SOD_LIST_PR <= 0 ? 'text-danger fw-bold' : ''">
                    {{ searchedOrder.salesOrder.SOD_LIST_PR | currency }}
                    <span *ngIf="searchedOrder.salesOrder.SOD_LIST_PR <= 0" class="badge bg-danger ms-2">NO PRICING</span>
                  </td>
                </tr>
                <tr>
                  <td class="fw-bold">Work Order:</td>
                  <td>{{ searchedOrder.salesOrder.WO_NBR }}</td>
                </tr>
                <tr>
                  <td class="fw-bold">Routing:</td>
                  <td>{{ searchedOrder.salesOrder.PT_ROUTING }}</td>
                </tr>
                <tr>
                  <td class="fw-bold">Ship Via:</td>
                  <td>{{ searchedOrder.salesOrder.SO_SHIPVIA }}</td>
                </tr>
                <tr>
                  <td class="fw-bold">Ship To:</td>
                  <td>{{ searchedOrder.salesOrder.SO_SHIP }}</td>
                </tr>
                <tr *ngIf="searchedOrder.salesOrder.SO_BOL">
                  <td class="fw-bold">BOL:</td>
                  <td>{{ searchedOrder.salesOrder.SO_BOL }}</td>
                </tr>
                <tr *ngIf="searchedOrder.salesOrder.CMT_CMMT">
                  <td class="fw-bold">Comments:</td>
                  <td>{{ searchedOrder.salesOrder.CMT_CMMT }}</td>
                </tr>
              </table>

              <!-- Recent Comments Section -->
              <div *ngIf="searchedOrder.salesOrder.recent_comments?.comments" class="mt-3">
                <h6 class="fw-bold text-info">Recent Comments</h6>
                <div class="alert alert-info py-2">
                  <div class="small fw-bold">{{ searchedOrder.salesOrder.recent_comments.comment_title }}</div>
                  <div [innerHTML]="searchedOrder.salesOrder.recent_comments.comments_html"></div>
                  <div class="small text-muted">
                    By {{ searchedOrder.salesOrder.recent_comments.created_by_name }} on 
                    {{ searchedOrder.salesOrder.recent_comments.createdDate | date:'short' }}
                  </div>
                </div>
              </div>

              <!-- Misc Info Section -->
              <div *ngIf="searchedOrder.salesOrder.misc" class="mt-3">
                <h6 class="fw-bold text-secondary">Additional Information</h6>
                <table class="table table-sm">
                  <tr>
                    <td class="fw-bold">Current Owner:</td>
                    <td [ngClass]="searchedOrder.salesOrder.misc.userName !== 'SHIPPING' ? 'text-warning fw-bold' : 'text-success'">
                      {{ searchedOrder.salesOrder.misc.userName }}
                      <span *ngIf="searchedOrder.salesOrder.misc.userName !== 'SHIPPING'" class="badge bg-warning ms-2">NOT IN SHIPPING</span>
                      <span *ngIf="searchedOrder.salesOrder.misc.userName === 'SHIPPING'" class="badge bg-success ms-2">AUTHORIZED</span>
                    </td>
                  </tr>
                  <tr *ngIf="searchedOrder.salesOrder.misc.tj_po_number">
                    <td class="fw-bold">TJ PO Number:</td>
                    <td>{{ searchedOrder.salesOrder.misc.tj_po_number }}</td>
                  </tr>
                  <tr *ngIf="searchedOrder.salesOrder.misc.tj_due_date">
                    <td class="fw-bold">TJ Due Date:</td>
                    <td>{{ searchedOrder.salesOrder.misc.tj_due_date }}</td>
                  </tr>
                  <tr *ngIf="searchedOrder.salesOrder.misc.lateReasonCode">
                    <td class="fw-bold">Late Reason:</td>
                    <td class="text-warning">{{ searchedOrder.salesOrder.misc.lateReasonCode }}</td>
                  </tr>
                  <tr *ngIf="searchedOrder.salesOrder.misc.hot_order">
                    <td class="fw-bold">Priority:</td>
                    <td class="text-danger fw-bold">🔥 HOT ORDER</td>
                  </tr>
                  <tr>
                    <td class="fw-bold">Last Modified:</td>
                    <td>{{ searchedOrder.salesOrder.misc.lastModDate | date:'short' }}</td>
                  </tr>
                </table>
              </div>
            </div>
            
            <!-- Shipping Status -->
            <div class="col-md-6">
              <h6 class="fw-bold text-primary">Shipping Status</h6>
              
              <!-- Critical Issues -->
              <div *ngIf="searchedOrder.eligibility.issues.length > 0" class="mb-3">
                <h6 class="text-danger">
                  <i class="fas fa-exclamation-triangle me-1"></i>
                  Critical Issues ({{ searchedOrder.criticalIssues }})
                </h6>
                <div *ngFor="let issue of searchedOrder.eligibility.issues" class="alert alert-danger py-2 mb-2">
                  <strong>{{ issue.message }}</strong>
                  <div class="small">{{ issue.description }}</div>
                  <div class="small text-muted">Resolution: {{ issue.resolution }}</div>
                </div>
              </div>

              <!-- Warnings -->
              <div *ngIf="searchedOrder.eligibility.warnings.length > 0" class="mb-3">
                <h6 class="text-warning">
                  <i class="fas fa-exclamation-circle me-1"></i>
                  Warnings ({{ searchedOrder.warningsCount }})
                </h6>
                <div *ngFor="let warning of searchedOrder.eligibility.warnings" class="alert alert-warning py-2 mb-2">
                  <strong>{{ warning.message }}</strong>
                  <span class="badge ms-2" [ngClass]="warning.impact === 'high' ? 'bg-danger' : warning.impact === 'medium' ? 'bg-warning' : 'bg-info'">
                    {{ warning.impact | titlecase }} Impact
                  </span>
                </div>
              </div>

              <!-- Recommendations -->
              <div *ngIf="searchedOrder.eligibility.recommendations.length > 0" class="mb-3">
                <h6 class="text-info">
                  <i class="fas fa-lightbulb me-1"></i>
                  Recommendations
                </h6>
                <ul class="list-unstyled">
                  <li *ngFor="let rec of searchedOrder.eligibility.recommendations" class="mb-1">
                    <i class="fas fa-arrow-right text-info me-2"></i>
                    {{ rec }}
                  </li>
                </ul>
              </div>

              <!-- Shipping Decision -->
              <div class="mt-4 p-3 rounded" [ngClass]="getShippingDecisionClass()">
                <h5 class="mb-2">
                  <i [class]="getShippingDecisionIcon()" class="me-2"></i>
                  Shipping Decision
                </h5>
                <p class="mb-0 fw-bold fs-5">{{ getShippingDecisionText() }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Results Message -->
      <div *ngIf="searchAttempted && !searchedOrder && !loading" class="alert alert-warning">
        <i class="fas fa-search me-2"></i>
        <strong>No Results Found</strong>
        <p class="mb-0">Could not find sales order "{{ lastSearchedBarcode }}". Please verify the barcode and try again.</p>
      </div>

      <!-- Summary Info -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            <strong>How to use:</strong> Use the barcode scanner above to check individual sales orders for shipping eligibility. 
            Scan the barcode on your paperwork or manually enter the sales order number to get instant shipping validation.
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
    
    .ag-theme-alpine {
      --ag-header-background-color: #f8f9fc;
      --ag-border-color: #e3e6f0;
    }
    
    .status-ready { color: #28a745; }
    .status-warning { color: #ffc107; }
    .status-blocked { color: #dc3545; }
  `]
})
export class ShippingReadinessComponent implements OnInit {
    @ViewChild('barcodeInput') barcodeInput!: ElementRef;

    loading = false;
    useMockData = false;

    // Barcode scanner properties
    scannedBarcode = '';
    searchedOrder: ShippingReadinessRow | null = null;
    searchAttempted = false;
    lastSearchedBarcode = '';

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
            LEADTIME: 14,
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
            STATUS: options.pastDue ? "Past Due" : "Open",
            STATUSCLASS: options.pastDue ? "badge badge-danger" : "badge badge-success",
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
        // Auto-trigger search if barcode looks complete (you can adjust this logic)
        if (this.scannedBarcode && this.scannedBarcode.length >= 6) {
            // Optional: Auto-search after a short delay
            // clearTimeout(this.searchTimeout);
            // this.searchTimeout = setTimeout(() => this.searchSalesOrder(), 500);
        }
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
            case 'ready': return 'border-success';
            case 'warning': return 'border-warning';
            case 'blocked': return 'border-danger';
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

    getShippingDecisionClass(): string {
        if (!this.searchedOrder) return '';
        
        switch (this.searchedOrder.status) {
            case 'ready': return 'bg-success text-white';
            case 'warning': return 'bg-warning text-dark';
            case 'blocked': return 'bg-danger text-white';
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
            return 'APPROVED FOR SHIPPING';
        } else if (this.searchedOrder.status === 'warning') {
            return 'PROCEED WITH CAUTION - Review warnings before shipping';
        } else {
            return 'DO NOT SHIP - Critical issues must be resolved';
        }
    }
}
