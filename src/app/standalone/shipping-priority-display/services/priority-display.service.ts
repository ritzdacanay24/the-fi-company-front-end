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
  kanban_priority?: number;
  priority_notes?: string;
  priority_id?: string | number;
  priority_created_at?: string;
  priority_created_by?: string;
  priority_source?: 'shipping' | 'kanban' | 'both';
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
    owner_name?:  string
  };
  recent_owner_changes?: any;
  all_mention_comments?: {
    all_comments?: string;
    orderNum?: string;
  };
  [key: string]: any;
}

export interface GroupedPriorityItem {
  partNumber: string;
  priority: number;
  totalQuantity: number;
  orders: ShippingOrder[];
  dueDate?: string;
  status?: string;
  customerName?: string;
  description?: string;
}

export interface PriorityContext {
  shippingPrioritiesCount: number;
  kanbanPrioritiesCount: number;
  highestShippingPriority: number | null;
  highestKanbanPriority: number | null;
  suggestedShippingPriority: number;
  suggestedKanbanPriority: number;
  combinedTotalCount: number;
}

export interface PriorityDisplayData {
  currentPriorityOrder: ShippingOrder | null;
  topThreePriorityOrders: ShippingOrder[];
  nextPriorityOrders: ShippingOrder[];
  allPriorityOrders: ShippingOrder[];
  // New grouped data for part number display
  groupedPriorityItems: GroupedPriorityItem[];
  currentGroupedItem: GroupedPriorityItem | null;
  topThreeGroupedItems: GroupedPriorityItem[];
  nextGroupedItems: GroupedPriorityItem[];
  // Alternate priority type data (e.g., kanban when showing shipping, and vice versa)
  alternateGroupedItems: GroupedPriorityItem[];
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
    groupedPriorityItems: [],
    currentGroupedItem: null,
    topThreeGroupedItems: [],
    nextGroupedItems: [],
    alternateGroupedItems: [],
    statusCount: { pastDue: 0, todayDue: 0, futureDue: 0 },
    isLoading: false,
    hasError: false,
    errorMessage: '',
    lastUpdated: ''
  });

  public readonly displayData$ = this._displayData$.asObservable();

  // Track current display mode
  private currentDisplayMode: 'single' | 'top3' | 'top6' | 'grid' = 'single';
  
  // Track current priority type ('shipping' or 'kanban')
  private currentPriorityType: 'shipping' | 'kanban' = 'kanban'; // Default to kanban

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
  async loadPriorityData(showLoadingState: boolean = true): Promise<void> {
    try {
      // Set loading state without clearing existing data - only if requested
      if (showLoadingState) {
        this.setLoadingState(true);
      }

      // Setup WebSocket connection on first load
      if (!this.isWebSocketSetup) {
        this.setupWebSocketConnection();
        this.isWebSocketSetup = true;
      }

      // Load BOTH priority types and shipping data in parallel
      const [primaryPriorities, alternatePriorities, shippingData] = await Promise.all([
        this.currentPriorityType === 'kanban' ? this.loadKanbanPriorities() : this.loadPriorities(),
        this.currentPriorityType === 'kanban' ? this.loadPriorities() : this.loadKanbanPriorities(),
        this.loadShippingData()
      ]);

      // Merge and process the PRIMARY data (displayed in main area)
      const activeOrders = this.mergePriorityWithShippingData(primaryPriorities, shippingData, this.currentPriorityType)
        .map(order => ({ ...order, priority_source: this.currentPriorityType as 'shipping' | 'kanban' }));
      
      // Merge and process the ALTERNATE data (displayed in "Coming Up Next")
      const alternatePriorityType = this.currentPriorityType === 'kanban' ? 'shipping' : 'kanban';
      const alternateOrders = this.mergePriorityWithShippingData(alternatePriorities, shippingData, alternatePriorityType)
        .map(order => ({ ...order, priority_source: alternatePriorityType as 'shipping' | 'kanban' }));
      
      const statusCount = this.calculateStatusCount(shippingData);

      // Update the display data with both primary and alternate
      this.updateDisplayDataState(activeOrders, alternateOrders, statusCount);
      
      console.log(`✅ ${this.currentPriorityType === 'kanban' ? 'Kanban' : 'Shipping'} priority data loaded successfully`);
      console.log(`✅ Alternate (${alternatePriorityType}) priority data loaded for bottom section`);
    } catch (error) {
      console.error('❌ Error loading priority data:', error);
      this.updateLoadingState(false, true, 'Failed to load priority data. Please check your connection.');
    }
  }

  /**
   * Load combined priority data (both shipping and kanban together)
   */
  async loadCombinedPriorityData(showLoadingState: boolean = true): Promise<void> {
    try {
      // Set loading state without clearing existing data - only if requested
      if (showLoadingState) {
        this.setLoadingState(true);
      }

      // Setup WebSocket connection on first load
      if (!this.isWebSocketSetup) {
        this.setupWebSocketConnection();
        this.isWebSocketSetup = true;
      }

      // Load BOTH priority types and shipping data in parallel
      const [shippingPriorities, kanbanPriorities, shippingData] = await Promise.all([
        this.loadPriorities(),
        this.loadKanbanPriorities(),
        this.loadShippingData()
      ]);

      // Merge shipping priorities with shipping data
      const shippingOrders = this.mergePriorityWithShippingData(shippingPriorities, shippingData, 'shipping')
        .map(order => ({ ...order, priority_source: 'shipping' as const }));
      
      // Merge kanban priorities with shipping data
      const kanbanOrders = this.mergePriorityWithShippingData(kanbanPriorities, shippingData, 'kanban')
        .map(order => ({ ...order, priority_source: 'kanban' as const }));
      
      // Combine both arrays - keep ALL orders with their source classification
      // Sort by priority number (lower number = higher priority) regardless of source
      const allOrders = [...shippingOrders, ...kanbanOrders];
      
      // Remove duplicates but KEEP the priority_source from each list
      // If an order appears in both, we'll keep it with BOTH priorities tracked
      const orderMap = new Map<string, ShippingOrder>();
      
      allOrders.forEach(order => {
        const key = `${order.SOD_NBR}-${order.SOD_LINE}`;
        const existing = orderMap.get(key);
        
        if (!existing) {
          // First time seeing this order
          orderMap.set(key, order);
        } else {
          // Order exists - merge priority information
          // Keep both shipping_priority and kanban_priority values
          if (order.priority_source === 'shipping' && order.shipping_priority) {
            existing.shipping_priority = order.shipping_priority;
          }
          if (order.priority_source === 'kanban' && order.kanban_priority) {
            existing.kanban_priority = order.kanban_priority;
          }
          
          // Set priority_source to 'both' if it appears in both lists
          if ((existing.shipping_priority && existing.kanban_priority) ||
              (existing.priority_source !== order.priority_source)) {
            existing.priority_source = 'both' as any;
          }
        }
      });

      const combinedOrders = Array.from(orderMap.values());
      
      // Sort by priority with secondary sort criteria for deterministic ordering
      combinedOrders.sort((a, b) => {
        // Primary sort: by LOWEST priority number (highest priority first)
        const aPriority = Math.min(a.shipping_priority || 999, a.kanban_priority || 999);
        const bPriority = Math.min(b.shipping_priority || 999, b.kanban_priority || 999);
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Secondary sort (when priorities are equal): 
        // 1. 'both' items first (highest visibility)
        // 2. Then 'shipping' 
        // 3. Then 'kanban'
        const sourceOrder = { 'both': 0, 'shipping': 1, 'kanban': 2 };
        const aSourceOrder = sourceOrder[a.priority_source as keyof typeof sourceOrder] ?? 3;
        const bSourceOrder = sourceOrder[b.priority_source as keyof typeof sourceOrder] ?? 3;
        
        if (aSourceOrder !== bSourceOrder) {
          return aSourceOrder - bSourceOrder;
        }
        
        // Tertiary sort (when priority and source are equal): by part number alphabetically
        return (a.SOD_PART || '').localeCompare(b.SOD_PART || '');
      });
      
      const statusCount = this.calculateStatusCount(shippingData);

      // Update display data with combined orders (empty alternate array for bottom section)
      this.updateDisplayDataState(combinedOrders, [], statusCount);
      
      console.log(`✅ Combined priority data loaded successfully - ${combinedOrders.length} orders`);
      console.log(`📊 Shipping priorities: ${shippingOrders.length}, Kanban priorities: ${kanbanOrders.length}, Combined total: ${combinedOrders.length}`);
      
      // Log breakdown by source
      const shippingOnly = combinedOrders.filter(o => o.priority_source === 'shipping').length;
      const kanbanOnly = combinedOrders.filter(o => o.priority_source === 'kanban').length;
      const both = combinedOrders.filter(o => o.priority_source === 'both').length;
      console.log(`📊 Source breakdown - Shipping only: ${shippingOnly}, Kanban only: ${kanbanOnly}, Both: ${both}`);
      
      // Log sorting behavior for items with same priority
      console.log(`📋 Sort order: Priority # (ascending) → Source (both>shipping>kanban) → Part # (alphabetical)`);
      
      // Log examples of 'both' items to show merged priorities
      if (both > 0) {
        const bothItems = combinedOrders.filter(o => o.priority_source === 'both').slice(0, 3);
        console.log(`🔗 Sample items with BOTH priorities:`);
        bothItems.forEach(item => {
          console.log(`   ${item.SOD_NBR}-${item.SOD_LINE}: Shipping #${item.shipping_priority}, Kanban #${item.kanban_priority}`);
        });
      }
    } catch (error) {
      console.error('❌ Error loading combined priority data:', error);
      this.updateLoadingState(false, true, 'Failed to load combined priority data. Please check your connection.');
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
  updateDisplayMode(mode: 'single' | 'top3' | 'top6' | 'grid'): void {
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
   * Update priority type (shipping or kanban) and reload data
   */
  async updatePriorityType(type: 'shipping' | 'kanban'): Promise<void> {
    console.log(`🔄 Switching priority type to: ${type}`);
    this.currentPriorityType = type;
    await this.loadPriorityData(true);
  }

  /**
   * Get current priority type
   */
  getCurrentPriorityType(): 'shipping' | 'kanban' {
    return this.currentPriorityType;
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
   * Load kanban priorities from the API
   */
  private async loadKanbanPriorities(): Promise<PriorityData[]> {
    try {
      const response = await this.api.getKanbanPriorities();
      
      if (!response?.data) {
        console.warn('⚠️ No kanban priority data received from API');
        return [];
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error loading kanban priorities:', error);
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
  private mergePriorityWithShippingData(
    priorities: PriorityData[], 
    shippingData: any[], 
    priorityType: 'shipping' | 'kanban' = this.currentPriorityType
  ): ShippingOrder[] {
    console.log('🔍 Merging priorities with shipping data...');
    console.log(`📊 Priority type: ${priorityType}`);
    console.log('📊 Total priorities count:', priorities.length);
    console.log('📦 Shipping data count:', shippingData.length);
    console.log('📋 Priority details:', priorities.map(p => `${p.sales_order_number}-${p.sales_order_line} (Level: ${p.priority_level})`));
    
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
        console.log(`✅ Found shipping data for active ${priority.sales_order_number}-${priority.sales_order_line}`);
        
        // Use different field names based on priority type
        const priorityField = priorityType === 'kanban' ? 'kanban_priority' : 'shipping_priority';
        
        activeOrders.push({
          ...shippingOrder,
          priority_id: priority.id,
          [priorityField]: parseInt(priority.priority_level.toString()),
          priority_notes: priority.notes,
          priority_created_at: priority.created_at,
          priority_created_by: priority.created_by
        });
      } else {
        console.log(`⚠️ Priority ${priority.sales_order_number}-${priority.sales_order_line} not found in shipping data - order may be completed/shipped`);
        // Don't add to activeOrders - order is completed since it's not in shipping data
      }
    }

    console.log('🎯 Final active orders count:', activeOrders.length);
    console.log(`📋 Active orders (${priorityType}):`, activeOrders.map(order => {
      const priorityValue = priorityType === 'kanban' ? order['kanban_priority'] : order.shipping_priority;
      return `${order.SOD_NBR}-${order.SOD_LINE} (Priority: ${priorityValue})`;
    }));

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
   * Group orders by part number across all priority levels
   */
  /**
   * Group orders by part number (with optional priority type override)
   */
  private groupOrdersByPartNumber(orders: ShippingOrder[], priorityType?: 'shipping' | 'kanban'): GroupedPriorityItem[] {
    const typeToUse = priorityType || this.currentPriorityType;
    
    console.log('📦 Grouping orders by part number...');
    console.log(`📊 Priority type: ${typeToUse}`);
    console.log('📊 Total orders to group:', orders.length);
    
    const grouped = new Map<string, { item: GroupedPriorityItem; firstOrderIndex: number }>();
    const priorityField = typeToUse === 'kanban' ? 'kanban_priority' : 'shipping_priority';

    orders.forEach((order, index) => {
      const partNumber = order.SOD_PART || 'Unknown Part';
      const priority = (typeToUse === 'kanban' ? order['kanban_priority'] : order.shipping_priority) || 999;
      // Use only part number as key to group across all priority levels
      const key = partNumber;

      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.item.orders.push(order);
        console.log(`  ➕ Added order to existing group: ${partNumber} (now has ${existing.item.orders.length} orders)`);
        // Use QTYOPEN as the primary quantity field, fallback to SOD_QTY_ORD
        existing.item.totalQuantity += (order.QTYOPEN || order.SOD_QTY_ORD || order.SOD_QTY_TO_SHIP || 0);
        // Keep the highest priority (lowest number) for this part
        if (priority < existing.item.priority) {
          existing.item.priority = priority;
        }
        // Update customer name logic - check if we have multiple customers
        const newCustomerName = order.SO_CUST || order.CUSTNAME || 'Unknown Customer';
        if (existing.item.customerName !== newCustomerName) {
          existing.item.customerName = 'Multiple Customers';
        }
      } else {
        console.log(`  ✨ Created new group: ${partNumber} (Priority: ${priority}, Index: ${index})`);
        // Get customer name - prefer SO_CUST over CUSTNAME
        const customerName = order.SO_CUST || order.CUSTNAME || 'Unknown Customer';
        
        grouped.set(key, {
          firstOrderIndex: index,  // Track the position of the first order in this group
          item: {
            partNumber,
            priority,
            totalQuantity: order.QTYOPEN || order.SOD_QTY_ORD || order.SOD_QTY_TO_SHIP || 0,
            orders: [order],
            dueDate: order.SOD_SHIP_DATE || order.SOD_DUE_DATE,
            status: order.STATUS,
            customerName: customerName
          }
        });
      }
    });

    // Convert map to array and sort by the FIRST ORDER'S POSITION (preserves input sort order)
    const result = Array.from(grouped.values())
      .sort((a, b) => a.firstOrderIndex - b.firstOrderIndex)
      .map(entry => entry.item);
    
    console.log('✅ Grouped result:', result.length, 'unique part numbers');
    console.log('📋 Group details:', result.map(g => `${g.partNumber} (${g.orders.length} orders, Priority: ${g.priority}, Source: ${g.orders[0]?.priority_source || 'unknown'})`));
    
    return result;
  }

  /**
   * Calculate display data based on mode
   */
  private calculateDisplayData(allOrders: ShippingOrder[], mode: 'single' | 'top3' | 'top6' | 'grid') {
    // Check if this is combined data (has mixed priority sources)
    const hasMixedSources = allOrders.some(o => o.priority_source === 'both') || 
                           (allOrders.some(o => o.priority_source === 'shipping') && 
                            allOrders.some(o => o.priority_source === 'kanban'));
    
    let sortedOrders: ShippingOrder[];
    
    if (hasMixedSources) {
      // Combined mode: orders are already sorted correctly by loadCombinedPriorityData()
      // DO NOT re-sort, just use them as-is
      sortedOrders = [...allOrders];
      console.log('📊 Using pre-sorted combined orders (preserving priority_source sort)');
    } else {
      // Single priority type mode: sort by that priority type
      const priorityField = this.currentPriorityType === 'kanban' ? 'kanban_priority' : 'shipping_priority';
      sortedOrders = [...allOrders].sort((a, b) => {
        const aPriority = this.currentPriorityType === 'kanban' ? (a['kanban_priority'] || 999) : (a.shipping_priority || 999);
        const bPriority = this.currentPriorityType === 'kanban' ? (b['kanban_priority'] || 999) : (b.shipping_priority || 999);
        return aPriority - bPriority;
      });
      console.log(`📊 Sorted by ${this.currentPriorityType} priority`);
    }

    // Generate grouped data for part number display
    const groupedItems = this.groupOrdersByPartNumber(sortedOrders);

    switch (mode) {
      case 'single':
        return {
          currentPriorityOrder: sortedOrders.length > 0 ? sortedOrders[0] : null,
          topThreePriorityOrders: [],
          nextPriorityOrders: sortedOrders.slice(1, 10),
          groupedPriorityItems: groupedItems,
          currentGroupedItem: groupedItems.length > 0 ? groupedItems[0] : null,
          topThreeGroupedItems: [],
          nextGroupedItems: groupedItems.slice(1, 10)
        };
      
      case 'top3':
        return {
          currentPriorityOrder: null,
          topThreePriorityOrders: sortedOrders.slice(0, 3),
          nextPriorityOrders: sortedOrders.slice(3, 10),
          groupedPriorityItems: groupedItems,
          currentGroupedItem: null,
          topThreeGroupedItems: groupedItems.slice(0, 3),
          nextGroupedItems: groupedItems.slice(3, 10)
        };
      
      case 'top6':
        return {
          currentPriorityOrder: null,
          topThreePriorityOrders: sortedOrders.slice(0, 6), // Reuse this array for 6 items
          nextPriorityOrders: sortedOrders.slice(6, 15),
          groupedPriorityItems: groupedItems,
          currentGroupedItem: null,
          topThreeGroupedItems: groupedItems.slice(0, 6), // Reuse this array for 6 items
          nextGroupedItems: groupedItems.slice(6, 15)
        };
      
      case 'grid':
        return {
          currentPriorityOrder: null,
          topThreePriorityOrders: sortedOrders.slice(0, 12), // Show up to 12 in grid
          nextPriorityOrders: [],
          groupedPriorityItems: groupedItems,
          currentGroupedItem: null,
          topThreeGroupedItems: groupedItems.slice(0, 12), // Show up to 12 in grid
          nextGroupedItems: []
        };
      
      default:
        return this.calculateDisplayData(allOrders, 'single');
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
  private updateDisplayDataState(
    allPriorityOrders: ShippingOrder[], 
    alternateOrders: ShippingOrder[], 
    statusCount: any
  ): void {
    const currentData = this._displayData$.value;
    // Use current display mode instead of defaulting to 'single'
    const displayData = this.calculateDisplayData(allPriorityOrders, this.currentDisplayMode);
    
    // Calculate alternate grouped items for "Coming Up Next" section
    const alternatePriorityType = this.currentPriorityType === 'kanban' ? 'shipping' : 'kanban';
    const alternateGroupedItems = this.groupOrdersByPartNumber(alternateOrders, alternatePriorityType);
    
    console.log(`📊 Updating display data with mode: ${this.currentDisplayMode}`);
    console.log(`📊 Alternate priority items (${alternatePriorityType}): ${alternateGroupedItems.length}`);
    
    this._displayData$.next({
      ...currentData,
      ...displayData,
      allPriorityOrders,
      alternateGroupedItems,
      statusCount,
      isLoading: false,
      hasError: false,
      errorMessage: '',
      lastUpdated: new Date().toLocaleTimeString()
    });
  }
}
