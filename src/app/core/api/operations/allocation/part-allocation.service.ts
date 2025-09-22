import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ItemService } from '../item/item.service';
import { QadService } from '../../qad/sales-order-search.service';

// QAD Data Interfaces based on existing structure
export interface QADWorkOrder {
  wo_nbr: string;
  WR_DUE: string;
  WR_QTY_ORD: number;
  WR_QTY_COMP: number;
  WR_STATUS: string;
  wo_part?: string; // Part number field
  available_qty?: number;
}

export interface QADSalesOrder {
  sod_nbr: string;
  SOD_DUE_DATE: string;
  TOTALORDERED: number;
  TOTALPICKED: number;
  TOTALSHIPPED: number;
  OPENBALANCE: number;
  sod_part?: string; // Part number field
}

export interface QADInventory {
  ld_loc: string;
  ld_part: string;
  ld_qty_oh: number;
  ld_site: string;
  ld_status: string;
  ld_qty_all: number;
  available_stock: number;
  fullDesc: string;
  ld_lot: string;
  stock_status?: 'AVAILABLE' | 'ALLOCATED' | 'OUT_OF_STOCK';
}

export interface AllocationAnalysis {
  partNumber: string;
  totalSoQuantity: number;
  totalWoQuantity: number;
  totalAvailableStock: number;
  totalSupply: number; // WO + Stock
  allocationGap: number; // negative = shortage, positive = excess
  stockCoverage: number; // How much demand stock can cover
  woNeeded: number; // Remaining demand after stock
  unmatchedSalesOrders: QADSalesOrder[];
  availableWorkOrders: QADWorkOrder[];
  inventory: QADInventory[];
  allocationStatus: 'SHORTAGE' | 'MATCHED' | 'EXCESS';
  stockStatus: 'SUFFICIENT_STOCK' | 'INSUFFICIENT_STOCK';
  criticalDueDate?: Date;
  recommendations: AllocationRecommendation[];
  
  // Traffic light decision system
  decisionSummary?: string; // Backend intelligent decision summary (e.g., "✅ COVERED: Stock sufficient for all orders")
  decisionCategory?: 'STOCK_SUFFICIENT' | 'URGENT_COVERED' | 'URGENT_SHORTAGE' | 'FUTURE_ONLY' | 'NO_DEMAND' | 'MANUAL_REVIEW';
  trafficLightStatus?: 'GREEN' | 'YELLOW' | 'RED' | 'GRAY'; // Visual indicator
  actionRecommendations?: {
    primary: string; // Main recommended action
    secondary?: string; // Alternative action
    urgent?: boolean; // Requires immediate attention
  };
}

export interface AllocationRecommendation {
  woNumber: string;
  soNumber: string;
  partNumber: string;
  recommendedQuantity: number;
  confidence: number;
  reason: string;
  woCompletionDate: Date;
  soDueDate: Date;
}

export interface ManualAllocation {
  id: number;
  woNumber: string;
  soNumber: string;
  partNumber: string;
  allocatedQuantity: number;
  allocationType: string;
  priority: number;
  lockedBy: string;
  lockedDate: Date;
  reason: string;
  isActive: boolean;
}

export interface PartAllocationSummary {
  totalParts: number;
  partsWithShortage: number;
  partsWithExcess: number;
  unmatchedSalesOrders: number;
  totalAllocationGap: number;
  criticalParts: string[]; // Parts with urgent shortages
}

@Injectable({
  providedIn: 'root'
})
export class PartAllocationService {

  constructor(
    private http: HttpClient,
    private itemService: ItemService,
    private qadService: QadService
  ) { }

  /**
   * Get all parts that have either work orders or sales orders
   * This would need a new backend endpoint that queries QAD for parts with open orders
   */
  getAllPartsWithOrders(): Observable<string[]> {
    // This endpoint would need to be created to query QAD for all parts with open WO or SO
    return this.http.get<string[]>('/operations/allocation/index.php?endpoint=parts-with-orders');
  }

  /**
   * Get allocation analysis for multiple parts at once
   */
  getAllocationAnalysis(partNumbers: string[]): Observable<any[]> {
    return this.http.post<any[]>('/operations/allocation/index.php?endpoint=allocation-analysis', {
      partNumbers: partNumbers
    });
  }

  /**
   * Analyze allocation for a specific part using backend API
   */
  analyzePartAllocation(partNumber: string): Observable<AllocationAnalysis> {
    return this.http.post<any>('/operations/allocation/index.php?endpoint=allocation-analysis', {
      partNumbers: [partNumber]
    }).pipe(
      map(response => {
        // The API returns an array, we want the first (and only) result
        const analysis = response[0];
        if (!analysis) {
          throw new Error(`No allocation analysis found for part ${partNumber}`);
        }
        
        return {
          partNumber: analysis.partNumber,
          totalSoQuantity: analysis.totalSoQuantity,
          totalWoQuantity: analysis.totalWoQuantity,
          allocationGap: analysis.allocationGap,
          unmatchedSalesOrders: analysis.salesOrders || [],
          availableWorkOrders: analysis.workOrders || [],
          allocationStatus: analysis.allocationStatus,
          criticalDueDate: analysis.workOrders?.[0]?.WR_DUE ? new Date(analysis.workOrders[0].WR_DUE) : undefined,
          recommendations: this.generateRecommendationsFromAnalysis(analysis)
        } as AllocationAnalysis;
      })
    );
  }

  /**
   * Get allocation recommendations with manual overrides for a specific part
   */
  getAllocationRecommendationsWithOverrides(partNumber: string): Observable<AllocationRecommendation[]> {
    // First get the allocation analysis
    return this.analyzePartAllocation(partNumber).pipe(
      map(analysis => analysis.recommendations)
    );
  }

  /**
   * Get bulk allocation analysis for multiple parts
   */
  analyzeBulkPartAllocation(partNumbers: string[]): Observable<AllocationAnalysis[]> {
    const analyses$ = partNumbers.map(partNumber => 
      this.analyzePartAllocation(partNumber)
    );
    
    return forkJoin(analyses$);
  }

  /**
   * Get sales orders without matching work orders across all parts
   */
  getUnmatchedSalesOrdersReport(): Observable<{
    partNumber: string;
    unmatchedOrders: QADSalesOrder[];
    totalDemand: number;
    earliestDueDate: Date;
  }[]> {
    return this.getAllPartsWithOrders().pipe(
      mergeMap(partNumbers => this.analyzeBulkPartAllocation(partNumbers)),
      map(analyses => 
        analyses
          .filter(analysis => analysis.unmatchedSalesOrders.length > 0)
          .map(analysis => ({
            partNumber: analysis.partNumber,
            unmatchedOrders: analysis.unmatchedSalesOrders,
            totalDemand: analysis.unmatchedSalesOrders.reduce((sum, order) => sum + order.OPENBALANCE, 0),
            earliestDueDate: new Date(Math.min(...analysis.unmatchedSalesOrders.map(o => new Date(o.SOD_DUE_DATE).getTime())))
          }))
          .sort((a, b) => a.earliestDueDate.getTime() - b.earliestDueDate.getTime())
      )
    );
  }

  /**
   * Get work order capacity vs demand report
   */
  getCapacityVsDemandReport(): Observable<{
    partNumber: string;
    totalDemand: number;
    totalCapacity: number;
    gap: number;
    utilizationPercent: number;
    status: 'SHORTAGE' | 'MATCHED' | 'EXCESS';
  }[]> {
    return this.getAllPartsWithOrders().pipe(
      mergeMap(partNumbers => this.analyzeBulkPartAllocation(partNumbers)),
      map(analyses => 
        analyses.map(analysis => ({
          partNumber: analysis.partNumber,
          totalDemand: analysis.totalSoQuantity,
          totalCapacity: analysis.totalWoQuantity,
          gap: analysis.allocationGap,
          utilizationPercent: analysis.totalWoQuantity > 0 ? 
            (analysis.totalSoQuantity / analysis.totalWoQuantity) * 100 : 0,
          status: analysis.allocationStatus
        }))
        .sort((a, b) => a.gap - b.gap) // Show shortages first
      )
    );
  }

  /**
   * Generate allocation recommendations from backend analysis data
   */
  private generateRecommendationsFromAnalysis(analysis: any): AllocationRecommendation[] {
    const recommendations: AllocationRecommendation[] = [];
    const workOrders = analysis.workOrders || [];
    const salesOrders = analysis.salesOrders || [];
    
    // Simple first-come-first-served allocation logic
    let woIndex = 0;
    for (const so of salesOrders) {
      let remainingDemand = so.OPENBALANCE;
      
      while (remainingDemand > 0 && woIndex < workOrders.length) {
        const wo = workOrders[woIndex];
        if (!wo.available_qty || wo.available_qty <= 0) {
          woIndex++;
          continue;
        }
        
        const allocatableQuantity = Math.min(remainingDemand, wo.available_qty);
        
        recommendations.push({
          woNumber: wo.wo_nbr,
          soNumber: so.sod_nbr,
          partNumber: analysis.partNumber,
          recommendedQuantity: allocatableQuantity,
          confidence: this.calculateConfidence(new Date(so.SOD_DUE_DATE), new Date(wo.WR_DUE)),
          reason: this.getAllocationReason(new Date(so.SOD_DUE_DATE), new Date(wo.WR_DUE)),
          woCompletionDate: new Date(wo.WR_DUE),
          soDueDate: new Date(so.SOD_DUE_DATE)
        });
        
        remainingDemand -= allocatableQuantity;
        wo.available_qty -= allocatableQuantity;
        
        if (wo.available_qty <= 0) {
          woIndex++;
        }
      }
      
      if (remainingDemand > 0) {
        // Create a shortage record
        recommendations.push({
          woNumber: 'SHORTAGE',
          soNumber: so.sod_nbr,
          partNumber: analysis.partNumber,
          recommendedQuantity: remainingDemand,
          confidence: 0,
          reason: 'Insufficient work order capacity',
          woCompletionDate: new Date(),
          soDueDate: new Date(so.SOD_DUE_DATE)
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Process allocation analysis from QAD data
   */
  private processPartAllocation(partNumber: string, qadData: any): AllocationAnalysis {
    const workOrders: QADWorkOrder[] = qadData.WOresults || [];
    const salesOrders: QADSalesOrder[] = qadData.orderDemand || [];

    // Calculate totals
    const totalWoQuantity = workOrders.reduce((sum, wo) => 
      sum + (wo.WR_QTY_ORD - wo.WR_QTY_COMP), 0); // Available quantity from WO
    
    const totalSoQuantity = salesOrders.reduce((sum, so) => 
      sum + so.OPENBALANCE, 0); // Open balance on sales orders

    const allocationGap = totalWoQuantity - totalSoQuantity;

    // Determine allocation status
    let allocationStatus: 'SHORTAGE' | 'MATCHED' | 'EXCESS';
    if (allocationGap < -5) { // Allow small tolerance
      allocationStatus = 'SHORTAGE';
    } else if (allocationGap > 5) {
      allocationStatus = 'EXCESS';
    } else {
      allocationStatus = 'MATCHED';
    }

    // Generate recommendations
    const recommendations = this.generateAllocationRecommendations(
      partNumber, workOrders, salesOrders
    );

    // Find unmatched sales orders (simplified logic - orders without enough WO coverage)
    const unmatchedSalesOrders = allocationStatus === 'SHORTAGE' ? 
      salesOrders.filter(so => so.OPENBALANCE > 0) : [];

    // Find critical due date
    const criticalDueDate = salesOrders.length > 0 ? 
      new Date(Math.min(...salesOrders.map(so => new Date(so.SOD_DUE_DATE).getTime()))) : 
      undefined;

    return {
      partNumber,
      totalSoQuantity,
      totalWoQuantity,
      totalAvailableStock: 0, // Will be populated by backend
      totalSupply: totalWoQuantity, // Will be updated with stock
      allocationGap,
      stockCoverage: 0, // Will be populated by backend
      woNeeded: totalSoQuantity, // Will be updated based on stock
      unmatchedSalesOrders,
      availableWorkOrders: workOrders.filter(wo => (wo.WR_QTY_ORD - wo.WR_QTY_COMP) > 0),
      inventory: [], // Will be populated by backend
      allocationStatus,
      stockStatus: 'INSUFFICIENT_STOCK', // Default, will be updated
      criticalDueDate,
      recommendations
    };
  }

  /**
   * Generate allocation recommendations using FIFO logic
   */
  private generateAllocationRecommendations(
    partNumber: string,
    workOrders: QADWorkOrder[],
    salesOrders: QADSalesOrder[]
  ): AllocationRecommendation[] {
    
    const recommendations: AllocationRecommendation[] = [];
    
    // Sort by due dates
    const sortedSO = [...salesOrders]
      .filter(so => so.OPENBALANCE > 0)
      .sort((a, b) => new Date(a.SOD_DUE_DATE).getTime() - new Date(b.SOD_DUE_DATE).getTime());
    
    const sortedWO = [...workOrders]
      .filter(wo => (wo.WR_QTY_ORD - wo.WR_QTY_COMP) > 0)
      .sort((a, b) => new Date(a.WR_DUE).getTime() - new Date(b.WR_DUE).getTime());

    // FIFO allocation
    const availableWO = sortedWO.map(wo => ({
      ...wo,
      availableQuantity: wo.WR_QTY_ORD - wo.WR_QTY_COMP
    }));

    let woIndex = 0;

    for (const so of sortedSO) {
      let remainingDemand = so.OPENBALANCE;

      while (remainingDemand > 0 && woIndex < availableWO.length) {
        const wo = availableWO[woIndex];

        if (wo.availableQuantity <= 0) {
          woIndex++;
          continue;
        }

        const allocatableQuantity = Math.min(remainingDemand, wo.availableQuantity);

        recommendations.push({
          woNumber: wo.wo_nbr,
          soNumber: so.sod_nbr,
          partNumber,
          recommendedQuantity: allocatableQuantity,
          confidence: this.calculateConfidence(new Date(so.SOD_DUE_DATE), new Date(wo.WR_DUE)),
          reason: this.getAllocationReason(new Date(so.SOD_DUE_DATE), new Date(wo.WR_DUE)),
          woCompletionDate: new Date(wo.WR_DUE),
          soDueDate: new Date(so.SOD_DUE_DATE)
        });

        remainingDemand -= allocatableQuantity;
        wo.availableQuantity -= allocatableQuantity;

        if (wo.availableQuantity <= 0) {
          woIndex++;
        }
      }
    }

    return recommendations;
  }

  /**
   * Calculate confidence score for allocation recommendation
   */
  private calculateConfidence(soDueDate: Date, woDueDate: Date): number {
    const timeDiff = soDueDate.getTime() - woDueDate.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    if (daysDiff >= 0) {
      return Math.min(100, 90 + (daysDiff * 2));
    } else {
      return Math.max(0, 50 - (Math.abs(daysDiff) * 5));
    }
  }

  /**
   * Generate reason for allocation recommendation
   */
  private getAllocationReason(soDueDate: Date, woDueDate: Date): string {
    const timeDiff = soDueDate.getTime() - woDueDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 7) {
      return `WO completes ${daysDiff} days before SO due date - Good buffer`;
    } else if (daysDiff >= 0) {
      return `WO completes ${daysDiff} days before SO due date - Tight timeline`;
    } else {
      return `WO completes ${Math.abs(daysDiff)} days after SO due date - Risk of delay`;
    }
  }

  /**
   * Get summary statistics for dashboard
   */
  getAllocationSummary(): Observable<PartAllocationSummary> {
    return this.getAllPartsWithOrders().pipe(
      mergeMap(partNumbers => this.analyzeBulkPartAllocation(partNumbers)),
      map(analyses => ({
        totalParts: analyses.length,
        partsWithShortage: analyses.filter(a => a.allocationStatus === 'SHORTAGE').length,
        partsWithExcess: analyses.filter(a => a.allocationStatus === 'EXCESS').length,
        unmatchedSalesOrders: analyses.reduce((sum, a) => sum + a.unmatchedSalesOrders.length, 0),
        totalAllocationGap: analyses.reduce((sum, a) => sum + Math.abs(a.allocationGap), 0),
        criticalParts: analyses
          .filter(a => a.allocationStatus === 'SHORTAGE' && a.criticalDueDate)
          .sort((a, b) => a.criticalDueDate!.getTime() - b.criticalDueDate!.getTime())
          .slice(0, 10)
          .map(a => a.partNumber)
      }))
    );
  }

  /**
   * Reassign work order from one sales order to another
   */
  reassignWorkOrder(data: any): Observable<any> {
    return this.http.post('/operations/allocation/index.php?endpoint=reassign', data);
  }

  /**
   * Update sales order priority
   */
  updateSalesOrderPriority(data: any): Observable<any> {
    return this.http.post('/operations/allocation/index.php?endpoint=update-priority', data);
  }

  /**
   * Lock allocation to prevent automatic reallocation
   */
  lockAllocation(data: any): Observable<any> {
    return this.http.post('/operations/allocation/index.php?endpoint=lock', data);
  }

  /**
   * Unlock allocation to allow automatic reallocation  
   */
  unlockAllocation(data: any): Observable<any> {
    return this.http.post('/operations/allocation/index.php?endpoint=unlock', data);
  }

  /**
   * Get inventory availability for specified parts
   */
  getInventoryAvailability(partNumbers: string[]): Observable<any> {
    return this.http.post('/operations/allocation/index.php?endpoint=inventory-availability', 
      { partNumbers });
  }
}