import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';
import { environment } from '@environments/environment';

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

  // Configuration flag: true for mock data, false for real API
  // In production, always use real API. In development, start with real API but allow mock mode for testing.
  private useMockData: boolean = false; // Always start with real API
  
  // Real API endpoint for shipping priorities
  private shippingPriorityApiUrl = 'shipping-priorities';
  
  // Real API endpoint for kanban priorities
  private kanbanPriorityApiUrl = 'kanban-priorities';
  
  // Mock data storage for shipping priorities
  private mockPriorities: Map<string, any> = new Map();
  
  // Mock data storage for kanban priorities
  private mockKanbanPriorities: Map<string, any> = new Map();

  constructor(http: HttpClient) {
    super(url, http);
    // Initialize with some sample mock data for testing (only if using mock mode)
    if (this.useMockData) {
      this.initializeMockData();
    }
  }

  // Get current user for API calls
  private getCurrentUser(): string {
    // For now, use a simple placeholder. This can be enhanced later.
    return 'api_user';
  }

  // Method to switch between mock and real API (useful for testing)
  setMockMode(useMock: boolean) {
    // In production, prevent switching to mock mode
    if (environment.production && useMock) {
      console.warn('🚫 Mock mode is disabled in production environment');
      return;
    }
    
    this.useMockData = useMock;
    if (useMock) {
      this.initializeMockData();
      console.log('🧪 Switched to MOCK mode for shipping priorities');
    } else {
      console.log('🌐 Switched to REAL API mode for shipping priorities');
    }
  }

  // Get current mode (for debugging)
  getCurrentMode() {
    return this.useMockData ? 'MOCK' : 'REAL';
  }

  getShipping = async () =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/Shipping/index?runOpenShippingReport`));

  getMasterProduction = async (routing) =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/MasterControl/index?getMasterProductionReportByRouting&routing=${routing}`));

  getPickingByWorkOrderId = async (workOrderId: number, filteredSections: any = ['Open Picks']) =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/MasterControl/index?workOrderNumber=${workOrderId}&filteredSections=${filteredSections}&getPickDetailsByWorkOrderNumber=1`));

  printWorkOrder(params: any) {
    return firstValueFrom(this.http.post(`/MasterControl/index`, params));
  }

  saveMisc(params: any) {
    return firstValueFrom(this.http.post(`/Shipping/index`, params));
  }

  private initializeMockData() {
    // Add some sample priority data for testing
    const samplePriorities = [
      {
        order_id: 'SO12345-001',
        sales_order_number: 'SO12345',
        sales_order_line: '001',
        priority_level: 1,
        notes: 'High priority customer order',
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        created_by: 'demo_user',
        updated_at: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        updated_by: 'demo_user',
        is_active: true
      },
      {
        order_id: 'SO12346-002',
        sales_order_number: 'SO12346',
        sales_order_line: '002',
        priority_level: 2,
        notes: 'Rush delivery required',
        created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        created_by: 'demo_user',
        updated_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updated_by: 'demo_user',
        is_active: true
      },
      {
        order_id: 'SO12347-001',
        sales_order_number: 'SO12347',
        sales_order_line: '001',
        priority_level: 3,
        notes: 'Production line dependency',
        created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        created_by: 'demo_user',
        updated_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        updated_by: 'demo_user',
        is_active: true
      }
    ];

    samplePriorities.forEach(priority => {
      this.mockPriorities.set(priority.order_id, priority);
    });

    console.log('Mock shipping priority data initialized with', this.mockPriorities.size, 'sample records');
  }

  updateShippingPriority(params: ShippingPriorityRequest) {
    if (this.useMockData) {
      return this.updateShippingPriorityMock(params);
    } else {
      return this.updateShippingPriorityAPI(params);
    }
  }

  getShippingPriorities() {
    if (this.useMockData) {
      return this.getShippingPrioritiesMock();
    } else {
      return this.getShippingPrioritiesAPI();
    }
  }

  removeShippingPriority(orderId: any) {
    if (this.useMockData) {
      return this.removeShippingPriorityMock(orderId);
    } else {
      return this.removeShippingPriorityAPI(orderId);
    }
  }

  // Bulk reorder priorities (for drag-and-drop)
  reorderShippingPriorities(priorityUpdates: Array<{id: string, priority_level: number}>) {
    if (this.useMockData) {
      return this.reorderShippingPrioritiesMock(priorityUpdates);
    } else {
      return this.reorderShippingPrioritiesAPI(priorityUpdates);
    }
  }

  // REAL API METHODS
  private async updateShippingPriorityAPI(params: ShippingPriorityRequest): Promise<ShippingPriorityResponse> {
    try {
      console.log('🌐 Making REAL API call to update shipping priority:', params);
      
      // First, check if priority already exists for this order
      const existingPriorities = await this.getShippingPrioritiesAPI();
      const existingPriority = existingPriorities.data?.find(p => p.order_id === params.orderId);
      
      if (params.priority === 0) {
        // Remove priority
        if (existingPriority) {
          return await this.removeShippingPriorityAPI(params.orderId);
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
          this.http.post<any>(`${this.shippingPriorityApiUrl}/?action=apply_change`, requestBody)
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
          this.http.post<any>(`${this.shippingPriorityApiUrl}/?action=apply_change`, requestBody)
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

  // MOCK API METHODS (for testing)
  private updateShippingPriorityMock(params: ShippingPriorityRequest) {
    return new Promise<ShippingPriorityResponse>((resolve) => {
      setTimeout(() => {
        try {
          const orderId = params.orderId;
          
          console.log('🧪 Mock API call - updating shipping priority:', params);
          
          // Check for duplicate priority (excluding current order)
          const existingOrderWithPriority = Array.from(this.mockPriorities.values())
            .find(p => p.priority_level === params.priority && p.order_id !== orderId);
          
          if (existingOrderWithPriority && params.priority > 0) {
            resolve({
              success: false,
              message: `Priority ${params.priority} is already assigned to order ${existingOrderWithPriority.order_id}`,
              data: null
            });
          } else {
            // Update or create priority
            if (params.priority > 0) {
              this.mockPriorities.set(orderId, {
                order_id: orderId,
                sales_order_number: params.salesOrderNumber,
                sales_order_line: params.salesOrderLine,
                priority_level: params.priority,
                notes: params.notes || '',
                created_at: new Date().toISOString(),
                created_by: 'mock_user',
                updated_at: new Date().toISOString(),
                updated_by: 'mock_user',
                is_active: true
              });
              
              console.log('🧪 Mock Priority Updated:', {
                orderId,
                priority: params.priority,
                totalPriorities: this.mockPriorities.size
              });
            } else {
              // Remove priority if set to 0
              this.mockPriorities.delete(orderId);
              console.log('🧪 Mock Priority Removed:', orderId);
            }
            
            resolve({
              success: true,
              message: 'Priority updated successfully',
              data: this.mockPriorities.get(orderId) || null
            });
          }
        } catch (error) {
          resolve({
            success: false,
            message: 'Failed to update priority',
            data: null
          });
        }
      }, 100); // Simulate network delay
    });
  }

  private getShippingPrioritiesMock() {
    return new Promise<ShippingPriorityResponse>((resolve) => {
      setTimeout(() => {
        const priorities = Array.from(this.mockPriorities.values());
        console.log('🧪 Mock Priorities Retrieved:', priorities.length);
        resolve({
          success: true,
          message: 'Priorities retrieved successfully',
          data: priorities
        });
      }, 50); // Simulate network delay
    });
  }

  private removeShippingPriorityMock(orderId: any) {
    return new Promise<ShippingPriorityResponse>((resolve) => {
      setTimeout(() => {
        const existed = this.mockPriorities.has(orderId);
        this.mockPriorities.delete(orderId);
        console.log('🧪 Mock Priority Removed:', orderId, 'existed:', existed);
        
        resolve({
          success: true,
          message: 'Priority removed successfully',
          data: null
        });
      }, 50);
    });
  }

  private reorderShippingPrioritiesMock(priorityUpdates: Array<{id: string, priority_level: number}>) {
    return new Promise<ShippingPriorityResponse>((resolve) => {
      setTimeout(() => {
        try {
          console.log('🧪 Mock API call - reordering shipping priorities:', priorityUpdates);
          
          // Update priorities in mock storage
          priorityUpdates.forEach(update => {
            const existingPriority = this.mockPriorities.get(update.id);
            if (existingPriority) {
              existingPriority.priority_level = update.priority_level;
              existingPriority.updated_at = new Date().toISOString();
              existingPriority.updated_by = 'mock_user';
            }
          });
          
          console.log('🧪 Mock priorities reordered successfully');
          resolve({
            success: true,
            message: 'Priorities reordered successfully',
            data: null
          });
        } catch (error) {
          resolve({
            success: false,
            message: 'Failed to reorder priorities',
            data: null
          });
        }
      }, 100);
    });
  }

  // =============================================================================
  // KANBAN PRIORITY METHODS
  // =============================================================================

  /**
   * Update kanban priority for an order
   */
  updateKanbanPriority(params: PriorityRequest) {
    if (this.useMockData) {
      return this.updateKanbanPriorityMock(params);
    } else {
      return this.updateKanbanPriorityAPI(params);
    }
  }

  /**
   * Get all kanban priorities
   */
  getKanbanPriorities() {
    if (this.useMockData) {
      return this.getKanbanPrioritiesMock();
    } else {
      return this.getKanbanPrioritiesAPI();
    }
  }

  /**
   * Remove kanban priority
   */
  removeKanbanPriority(orderId: any) {
    if (this.useMockData) {
      return this.removeKanbanPriorityMock(orderId);
    } else {
      return this.removeKanbanPriorityAPI(orderId);
    }
  }

  /**
   * Bulk reorder kanban priorities (for drag-and-drop)
   */
  reorderKanbanPriorities(priorityUpdates: Array<{id: string, priority_level: number}>) {
    if (this.useMockData) {
      return this.reorderKanbanPrioritiesMock(priorityUpdates);
    } else {
      return this.reorderKanbanPrioritiesAPI(priorityUpdates);
    }
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

  // KANBAN PRIORITY - MOCK API METHODS

  private updateKanbanPriorityMock(params: PriorityRequest) {
    return new Promise<PriorityResponse>((resolve) => {
      setTimeout(() => {
        try {
          const orderId = params.orderId;
          
          console.log('🧪 Mock API call - updating kanban priority:', params);
          
          // Check for duplicate priority (excluding current order)
          const existingOrderWithPriority = Array.from(this.mockKanbanPriorities.values())
            .find(p => p.priority_level === params.priority && p.order_id !== orderId);
          
          if (existingOrderWithPriority && params.priority > 0) {
            resolve({
              success: false,
              message: `Priority ${params.priority} is already assigned to order ${existingOrderWithPriority.order_id}`,
              data: null
            });
          } else {
            // Update or create priority
            if (params.priority > 0) {
              this.mockKanbanPriorities.set(orderId, {
                order_id: orderId,
                sales_order_number: params.salesOrderNumber,
                sales_order_line: params.salesOrderLine,
                priority_level: params.priority,
                notes: params.notes || '',
                created_at: new Date().toISOString(),
                created_by: 'mock_user',
                updated_at: new Date().toISOString(),
                updated_by: 'mock_user',
                is_active: true
              });
              
              console.log('🧪 Mock Kanban Priority Updated:', {
                orderId,
                priority: params.priority,
                totalPriorities: this.mockKanbanPriorities.size
              });
            } else {
              // Remove priority if set to 0
              this.mockKanbanPriorities.delete(orderId);
              console.log('🧪 Mock Kanban Priority Removed:', orderId);
            }
            
            resolve({
              success: true,
              message: 'Priority updated successfully',
              data: this.mockKanbanPriorities.get(orderId) || null
            });
          }
        } catch (error) {
          resolve({
            success: false,
            message: 'Failed to update priority',
            data: null
          });
        }
      }, 100);
    });
  }

  private getKanbanPrioritiesMock() {
    return new Promise<PriorityResponse>((resolve) => {
      setTimeout(() => {
        const priorities = Array.from(this.mockKanbanPriorities.values());
        console.log('🧪 Mock Kanban Priorities Retrieved:', priorities.length);
        resolve({
          success: true,
          message: 'Priorities retrieved successfully',
          data: priorities
        });
      }, 50);
    });
  }

  private removeKanbanPriorityMock(orderId: any) {
    return new Promise<PriorityResponse>((resolve) => {
      setTimeout(() => {
        const existed = this.mockKanbanPriorities.has(orderId);
        this.mockKanbanPriorities.delete(orderId);
        console.log('🧪 Mock Kanban Priority Removed:', orderId, 'existed:', existed);
        
        resolve({
          success: true,
          message: 'Priority removed successfully',
          data: null
        });
      }, 50);
    });
  }

  private reorderKanbanPrioritiesMock(priorityUpdates: Array<{id: string, priority_level: number}>) {
    return new Promise<PriorityResponse>((resolve) => {
      setTimeout(() => {
        try {
          console.log('🧪 Mock API call - reordering kanban priorities:', priorityUpdates);
          
          // Update priorities in mock storage
          priorityUpdates.forEach(update => {
            const existingPriority = this.mockKanbanPriorities.get(update.id);
            if (existingPriority) {
              existingPriority.priority_level = update.priority_level;
              existingPriority.updated_at = new Date().toISOString();
              existingPriority.updated_by = 'mock_user';
            }
          });
          
          console.log('🧪 Mock kanban priorities reordered successfully');
          resolve({
            success: true,
            message: 'Priorities reordered successfully',
            data: null
          });
        } catch (error) {
          resolve({
            success: false,
            message: 'Failed to reorder priorities',
            data: null
          });
        }
      }, 100);
    });
  }
}