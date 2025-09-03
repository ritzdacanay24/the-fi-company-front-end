import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { NgSelectModule } from "@ng-select/ng-select";
import { MasterSchedulingService } from "@app/core/api/operations/master-scheduling/master-scheduling.service";
import moment from "moment";
import {
  agGridDateFilter,
  currencyFormatter,
  highlightRowView,
  highlightRowViewV1,
  isEmpty,
} from "src/assets/js/util";
import { CommentsModalService } from "@app/shared/components/comments/comments-modal.service";
import { WorkOrderRoutingModalService } from "@app/shared/components/work-order-routing-modal/work-order-routing-modal.component";
import { FgLabelPrintModalService } from "@app/shared/components/fg-label-print-modal/fg-label-print-modal.component";
import { AddressInfoModalService } from "@app/shared/components/address-info-modal/address-info-modal.component";
import { OwnerTransactionsService } from "@app/shared/components/owner-transactions/owner-transactions.component";
import { CustomerOrderInfoModalService } from "@app/shared/components/customer-order-info/customer-order-info.component";
import { SalesOrderInfoModalService } from "@app/shared/components/sales-order-info-modal/sales-order-info-modal.component";
import { ItemInfoModalService } from "@app/shared/components/item-info-modal/item-info-modal.component";
import { PorLabelPrintModalService } from "@app/shared/components/por-label-print-modal/por-label-print-modal.component";
import { PlacardModalService } from "@app/shared/components/placard-modal/placard-modal.component";
import { LateReasonCodeModalService } from "@app/shared/components/last-reason-code-modal/late-reason-code-modal.component";
import { NotesModalService } from "@app/shared/components/notes-modal/notes-modal.component";
import { RfqModalService } from "@app/shared/components/rfq-modal/rfq-modal.component";
import { ShippingMiscModalService } from "@app/shared/components/shipping-misc-modal/shipping-misc-modal.component";
import { NgbDropdownModule } from "@ng-bootstrap/ng-bootstrap";
import { TableSettingsService } from "@app/core/api/table-settings/table-settings.service";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { WebsocketService } from "@app/core/services/websocket.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { PartsOrderModalService } from "@app/pages/field-service/parts-order/parts-order-modal/parts-order-modal.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { ShipAccountRendererV2Component } from "@app/shared/ag-grid/cell-renderers/ship-account-renderer-v2/ship-account-renderer-v2.component";
import { CommentsRendererV2Component } from "@app/shared/ag-grid/comments-renderer-v2/comments-renderer-v2.component";
import { EditIconV2Component } from "@app/shared/ag-grid/edit-icon-v2/edit-icon-v2.component";
import { IconRendererV2Component } from "@app/shared/ag-grid/icon-renderer-v2/icon-renderer-v2.component";
import { NotesRendererV2Component } from "@app/shared/ag-grid/notes-renderer-v2/notes-renderer-v2.component";
import { StatusDateRenderer } from "@app/shared/ag-grid/cell-renderers/status-date-renderer-v2.component";
import { BomRendererV2Component } from "@app/shared/ag-grid/bom-renderer-v2/bom-renderer-v2.component";
import { BomViewModalService } from "@app/shared/components/bom-view-modal/bom-view-modal.component";
import { WorkOrderInfoModalService } from "@app/shared/components/work-order-info-modal/work-order-info-modal.component";
import { ChecboxRendererV2 } from "@app/shared/ag-grid/cell-renderers/checkbox-renderer-v2/checkbox-renderer-v2.component";
import { LateReasonCodeRendererV2Component } from "@app/shared/ag-grid/cell-renderers/late-reason-code-renderer-v2/late-reason-code-renderer-v2.component";
import { OwnerRendererV2Component } from "@app/shared/ag-grid/owner-renderer-v2/owner-renderer-v2.component";

// Priority-related interfaces
interface PriorityData {
  order_id: string;
  sales_order_number: string;
  sales_order_line: string;
  priority_level: number;
  notes?: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  is_active: boolean;
}

interface ShippingOrder {
  id: any;
  SOD_NBR: string;
  SOD_LINE: string;
  SOD_PART: string;
  STATUS: string;
  shipping_priority?: number;
  priority_notes?: string;
  [key: string]: any; // For other dynamic properties
}

const WS_SHIPPING = "WS_SHIPPING";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule,
    NgbDropdownModule,
    GridSettingsComponent,
    GridFiltersComponent,
  ],
  selector: "app-shipping",
  templateUrl: "./shipping.component.html",
  styleUrls: ["./shipping.component.scss"],
})
export class ShippingComponent implements OnInit {
  onBtExport() {
    this.gridApi!.exportDataAsExcel();
  }

  pastDue() {
    this.gridApi!.setColumnFilterModel("STATUS", {
      values: ["Past Due"],
      filterType: "set",
    }).then(() => {
      this.gridApi!.onFilterChanged();
    });
  }

  dueToday() {
    this.gridApi!.setColumnFilterModel("STATUS", {
      values: ["Due Today"],
      filterType: "set",
    }).then(() => {
      this.gridApi!.onFilterChanged();
    });
  }

  future() {
    this.gridApi!.setColumnFilterModel("STATUS", {
      values: ["Future Order"],
      filterType: "set",
    }).then(() => {
      this.gridApi!.onFilterChanged();
    });
  }

  all() {
    this.gridApi!.setColumnFilterModel("STATUS", null).then(() => {
      this.gridApi!.onFilterChanged();
    });
  }

  constructor(
    public router: Router,
    private api: MasterSchedulingService,
    public activatedRoute: ActivatedRoute,
    private commentsModalService: CommentsModalService,
    private workOrderRoutingModalService: WorkOrderRoutingModalService,
    private fgLabelPrintModal: FgLabelPrintModalService,
    private addressInfoModalService: AddressInfoModalService,
    private ownerTransactionsService: OwnerTransactionsService,
    private customerOrderInfoModalService: CustomerOrderInfoModalService,
    private salesOrderInfoModalService: SalesOrderInfoModalService,
    private itemInfoModalService: ItemInfoModalService,
    private porLabelPrintModalService: PorLabelPrintModalService,
    private placardModalService: PlacardModalService,
    private lateReasonCodeModalService: LateReasonCodeModalService,
    private notesModalService: NotesModalService,
    private rfqModalService: RfqModalService,
    private shippingMiscModalService: ShippingMiscModalService,
    private tableSettingsService: TableSettingsService,
    private websocketService: WebsocketService,
    private authenticationService: AuthenticationService,
    private partsOrderModalService: PartsOrderModalService,
    private workOrderInfoModalService: WorkOrderInfoModalService,
    private bomViewModalService: BomViewModalService

  ) {
    this.websocketService = websocketService;

    //watch for changes if this modal is open
    //changes will only occur if modal is open and if the modal equals to the same qir number
    const ws_observable = this.websocketService.multiplex(
      () => ({ subscribe: WS_SHIPPING }),
      () => ({ unsubscribe: WS_SHIPPING }),
      (message) => message.type === WS_SHIPPING
    );

    //if changes are found, patch new values
    ws_observable.subscribe((data: any) => {
      if (Array.isArray(data?.message)) {
        this.gridApi.applyTransaction({ update: data?.message });
        this.gridApi.redrawRows();
      } else {
        var rowNode = this.gridApi.getRowNode(data.message.id);
        this.gridApi.applyTransaction({ update: [data.message] });
        this.gridApi.redrawRows({ rowNodes: [rowNode] });

        this.refreshCells([rowNode]);
      }
    });
  }

  statusCount = {
    pastDue: 0,
    todayDue: 0,
    futureDue: 0,
  };

  private calculateStatus() {
    let statusCount = {
      pastDue: 0,
      todayDue: 0,
      futureDue: 0,
    };

    let data = this.data;
    for (let i = 0; i < data.length; i++) {
      let status = data[i].STATUS;
      if (status == "Past Due") {
        statusCount.pastDue++;
      } else if (status == "Due Today") {
        statusCount.todayDue++;
      } else {
        statusCount.futureDue++;
      }
    }

    return statusCount;
  }

  public refreshCells(rowNode) {
    this.gridApi.flashCells({
      rowNodes: rowNode,
      flashDuration: 3000,
      fadeDuration: 2000,
    });
  }

  comment;

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
      this.gridFilterId = params["gridFilterId"];
      this.gridViewId = params["gridViewId"];
      this.comment = params["comment"];
    });

    // Initialize user ID
    this.userSsoId = this.authenticationService.currentUserValue?.ssoId || 'unknown';

    // Set up global methods for cell renderer buttons
    (window as any).removePriorityOrder = (orderId: string) => this.removePriorityOrder(orderId);
    (window as any).movePriorityToTop = (orderId: string) => this.movePriorityToTop(orderId);
    (window as any).addToPriorityList = (orderData: any) => this.addToPriorityList(orderData);

    this.getData();

    if (this.comment) {
      this.viewComment(this.comment, null);
    }
  }

  dateFrom = moment()
    .subtract(12, "months")
    .startOf("month")
    .format("YYYY-MM-DD");
  dateTo = moment().endOf("month").format("YYYY-MM-DD");
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event: { [x: string]: string }) {
    this.dateFrom = $event["dateFrom"];
    this.dateTo = $event["dateTo"];
    this.getData();
  }

  viewFilter() {
    const savedModel = this.gridApi.getFilterModel();
  }

  gridFilterId;

  gridViewId;

  gridApi: GridApi;

  id = null;

  title = "Shipping";

  // Priority system properties
  activeTab: 'all' | 'priority' = 'all';
  priorityData: PriorityData[] = [];
  priorityMap = new Map<string, PriorityData>();
  allOrdersData: ShippingOrder[] = [];
  priorityOrdersData: ShippingOrder[] = [];
  allOrdersCount = 0;
  priorityOrdersCount = 0;
  userSsoId: string = '';
  
  // Priority management grid
  priorityGridApi!: GridApi;
  priorityGridOptions: GridOptions = {
    rowDragManaged: true,
    animateRows: true,
    suppressMoveWhenRowDragging: true,
    rowDragEntireRow: true,
    suppressRowDrag: false,
    onRowDragEnd: (event) => this.onPriorityRowDragEnd(event),
    getRowStyle: (params) => {
      if (params.data.shipping_priority) {
        return { 
          backgroundColor: '#f8f9fa', 
          border: '2px solid #007bff',
          fontWeight: 'bold'
        };
      }
      return null;
    }
  };

  priorityColumns: ColDef[] = [
    {
      field: 'priority_position',
      headerName: '#',
      width: 60,
      cellStyle: { textAlign: 'center', fontWeight: 'bold', fontSize: '16px' },
      valueGetter: (params) => {
        const rowIndex = params.node?.rowIndex;
        return rowIndex !== undefined ? rowIndex + 1 : '';
      }
    },
    {
      rowDrag: true,
      headerName: '',
      width: 40,
      cellRenderer: () => '<i class="mdi mdi-drag-vertical" style="cursor: grab; color: #6c757d;"></i>'
    },
    {
      field: 'SOD_NBR',
      headerName: 'Sales Order',
      width: 120,
      cellStyle: { fontWeight: 'bold' }
    },
    {
      field: 'SOD_LINE', 
      headerName: 'Line',
      width: 80
    },
    {
      field: 'SOD_PART',
      headerName: 'Part Number',
      width: 150
    },
    {
      field: 'SOD_CUSTOMER_NAME',
      headerName: 'Customer',
      width: 200
    },
    {
      field: 'SOD_DUE_DATE',
      headerName: 'Due Date',
      width: 120,
      valueFormatter: (params) => {
        if (params.value) {
          return moment(params.value).format('MM/DD/YYYY');
        }
        return '';
      }
    },
    {
      field: 'priority_notes',
      headerName: 'Priority Notes',
      width: 200,
      editable: true,
      cellEditor: 'agTextCellEditor'
    },
    {
      headerName: 'Actions',
      width: 120,
      cellRenderer: (params: any) => {
        return `
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-danger" onclick="window.removePriorityOrder('${params.data.id}')" title="Remove from Priority">
              <i class="mdi mdi-close"></i>
            </button>
            <button class="btn btn-sm btn-outline-primary" onclick="window.movePriorityToTop('${params.data.id}')" title="Move to Top">
              <i class="mdi mdi-chevron-double-up"></i>
            </button>
          </div>
        `;
      }
    }
  ];

  public isInspection(data: any) {
    return (
      data.source_inspection_required == "Yes" &&
      (data.source_inspection_completed == "No" ||
        data.source_inspection_completed == "" ||
        data.source_inspection_completed == null)
    );
  }
  isModalOpen = false;

  viewComment = (salesOrderLineNumber: any, id: string, so?) => {

    if (this.isModalOpen) return;

    this.isModalOpen = true;

    let modalRef = this.commentsModalService.open(
      salesOrderLineNumber,
      "Sales Order"
    );
    modalRef.result.then(
      (result: any) => {
        this.isModalOpen = false;

        let rowNode = this.gridApi.getRowNode(id);
        rowNode.data.recent_comments = result;
        this.gridApi.redrawRows({ rowNodes: [rowNode] });

        this.websocketService.next({
          actions: {
            time: moment().format("h:mm A"),
            icon: "feather icon-message-square",
            link: `/master-scheduling/shipping?comment=${rowNode.data.SALES_ORDER_LINE_NUMBER}`,
            info: `Comment added by ${this.authenticationService.currentUserValue.full_name} on SO#: ${rowNode.data.SALES_ORDER_LINE_NUMBER} Comment: ${rowNode.data.recent_comments.comments_html}`,
          },
          message: rowNode.data,
          type: WS_SHIPPING,
        });
        this.router.navigate([`.`], {
          relativeTo: this.activatedRoute,
          queryParamsHandling: "merge",
          queryParams: {
            comment: null,
          },
        });
      },
      () => {
        this.isModalOpen = false;
        this.router.navigate([`.`], {
          relativeTo: this.activatedRoute,
          queryParamsHandling: "merge",
          queryParams: {
            comment: null,
          },
        });
      }
    );
  };

  viewPartsOrder = (so_number_and_line) => {
    let modalRef = this.partsOrderModalService.open(so_number_and_line);
    modalRef.result.then(
      (result: any) => { },
      () => { }
    );
  };

  viewBom = (data: { partNumber: string, soNumber?: string, rowData: any }) => {
    if (!data.partNumber) {
      console.warn('No part number provided for BOM view');
      return;
    }
    
    let modalRef = this.bomViewModalService.open(data.partNumber, data.soNumber);
    modalRef.result.then(
      (result: any) => { 
        // Handle any result if needed
      },
      () => { 
        // Handle modal dismiss
      }
    );
  };

  viewRouting = (partNumber) => {
    let modalRef = this.workOrderRoutingModalService.open(partNumber);
    modalRef.result.then(
      (result: any) => { },
      () => { }
    );
  };

  viewPlacard = (so, line, partNumber) => {
    let modalRef = this.placardModalService.open(so, line, partNumber);
    modalRef.result.then(
      (result: any) => { },
      () => { }
    );
  };

  viewReasonCode = (key, misc, soLineNumber, rowData) => {
    let modalRef = this.lateReasonCodeModalService.open(
      key,
      misc,
      soLineNumber,
      "Shipping"
    );
    modalRef.result.then(
      (result: any) => {
        rowData.misc = result;
        this.sendAndUpdate(rowData, rowData.id);
      },
      () => { }
    );
  };

  viewNotes = (e: { rowData: any }) => {
    const uniqueId = `${e.rowData.SOD_NBR}-${e.rowData.SOD_LINE}`;
    let modalRef = this.notesModalService.open(
      uniqueId,
      e.rowData.recent_notes,
      "Sales Order"
    );
    modalRef.result.then(
      (result: any) => {
        e.rowData.recent_notes = result;
        this.sendAndUpdate(e.rowData, e.rowData.id);
      },
      () => { }
    );
  };

  vewRfq = (e: { rowData: any }) => {
    let modalRef = this.rfqModalService.open(
      e.rowData.SOD_NBR,
      e.rowData.SOD_LINE
    );
    modalRef.result.then(
      (result: any) => {
        this.getData();
      },
      () => { }
    );
  };

  openMisc(soLine, rowData) {
    const modalRef = this.shippingMiscModalService.open(soLine);
    modalRef.result.then((result: any) => {
      rowData.misc = result;
      this.sendAndUpdate(rowData, rowData.id);
    });
  }

  searchName = "";

  onFilterTextBoxChanged(value: any) {
    this.gridApi.setGridOption("quickFilterText", value);
  }

  // Priority-related methods
  switchTab(tab: 'all' | 'priority') {
    this.activeTab = tab;
    if (tab === 'all') {
      this.data = this.allOrdersData;
    } else {
      this.data = this.priorityOrdersData;
    }
    this.updateCounts();
  }

  updateCounts() {
    this.allOrdersCount = this.allOrdersData.length;
    this.priorityOrdersCount = this.priorityOrdersData.length;
  }

  // Method to refresh mock data - useful for testing
  refreshMockData() {
    console.log('Refreshing mock priority data...');
    this.loadPriorities();
  }

  // Method to demonstrate mock functionality with test data
  testMockPriorities() {
    console.log('🧪 Testing Mock Priority System...');
    
    // Simulate adding priorities to some orders
    if (this.data.length > 0) {
      const testOrders = this.data.slice(0, 3); // Take first 3 orders for testing
      
      testOrders.forEach(async (order, index) => {
        const testPriority = index + 1;
        console.log(`🔧 Setting priority ${testPriority} for ${order.SOD_NBR}-${order.SOD_LINE}`);
        await this.updatePriority(order, testPriority);
      });
      
      setTimeout(() => {
        console.log('🎉 Mock test completed! Check the Priority Orders tab.');
        alert('Mock test completed! Check the Priority Orders tab to see the results.');
      }, 1000);
    } else {
      console.log('⚠️ No orders available for testing');
      alert('No orders available for testing. Please load some shipping data first.');
    }
  }

  // AG-Grid Priority Management Methods
  onPriorityGridReady(params: any) {
    this.priorityGridApi = params.api;
    this.updatePriorityGrid();
  }

  onPriorityRowDragEnd(event: any) {
    console.log('🔄 Priority row drag ended');
    this.recalculatePriorities();
  }

  recalculatePriorities() {
    const allRowData: any[] = [];
    this.priorityGridApi.forEachNode((node, index) => {
      if (node.data) {
        // Update priority based on new position
        const newPriority = index + 1;
        const oldPriority = node.data.shipping_priority;
        
        node.data.shipping_priority = newPriority;
        allRowData.push(node.data);
        
        // Update the priority in the mock service
        this.updatePriorityInService(node.data, newPriority);
        
        console.log(`📍 Reordered: ${node.data.SOD_NBR}-${node.data.SOD_LINE} from priority ${oldPriority} to ${newPriority}`);
      }
    });

    // Update the main data
    this.priorityOrdersData = [...allRowData];
    this.updateCounts();
    
    // Refresh the main grid to show updated priorities
    if (this.gridApi) {
      this.gridApi.refreshCells();
    }

    console.log('✅ Priority recalculation completed');
  }

  async updatePriorityInService(orderData: any, newPriority: number) {
    try {
      await this.api.updateShippingPriority({
        orderId: `${orderData.SOD_NBR}-${orderData.SOD_LINE}`,
        salesOrderNumber: orderData.SOD_NBR,
        salesOrderLine: orderData.SOD_LINE,
        priority: newPriority,
        notes: orderData.priority_notes || `Priority ${newPriority}`
      });
    } catch (error) {
      console.error('Error updating priority in service:', error);
    }
  }

  updatePriorityGrid() {
    if (this.priorityGridApi && this.priorityOrdersData) {
      // Sort by current priority
      const sortedData = [...this.priorityOrdersData].sort((a, b) => {
        return (a.shipping_priority || 999) - (b.shipping_priority || 999);
      });
      
      this.priorityGridApi.setGridOption('rowData', sortedData);
      console.log('🔄 Priority grid updated with', sortedData.length, 'orders');
    }
  }

  // Quick action methods (called from cell renderer buttons)
  removePriorityOrder(orderId: string) {
    const order = this.priorityOrdersData.find(o => o.id === orderId);
    if (order) {
      this.updatePriority(order, 0); // Remove priority
      setTimeout(() => {
        this.updatePriorityGrid();
      }, 100);
    }
  }

  movePriorityToTop(orderId: string) {
    const orderIndex = this.priorityOrdersData.findIndex(o => o.id === orderId);
    if (orderIndex > 0) {
      // Move order to top of array
      const order = this.priorityOrdersData.splice(orderIndex, 1)[0];
      this.priorityOrdersData.unshift(order);
      
      // Update grid and recalculate priorities
      this.updatePriorityGrid();
      setTimeout(() => {
        this.recalculatePriorities();
      }, 100);
    }
  }

  // Add order to priority list
  addToPriorityList(orderIdOrData: any) {
    let orderData;
    
    // Handle both order ID and order object inputs
    if (typeof orderIdOrData === 'string') {
      // Find order by ID
      orderData = this.allOrdersData.find(order => order.id === orderIdOrData);
      if (!orderData) {
        console.error('Order not found with ID:', orderIdOrData);
        return;
      }
    } else {
      orderData = orderIdOrData;
    }
    
    if (!orderData.shipping_priority) {
      const nextPriority = this.priorityOrdersData.length + 1;
      console.log(`➕ Adding order ${orderData.SOD_NBR}-${orderData.SOD_LINE} to priority list as priority ${nextPriority}`);
      
      this.updatePriority(orderData, nextPriority);
      
      setTimeout(() => {
        this.updatePriorityGrid();
      }, 200);
    } else {
      console.log(`⚠️ Order ${orderData.SOD_NBR}-${orderData.SOD_LINE} already has priority ${orderData.shipping_priority}`);
    }
  }

  async updatePriority(orderData: ShippingOrder, newPriority: number): Promise<boolean> {
    try {
      // Generate order ID from SO number and line
      const orderId = `${orderData.SOD_NBR}-${orderData.SOD_LINE}`;
      
      console.log('🎯 Mock Priority Update Request:', {
        orderId,
        currentPriority: orderData.shipping_priority,
        newPriority,
        orderDetails: `${orderData.SOD_NBR}-${orderData.SOD_LINE}`
      });
      
      // Check if priority already exists (excluding current order)
      const existingOrder = this.allOrdersData.find(
        order => order.shipping_priority === newPriority && 
                order.id !== orderData.id && 
                newPriority > 0
      );
      
      if (existingOrder && newPriority > 0) {
        console.log('❌ Priority conflict detected:', `Priority ${newPriority} already assigned to ${existingOrder.SOD_NBR}-${existingOrder.SOD_LINE}`);
        alert(`Priority ${newPriority} is already assigned to SO#${existingOrder.SOD_NBR}-${existingOrder.SOD_LINE}`);
        return false;
      }

      // Update via API (mock)
      await this.api.updateShippingPriority({
        orderId: orderId,
        salesOrderNumber: orderData.SOD_NBR,
        salesOrderLine: orderData.SOD_LINE,
        priority: newPriority,
        notes: `Priority set for ${orderData.SOD_PART}`
      });

      // Update local data
      orderData.shipping_priority = newPriority;
      
      // Update priority map
      if (newPriority > 0) {
        this.priorityMap.set(orderId, {
          priority_level: newPriority,
          order_id: orderId,
          sales_order_number: orderData.SOD_NBR,
          sales_order_line: orderData.SOD_LINE,
          notes: `Priority set for ${orderData.SOD_PART}`,
          created_at: new Date().toISOString(),
          created_by: this.userSsoId || 'unknown',
          updated_at: new Date().toISOString(),
          updated_by: this.userSsoId || 'unknown',
          is_active: true
        });
        
        console.log('✅ Mock Priority Set:', {
          orderId,
          priority: newPriority,
          totalPriorities: this.priorityMap.size
        });
      } else {
        this.priorityMap.delete(orderId);
        console.log('🗑️ Mock Priority Removed:', orderId);
      }
      
      this.refreshPriorityData();
      
      return true;
    } catch (error) {
      console.error('❌ Error updating mock priority:', error);
      alert('Failed to update priority. Please try again.');
      return false;
    }
  }

  async loadPriorities() {
    try {
      const response = await this.api.getShippingPriorities();
      if (response && response.success) {
        // Create a map of order IDs to priority data
        this.priorityMap.clear();
        if (response.data) {
          response.data.forEach((priority: any) => {
            this.priorityMap.set(priority.order_id, priority);
          });
        }
        
        console.log('Mock Priorities Loaded:', {
          count: this.priorityMap.size,
          priorities: Array.from(this.priorityMap.values())
        });
        
        // Merge priority data with shipping data
        this.mergePriorityData();
      }
    } catch (error) {
      console.error('Error loading priorities:', error);
    }
  }

  mergePriorityData() {
    // Add priority information to shipping data
    this.data.forEach((order: any) => {
      const orderId = `${order.SOD_NBR}-${order.SOD_LINE}`;
      const priorityData = this.priorityMap.get(orderId);
      
      if (priorityData) {
        order.shipping_priority = priorityData.priority_level;
        order.priority_notes = priorityData.notes;
      } else {
        order.shipping_priority = 0;
        order.priority_notes = null;
      }
    });
    
    this.refreshPriorityData();
  }

  refreshPriorityData() {
    // Split data based on priority
    this.allOrdersData = [...this.data];
    this.priorityOrdersData = this.data.filter(order => 
      order.shipping_priority && order.shipping_priority > 0
    ).sort((a, b) => a.shipping_priority - b.shipping_priority);
    
    this.updateCounts();
    
    // Refresh current view
    if (this.activeTab === 'priority') {
      this.data = this.priorityOrdersData;
    }
  }

  columnDefs: ColDef[] = [
    {
      field: "Misc Edit",
      headerName: "Misc Edit",
      filter: false,
      valueGetter: (params) => {
        if (params.data) {
          return `SO#: ${params?.data?.sales_order_line_number}`;
        } else {
          return null;
        }
      },
      cellRenderer: ShipAccountRendererV2Component,
      cellRendererParams: {
        onClick: (e) =>
          this.openMisc(
            `${e.rowData.SOD_NBR}-${e.rowData.SOD_LINE}`,
            e.rowData
          ),
      },
      maxWidth: 120,
      suppressHeaderMenuButton: false,
    },
    {
      field: "shipping_priority",
      headerName: "Priority",
      filter: false,
      editable: true,
      maxWidth: 100,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0,
        max: 9999,
        precision: 0
      },
      cellRenderer: (params: any) => {
        if (params.data && params.value > 0) {
          return `<span class="badge bg-warning text-dark">
                    <i class="mdi mdi-star me-1"></i>${params.value}
                  </span>`;
        }
        return params.value || '';
      },
      onCellValueChanged: async (params: any) => {
        const newPriority = parseInt(params.newValue) || 0;
        const success = await this.updatePriority(params.data, newPriority);
        if (!success) {
          // Revert the change if it failed
          params.data.shipping_priority = params.oldValue;
          this.gridApi.refreshCells({ rowNodes: [params.node] });
        }
      },
      tooltipField: 'shipping_priority',
      headerTooltip: 'Set shipping priority (1 = highest priority). Must be unique.',
    },
    {
      headerName: "Priority Actions",
      filter: false,
      sortable: false,
      maxWidth: 150,
      cellRenderer: (params: any) => {
        const hasPriority = params.data?.shipping_priority > 0;
        
        if (hasPriority) {
          return `
            <div class="d-flex gap-1">
              <button class="btn btn-sm btn-outline-danger" 
                      onclick="window.removePriorityOrder('${params.data.id}')" 
                      title="Remove Priority">
                <i class="mdi mdi-star-off"></i>
              </button>
              <button class="btn btn-sm btn-outline-primary" 
                      onclick="window.movePriorityToTop('${params.data.id}')" 
                      title="Move to Top Priority">
                <i class="mdi mdi-chevron-double-up"></i>
              </button>
            </div>
          `;
        } else {
          return `
            <button class="btn btn-sm btn-outline-success" 
                    onclick="window.addToPriorityList('${params.data.id}')" 
                    title="Add to Priority List">
              <i class="mdi mdi-star-plus"></i>
              Add Priority
            </button>
          `;
        }
      },
      headerTooltip: 'Quick actions for priority management',
    },
    {
      field: "STATUS",
      headerName: "Status",
      filter: "agSetColumnFilter",
      cellRenderer: (params: any) => {
        if (params.data) {
          if (params.value == "Future Order")
            return `<span class="badge bg-success-subtle text-success mb-0">${params.value}</span>`;
          if (params.value == "Past Due")
            return `<span class="badge bg-danger-subtle text-danger mb-0">${params.value}</span>`;
          if (params.value == "Due Today")
            return `<span class="badge bg-warning-subtle text-warning mb-0">${params.value}</span>`;
          return params.value;
        }
        return null;
      },
    },
    {
      field: "SOD_PART",
      headerName: "Part",
      filter: "agMultiColumnFilter",

      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.itemInfoModalService.open(e.rowData.SOD_PART),
        isLink: true,
      },
    },
    {
      field: "VIEW_BOM",
      headerName: "BOM",
      filter: false,
      sortable: false,
      cellRenderer: BomRendererV2Component,
      maxWidth: 70,
      minWidth: 60,
      width: 65,
      suppressHeaderMenuButton: true,
      cellClass: "text-center",
    },
    { field: "FULLDESC", headerName: "Desc", filter: "agMultiColumnFilter" },
    {
      field: "CP_CUST_PART",
      headerName: "Cust Part #",
      filter: "agMultiColumnFilter",
    },
    {
      field: "PT_REV",
      headerName: "Part Revision",
      filter: "agMultiColumnFilter",
    },
    {
      field: "SOD_NBR",
      headerName: "SO #",
      filter: "agMultiColumnFilter",
      cellStyle: (e) => {
        if (
          e.data &&
          e.data.SOD_NBR &&
          e.data.SOD_NBR.toString().includes("SV")
        )
          return { borderColor: "#0074D9", borderWidth: "1px" };
        return null;
      },
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.salesOrderInfoModalService.open(e.rowData.SOD_NBR),
        isLink: true,
      },
    },
    { field: "SOD_LINE", headerName: "Line #", filter: "agNumberColumnFilter" },
    {
      field: "SOD_CONTR_ID",
      headerName: "PO #",
      filter: "agMultiColumnFilter",
    },
    { field: "SO_CUST", headerName: "Customer", filter: "agMultiColumnFilter" },
    {
      field: "SO_SHIP",
      headerName: "Ship To",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.addressInfoModalService.open(e.rowData.SO_SHIP),
        isLink: true,
      },
    },
    {
      field: "SOD_QTY_ORD",
      headerName: "Qty Ordered",
      filter: "agNumberColumnFilter",
    },
    {
      field: "SOD_QTY_ALL",
      headerName: "Qty Allocated",
      filter: "agNumberColumnFilter",
    },
    {
      field: "SOD_QTY_SHIP",
      headerName: "Qty Shipped",
      filter: "agNumberColumnFilter",
    },
    {
      field: "QTYOPEN",
      headerName: "Qty Open",
      filter: "agNumberColumnFilter",
    },
    {
      field: "LD_QTY_OH",
      headerName: "Qty OH",
      filter: "agSetColumnFilter",
      cellClass: (e) => {
        if (e.data && e.data.LD_QTY_OH <= 0)
          return ["border-start border-danger"];
        return null;
      },
      filterParams: {
        valueGetter: (params) => {
          if (params.data && params.data.LD_QTY_OH <= 0) {
            return "No qty on hand";
          } else {
            return "On hand qty available";
          }
        },
      },
    },
    {
      field: "Drop in today",
      headerName: "Dropped in today",
      filter: "agSetColumnFilter",
      cellClass: (e) => {
        if (e.data && e.data.SOD_DUE_DATE == e.data.SO_ORD_DATE)
          return ["border-start border-danger"];
        return null;
      },
      valueGetter: (e) => {
        if (e.data && e.data.SOD_DUE_DATE == e.data.SO_ORD_DATE)
          return "Dropped in today"
        return null;
      },
      filterParams: {
        valueGetter: (e) => {
          if (e.data && e.data.SOD_DUE_DATE == e.data.SO_ORD_DATE) {
            return "Dropped in today";
          } else {
            return null;
          }
        },
      },
    },
    {
      field: "SOD_DUE_DATE",
      headerName: "Due Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
      cellStyle: (params) => {
        if (params.data && this.isInspection(params.data?.misc)) {
          return {
            "background-color": "#0074D9",
            color: "#fff",
          };
        }
        return null;
      },
      // cellRenderer: (params) => {
      //   if (params.data) {
      //     if (params.data && this.isInspection(params.data?.misc)) {
      //       let startdate = moment(params.data.SOD_DUE_DATE);
      //       const dow = startdate.day();

      //       if (dow == 1) {
      //         startdate = startdate.subtract(3, "days");
      //         return startdate.format("YYYY-MM-DD");
      //       } else {
      //         startdate = startdate.subtract(1, "days");
      //         return startdate.format("YYYY-MM-DD");
      //       }
      //     } else {
      //       return params.data.SOD_DUE_DATE;
      //     }
      //   }
      // },
    },
    {
      field: "SOD_ORDER_CATEGORY",
      headerName: "Customer CO #",
      filter: "agTextColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.customerOrderInfoModalService.open(e.rowData.SOD_ORDER_CATEGORY);
        },
        isLink: true,
      },
    },
    {
      field: "SO_ORD_DATE",
      headerName: "Ordered Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
    },
    { field: "PT_ROUTING", headerName: "Routing", filter: "agSetColumnFilter" },
    {
      field: "Comments",
      headerName: "Comments",
      filter: "agMultiColumnFilter",
      cellRenderer: CommentsRendererV2Component,
      cellRendererParams: {
        onClick: (params: any) =>
          this.viewComment(
            params.rowData.sales_order_line_number,
            params.rowData.id,
            params.rowData.SOD_NBR
          ),
      },
      valueGetter: (params) => {
        if (params.data)
          if (params.data?.recent_comments?.bg_class_name == "bg-info") {
            return "Has Comments";
          }
        if (params.data?.recent_comments?.bg_class_name == "bg-success") {
          return "New Comments";
        } else {
          return "No Comments";
        }
      },
      filterParams: {
        valueGetter: (params) => {
          let data = params.value;
          if (data !== "") {
            return "Has Comments";
          } else {
            return "No Comments";
          }
        },
      },
    },
    {
      field: "recent_comments.comments_html",
      headerName: "Recent Comment",
      filter: "agTextColumnFilter",
      autoHeight: false,
      wrapText: false,
      width: 100,
      minWidth: 100,
      // suppressSizeToFit: true,
      // suppressAutoSize: true,
      tooltipField: "recent_comments.comments_html",
    },
    {
      field: "CMT_CMMT",
      headerName: "QAD Comments",
      filter: "agMultiColumnFilter",
      tooltipField: "CMT_CMMT",
      filterParams: {
        valueGetter: (params) => {
          let data = params.data.CMT_CMMT;
          if (data !== "") {
            return "Has Comments";
          } else {
            return "No Comments";
          }
        },
      },
    },
    {
      field: "misc.userName",
      headerName: "Owner",
      filter: "agMultiColumnFilter",
      editable: true,
      cellRenderer: EditIconV2Component,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "ownerTransactions",
      headerName: "Owner Transactions",
      filter: "agSetColumnFilter",
      cellRenderer: OwnerRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.ownerTransactionsService.open(
            `${e.rowData.SOD_NBR}-${e.rowData.SOD_LINE}`
          );
        },
      },
      filterParams: {
        valueGetter: (params) => {
          if (params.data && !isEmpty(params.data.recent_owner_changes)) {
            return "New Owners";
          } else {
            return "Show All";
          }
        },
      },
    },
    {
      field: "SOD_LIST_PR",
      headerName: "List Price",
      filter: "agSetColumnFilter",
      valueFormatter: currencyFormatter,
      aggFunc: "sum",
      filterParams: {
        valueGetter: (params) => {
          if (params.data.SOD_LIST_PR == 0.0) {
            return "No cost list price";
          } else {
            return "Has list price";
          }
        },
      },
    },
    {
      field: "SOD_LIST_PR",
      headerName: "No Cost List Price",
      filter: "agSetColumnFilter",
      valueFormatter: currencyFormatter,
      cellStyle: function (e) {
        if (e.data && 0 == e.data.SOD_LIST_PR)
          return { borderColor: "red", borderWidth: "1px", display: "inline" };
        return null;
      },
      filterParams: {
        valueGetter: (params) => {
          if (params.data.SOD_LIST_PR == 0.0) {
            return "No cost list price";
          } else {
            return "Has list price";
          }
        },
      },
    },
    {
      field: "OPENBALANCE",
      headerName: "Open Balance",
      filter: "agNumberColumnFilter",
      valueFormatter: currencyFormatter,
      aggFunc: "sum",
    },
    {
      field: "WORK_ORDER_ROUTING",
      headerName: "View Work Order Routing",
      filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.viewRouting(e.rowData.SOD_PART),
        isLink: true,
      },
    },
    {
      field: "LEADTIME",
      headerName: "Lead Time",
      filter: "agTextColumnFilter",
    },
    { field: "AGE", headerName: "Age", filter: "agSetColumnFilter" },
    {
      field: "RFQ",
      headerName: "RFQ",
      filter: "agSetColumnFilter",
      cellRenderer: IconRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.vewRfq(e);
        },
        iconName: "mdi mdi-printer",
      },
    },
    {
      field: "misc.arrivalDate",
      headerName: "Arrival Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
    },
    {
      field: "misc.shipViaAccount",
      headerName: "Ship Via Account",
      filter: "agSetColumnFilter",
    },
    {
      field: "sod_acct",
      headerName: "Sod Account",
      filter: "agSetColumnFilter",
    },
    {
      field: "generate_placard",
      headerName: "Generate Placard",
      filter: "agSetColumnFilter",
      cellRenderer: IconRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.viewPlacard(
            e.rowData.SOD_NBR,
            e.rowData.SOD_LINE,
            e.rowData.SOD_PART
          );
        },
        iconName: "mdi mdi-printer",
      },
    },
    {
      field: "recent_notes.notes",
      headerName: "Notes",
      filter: "agSetColumnFilter",
      cellRenderer: NotesRendererV2Component,
      cellRendererParams: {
        onClick: this.viewNotes.bind(this),
      },
      filterParams: {
        valueGetter: (params) => {
          let isEMpty = isEmpty(params.data.recent_notes);
          if (!isEMpty) {
            return "Has Notes";
          } else {
            return "No Notes";
          }
        },
      },
    },
    {
      field: "SO_SHIPVIA",
      headerName: "Ship Via",
      filter: "agMultiColumnFilter",
    },
    {
      field: "misc.container",
      headerName: "Container",
      filter: "agMultiColumnFilter",
      editable: true,
      cellRenderer: EditIconV2Component,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "misc.container_due_date",
      headerName: "Container due date",
      filter: "agSetColumnFilter",
      editable: true,
      cellRenderer: EditIconV2Component,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "misc.tj_po_number",
      // headerName: "TJ PO #",
      headerName: "Work Order #",
      filter: "agSetColumnFilter",
      editable: true,
      cellRenderer: EditIconV2Component,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "misc.tj_due_date",
      // headerName: "TJ Due Date",
      headerName: "Planned to Pick",
      filter: "agSetColumnFilter",
      editable: true,
      cellRenderer: EditIconV2Component,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "misc.pallet_count",
      headerName: "Pallet Count",
      filter: "agSetColumnFilter",
      editable: true,
      cellRenderer: EditIconV2Component,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "FG-Label",
      headerName: "FG Label",
      filter: "agSetColumnFilter",
      cellRenderer: IconRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.fgLabelPrintModal.open(
            e.rowData.CP_CUST_PART,
            e.rowData.SOD_CONTR_ID,
            e.rowData.SOD_PART,
            e.rowData.PT_DESC1,
            e.rowData.PT_DESC2,
            e.rowData
          );
        },
        iconName: "mdi mdi-printer",
      },
    },
    {
      field: "POR-Label",
      headerName: "POR Label",
      filter: "agSetColumnFilter",
      cellRenderer: IconRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.porLabelPrintModalService.open(
            e.rowData.CP_CUST_PART,
            e.rowData.SOD_CONTR_ID,
            e.rowData.SOD_PART,
            e.rowData.PT_DESC1,
            e.rowData.PT_DESC2
          );
        },
        iconName: "mdi mdi-printer",
      },
    },
    {
      field: "misc.g2e_comments",
      headerName: "G2E",
      filter: "agMultiColumnFilter",
      cellRenderer: EditIconV2Component,
      editable: true,
      cellRendererParams: {
        iconName: "mdi mdi-pencil",
      },
    },
    {
      field: "misc.shortages_review",
      headerName: "Shortages Review",
      filter: "agSetColumnFilter",
      cellRenderer: ChecboxRendererV2,
      cellRendererParams: {
        onClick: (e) => this.update(e.rowData),
      },
    },
    {
      field: "all_mention_comments.all_comments",
      headerName: "All Comments",
      filter: "agTextColumnFilter",
      maxWidth: 200,
      hide: true,
    },
    {
      field: "misc.lateReasonCodePerfDate",
      headerName: "Late Reason Code (Perf Date)",
      filter: "agSetColumnFilter",
      cellRenderer: LateReasonCodeRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.viewReasonCode(
            "lateReasonCodePerfDate",
            e.rowData.misc,
            e.rowData.SOD_NBR + "-" + e.rowData.SOD_LINE,
            e.rowData
          );
        },
      },
    },
    {
      field: "misc.lateReasonCode",
      headerName: "Late Reason Code",
      filter: "agSetColumnFilter",
      cellRenderer: LateReasonCodeRendererV2Component,
      cellRendererParams: {
        onClick: (e) => {
          this.viewReasonCode(
            "lateReasonCode",
            e.rowData.misc,
            e.rowData.SOD_NBR + "-" + e.rowData.SOD_LINE,
            e.rowData
          );
        },
      },
    },
    {
      field: "misc.clear_to_build_status",
      headerName: "CTB in Period",
      filter: "agSetColumnFilter",
      cellEditor: "agRichSelectCellEditor",
      editable: true,
      cellClass: (params: any) => {
        if (params.value == "CTB in Period") {
          return ["bg-success bg-opacity-50"];
        } else if (params.value == "At Risk") {
          return ["bg-danger bg-opacity-75"];
        } else if (params.value == "Miss") {
          return ["bg-warning bg-opacity-50"];
        } else {
          return [];
        }
      },

      cellEditorParams: {
        values: ["CTB in Period", "At Risk", "Miss", "NA"],
        cellEditorPopup: false,
      },

      valueGetter: (params) => {
        if (params.data) {
          if (params?.data?.misc?.clear_to_build_status != "NA") {
            return (
              params?.data?.misc?.clear_to_build_status || "--Select status--"
            );
          }
          return "--Select status--";
        } else {
          return "--Select status--";
        }
      },
    },
    {
      field: "clear_to_build_period",
      headerName: "CTB Report Period",
      filter: "agMultiColumnFilter",
      valueGetter: (params) => {
        if (params.data)
          return moment(params?.data?.SOD_DUE_DATE).format("MM-YYYY");
        return "";
      },
    },
    { field: "sod_type", headerName: "SOD Type", filter: "agSetColumnFilter" },
    {
      field: "sod_per_date",
      headerName: "Performance Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
      cellRenderer: StatusDateRenderer,
    },
    {
      field: "sod_req_date",
      headerName: "Request Date",
      filter: "agDateColumnFilter",
      filterParams: agGridDateFilter,
    },
    {
      field: "REQ_DUE_DIFF",
      headerName: "Request and Due Date Diff",
      filter: "agMultiColumnFilter",
    },
    {
      field: "VIEW_PARTS_ORDER_REQUEST",
      headerName: "View Parts Order Request",
      filter: "agMultiColumnFilter",
      cellRenderer: IconRendererV2Component,
      cellRendererParams: {
        onClick: (e) => this.viewPartsOrder(e.rowData.SOD_NBR),
        iconName: "mdi mdi-ballot-outline",
      },
    },
    {
      field: "WO_NBR", headerName: "SO/Job", filter: "agMultiColumnFilter",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: ({ rowData }) =>
          this.workOrderInfoModalService.open(rowData.WO_NBR),
        isLink: true,
      },
    },
  ];

  pageId = "/master-scheduling/shipping";

  tableList: any;
  currentTableView: any;
  async getTableSettings() {
    this.tableList = await this.tableSettingsService.getTableByUserId({
      pageId: this.pageId,
    });
    this.gridApi!.applyColumnState({
      state: this.tableList.currentView.data,
      applyOrder: true,
    });
  }

  defaultFilters = [
    {
      id: -1,
      name: "Future Orders",
      data: {
        STATUS: {
          values: ["Future Order"],
          filterType: "set",
        },
      },
    },
    {
      id: -2,
      name: "Past Due Orders",
      data: {
        STATUS: {
          values: ["Past Due"],
          filterType: "set",
        },
      },
    },
  ];

  emitFilter($event) {
    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        gridFilterId: $event,
      },
    });
  }

  emitGrid($event) {
    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        gridViewId: $event,
      },
    });
  }

  dataRenderered = false;

  gridOptions: GridOptions = {
    // rowBuffer: 0,
    animateRows: true,
    tooltipShowDelay: 0,
    columnDefs: [],
    enableCharts: true,
    enableAdvancedFilter: false,
    enableBrowserTooltips: true,
    suppressColumnMoveAnimation: true,
    getRowId: (data: any) => data?.data.id?.toString(),
    onGridReady: (params) => {
      this.gridApi = params.api;
    },
    onFirstDataRendered: (params) => {
      this.dataRenderered = true;
      if (this.comment) {
        highlightRowViewV1(params, "id", this.comment?.replace("-", ""));
        this.gridApi.ensureColumnVisible("Comments", "end");
      } else {
        highlightRowView(params, "id", this.id);
      }
      this.setPinnedRows();
    },
    // onFilterChanged: params => this.updateUrl(params),
    // onSortChanged: params => this.updateUrl(params),
    onCellEditingStopped: (event) => {
      if (event.oldValue == event.newValue || event.value === undefined) return;
      this.update(event.data);
    },
    getRowClass: (params: any) => {

      let classes = [];
      if (params.data && params.data.SOD_DUE_DATE == params.data.SO_ORD_DATE) {
        classes.push("border-2 border border-danger border-start")
      } else if (params.data?.SALES_ORDER_LINE_NUMBER === this.comment) {
        classes.push("bg-primary-subtle")
      } else if (params.data.misc?.hot_order) {
        classes.push("border border-danger bg-opacity-10 bg-danger")
      }
      return classes;
    },
    context: {
      pageId: this.pageId,
      onBomClick: this.viewBom.bind(this),
    },
  };

  public async update(data: any) {
    data.misc.shippingMisc = 1;
    data.misc.so = data.sales_order_line_number; //add on insert since so is not available yet

    /**
     * this data should be the full data object!!
     */

    /**
     *  Save data to database
     */

    // Save transactop
    try {
      this.gridApi?.showLoadingOverlay();
      let res = await this.api.saveMisc(data.misc);
      data.misc = res;
      this.sendAndUpdate(data, data.id);
      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }

    // let res = await this.api
    //     .saveMisc(data.misc)
    //     .pipe(first())
    //     .subscribe((res) => {
    //         data.misc = res;
    //         this.sendAndUpdate(data, data.id);
    //         this.showHideOverlay(false);
    //     }, () => this.showHideOverlay(false));
  }

  //send the updated data to the wing. Once update redraw rows.
  public sendAndUpdate(newData: any, id: any) {
    /**
     * newData MUST be the complete data object
     */
    let rowNode = this.gridApi.getRowNode(id);
    rowNode.data = newData;
    this.gridApi.redrawRows({ rowNodes: [rowNode] });

    this.setPinnedRows();

    this.websocketService.next({
      message: newData,
      type: WS_SHIPPING,
    });
  }

  //send the updated data to the wing. Once update redraw rows.
  public sendAndUpdateByUser(newData: any, id: any) {
    /**
     * newData MUST be the complete data object
     */
    let rowNode = this.gridApi.getRowNode(id);
    rowNode.data = newData;
    this.gridApi.redrawRows({ rowNodes: [rowNode] });

    this.setPinnedRows();

    // this.websocketService.next({
    //     message: newData,
    //     type: WS_SHIPPING
    // });
  }

  updateUrl = (params) => {
    let gridParams = _compressToEncodedURIComponent(params.api);
    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        gridParams,
      },
    });
  };

  getAllRows() {
    let rowData = [];
    this.gridApi.forEachNode((node) => rowData.push(node.data));
    return rowData;
  }

  setPinnedRows() {
    let data = this.getAllRows();
    let res = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i]?.misc?.hot_order) {
        res.push(data[i]);
      }
    }
    this.gridApi.setGridOption("pinnedTopRowData", res);
  }

  data: any;
  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();
      
      // Load shipping data and priorities in parallel
      const [shippingData] = await Promise.all([
        this.api.getShipping(),
        this.loadPriorities()
      ]);
      
      this.data = shippingData;
      this.statusCount = this.calculateStatus();
      
      // Merge priority data with shipping data
      this.mergePriorityData();
      
      // Set data based on active tab
      if (this.activeTab === 'priority') {
        this.data = this.priorityOrdersData;
      }
      
      this.setPinnedRows();
      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }
}
