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
import { PathUtilsService } from "@app/core/services/path-utils.service";
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
import { PriorityActionsCellRendererComponent } from './priority-actions-cell-renderer.component';
import { PriorityDisplayCellRendererComponent } from './priority-display-cell-renderer.component';
import { PriorityOrderActionsCellRendererComponent } from './priority-order-actions-cell-renderer.component';
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
import { environment } from "@environments/environment";
import { ChecboxRendererV2 } from "@app/shared/ag-grid/cell-renderers/checkbox-renderer-v2/checkbox-renderer-v2.component";
import { LateReasonCodeRendererV2Component } from "@app/shared/ag-grid/cell-renderers/late-reason-code-renderer-v2/late-reason-code-renderer-v2.component";
import { OwnerRendererV2Component } from "@app/shared/ag-grid/owner-renderer-v2/owner-renderer-v2.component";

// Priority-related interfaces
interface PriorityData {
  id: number; // Database ID from shipping_priorities table
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
const WS_SHIPPING_PRIORITY = "WS_SHIPPING_PRIORITY";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule,
    NgbDropdownModule,
    GridSettingsComponent,
    GridFiltersComponent,
    PriorityActionsCellRendererComponent,
    PriorityDisplayCellRendererComponent,
    PriorityOrderActionsCellRendererComponent,
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
    private bomViewModalService: BomViewModalService,
    private pathUtils: PathUtilsService

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

    // Watch for priority changes
    const ws_priority_observable = this.websocketService.multiplex(
      () => ({ subscribe: WS_SHIPPING_PRIORITY }),
      () => ({ unsubscribe: WS_SHIPPING_PRIORITY }),
      (message) => message.type === WS_SHIPPING_PRIORITY
    );

    // Handle priority change notifications
    ws_priority_observable.subscribe((data: any) => {
      console.log('🔔 Received priority update via WebSocket:', data);

      if (data?.message) {
        // Reload priorities to get the latest data
        this.loadPriorities().then(() => {
          console.log('✅ Priorities reloaded due to WebSocket update');

          // Refresh both grids
          if (this.gridApi) {
            this.gridApi.refreshCells();
          }
        });
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

    // Check if priority help alert should be shown
    this.initializePriorityHelpAlert();

    // Set up global methods for cell renderer buttons
    (window as any).removePriorityOrder = (orderId: string) => this.removePriorityOrder(orderId);
    (window as any).addToPriorityList = (orderData: any) => this.addToPriorityList(orderData);
    (window as any).makeTopPriority = (orderData: any) => this.makeTopPriority(orderData);
    (window as any).removePriorityFromList = (orderId: string) => this.removePriorityFromList(orderId);

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

  // Method to get dynamic column definitions based on active tab
  priorityData: PriorityData[] = [];
  priorityMap = new Map<string, PriorityData>();
  allOrdersData: ShippingOrder[] = [];
  allOrdersCount = 0;
  priorityOrdersCount = 0;
  userSsoId: string = '';

  // Development/Testing control
  isDevelopmentMode = !environment.production;

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
    console.log(`🔄 Switching to ${tab} tab`);
    this.activeTab = tab;

    if (this.gridApi) {
      // Configure grid settings for the active tab FIRST
      this.configureGridForActiveTab();
      
      // Update column visibility based on tab
      this.updateColumnVisibility();

      // Filter and set data based on tab instead of using external filters
      if (tab === 'priority') {
        // Filter data to show only priority orders, sorted by priority
        const priorityOrders = this.allOrdersData
          .filter(order => order.shipping_priority > 0)
          .sort((a, b) => a.shipping_priority - b.shipping_priority);
        
        this.data = priorityOrders;
        console.log(`📋 Switched to Priority Orders - showing ${priorityOrders.length} priority orders`);
        
        // Set the filtered data directly to the grid
        this.gridApi.setGridOption('rowData', this.data);
      } else {
        // Show all orders
        this.data = [...this.allOrdersData];
        console.log(`📋 Switched to All Orders: ${this.data.length} orders`);
        
        // Set all data to the grid
        this.gridApi.setGridOption('rowData', this.data);
      }
      
      // Clear any filters that might interfere
      this.gridApi.setGridOption('isExternalFilterPresent', () => false);
      this.gridApi.setGridOption('doesExternalFilterPass', null);
    }

    this.updateCounts();
  }

  private updateColumnVisibility(): void {
    if (!this.gridApi) return;

    // Get all column definitions to identify the correct columns
    const allColumns = this.gridApi.getColumns();

    // Find columns by their properties since row drag column doesn't have a field
    const rowDragColumn = allColumns?.find(col => col.getColDef().rowDrag === true);
    const priorityPositionColumn = allColumns?.find(col => col.getColDef().field === 'priority_position');
    const priorityActionsColumn = allColumns?.find(col => col.getColDef().headerName === 'Priority Actions');

    // Show/hide columns based on active tab
    if (this.activeTab === 'priority') {
      // In priority tab, show priority-specific columns and hide all orders actions
      if (rowDragColumn) this.gridApi.setColumnVisible(rowDragColumn, true);
      if (priorityPositionColumn) this.gridApi.setColumnVisible(priorityPositionColumn, true);
      if (priorityActionsColumn) this.gridApi.setColumnVisible(priorityActionsColumn, false);
    } else {
      // In all orders tab, hide priority-specific columns and show priority actions
      if (rowDragColumn) this.gridApi.setColumnVisible(rowDragColumn, false);
      if (priorityPositionColumn) this.gridApi.setColumnVisible(priorityPositionColumn, true); // Keep visible to show priority numbers
      if (priorityActionsColumn) this.gridApi.setColumnVisible(priorityActionsColumn, true);
    }
  }

  private applyPriorityFilter(): void {
    // This method is now handled directly in switchTab by setting rowData
    // Keeping this method for potential future use but making it a no-op
    console.log('🔧 Priority filter - now handled by direct data filtering');
  }

  private clearPriorityFilter(): void {
    // This method is now handled directly in switchTab by setting rowData  
    // Keeping this method for potential future use but making it a no-op
    console.log('🔧 Priority filter cleared - now handled by direct data filtering');
  }

  updateCounts() {
    this.allOrdersCount = this.allOrdersData.length;
    // Calculate priority orders count from all orders data
    this.priorityOrdersCount = this.allOrdersData.filter(order => order.shipping_priority > 0).length;
  }

  // Method to refresh mock data - useful for testing
  refreshMockData() {
    if (!this.isDevelopmentMode) {
      alert('🚫 Mock data refresh is disabled in production environment');
      return;
    }

    console.log('Refreshing mock priority data...');
    this.loadPriorities();
  }

  // Method to switch between mock and real API modes
  switchToMockMode() {
    if (!this.isDevelopmentMode) {
      alert('🚫 Mock mode is disabled in production environment');
      return;
    }

    this.api.setMockMode(true);
    console.log('🧪 Switched to MOCK mode - using local test data');
    alert('Switched to MOCK mode! 🧪\n\nNow using local test data for faster development.\nPerfect for testing UI without hitting the real database.');
    this.loadPriorities(); // Reload with mock data
  }

  switchToRealAPI() {
    this.api.setMockMode(false);
    console.log('🌐 Switched to REAL API mode - using PHP server');
    alert('Switched to REAL API mode! 🌐\n\nNow using the PHP server endpoints.\nChanges will be saved to the actual database.');
    this.loadPriorities(); // Reload with real API data
  }

  getCurrentAPIMode() {
    if (!this.isDevelopmentMode) {
      alert('🚫 API mode information is disabled in production environment');
      return false;
    }

    const mode = this.api.getCurrentMode();
    console.log(`Current API mode: ${mode}`);
    alert(`Current API Mode: ${mode}\n\n${mode === 'MOCK' ? '🧪 Using local test data for development' : '🌐 Using real PHP server endpoints'}`);
    return mode;
  }

  // Getter for template access
  get apiService() {
    return this.api;
  }

  // Method to demonstrate mock functionality with test data
  testMockPriorities() {
    if (!this.isDevelopmentMode) {
      alert('🚫 Test mock priorities is disabled in production environment');
      return;
    }

    console.log('🧪 Testing Mock Priority System...');

    // Simulate adding priorities to some orders
    if (this.data.length > 0) {
      const testOrders = this.data.slice(0, 3); // Take first 3 orders for testing

      console.log('🎬 Demonstrating button state changes...');

      testOrders.forEach(async (order, index) => {
        // Add delay between each test to show the animation
        setTimeout(async () => {
          const testPriority = index + 1;
          console.log(`🔧 Setting priority ${testPriority} for ${order.SOD_NBR}-${order.SOD_LINE}`);

          // Show the button feedback in action
          this.updatePriorityButton(order.id, 'adding');

          // Simulate API delay
          setTimeout(async () => {
            await this.updatePriority(order, testPriority);
          }, 800);

        }, index * 1500); // Stagger the tests
      });

      setTimeout(() => {
        console.log('🎉 Mock test completed! Check the Priority Orders tab and notice the button state changes.');
        alert('Mock test completed! Watch the button transitions:\n\n1. "Add Priority" → "Adding..." (yellow)\n2. "Adding..." → "Added!" (green)\n3. Button becomes priority badge\n\nCheck the Priority Orders tab to see results!');
      }, 6000);
    } else {
      console.log('⚠️ No orders available for testing');
      alert('No orders available for testing. Please load some shipping data first.');
    }
  }

  // AG-Grid Management Methods
  onGridReady(params: any) {
    this.gridApi = params.api;
    console.log('📊 Grid ready');

    // Configure grid based on active tab
    this.configureGridForActiveTab();

    // Add row drag end listener for priority reordering
    this.gridApi.addEventListener('rowDragEnd', (event: any) => {
      if (this.activeTab === 'priority') {
        this.onPriorityRowDragEnd(event);
      }
    });
  }

  // Configure grid settings based on active tab
  private configureGridForActiveTab(): void {
    if (!this.gridApi) return;

    if (this.activeTab === 'priority') {
      // Enable row drag for priority reordering - must be set BEFORE applying filters
      this.gridApi.setGridOption('rowDragManaged', true);
      this.gridApi.setGridOption('suppressRowDrag', false);
      this.gridApi.setGridOption('animateRows', true);
      this.gridApi.setGridOption('rowDragMultiRow', false);
      this.gridApi.setGridOption('rowDragEntireRow', true);
      
      // Important: Clear any existing sorting first to ensure drag order is respected
      this.gridApi.applyColumnState({
        defaultState: { sort: null }
      });

      // Ensure all row drag columns are properly configured
      this.gridApi.refreshHeader();
      
      console.log('🔧 Priority tab: Row drag enabled, sorting cleared, headers refreshed');
    } else {
      // Disable row drag for all orders view
      this.gridApi.setGridOption('rowDragManaged', false);
      this.gridApi.setGridOption('suppressRowDrag', true);
      this.gridApi.setGridOption('animateRows', true);
      
      // Clear any existing sort when switching to all orders
      this.gridApi.applyColumnState({
        defaultState: { sort: null }
      });
      
      console.log('🔧 All orders tab: Row drag disabled');
    }
  }

  onPriorityRowDragEnd(event: any) {
    console.log('🔄 Priority row drag ended', {
      event: event,
      activeTab: this.activeTab,
      node: event.node?.data,
      overNode: event.overNode?.data
    });
    
    // Ensure we're in priority tab
    if (this.activeTab !== 'priority') {
      console.warn('⚠️ Row drag ended but not in priority tab');
      return;
    }
    
    // Clear any sorting to maintain the drag order
    console.log('🔄 Clearing sorting to maintain drag order');
    this.gridApi.applyColumnState({
      defaultState: { sort: null }
    });
    
    // Add a small delay to allow the grid to settle after drag operation
    setTimeout(() => {
      this.recalculatePriorities();
    }, 200);
  }  recalculatePriorities() {
    console.log('🔄 Recalculating priorities after drag operation...');
    
    const allRowData: any[] = [];
    const priorityUpdates: Array<{ id: string, priority_level: number }> = [];
    
    // Get all displayed rows in their CURRENT DISPLAY ORDER (not sorted order)
    const displayedRows: any[] = [];
    
    // Use forEachNode to get the actual display order after drag
    this.gridApi.forEachNode((node) => {
      // Only include rows that are displayed (pass the filter) and have priority
      if (node.displayed && node.data && node.data.shipping_priority > 0) {
        displayedRows.push(node.data);
      }
    });

    console.log(`📊 Found ${displayedRows.length} priority orders in display order after drag`);

    // Update priorities based on the ACTUAL display order from drag operation
    displayedRows.forEach((rowData, index) => {
      const newPriority = index + 1;
      const oldPriority = rowData.shipping_priority;

      console.log(`🔄 Processing ${rowData.SOD_NBR}-${rowData.SOD_LINE}: display position ${index} -> priority ${newPriority} (was ${oldPriority})`);

      // Update the local data immediately
      rowData.shipping_priority = newPriority;
      allRowData.push(rowData);

      // Get the database ID from the priority map
      const orderIdKey = `${rowData.SOD_NBR}-${rowData.SOD_LINE}`;
      const priorityData = this.priorityMap.get(orderIdKey);

      if (priorityData && priorityData.id) {
        // Update the priority map as well
        priorityData.priority_level = newPriority;
        
        // Prepare data for bulk update using database ID
        priorityUpdates.push({
          id: priorityData.id.toString(),
          priority_level: newPriority
        });

        console.log(`📍 Reordered: ${rowData.SOD_NBR}-${rowData.SOD_LINE} from priority ${oldPriority} to ${newPriority} (DB ID: ${priorityData.id})`);
      } else {
        console.error(`❌ No database ID found for order ${orderIdKey} during drag reorder`);
      }
    });

    // Update the main data array with new priorities
    this.allOrdersData.forEach(order => {
      const orderIdKey = `${order.SOD_NBR}-${order.SOD_LINE}`;
      const priorityData = this.priorityMap.get(orderIdKey);
      if (priorityData) {
        order.shipping_priority = priorityData.priority_level;
      }
    });

    // Update counts
    this.updateCounts();

    // Send complete array replacement to API with database IDs
    if (priorityUpdates.length > 0) {
      console.log('📤 Sending complete priority array replacement via drag-and-drop:', priorityUpdates);

      this.api.reorderShippingPriorities(priorityUpdates).then(response => {
        if (response.success) {
          console.log('✅ Bulk priority update successful - maintaining drag order');

          // Send WebSocket notification for bulk reorder
          this.sendPriorityWebSocketNotification('reorder', allRowData);

          // Refresh cells to show updated priority numbers but don't re-sort
          if (this.gridApi) {
            this.gridApi.refreshCells();
            console.log('🔄 Grid refreshed after drag reorder save - maintaining manual order');
          }
        } else {
          console.error('❌ Bulk priority update failed:', response.message);
          alert('Failed to save priority changes: ' + response.message);
          // Reload data to revert changes
          this.loadPriorities();
        }
      }).catch(error => {
        console.error('❌ Error during priority update:', error);
        alert('Error saving priority changes. Please try again.');
        // Reload data to revert changes
        this.loadPriorities();
      });
    } else {
      console.warn('⚠️ No priority updates to send - no valid database IDs found');
    }

    console.log('✅ Priority recalculation completed - maintaining drag order');
  }  async updatePriorityInService(orderData: any, newPriority: number) {
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

  // Resequence all priorities to eliminate gaps (1, 2, 3, 4... with no missing numbers)
  async resequenceAllPriorities() {
    console.log('🔄 Resequencing all priorities to eliminate gaps...');

    // Get all orders that currently have priorities (excluding the one we just removed)
    const ordersWithPriorities = this.allOrdersData
      .filter(order => order.shipping_priority && order.shipping_priority > 0)
      .sort((a, b) => a.shipping_priority - b.shipping_priority);

    console.log('📋 Found', ordersWithPriorities.length, 'orders with priorities to resequence');

    // Create priority updates array with new sequential priorities
    const priorityUpdates: Array<{ id: string, priority_level: number }> = [];
    const validOrders: any[] = [];

    ordersWithPriorities.forEach((order, index) => {
      const newPriority = index + 1; // Sequential: 1, 2, 3, 4...
      const oldPriority = order.shipping_priority;

      // Get the database ID from the priority map
      const orderId = `${order.SOD_NBR}-${order.SOD_LINE}`;
      const priorityData = this.priorityMap.get(orderId);

      if (priorityData && priorityData.id) {
        // Valid order with database record
        validOrders.push(order);

        if (oldPriority !== newPriority) {
          console.log(`📍 Resequencing: ${order.SOD_NBR}-${order.SOD_LINE} from priority ${oldPriority} to ${newPriority}`);

          // Update the local data
          order.shipping_priority = newPriority;

          // Add to bulk update using the database ID
          priorityUpdates.push({
            id: priorityData.id.toString(), // Convert to string for API
            priority_level: newPriority
          });
          console.log(`🔗 Mapped ${orderId} to database ID: ${priorityData.id}`);
        }
      } else {
        console.warn(`⚠️ No database record found for order ${orderId} - removing from local priority list`);
        // Remove the invalid priority from local data
        order.shipping_priority = 0;
        order.priority_notes = null;

        // Remove from priority map if it exists
        if (this.priorityMap.has(orderId)) {
          this.priorityMap.delete(orderId);
          console.log(`🗑️ Removed invalid priority mapping for ${orderId}`);
        }
      }
    });

    // Update counts
    this.updateCounts();

    // If there are updates to make, send them to the API
    if (priorityUpdates.length > 0) {
      console.log('📤 Sending bulk priority updates:', priorityUpdates);

      try {
        const response = await this.api.reorderShippingPriorities(priorityUpdates);
        if (response.success) {
          console.log('✅ Priority resequencing successful');
          // Reload priorities to ensure consistency
          await this.loadPriorities();
        } else {
          console.error('❌ Priority resequencing failed:', response.message);
          alert('Failed to resequence priorities: ' + response.message);
        }
      } catch (error) {
        console.error('❌ Error during priority resequencing:', error);
        alert('Error resequencing priorities. Please try again.');
      }
    } else {
      console.log('✅ No resequencing needed - priorities are already sequential');
    }
  }

  // Resequence only priorities higher than the removed priority to fill the gap
  async resequenceAfterRemoval(removedPriority: number) {
    console.log(`🔄 Resequencing priorities higher than ${removedPriority} to fill the gap...`);

    // Check if we're in mock mode - don't try to update real API with mock data
    if (this.api.getCurrentMode() === 'MOCK') {
      console.log('🧪 Mock mode detected - handling resequencing locally');
      this.resequenceMockData(removedPriority);
      return;
    }

    // Get all orders that currently have priorities higher than the removed one
    const ordersToResequence = this.allOrdersData
      .filter(order => order.shipping_priority && order.shipping_priority > removedPriority)
      .sort((a, b) => a.shipping_priority - b.shipping_priority);

    console.log('📋 Found', ordersToResequence.length, 'orders with priorities higher than', removedPriority, 'to resequence');

    if (ordersToResequence.length === 0) {
      console.log('✅ No resequencing needed - no priorities higher than removed priority');
      return;
    }

    // Create priority updates array
    const priorityUpdates: Array<{ id: string, priority_level: number }> = [];
    const validOrders: any[] = [];

    ordersToResequence.forEach((order, index) => {
      const newPriority = removedPriority + index; // Fill the gap starting from removed priority
      const oldPriority = order.shipping_priority;

      // Get the database ID from the priority map
      const orderId = `${order.SOD_NBR}-${order.SOD_LINE}`;
      const priorityData = this.priorityMap.get(orderId);

      if (priorityData && priorityData.id) {
        // Check if this is a mock ID (generated timestamp) vs real database ID
        const idStr = priorityData.id.toString();
        const isMockId = idStr.includes('.') || parseInt(idStr) > 1000000000000; // Timestamp-like numbers

        if (isMockId) {
          console.warn(`⚠️ Skipping mock data ID ${priorityData.id} for order ${orderId}`);
          // Handle locally for mock data
          order.shipping_priority = newPriority;
          validOrders.push(order);
          return;
        }

        // Valid order with real database record
        validOrders.push(order);

        console.log(`📍 Resequencing: ${order.SOD_NBR}-${order.SOD_LINE} from priority ${oldPriority} to ${newPriority}`);

        // Update the local data
        order.shipping_priority = newPriority;

        // Add to bulk update using the database ID
        priorityUpdates.push({
          id: priorityData.id.toString(), // Convert to string for API
          priority_level: newPriority
        });
        console.log(`🔗 Mapped ${orderId} to database ID: ${priorityData.id}`);
      } else {
        console.warn(`⚠️ No database record found for order ${orderId} - removing from local priority list`);
        // Remove the invalid priority from local data
        order.shipping_priority = 0;
        order.priority_notes = null;

        // Remove from priority map if it exists
        if (this.priorityMap.has(orderId)) {
          this.priorityMap.delete(orderId);
          console.log(`🗑️ Removed invalid priority mapping for ${orderId}`);
        }
      }
    });

    // Update priority orders data
    this.refreshPriorityData();

    // If there are updates to make, send them to the API
    if (priorityUpdates.length > 0) {
      console.log('📤 Sending bulk priority updates:', priorityUpdates);

      try {
        const response = await this.api.reorderShippingPriorities(priorityUpdates);
        if (response.success) {
          console.log('✅ Priority resequencing after removal successful');
          // Reload priorities to ensure consistency
          await this.loadPriorities();
        } else {
          console.error('❌ Priority resequencing failed:', response.message);
          alert('Failed to resequence priorities: ' + response.message);
        }
      } catch (error) {
        console.error('❌ Error during priority resequencing:', error);
        alert('Error resequencing priorities. Please try again.');
      }
    } else {
      console.log('✅ No valid orders to resequence');
    }
  }

  // Handle resequencing for mock data locally
  private resequenceMockData(removedPriority: number) {
    console.log('🧪 Resequencing mock data locally...');

    // Get all orders that currently have priorities higher than the removed one
    const ordersToResequence = this.allOrdersData
      .filter(order => order.shipping_priority && order.shipping_priority > removedPriority)
      .sort((a, b) => a.shipping_priority - b.shipping_priority);

    // Update their priorities locally
    ordersToResequence.forEach((order, index) => {
      const newPriority = removedPriority + index; // Start from the removed priority slot
      const oldPriority = order.shipping_priority;

      console.log(`📍 Mock resequencing: ${order.SOD_NBR}-${order.SOD_LINE} from priority ${oldPriority} to ${newPriority}`);

      // Update the local data
      order.shipping_priority = newPriority;

      // Update the priority map
      const orderId = `${order.SOD_NBR}-${order.SOD_LINE}`;
      const priorityData = this.priorityMap.get(orderId);
      if (priorityData) {
        priorityData.priority_level = newPriority;
        priorityData.updated_at = new Date().toISOString();
        priorityData.updated_by = this.userSsoId || 'unknown';
      }
    });

    // Update priority orders data
    this.refreshPriorityData();
    console.log('✅ Mock data resequencing completed');
  }

  // Quick action methods (called from cell renderer buttons)
  removePriorityOrder(orderId: string) {
    const order = this.allOrdersData.find(o => o.id === orderId);
    if (order) {
      const removedPriority = order.shipping_priority;
      console.log(`🗑️ Removing priority ${removedPriority} from order ${order.SOD_NBR}-${order.SOD_LINE}`);

      // Show removing state immediately
      this.updatePriorityButton(orderId, 'removing');

      // Simulate brief delay for user feedback
      setTimeout(async () => {
        // Remove the priority from local data first
        await this.updatePriority(order, 0);

        // Get the remaining priority orders (excluding the one we just removed)
        const remainingOrders = this.allOrdersData
          .filter(o => o.shipping_priority > 0 && o.id !== orderId)
          .sort((a, b) => a.shipping_priority - b.shipping_priority);

        console.log(`📋 Found ${remainingOrders.length} remaining priority orders to resequence`);

        // Create the complete resequenced array with database IDs
        const priorityUpdates: Array<{ id: string, priority_level: number }> = [];

        remainingOrders.forEach((orderItem, index) => {
          const newPriority = index + 1; // Sequential: 1, 2, 3, 4...
          const orderIdKey = `${orderItem.SOD_NBR}-${orderItem.SOD_LINE}`;
          const priorityData = this.priorityMap.get(orderIdKey);

          if (priorityData && priorityData.id) {
            // Update local data
            orderItem.shipping_priority = newPriority;

            // Add to bulk update using database ID
            priorityUpdates.push({
              id: priorityData.id.toString(),
              priority_level: newPriority
            });

            console.log(`📍 Resequencing: ${orderItem.SOD_NBR}-${orderItem.SOD_LINE} to priority ${newPriority} (DB ID: ${priorityData.id})`);
          }
        });

        // Send the complete array to replace all priorities at once
        if (priorityUpdates.length > 0) {
          console.log('📤 Sending complete priority array replacement:', priorityUpdates);

          try {
            const response = await this.api.reorderShippingPriorities(priorityUpdates);
            if (response.success) {
              console.log('✅ Complete priority array replacement successful');
              // Reload priorities to ensure consistency
              await this.loadPriorities();
            } else {
              console.error('❌ Priority array replacement failed:', response.message);
              alert('Failed to resequence priorities: ' + response.message);
            }
          } catch (error) {
            console.error('❌ Error during priority array replacement:', error);
            alert('Error resequencing priorities. Please try again.');
          }
        }

        setTimeout(() => {
          // Refresh the main grid to show updated button state
          if (this.gridApi) {
            this.gridApi.refreshCells();
          }
        }, 100);
      }, 500);
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

    if (!orderData.shipping_priority || orderData.shipping_priority === 0) {
      const priorityOrders = this.allOrdersData.filter(order => order.shipping_priority > 0);
      const nextPriority = priorityOrders.length + 1;
      console.log(`➕ Adding order ${orderData.SOD_NBR}-${orderData.SOD_LINE} to priority list as priority ${nextPriority}`);

      // Update button immediately for user feedback
      this.updatePriorityButton(orderData.id, 'adding');

      this.updatePriority(orderData, nextPriority).then((success) => {
        if (success) {
          setTimeout(() => {
            // Refresh the main grid to show updated button state
            if (this.gridApi) {
              this.gridApi.refreshCells();
            }
          }, 200);
        }
      });
    } else {
      console.log(`⚠️ Order ${orderData.SOD_NBR}-${orderData.SOD_LINE} already has priority ${orderData.shipping_priority}`);
    }
  }

  // Make order top priority (Priority #1)
  makeTopPriority(orderIdOrData: any) {
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

    console.log(`🏆 Making order ${orderData.SOD_NBR}-${orderData.SOD_LINE} top priority (#1)`);

    // Update button immediately for user feedback
    this.updatePriorityButton(orderData.id, 'adding');

    this.updatePriority(orderData, 1).then((success) => {
      if (success) {
        setTimeout(() => {
          // Refresh the main grid to show updated button state
          if (this.gridApi) {
            this.gridApi.refreshCells();
          }
        }, 200);
      }
    });
  }

  // Update priority button state for immediate user feedback
  updatePriorityButton(orderId: string, state: 'adding' | 'added' | 'removing' | 'removed') {
    const buttonElement = document.getElementById(`priority-btn-${orderId}`) as HTMLButtonElement;
    if (buttonElement) {
      const iconElement = buttonElement.querySelector('i');
      const textElement = buttonElement.querySelector('.btn-text');

      switch (state) {
        case 'adding':
          buttonElement.className = 'btn btn-sm btn-warning priority-toggle-btn';
          buttonElement.disabled = true;
          if (iconElement) iconElement.className = 'mdi mdi-loading mdi-spin me-1';
          if (textElement) textElement.textContent = 'Adding...';
          break;

        case 'added':
          buttonElement.className = 'btn btn-sm btn-outline-danger priority-toggle-btn';
          buttonElement.disabled = false;
          buttonElement.onclick = () => (window as any).removePriorityOrder(orderId);
          buttonElement.title = `Remove from Priority List`;
          if (iconElement) iconElement.className = 'mdi mdi-star-off me-1';
          if (textElement) textElement.textContent = 'Remove Priority';
          break;

        case 'removing':
          buttonElement.className = 'btn btn-sm btn-warning priority-toggle-btn';
          buttonElement.disabled = true;
          if (iconElement) iconElement.className = 'mdi mdi-loading mdi-spin me-1';
          if (textElement) textElement.textContent = 'Removing...';
          break;

        case 'removed':
          buttonElement.className = 'btn btn-sm btn-outline-success priority-toggle-btn';
          buttonElement.disabled = false;
          buttonElement.onclick = () => (window as any).addToPriorityList(orderId);
          buttonElement.title = 'Add to Priority List';
          if (iconElement) iconElement.className = 'mdi mdi-star-plus me-1';
          if (textElement) textElement.textContent = 'Add Priority';
          break;
      }
    }
  }

  // Remove order from priority list (called from priority grid remove button)
  removePriorityFromList(orderId: string) {
    const order = this.allOrdersData.find(o => o.id === orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      return;
    }

    const removedPriority = order.shipping_priority;
    console.log(`🗑️ Removing priority ${removedPriority} from order ${order.SOD_NBR}-${order.SOD_LINE} from priority list`);

    // Remove the priority from this order (set to 0)
    this.updatePriority(order, 0).then(async (success) => {
      if (success) {
        // After successful removal, resequence all remaining priorities
        // Get the remaining priority orders (excluding the one we just removed)
        const remainingOrders = this.allOrdersData
          .filter(o => o.shipping_priority > 0 && o.id !== orderId)
          .sort((a, b) => a.shipping_priority - b.shipping_priority);

        console.log(`📋 Found ${remainingOrders.length} remaining priority orders to resequence`);

        // Create the complete resequenced array with database IDs
        const priorityUpdates: Array<{ id: string, priority_level: number }> = [];

        remainingOrders.forEach((orderItem, index) => {
          const newPriority = index + 1; // Sequential: 1, 2, 3, 4...
          const orderIdKey = `${orderItem.SOD_NBR}-${orderItem.SOD_LINE}`;
          const priorityData = this.priorityMap.get(orderIdKey);

          if (priorityData && priorityData.id) {
            // Update local data
            orderItem.shipping_priority = newPriority;

            // Add to bulk update using database ID
            priorityUpdates.push({
              id: priorityData.id.toString(),
              priority_level: newPriority
            });

            console.log(`📍 Resequencing: ${orderItem.SOD_NBR}-${orderItem.SOD_LINE} to priority ${newPriority} (DB ID: ${priorityData.id})`);
          }
        });

        // Send the complete array to replace all priorities at once
        if (priorityUpdates.length > 0) {
          console.log('📤 Sending complete priority array replacement after removal:', priorityUpdates);

          try {
            const response = await this.api.reorderShippingPriorities(priorityUpdates);
            if (response.success) {
              console.log('✅ Complete priority array replacement successful');

              // Send WebSocket notification for removal and resequencing
              this.sendPriorityWebSocketNotification('remove', order, 0, remainingOrders);

              // Reload priorities to ensure consistency
              await this.loadPriorities();
            } else {
              console.error('❌ Priority array replacement failed:', response.message);
              alert('Failed to resequence priorities: ' + response.message);
            }
          } catch (error) {
            console.error('❌ Error during priority array replacement:', error);
            alert('Error resequencing priorities. Please try again.');
          }
        }

        // Refresh the main grid to show updated button state
        if (this.gridApi) {
          this.gridApi.refreshCells();
        }
      } else {
        console.error('Failed to remove priority from order');
        alert('Failed to remove priority. Please try again.');
      }
    });
  }

  // Send WebSocket notification for priority changes
  private sendPriorityWebSocketNotification(action: string, orderData: any, priority?: number, affectedOrders?: any[]) {
    const currentUser = this.authenticationService.currentUserValue;
    const timestamp = moment().format("h:mm A");

    let message = '';
    let icon = 'mdi mdi-star';

    switch (action) {
      case 'update':
        if (priority === 0) {
          message = `Priority removed from SO#${orderData.SOD_NBR}-${orderData.SOD_LINE} (${orderData.SOD_PART})`;
          icon = 'mdi mdi-star-off';
        } else {
          message = `Priority ${priority} assigned to SO#${orderData.SOD_NBR}-${orderData.SOD_LINE} (${orderData.SOD_PART})`;
          icon = 'mdi mdi-star';
        }
        break;
      case 'reorder':
        message = `Priority orders resequenced - ${orderData.length} orders affected`;
        icon = 'mdi mdi-sort';
        break;
      case 'remove':
        message = `Priority removed from SO#${orderData.SOD_NBR}-${orderData.SOD_LINE} and ${affectedOrders?.length || 0} orders resequenced`;
        icon = 'mdi mdi-delete';
        break;
    }

    this.websocketService.next({
      actions: {
        time: timestamp,
        icon: icon,
        link: `/master-scheduling/shipping`,
        info: `${message} by ${currentUser?.full_name || 'Unknown User'}`,
      },
      message: {
        action: action,
        orderData: orderData,
        priority: priority,
        affectedOrders: affectedOrders,
        timestamp: new Date().toISOString(),
        user: currentUser?.full_name || 'Unknown User'
      },
      type: WS_SHIPPING_PRIORITY,
    });

    console.log(`🔔 WebSocket notification sent for priority ${action}:`, message);
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
          id: Date.now() + Math.random(), // Generate a mock ID for development
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

      // Update button state based on priority change
      if (newPriority > 0) {
        this.updatePriorityButton(orderId, 'added');
      } else {
        this.updatePriorityButton(orderId, 'removed');
      }

      // Send WebSocket notification for priority changes
      this.sendPriorityWebSocketNotification('update', orderData, newPriority);

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

        // Clean up any inconsistent data
        this.cleanupPriorityData();
      }
    } catch (error) {
      console.error('Error loading priorities:', error);
    }
  }

  cleanupPriorityData() {
    console.log('🧹 Cleaning up priority data inconsistencies...');

    let cleanupCount = 0;

    // Remove any local priorities that don't have database records
    this.data.forEach((order: any) => {
      const orderId = `${order.SOD_NBR}-${order.SOD_LINE}`;

      if (order.shipping_priority > 0) {
        const priorityData = this.priorityMap.get(orderId);

        if (!priorityData || !priorityData.id) {
          console.warn(`🧹 Cleaning up orphaned priority for ${orderId}`);
          order.shipping_priority = 0;
          order.priority_notes = null;
          cleanupCount++;
        }
      }
    });

    if (cleanupCount > 0) {
      console.log(`🧹 Cleaned up ${cleanupCount} orphaned priority assignments`);
      this.refreshPriorityData();
    } else {
      console.log('✅ No priority data cleanup needed');
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
    // Split data based on priority - only update allOrdersData if we're working with the full dataset
    // Don't overwrite allOrdersData if we're currently showing filtered priority data
    if (this.activeTab === 'all' || !this.allOrdersData || this.allOrdersData.length === 0) {
      this.allOrdersData = [...this.data];
    }

    this.updateCounts();

    // No need to set separate data arrays - we'll use filtering in the grid
  }

  columnDefs: ColDef[] = [
    // Priority tab specific columns
    {
      rowDrag: (params: any) => {
        // Simply check if we're in priority tab - the external filter already ensures only priority orders are shown
        return this.activeTab === 'priority';
      },
      field: 'priority_drag_handle',
      headerName: '',
      width: 40,
      maxWidth: 40,
      minWidth: 40,
      resizable: false,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      suppressMovable: true,
      lockPosition: 'left',
      cellClass: 'drag-handle-cell',
      cellRenderer: (params: any) => {
        // Only show drag handle for rows with priority in priority tab
        if (this.activeTab === 'priority' && params.data && params.data.shipping_priority > 0) {
          return '<div class="ag-drag-handle ag-row-drag" draggable="true"><i class="mdi mdi-drag-vertical"></i></div>';
        }
        return '';
      },
      hide: true, // Will be shown/hidden dynamically
    },
    {
      field: 'priority_position',
      headerName: 'Shipping Position',
      width: 60,
      sortable: false, // Disable sorting to prevent interference with drag operations
      cellStyle: { textAlign: 'center', fontWeight: 'bold', fontSize: '16px' },
      valueGetter: (params) => {
        // Always show the shipping_priority value if it exists
        if (params.data?.shipping_priority > 0) {
          return params.data.shipping_priority;
        }
        return '';
      },
      hide: true, // Will be shown/hidden dynamically
    },
    // All orders tab specific columns
    {
      headerName: "Priority Actions",
      filter: false,
      sortable: false,
      maxWidth: 250,
      cellRenderer: PriorityActionsCellRendererComponent,
      cellRendererParams: {
        onAddToPriority: (orderData: any) => this.addToPriorityList(orderData),
        onMakeTopPriority: (orderData: any) => this.makeTopPriority(orderData),
        onRemovePriority: (orderId: string) => this.removePriorityFromList(orderId)
      },
      headerTooltip: 'Quick priority management actions',
    },
    // Shared columns
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
      headerName: "Shipping Priority",
      filter: false,
      sortable: false, // Disable sorting to prevent interference with drag operations
      editable: true,
      maxWidth: 150,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0,
        max: 9999,
        precision: 0
      },
      cellRenderer: PriorityDisplayCellRendererComponent,
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
    rowDragManaged: true,
    suppressMoveWhenRowDragging: true,
    rowDragEntireRow: true,
    suppressRowDrag: false,
    onRowDragEnd: (event) => this.onPriorityRowDragEnd(event),
    // rowBuffer: 0,
    animateRows: true,
    tooltipShowDelay: 0,
    columnDefs: this.columnDefs,
    enableCharts: true,
    enableAdvancedFilter: false,
    enableBrowserTooltips: true,
    suppressColumnMoveAnimation: true,
    getRowId: (data: any) => data?.data.id?.toString(),
    onGridReady: (params) => {
      this.gridApi = params.api;
      // Configure grid for the active tab
      this.configureGridForActiveTab();
      this.updateColumnVisibility();
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

  // Priority help alert properties
  showPriorityHelpAlert = false;
  private priorityHelpDismissedKey = 'shipping_priority_help_dismissed';

  // Initialize priority help alert visibility
  private initializePriorityHelpAlert(): void {
    const dismissed = localStorage.getItem(this.priorityHelpDismissedKey);
    this.showPriorityHelpAlert = !dismissed;
  }

  // Dismiss priority help alert
  dismissPriorityHelpAlert(): void {
    this.showPriorityHelpAlert = false;
    localStorage.setItem(this.priorityHelpDismissedKey, 'true');
  }

  // Open Priority Display in new window/tab
  openPriorityDisplay(): void {
    const url = this.pathUtils.createExternalUrl(['/shipping-priority-display']);
    window.open(url, '_blank');
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

      // Set data to all orders, filtering will be handled by the tab switching
      this.data = this.allOrdersData;

      this.setPinnedRows();
      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }

}
