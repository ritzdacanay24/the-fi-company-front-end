import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, EMPTY, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { MasterSchedulingService } from '@app/core/api/operations/master-scheduling/master-scheduling.service';
import { WebsocketService } from '@app/core/services/websocket.service';

// Priority-related interfaces
export interface PriorityData {
  id: string | number;
  order_id: string;
  sales_order_number: string;
  sales_order_line: string;
  priority_level: string | number;
  notes?: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  is_active: string | boolean;
}

export interface ShippingOrder {
  id: any;
  SOD_NBR: string;
  SOD_LINE: string;
  SOD_PART: string;
  STATUS: string;
  CUSTNAME?: string;
  SOD_SHIP_DATE?: string;
  SOD_QTY_TO_SHIP?: number;
  shipping_priority?: number;
  priority_notes?: string;
  priority_id?: string | number;
  priority_created_at?: string;
  priority_created_by?: string;
  // Additional fields from the data structure
  SOD_DUE_DATE?: string;
  LEADTIME?: number;
  SOD_QTY_ORD?: number;
  SOD_QTY_SHIP?: number;
  SOD_PRICE?: number;
  SOD_CONTR_ID?: string;
  SOD_DOMAIN?: string;
  OPENBALANCE?: number;
  QTYOPEN?: number;
  FULLDESC?: string;
  SO_CUST?: string;
  SO_ORD_DATE?: string;
  SO_SHIP?: string;
  CP_CUST_PART?: string;
  LD_QTY_OH?: number;
  SO_BOL?: string;
  PT_ROUTING?: string;
  AGE?: number;
  SOD_LIST_PR?: number;
  CMT_CMMT?: string;
  WORK_ORDER_ROUTING?: string;
  sod_acct?: number;
  SO_SHIPVIA?: string;
  SALES_ORDER_LINE_NUMBER?: string;
  PT_DESC1?: string;
  PT_DESC2?: string;
  sod_per_date?: string;
  sod_type?: string;
  sod_req_date?: string;
  REQ_DUE_DIFF?: number;
  WO_NBR?: number;
  PT_REV?: string;
  sales_order_line_number?: string;
  recent_notes?: any;
  recent_comments?: {
    orderNum?: string;
    comments_html?: string;
    comments?: string;
    createdDate?: string;
    byDate?: string;
    color_class_name?: string;
    bg_class_name?: string;
    comment_title?: string;
    created_by_name?: string;
  };
  misc?: {
    tj_po_number?: string;
    tj_due_date?: string;
    hot_order?: any;
    clear_to_build_status?: any;
    shipping_db_status?: any;
    recoveryDate?: string;
    lateReasonCode?: string;
    recoveryDateComment?: string;
    supplyReview?: string;
    shortages_review?: string;
    g2e_comments?: string;
  };
  recent_owner_changes?: any;
  all_mention_comments?: {
    all_comments?: string;
    orderNum?: string;
  };
  [key: string]: any;
}

export interface PriorityDisplayData {
  currentPriorityOrder: ShippingOrder | null;
  topThreePriorityOrders: ShippingOrder[];
  nextPriorityOrders: ShippingOrder[];
  allPriorityOrders: ShippingOrder[];
  statusCount: {
    pastDue: number;
    todayDue: number;
    futureDue: number;
  };
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  lastUpdated: string;
}

const WS_SHIPPING_PRIORITY = "WS_SHIPPING_PRIORITY";

@Injectable({
  providedIn: 'root'
})
export class PriorityDisplayService {
  private readonly _displayData$ = new BehaviorSubject<PriorityDisplayData>({
    currentPriorityOrder: null,
    topThreePriorityOrders: [],
    nextPriorityOrders: [],
    allPriorityOrders: [],
    statusCount: { pastDue: 0, todayDue: 0, futureDue: 0 },
    isLoading: false,
    hasError: false,
    errorMessage: '',
    lastUpdated: ''
  });

  public readonly displayData$ = this._displayData$.asObservable();

  // Track current display mode
  private currentDisplayMode: 'single' | 'top3' = 'single';

  constructor(
    private api: MasterSchedulingService,
    private websocketService: WebsocketService
  ) {
    // Don't setup WebSocket in constructor - wait for first load
  }

  // Track if WebSocket is setup
  private isWebSocketSetup = false;

  /**
   * Load priority data and update the display
   */
  async loadPriorityData(): Promise<void> {
    try {
      // Set loading state without clearing existing data
      this.setLoadingState(true);

      // Setup WebSocket connection on first load
      if (!this.isWebSocketSetup) {
        this.setupWebSocketConnection();
        this.isWebSocketSetup = true;
      }

      // Load both priorities and shipping data
      const [priorities, shippingData] = await Promise.all([
        this.loadPriorities(),
        this.loadShippingData()
      ]);

      // Merge and process the data - only get active orders
      const activeOrders = this.mergePriorityWithShippingData(priorities, shippingData);
      const statusCount = this.calculateStatusCount(shippingData);

      // Update the display data
      this.updateDisplayDataState(activeOrders, statusCount);
      
      console.log('✅ Priority data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading priority data:', error);
      this.updateLoadingState(false, true, 'Failed to load priority data. Please check your connection.');
    }
  }

  /**
   * Set loading state without clearing existing data
   */
  private setLoadingState(isLoading: boolean): void {
    const currentData = this._displayData$.value;
    this._displayData$.next({
      ...currentData,
      isLoading,
      hasError: false,
      errorMessage: ''
    });
  }

  /**
   * Update display mode and recalculate display data
   */
  updateDisplayMode(mode: 'single' | 'top3'): void {
    console.log(`🔄 Setting display mode to: ${mode}`);
    this.currentDisplayMode = mode;
    
    const currentData = this._displayData$.value;
    const updatedData = this.calculateDisplayData(currentData.allPriorityOrders, mode);
    
    this._displayData$.next({
      ...currentData,
      ...updatedData
    });
  }

  /**
   * Set up WebSocket connection for real-time updates
   */
  private setupWebSocketConnection(): void {
    try {
      // Check if websocketService is available
      if (!this.websocketService || !this.websocketService.multiplex) {
        console.warn('⚠️ WebSocket service not available, skipping real-time updates');
        return;
      }

      const ws_priority_observable = this.websocketService.multiplex(
        () => ({ subscribe: WS_SHIPPING_PRIORITY }),
        () => ({ unsubscribe: WS_SHIPPING_PRIORITY }),
        (message) => message.type === WS_SHIPPING_PRIORITY
      );

      ws_priority_observable.subscribe({
        next: (data: any) => {
          console.log('🔔 Received priority update via WebSocket:', data);
          
          if (data?.message) {
            this.loadPriorityData();
          }
        },
        error: (error) => {
          console.warn('⚠️ WebSocket error:', error);
          // Continue without real-time updates
        }
      });
      
      console.log('✅ WebSocket connection established for priority updates');
    } catch (error) {
      console.warn('⚠️ Failed to setup WebSocket connection:', error);
      // Continue without real-time updates
    }
  }

  /**
   * Load priorities from the API
   */
  private async loadPriorities(): Promise<PriorityData[]> {
    try {
      const response = await this.api.getShippingPriorities();
      
      if (!response?.data) {
        console.warn('⚠️ No priority data received from API');
        return [];
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error loading priorities:', error);
      throw error;
    }
  }

  /**
   * Load shipping data from the API
   */
  private async loadShippingData(): Promise<any[]> {
    try {
      const shippingData = await this.api.getShipping();
      return shippingData || [];
    } catch (error) {
      console.error('❌ Error loading shipping data:', error);
      throw error;
    }
  }

  /**
   * Merge priority data with shipping data (active orders only)
   */
  private mergePriorityWithShippingData(priorities: PriorityData[], shippingData: any[]): ShippingOrder[] {
    console.log('🔍 Merging priorities with shipping data...');
    console.log('📊 Total priorities count:', priorities.length);
    console.log('📦 Shipping data count:', shippingData.length);
    
    // Filter and sort active priorities only
    const activePriorities = priorities
      .filter(p => this.isActive(p.is_active))
      .sort((a, b) => parseInt(a.priority_level.toString()) - parseInt(b.priority_level.toString()));

    console.log('✅ Active priorities count:', activePriorities.length);

    const activeOrders: ShippingOrder[] = [];

    // Process only active priorities that still exist in shipping data
    for (const priority of activePriorities) {
      const shippingOrder = this.findMatchingShippingOrder(shippingData, priority);
      
      if (shippingOrder) {
        console.log(`✅ Found shipping data for active ${priority.sales_order_number}-${priority.sales_order_line} - still needs processing`);
        activeOrders.push({
          ...shippingOrder,
          priority_id: priority.id,
          shipping_priority: parseInt(priority.priority_level.toString()),
          priority_notes: priority.notes,
          priority_created_at: priority.created_at,
          priority_created_by: priority.created_by
        });
      } else {
        console.log(`✅ Priority ${priority.sales_order_number}-${priority.sales_order_line} not found in shipping data - order completed/shipped, skipping`);
        // Don't add to activeOrders - order is completed since it's not in shipping data
      }
    }

    console.log('🎯 Final active orders count:', activeOrders.length);
    console.log('📋 Active orders (still need processing):', activeOrders.map(order => `${order.SOD_NBR}-${order.SOD_LINE} (Priority: ${order.shipping_priority})`));

    return activeOrders;
  }

  /**
   * Find matching shipping order using multiple strategies
   */
  private findMatchingShippingOrder(shippingData: any[], priority: PriorityData): any | null {
    console.log(`🔍 Looking for SO: ${priority.sales_order_number}-${priority.sales_order_line}`);
    
    // Strategy 1: Exact match
    let shippingOrder = shippingData.find(order => 
      order.SOD_NBR === priority.sales_order_number && 
      order.SOD_LINE.toString() === priority.sales_order_line.toString()
    );

    // Strategy 2: Trimmed values
    if (!shippingOrder) {
      shippingOrder = shippingData.find(order => 
        order.SOD_NBR?.toString().trim() === priority.sales_order_number?.toString().trim() && 
        order.SOD_LINE?.toString().trim() === priority.sales_order_line?.toString().trim()
      );
    }

    // Strategy 3: Case-insensitive match
    if (!shippingOrder) {
      shippingOrder = shippingData.find(order => 
        order.SOD_NBR?.toString().toLowerCase().trim() === priority.sales_order_number?.toString().toLowerCase().trim() && 
        order.SOD_LINE?.toString().trim() === priority.sales_order_line?.toString().trim()
      );
    }

    // Strategy 4: Alternative field matching
    if (!shippingOrder) {
      const searchKey = `${priority.sales_order_number}-${priority.sales_order_line}`;
      shippingOrder = shippingData.find(order => 
        order.sales_order_line_number === searchKey ||
        order.SALES_ORDER_LINE_NUMBER === searchKey ||
        order.id === searchKey
      );
    }

    if (!shippingOrder) {
      console.log('🔍 Sample shipping data for debugging:');
      shippingData.slice(0, 5).forEach(order => {
        console.log(`  📦 ${order.SOD_NBR}-${order.SOD_LINE} (ID: ${order.id}, SOLN: ${order.sales_order_line_number || 'none'})`);
      });
    }

    return shippingOrder || null;
  }

  /**
   * Calculate display data based on mode
   */
  private calculateDisplayData(allOrders: ShippingOrder[], mode: 'single' | 'top3') {
    const sortedOrders = [...allOrders].sort((a, b) => 
      (a.shipping_priority || 999) - (b.shipping_priority || 999)
    );

    if (mode === 'single') {
      return {
        currentPriorityOrder: sortedOrders.length > 0 ? sortedOrders[0] : null,
        topThreePriorityOrders: [],
        nextPriorityOrders: sortedOrders.slice(1, 10) // Show up to 9 next orders
      };
    } else {
      return {
        currentPriorityOrder: null,
        topThreePriorityOrders: sortedOrders.slice(0, 3),
        nextPriorityOrders: sortedOrders.slice(3, 10) // Show up to 7 next orders after top 3
      };
    }
  }

  /**
   * Calculate status counts for display
   */
  private calculateStatusCount(shippingData: any[]) {
    return shippingData.reduce((count, order) => {
      switch (order.STATUS) {
        case "Past Due":
          count.pastDue++;
          break;
        case "Due Today":
          count.todayDue++;
          break;
        default:
          count.futureDue++;
      }
      return count;
    }, { pastDue: 0, todayDue: 0, futureDue: 0 });
  }

  /**
   * Check if priority is active
   */
  private isActive(isActive: string | boolean): boolean {
    return isActive === true || isActive === "1";
  }

  /**
   * Update loading state
   */
  private updateLoadingState(isLoading: boolean, hasError: boolean, errorMessage: string): void {
    const currentData = this._displayData$.value;
    this._displayData$.next({
      ...currentData,
      isLoading,
      hasError,
      errorMessage
    });
  }

  /**
   * Update display data state
   */
  private updateDisplayDataState(allPriorityOrders: ShippingOrder[], statusCount: any): void {
    const currentData = this._displayData$.value;
    // Use current display mode instead of defaulting to 'single'
    const displayData = this.calculateDisplayData(allPriorityOrders, this.currentDisplayMode);
    
    console.log(`📊 Updating display data with mode: ${this.currentDisplayMode}`);
    
    this._displayData$.next({
      ...currentData,
      ...displayData,
      allPriorityOrders,
      statusCount,
      isLoading: false,
      hasError: false,
      errorMessage: '',
      lastUpdated: new Date().toLocaleTimeString()
    });
  }
}
