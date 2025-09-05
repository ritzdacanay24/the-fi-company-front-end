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
      this.updateLoadingState(true, false, '');

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

      // Merge and process the data
      const mergedData = this.mergePriorityWithShippingData(priorities, shippingData);
      const statusCount = this.calculateStatusCount(shippingData);

      // Update the display data
      this.updateDisplayDataState(mergedData, statusCount);
      
      console.log('✅ Priority data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading priority data:', error);
      this.updateLoadingState(false, true, 'Failed to load priority data. Please check your connection.');
    }
  }

  /**
   * Update display mode and recalculate display data
   */
  updateDisplayMode(mode: 'single' | 'top3'): void {
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
   * Merge priority data with shipping data
   */
  private mergePriorityWithShippingData(priorities: PriorityData[], shippingData: any[]): ShippingOrder[] {
    // Filter and sort active priorities
    const activePriorities = priorities
      .filter(p => this.isActive(p.is_active))
      .sort((a, b) => parseInt(a.priority_level.toString()) - parseInt(b.priority_level.toString()));

    const mergedOrders: ShippingOrder[] = [];

    for (const priority of activePriorities) {
      const shippingOrder = shippingData.find(order => 
        order.SOD_NBR === priority.sales_order_number && 
        order.SOD_LINE.toString() === priority.sales_order_line.toString()
      );

      if (shippingOrder) {
        mergedOrders.push({
          ...shippingOrder,
          priority_id: priority.id,
          shipping_priority: parseInt(priority.priority_level.toString()),
          priority_notes: priority.notes,
          priority_created_at: priority.created_at,
          priority_created_by: priority.created_by
        });
      } else {
        // Create minimal order if shipping data is missing
        mergedOrders.push({
          id: priority.id,
          SOD_NBR: priority.sales_order_number,
          SOD_LINE: priority.sales_order_line,
          SOD_PART: 'N/A',
          STATUS: 'Unknown',
          CUSTNAME: 'N/A',
          SOD_SHIP_DATE: null,
          SOD_QTY_TO_SHIP: 0,
          priority_id: priority.id,
          shipping_priority: parseInt(priority.priority_level.toString()),
          priority_notes: priority.notes,
          priority_created_at: priority.created_at,
          priority_created_by: priority.created_by
        });
      }
    }

    return mergedOrders;
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
        nextPriorityOrders: sortedOrders.slice(1, 5)
      };
    } else {
      return {
        currentPriorityOrder: null,
        topThreePriorityOrders: sortedOrders.slice(0, 3),
        nextPriorityOrders: sortedOrders.slice(3, 7)
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
    const displayData = this.calculateDisplayData(allPriorityOrders, 'single'); // Default to single mode
    
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
