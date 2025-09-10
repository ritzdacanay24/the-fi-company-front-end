import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { SalesOrder, ShippingEligibility, ShippingIssue, ShippingWarning, ShippingValidationResult } from '../models/sales-order.model';

@Injectable({
  providedIn: 'root'
})
export class SalesOrderShippingService {
  private readonly API_URL = '/backend/api/sales-orders';

  constructor(private http: HttpClient) {}

  // Get sales order data
  getSalesOrder(salesOrderNumber: string): Observable<SalesOrder> {
    // For now, return mock data. Replace with actual API call
    return this.http.get<SalesOrder>(`${this.API_URL}/${salesOrderNumber}`);
  }

  // Validate shipping eligibility for a sales order
  validateShippingEligibility(salesOrder: SalesOrder): ShippingValidationResult {
    const eligibility = this.checkShippingEligibility(salesOrder);
    
    return {
      salesOrder,
      eligibility,
      lastValidated: new Date()
    };
  }

  // Core logic to determine if an order can be shipped
  private checkShippingEligibility(order: SalesOrder): ShippingEligibility {
    const issues: ShippingIssue[] = [];
    const warnings: ShippingWarning[] = [];
    const blockers: string[] = [];
    const recommendations: string[] = [];

    // Critical Check 1: No Cost List Price
    if (order.SOD_LIST_PR === 0) {
      issues.push({
        type: 'critical',
        field: 'SOD_LIST_PR',
        message: 'No Cost List Price is $0.00',
        description: 'Cannot ship order without valid pricing',
        resolution: 'Update the list price before shipping'
      });
      blockers.push('Missing or invalid pricing');
    }

    // Critical Check 2: Quantity Available
    if (order.QTYOPEN <= 0) {
      issues.push({
        type: 'critical',
        field: 'QTYOPEN',
        message: 'No open quantity available',
        description: 'All quantities have been shipped or allocated',
        resolution: 'Verify inventory or check for additional stock'
      });
      blockers.push('No open quantity available');
    }

    // Critical Check 3: Inventory Check
    if (order.LD_QTY_OH <= 0) {
      issues.push({
        type: 'critical',
        field: 'LD_QTY_OH',
        message: 'No quantity on hand',
        description: 'Insufficient inventory to fulfill order',
        resolution: 'Replenish inventory or contact production'
      });
      blockers.push('Insufficient inventory');
    }

    // Critical Check 4: Shipping Authorization
    if (order.misc?.userName !== 'SHIPPING') {
      issues.push({
        type: 'critical',
        field: 'userName',
        message: 'Order not authorized for shipping',
        description: `Current owner is "${order.misc?.userName || 'Unknown'}" - must be "SHIPPING" to authorize shipment`,
        resolution: 'Transfer order ownership to SHIPPING department'
      });
      blockers.push('Not authorized for shipping');
    }

    // Warning Checks
    
    // Past Due Check
    const dueDate = new Date(order.SOD_DUE_DATE);
    const today = new Date();
    if (dueDate < today) {
      warnings.push({
        type: 'date',
        message: `Order is past due (Due: ${order.SOD_DUE_DATE})`,
        impact: 'high'
      });
      recommendations.push('Expedite shipping due to past due date');
    }

    // Future Order Check  
    if (order.STATUS === 'Future Order') {
      warnings.push({
        type: 'date',
        message: 'This is a future order',
        impact: 'medium'
      });
    }

    // Quality/Routing Checks
    if (!order.PT_ROUTING || order.PT_ROUTING.trim() === '') {
      warnings.push({
        type: 'routing',
        message: 'No routing information available',
        impact: 'medium'
      });
      recommendations.push('Verify routing before shipping');
    }

    // Inspection Requirements
    if (order.misc?.source_inspection_required && !order.misc?.source_inspection_completed) {
      issues.push({
        type: 'warning',
        field: 'source_inspection',
        message: 'Source inspection required but not completed',
        description: 'Quality inspection must be completed before shipping',
        resolution: 'Complete required inspection or waive if appropriate'
      });
      blockers.push('Pending quality inspection');
    }

    // Hot Order Priority
    if (order.misc?.hot_order) {
      warnings.push({
        type: 'routing',
        message: 'This is a HOT ORDER - High Priority',
        impact: 'high'
      });
      recommendations.push('Process with highest priority');
    }

    // Allocation Check
    if (order.SOD_QTY_ALL < order.QTYOPEN) {
      warnings.push({
        type: 'inventory',
        message: 'Partial or no allocation',
        impact: 'medium'
      });
      recommendations.push('Check inventory allocation before shipping');
    }

    // Late Reason Code Check
    if (order.misc?.lateReasonCode) {
      warnings.push({
        type: 'date',
        message: `Late reason: ${order.misc.lateReasonCode}`,
        impact: 'high'
      });
      recommendations.push('Review late reason code before shipping');
    }

    // Order Age Check
    if (order.AGE > 30) {
      warnings.push({
        type: 'date',
        message: `Order is ${order.AGE} days old`,
        impact: 'medium'
      });
      recommendations.push('Verify order requirements due to age');
    }

    // Recent Comments Alert
    if (order.recent_comments?.comments) {
      warnings.push({
        type: 'quality',
        message: 'Order has recent comments - review before shipping',
        impact: 'high'
      });
      recommendations.push('Check recent comments for shipping instructions');
    }

    // Customer/Shipping Information
    if (!order.SO_SHIP || order.SO_SHIP.trim() === '') {
      issues.push({
        type: 'critical',
        field: 'SO_SHIP',
        message: 'No shipping address specified',
        description: 'Shipping address is required for order fulfillment',
        resolution: 'Add complete shipping address information'
      });
      blockers.push('Missing shipping address');
    }

    // Container/Packaging Check
    if (order.misc?.container_due_date) {
      const containerDueDate = new Date(order.misc.container_due_date);
      if (containerDueDate < today) {
        warnings.push({
          type: 'routing',
          message: 'Container due date has passed',
          impact: 'medium'
        });
      }
    }

    // Determine overall shipping eligibility
    const criticalIssues = issues.filter(issue => issue.type === 'critical');
    const canShip = criticalIssues.length === 0 && blockers.length === 0;
    const readyToShip = canShip && warnings.filter(w => w.impact === 'high').length === 0;

    return {
      canShip,
      issues,
      warnings,
      readyToShip,
      blockers,
      recommendations
    };
  }

  // Get mock sales order for testing
  getMockSalesOrder(): Observable<SalesOrder> {
    const mockOrder: SalesOrder = {
      SOD_NBR: "SO132367",
      SOD_DUE_DATE: "2025-09-15",
      LEADTIME: 11,
      SOD_PART: "CTO-03514-401",
      SOD_QTY_ORD: 1,
      SOD_QTY_SHIP: 0,
      SOD_PRICE: 14121.19,
      SOD_CONTR_ID: "PO087561",
      SOD_DOMAIN: "EYE",
      SOD_COMPL_STAT: "",
      OPENBALANCE: 14121.19,
      QTYOPEN: 1,
      SOD_QTY_ALL: 0,
      FULLDESC: "CTO, 4POD, Backlit,Baron, No LED",
      SO_CUST: "ATI",
      SOD_LINE: 4,
      SO_ORD_DATE: "2025-09-04",
      SO_SHIP: "NV.DECAT",
      STATUS: "Future Order",
      STATUSCLASS: "badge badge-success",
      SOD_ORDER_CATEGORY: "",
      CP_CUST_PART: 145304,
      LD_QTY_OH: 1,
      SO_BOL: "",
      SO_CMTINDX: 0,
      PT_ROUTING: "LINE 1",
      AGE: -5,
      SOD_LIST_PR: 0, // Set to 0 to test the no-cost pricing issue
      CMT_CMMT: "",
      WORK_ORDER_ROUTING: "CTO-03514-401",
      sod_acct: 47000,
      SO_SHIPVIA: "EYEFI",
      SALES_ORDER_LINE_NUMBER: "SO132367-4",
      PT_DESC1: "CTO, 4POD, Backlit,",
      PT_DESC2: "Baron, No LED",
      sod_per_date: "2025-09-15",
      sod_type: "",
      OID_SO_ORDER_DATE: 20250904,
      OID_SO_ORDER_TIME: 1231088885,
      OID_SO_MSTR: 2.025090412310889e+17,
      sod_req_date: "2025-09-15",
      REQ_DUE_DIFF: 0,
      WO_NBR: 40385,
      PT_REV: "X04",
      id: "SO1323674",
      sales_order_line_number: "SO132367-4",
      recent_notes: {},
      misc: {
        id: 46491,
        userName: "PROD",
        so: "SO132367-4",
        fs_install: null,
        createdDate: "2025-09-04 10:44:51",
        createdBy: 513,
        lastModDate: "2025-09-10 09:09:01",
        lastModUser: 531,
        fs_install_date: null,
        arrivalDate: null,
        shipViaAccount: null,
        source_inspection_required: true,
        source_inspection_completed: false,
        source_inspection_waived: null,
        pallet_count: null,
        container: null,
        container_due_date: null,
        last_mod_info: null,
        tj_po_number: 40383,
        tj_due_date: "9/9",
        g2e_comments: null,
        shortages_review: null,
        recoveryDate: null,
        lateReasonCode: null,
        lateReasonCodePerfDate: null,
        recoveryDateComment: null,
        supplyReview: null,
        shipping_db_status: null,
        clear_to_build_status: null,
        hot_order: true,
        lateReasonCodeComment: null
      }
    };

    return of(mockOrder);
  }
}
