import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

// Interfaces for type safety
interface PriorityRequest {
  orderId: any;
  salesOrderNumber: string;
  salesOrderLine?: string;
  priority: number;
  notes?: string;
}

interface PriorityResponse {
  success: boolean;
  message: string;
  orderId?: any;
  priority?: number;
  data?: any[];
}

// Backwards compatibility
interface ShippingPriorityRequest extends PriorityRequest {}
interface ShippingPriorityResponse extends PriorityResponse {}

let url = 'operations/master-scheduling';

@Injectable({
  providedIn: 'root'
})
export class MasterSchedulingService extends DataService<any> {
  
  // Real API endpoint for shipping priorities
  private shippingPriorityApiUrl = 'apiV2/shipping-priorities';
  
  // Real API endpoint for kanban priorities
  private kanbanPriorityApiUrl = 'apiV2/kanban-priorities';

  constructor(http: HttpClient) {
    super(url, http);
  }

  // Get current user for API calls
  private getCurrentUser(): string {
    // For now, use a simple placeholder. This can be enhanced later.
    return 'api_user';
  }

  // Compatibility stub: mock mode has been removed and service is always real-api mode.
  setMockMode(_useMock: boolean) {
    console.warn('Mock mode is removed. MasterSchedulingService always uses real API.');
  }

  // Get current mode (for debugging)
  getCurrentMode() {
    return 'REAL';
  }

  getShipping = async () =>
    await firstValueFrom(this.http.get<any[]>(`apiV2/shipping/read-open-report`));

  getMasterProduction = async (routing) =>
    await firstValueFrom(
      this.http.get<any[]>(`apiV2/master-control/report-by-routing?routing=${routing}`)
    );

  getPickingByWorkOrderId = async (workOrderId: number, filteredSections: any = ['Open Picks']) =>
    await firstValueFrom(
      this.http.get<any[]>(
        `apiV2/master-control/pick-details?workOrderNumber=${workOrderId}&filteredSections=${filteredSections}`
      )
    );

  printWorkOrder(params: any) {
    return firstValueFrom(this.http.post(`apiV2/master-control/print-work-order`, params));
  }

  saveMisc(params: any) {
    return firstValueFrom(this.http.post(`apiV2/shipping/save-misc`, params));
  }

  updateShippingPriority(params: ShippingPriorityRequest) {
    return this.updateShippingPriorityAPI(params);
  }

  getShippingPriorities() {
    return this.getShippingPrioritiesAPI();
  }

  removeShippingPriority(orderId: any) {
    return this.removeShippingPriorityAPI(orderId);
  }

  // Bulk reorder priorities (for drag-and-drop)
  reorderShippingPriorities(priorityUpdates: Array<{id: string, priority_level: number}>) {
    return this.reorderShippingPrioritiesAPI(priorityUpdates);
  }

  // REAL API METHODS
  private async updateShippingPriorityAPI(params: ShippingPriorityRequest): Promise<ShippingPriorityResponse> {
    try {
      console.log('🌐 Making REAL API call to update shipping priority:', params);

      if (params.priority === 0) {
        return await this.removeShippingPriorityAPI(params.orderId);
      }

      // The backend applyChange handles priority shifting atomically — no client-side conflict check needed
      const requestBody = {
        order_id: params.orderId,
        sales_order_number: params.salesOrderNumber,
        sales_order_line: params.salesOrderLine,
        priority: params.priority,
        notes: params.notes,
        created_by: this.getCurrentUser(),
        updated_by: this.getCurrentUser()
      };

      const response = await firstValueFrom(
        this.http.post<any>(`${this.shippingPriorityApiUrl}?action=apply_change`, requestBody)
      );

      console.log('✅ Real API response:', response);
      return {
        success: response.success || false,
        message: response.message || 'Priority updated',
        data: response.data || null
      };
    } catch (error: any) {
      console.error('❌ Real API error:', error);
      return {
        success: false,
        message: error.error?.error || error.message || 'Failed to update priority',
        data: null
      };
    }
  }

  private async getShippingPrioritiesAPI(): Promise<ShippingPriorityResponse> {
    try {
      console.log('🌐 Making REAL API call to get shipping priorities');
      
      const response = await firstValueFrom(
        this.http.get<any>(`${this.shippingPriorityApiUrl}/`)
      );

      console.log('✅ Real API priorities retrieved:', response.data?.length || 0);
      return {
        success: response.success || false,
        message: response.message || 'Priorities retrieved',
        data: response.data || []
      };
    } catch (error: any) {
      console.error('❌ Real API error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get priorities',
        data: []
      };
    }
  }

  private async removeShippingPriorityAPI(orderId: any): Promise<ShippingPriorityResponse> {
    try {
      console.log('🌐 Making REAL API call to remove shipping priority:', orderId);
      
      // For real API, we need to find the priority ID first
      const prioritiesResponse = await this.getShippingPrioritiesAPI();
      if (!prioritiesResponse.success) {
        throw new Error('Failed to get priorities for removal');
      }

      const priority = prioritiesResponse.data?.find(p => p.order_id === orderId);
      if (!priority) {
        return {
          success: true,
          message: 'Priority not found (already removed)',
          data: null
        };
      }

      // Use atomic apply_change endpoint to remove and resequence
      const requestBody = {
        order_id: orderId,
        priority: 0,
        updated_by: this.getCurrentUser()
      };

      const response = await firstValueFrom(
        this.http.post<any>(`${this.shippingPriorityApiUrl}/?action=apply_change`, requestBody)
      );

      console.log('✅ Real API priority removed:', response);
      return {
        success: response.success || false,
        message: response.message || 'Priority removed',
        data: null
      };
    } catch (error: any) {
      console.error('❌ Real API error:', error);
      return {
        success: false,
        message: error.error?.error || error.message || 'Failed to remove priority',
        data: null
      };
    }
  }

  private async reorderShippingPrioritiesAPI(priorityUpdates: Array<{id: string, priority_level: number}>): Promise<ShippingPriorityResponse> {
    try {
      console.log('🌐 Making REAL API call to reorder shipping priorities:', priorityUpdates);
      
      // The priorityUpdates array should already contain database IDs from the frontend
      // Check if we're getting order_id strings (SOxxxxx-x) or database IDs (numeric)
      const firstId = priorityUpdates[0]?.id;
      const isOrderIdFormat = firstId && firstId.includes('-') && firstId.startsWith('SO');
      
      let finalUpdates;
      
      if (isOrderIdFormat) {
        console.log('🔄 Detected order_id format, mapping to database IDs...');
        
        // Get current priorities for mapping
        const prioritiesResponse = await this.getShippingPrioritiesAPI();
        if (!prioritiesResponse.success) {
          throw new Error('Failed to get current priorities for reordering');
        }
        
        console.log('📋 Current priorities from API:', prioritiesResponse.data);
        
        // Map order_id to database id
        finalUpdates = priorityUpdates.map(update => {
          const existingPriority = prioritiesResponse.data?.find(p => p.order_id === update.id);
          if (!existingPriority) {
            console.error(`❌ Priority not found for order ${update.id}`);
            console.log('Available priorities:', prioritiesResponse.data?.map(p => ({ id: p.id, order_id: p.order_id })));
            throw new Error(`Priority not found for order ${update.id}`);
          }
          console.log(`🔄 Mapping ${update.id} (order_id) → ${existingPriority.id} (db_id) with priority ${update.priority_level}`);
          return {
            id: existingPriority.id, // Use database primary key
            priority_level: update.priority_level
          };
        });
      } else {
        console.log('✅ Already using database IDs, proceeding directly...');
        finalUpdates = priorityUpdates;
      }
      
      console.log('🎯 Final updates for API:', finalUpdates);
      
      const requestBody = {
        priorities: finalUpdates,
        updated_by: this.getCurrentUser(),
        debug: true // TEMP: request per-ID diagnostics from server for troubleshooting
      };

      console.log('📤 Sending reorder request (with debug):', requestBody);

      const response = await firstValueFrom(
        this.http.post<any>(`${this.shippingPriorityApiUrl}/?action=reorder`, requestBody)
      );

      // If server returned debug info, dump it to console for analysis
      if (response && response.debug) {
        console.log('📥 Reorder response debug:', response.debug);
      }

      console.log('✅ Real API reorder response:', response);
      return {
        success: response.success || false,
        message: response.message || 'Priorities reordered',
        data: response.data || null
      };
    } catch (error: any) {
      console.error('❌ Real API reorder error:', error);
      return {
        success: false,
        message: error.error?.error || error.message || 'Failed to reorder priorities',
        data: null
      };
    }
  }

  // =============================================================================
  // KANBAN PRIORITY METHODS
  // =============================================================================

  /**
   * Update kanban priority for an order
   */
  updateKanbanPriority(params: PriorityRequest) {
    return this.updateKanbanPriorityAPI(params);
  }

  /**
   * Get all kanban priorities
   */
  getKanbanPriorities() {
    return this.getKanbanPrioritiesAPI();
  }

  /**
   * Remove kanban priority
   */
  removeKanbanPriority(orderId: any) {
    return this.removeKanbanPriorityAPI(orderId);
  }

  /**
   * Bulk reorder kanban priorities (for drag-and-drop)
   */
  reorderKanbanPriorities(priorityUpdates: Array<{id: string, priority_level: number}>) {
    return this.reorderKanbanPrioritiesAPI(priorityUpdates);
  }

  // KANBAN PRIORITY - REAL API METHODS

  private async updateKanbanPriorityAPI(params: PriorityRequest): Promise<PriorityResponse> {
    try {
      console.log('🌐 Making REAL API call to update kanban priority:', params);
      
      // First, check if priority already exists for this order
      const existingPriorities = await this.getKanbanPrioritiesAPI();
      const existingPriority = existingPriorities.data?.find(p => p.order_id === params.orderId);
      
      if (params.priority === 0) {
        // Remove priority
        if (existingPriority) {
          return await this.removeKanbanPriorityAPI(params.orderId);
        } else {
          return {
            success: true,
            message: 'Priority already removed',
            data: null
          };
        }
      }
      
      // Check for priority conflicts (another order with same priority)
      const conflictingPriority = existingPriorities.data?.find(
        p => p.priority_level === params.priority && p.order_id !== params.orderId
      );
      
      if (conflictingPriority) {
        return {
          success: false,
          message: `Priority ${params.priority} is already assigned to order ${conflictingPriority.order_id}`,
          data: null
        };
      }

      let response;
      
      if (existingPriority) {
        // Move existing priority via server-side atomic endpoint
        const requestBody = {
          order_id: params.orderId,
          sales_order_number: params.salesOrderNumber,
          sales_order_line: params.salesOrderLine,
          priority: params.priority,
          notes: params.notes,
          updated_by: this.getCurrentUser(),
          created_by: existingPriority.created_by
        };

        response = await firstValueFrom(
          this.http.post<any>(`${this.kanbanPriorityApiUrl}/?action=apply_change`, requestBody)
        );
      } else {
        // Create new priority via atomic endpoint (this will shift existing priorities)
        const requestBody = {
          order_id: params.orderId,
          sales_order_number: params.salesOrderNumber,
          sales_order_line: params.salesOrderLine,
          priority: params.priority,
          notes: params.notes,
          created_by: this.getCurrentUser(),
          updated_by: this.getCurrentUser()
        };

        response = await firstValueFrom(
          this.http.post<any>(`${this.kanbanPriorityApiUrl}/?action=apply_change`, requestBody)
        );
      }

      console.log('✅ Real API response:', response);
      return {
        success: response.success || false,
        message: response.message || 'Priority updated',
        data: response.data || null
      };
    } catch (error: any) {
      console.error('❌ Real API error:', error);
      return {
        success: false,
        message: error.error?.error || error.message || 'Failed to update priority',
        data: null
      };
    }
  }

  private async getKanbanPrioritiesAPI(): Promise<PriorityResponse> {
    try {
      console.log('🌐 Making REAL API call to get kanban priorities');
      
      const response = await firstValueFrom(
        this.http.get<any>(`${this.kanbanPriorityApiUrl}/`)
      );

      console.log('✅ Real API kanban priorities retrieved:', response.data?.length || 0);
      return {
        success: response.success || false,
        message: response.message || 'Priorities retrieved',
        data: response.data || []
      };
    } catch (error: any) {
      console.error('❌ Real API error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get priorities',
        data: []
      };
    }
  }

  private async removeKanbanPriorityAPI(orderId: any): Promise<PriorityResponse> {
    try {
      console.log('🌐 Making REAL API call to remove kanban priority:', orderId);
      
      // For real API, we need to find the priority ID first
      const prioritiesResponse = await this.getKanbanPrioritiesAPI();
      if (!prioritiesResponse.success) {
        throw new Error('Failed to get priorities for removal');
      }

      const priority = prioritiesResponse.data?.find(p => p.order_id === orderId);
      if (!priority) {
        return {
          success: true,
          message: 'Priority not found (already removed)',
          data: null
        };
      }

      // Use atomic apply_change endpoint to remove and resequence
      const requestBody = {
        order_id: orderId,
        priority: 0,
        updated_by: this.getCurrentUser()
      };

      const response = await firstValueFrom(
        this.http.post<any>(`${this.kanbanPriorityApiUrl}/?action=apply_change`, requestBody)
      );

      console.log('✅ Real API kanban priority removed:', response);
      return {
        success: response.success || false,
        message: response.message || 'Priority removed',
        data: null
      };
    } catch (error: any) {
      console.error('❌ Real API error:', error);
      return {
        success: false,
        message: error.error?.error || error.message || 'Failed to remove priority',
        data: null
      };
    }
  }

  private async reorderKanbanPrioritiesAPI(priorityUpdates: Array<{id: string, priority_level: number}>): Promise<PriorityResponse> {
    try {
      console.log('🌐 Making REAL API call to reorder kanban priorities:', priorityUpdates);
      
      // The priorityUpdates array should already contain database IDs from the frontend
      const requestBody = {
        priorities: priorityUpdates,
        updated_by: this.getCurrentUser()
      };

      const response = await firstValueFrom(
        this.http.post<any>(`${this.kanbanPriorityApiUrl}/?action=reorder`, requestBody)
      );

      console.log('✅ Real API kanban reorder response:', response);
      return {
        success: response.success || false,
        message: response.message || 'Priorities reordered',
        data: response.data || null
      };
    } catch (error: any) {
      console.error('❌ Real API kanban reorder error:', error);
      return {
        success: false,
        message: error.error?.error || error.message || 'Failed to reorder priorities',
        data: null
      };
    }
  }

}