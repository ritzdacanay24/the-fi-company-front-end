import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ShippingOrder {
  order_id: string;
  customer_name: string;
  customer_tier: string;
  product_type: string;
  order_date: string;
  ship_date: string;
  estimated_delivery: string;
  actual_delivery: string | null;
  status: string;
  priority: string;
  lead_time_days: number;
  order_value: number;
  weight_lbs: number;
  shipping_cost: number;
  carrier: string;
  tracking_number: string | null;
  destination_state: string;
  customer_id: string;
  sales_rep: string;
  notes: string | null;
}

export interface ShippingAnalytics {
  totalOrders: number;
  pastDueOrders: number;
  onTimeDeliveryRate: number;
  totalValue: number;
  averageLeadTime: number;
  priorityOrders: number;
  statusDistribution: { [key: string]: number };
  customerDistribution: { [key: string]: number };
  monthlyTrends: { month: string; orders: number; value: number }[];
  leadTimeDistribution: { range: string; count: number }[];
  carrierPerformance: { carrier: string; onTimeRate: number; avgCost: number }[];
  agingAnalysis: { range: string; count: number; value: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class ShippingDataService {
  private apiUrl = '/api/shipping';
  private ordersSubject = new BehaviorSubject<ShippingOrder[]>([]);
  private analyticsSubject = new BehaviorSubject<ShippingAnalytics | null>(null);

  public orders$ = this.ordersSubject.asObservable();
  public analytics$ = this.analyticsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Fetch shipping orders from backend
  getShippingOrders(): Observable<ShippingOrder[]> {
    return this.http.get<ShippingOrder[]>(`${this.apiUrl}/orders`).pipe(
      map(orders => {
        this.ordersSubject.next(orders);
        this.calculateAnalytics(orders);
        return orders;
      })
    );
  }

  // Get shipping analytics
  getShippingAnalytics(): Observable<ShippingAnalytics> {
    return this.http.get<ShippingAnalytics>(`${this.apiUrl}/analytics`);
  }

  // Get orders by date range
  getOrdersByDateRange(startDate: string, endDate: string): Observable<ShippingOrder[]> {
    return this.http.get<ShippingOrder[]>(`${this.apiUrl}/orders`, {
      params: { startDate, endDate }
    });
  }

  // Get orders by status
  getOrdersByStatus(status: string): Observable<ShippingOrder[]> {
    return this.http.get<ShippingOrder[]>(`${this.apiUrl}/orders/status/${status}`);
  }

  // Update order status
  updateOrderStatus(orderId: string, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/orders/${orderId}/status`, { status });
  }

  // Get customer shipping history
  getCustomerShippingHistory(customerId: string): Observable<ShippingOrder[]> {
    return this.http.get<ShippingOrder[]>(`${this.apiUrl}/customers/${customerId}/orders`);
  }

  // Calculate analytics from orders data
  private calculateAnalytics(orders: ShippingOrder[]): void {
    const analytics: ShippingAnalytics = {
      totalOrders: orders.length,
      pastDueOrders: 0,
      onTimeDeliveryRate: 0,
      totalValue: 0,
      averageLeadTime: 0,
      priorityOrders: 0,
      statusDistribution: {},
      customerDistribution: {},
      monthlyTrends: [],
      leadTimeDistribution: [],
      carrierPerformance: [],
      agingAnalysis: []
    };

    if (orders.length === 0) {
      this.analyticsSubject.next(analytics);
      return;
    }

    const currentDate = new Date();
    let onTimeDeliveries = 0;
    let totalLeadTime = 0;
    let completedOrders = 0;

    // Calculate basic metrics
    orders.forEach(order => {
      // Total value
      analytics.totalValue += order.order_value;

      // Lead time
      totalLeadTime += order.lead_time_days;

      // Priority orders
      if (order.priority === 'High' || order.priority === 'Critical') {
        analytics.priorityOrders++;
      }

      // Past due orders
      const estimatedDelivery = new Date(order.estimated_delivery);
      if (estimatedDelivery < currentDate && !order.actual_delivery) {
        analytics.pastDueOrders++;
      }

      // On-time delivery
      if (order.actual_delivery) {
        completedOrders++;
        const actualDelivery = new Date(order.actual_delivery);
        if (actualDelivery <= estimatedDelivery) {
          onTimeDeliveries++;
        }
      }

      // Status distribution
      analytics.statusDistribution[order.status] = 
        (analytics.statusDistribution[order.status] || 0) + 1;

      // Customer distribution
      analytics.customerDistribution[order.customer_name] = 
        (analytics.customerDistribution[order.customer_name] || 0) + 1;
    });

    // Calculate rates and averages
    analytics.onTimeDeliveryRate = completedOrders > 0 ? 
      (onTimeDeliveries / completedOrders) * 100 : 0;
    analytics.averageLeadTime = orders.length > 0 ? 
      totalLeadTime / orders.length : 0;

    // Calculate monthly trends
    analytics.monthlyTrends = this.calculateMonthlyTrends(orders);

    // Calculate lead time distribution
    analytics.leadTimeDistribution = this.calculateLeadTimeDistribution(orders);

    // Calculate carrier performance
    analytics.carrierPerformance = this.calculateCarrierPerformance(orders);

    // Calculate aging analysis
    analytics.agingAnalysis = this.calculateAgingAnalysis(orders);

    this.analyticsSubject.next(analytics);
  }

  private calculateMonthlyTrends(orders: ShippingOrder[]): { month: string; orders: number; value: number }[] {
    const monthlyData: { [key: string]: { orders: number; value: number } } = {};

    orders.forEach(order => {
      const orderDate = new Date(order.order_date);
      const monthKey = `${orderDate.getFullYear()}-${(orderDate.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { orders: 0, value: 0 };
      }
      
      monthlyData[monthKey].orders++;
      monthlyData[monthKey].value += order.order_value;
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }

  private calculateLeadTimeDistribution(orders: ShippingOrder[]): { range: string; count: number }[] {
    const ranges = [
      { min: 0, max: 7, label: '0-7 days' },
      { min: 8, max: 14, label: '8-14 days' },
      { min: 15, max: 21, label: '15-21 days' },
      { min: 22, max: 30, label: '22-30 days' },
      { min: 31, max: Infinity, label: '30+ days' }
    ];

    return ranges.map(range => ({
      range: range.label,
      count: orders.filter(order => 
        order.lead_time_days >= range.min && order.lead_time_days <= range.max
      ).length
    }));
  }

  private calculateCarrierPerformance(orders: ShippingOrder[]): { carrier: string; onTimeRate: number; avgCost: number }[] {
    const carrierData: { [key: string]: { total: number; onTime: number; totalCost: number } } = {};

    orders.forEach(order => {
      if (!carrierData[order.carrier]) {
        carrierData[order.carrier] = { total: 0, onTime: 0, totalCost: 0 };
      }

      if (order.actual_delivery) {
        carrierData[order.carrier].total++;
        carrierData[order.carrier].totalCost += order.shipping_cost;

        const estimatedDelivery = new Date(order.estimated_delivery);
        const actualDelivery = new Date(order.actual_delivery);
        if (actualDelivery <= estimatedDelivery) {
          carrierData[order.carrier].onTime++;
        }
      }
    });

    return Object.entries(carrierData)
      .filter(([_, data]) => data.total > 0)
      .map(([carrier, data]) => ({
        carrier,
        onTimeRate: (data.onTime / data.total) * 100,
        avgCost: data.totalCost / data.total
      }))
      .sort((a, b) => b.onTimeRate - a.onTimeRate);
  }

  private calculateAgingAnalysis(orders: ShippingOrder[]): { range: string; count: number; value: number }[] {
    const currentDate = new Date();
    const ranges = [
      { min: 0, max: 30, label: '0-30 days' },
      { min: 31, max: 60, label: '31-60 days' },
      { min: 61, max: 90, label: '61-90 days' },
      { min: 91, max: Infinity, label: '90+ days' }
    ];

    return ranges.map(range => {
      const ordersInRange = orders.filter(order => {
        if (order.actual_delivery) return false; // Only pending orders
        
        const orderDate = new Date(order.order_date);
        const daysDiff = Math.floor((currentDate.getTime() - orderDate.getTime()) / (1000 * 3600 * 24));
        
        return daysDiff >= range.min && daysDiff <= range.max;
      });

      return {
        range: range.label,
        count: ordersInRange.length,
        value: ordersInRange.reduce((sum, order) => sum + order.order_value, 0)
      };
    });
  }

  // Sample data for testing (remove in production)
  getSampleData(): ShippingOrder[] {
    return [
      {
        order_id: "ORD-2024-001",
        customer_name: "TechCorp Industries",
        customer_tier: "Enterprise",
        product_type: "Electronics",
        order_date: "2024-01-15",
        ship_date: "2024-01-20",
        estimated_delivery: "2024-01-25",
        actual_delivery: "2024-01-24",
        status: "Delivered",
        priority: "High",
        lead_time_days: 10,
        order_value: 75000,
        weight_lbs: 150,
        shipping_cost: 850,
        carrier: "UPS",
        tracking_number: "1Z123456789",
        destination_state: "CA",
        customer_id: "CUST-001",
        sales_rep: "John Smith",
        notes: "Expedited shipping requested"
      },
      {
        order_id: "ORD-2024-002",
        customer_name: "Manufacturing Plus",
        customer_tier: "Premium",
        product_type: "Industrial Parts",
        order_date: "2024-01-18",
        ship_date: "2024-01-22",
        estimated_delivery: "2024-01-28",
        actual_delivery: null,
        status: "In Transit",
        priority: "Medium",
        lead_time_days: 8,
        order_value: 42000,
        weight_lbs: 300,
        shipping_cost: 1200,
        carrier: "FedEx",
        tracking_number: "FX987654321",
        destination_state: "TX",
        customer_id: "CUST-002",
        sales_rep: "Sarah Johnson",
        notes: null
      },
      {
        order_id: "ORD-2024-003",
        customer_name: "Global Solutions",
        customer_tier: "Standard",
        product_type: "Software Licenses",
        order_date: "2024-01-10",
        ship_date: "2024-01-12",
        estimated_delivery: "2024-01-20",
        actual_delivery: "2024-01-22",
        status: "Delivered",
        priority: "Low",
        lead_time_days: 12,
        order_value: 15000,
        weight_lbs: 5,
        shipping_cost: 25,
        carrier: "Digital Delivery",
        tracking_number: null,
        destination_state: "NY",
        customer_id: "CUST-003",
        sales_rep: "Mike Davis",
        notes: "Digital delivery via email"
      }
    ];
  }
}