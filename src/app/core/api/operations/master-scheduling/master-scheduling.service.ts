import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

// Interfaces for type safety
interface ShippingPriorityRequest {
  orderId: any;
  salesOrderNumber: string;
  salesOrderLine?: string;
  priority: number;
  notes?: string;
}

interface ShippingPriorityResponse {
  success: boolean;
  message: string;
  orderId?: any;
  priority?: number;
  data?: any[];
}

let url = 'operations/master-scheduling';

@Injectable({
  providedIn: 'root'
})
export class MasterSchedulingService extends DataService<any> {

  // Mock data storage for shipping priorities
  private mockPriorities: Map<string, any> = new Map();

  constructor(http: HttpClient) {
    super(url, http);
    // Initialize with some sample mock data for testing
    this.initializeMockData();
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
    return new Promise<ShippingPriorityResponse>((resolve) => {
      setTimeout(() => {
        try {
          const orderId = params.orderId;
          
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
              
              console.log('Mock Priority Updated:', {
                orderId,
                priority: params.priority,
                totalPriorities: this.mockPriorities.size
              });
            } else {
              // Remove priority if set to 0
              this.mockPriorities.delete(orderId);
              console.log('Mock Priority Removed:', orderId);
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

  getShippingPriorities() {
    return new Promise<ShippingPriorityResponse>((resolve) => {
      setTimeout(() => {
        const priorities = Array.from(this.mockPriorities.values());
        console.log('Mock Priorities Retrieved:', priorities.length);
        resolve({
          success: true,
          message: 'Priorities retrieved successfully',
          data: priorities
        });
      }, 50); // Simulate network delay
    });
  }

  removeShippingPriority(orderId: any) {
    return new Promise<ShippingPriorityResponse>((resolve) => {
      setTimeout(() => {
        const existed = this.mockPriorities.has(orderId);
        this.mockPriorities.delete(orderId);
        console.log('Mock Priority Removed:', orderId, 'existed:', existed);
        
        resolve({
          success: true,
          message: 'Priority removed successfully',
          data: null
        });
      }, 50);
    });
  }
}
