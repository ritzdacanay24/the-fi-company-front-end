import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ItemService } from '../item/item.service';

// QAD Data Interfaces based on existing structure
export interface QADWorkOrder {
  wr_nbr: string;
  WR_DUE: string;
  WR_QTY_ORD: number;
  WR_QTY_COMP: number;
  WR_STATUS: string;
  pt_part?: string; // Part number (may need to be added to query)
}

export interface QADSalesOrder {
  sod_nbr: string;
  SOD_DUE_DATE: string;
  TOTALORDERED: number;
  TOTALPICKED: number;
  TOTALSHIPPED: number;
  OPENBALANCE: number;
  pt_part?: string; // Part number (may need to be added to query)
}

export interface AllocationAnalysis {
  partNumber: string;
  totalSoQuantity: number;
  totalWoQuantity: number;
  allocationGap: number; // negative = shortage, positive = excess
  unmatchedSalesOrders: QADSalesOrder[];
  availableWorkOrders: QADWorkOrder[];
  allocationStatus: 'SHORTAGE' | 'MATCHED' | 'EXCESS';
  criticalDueDate?: Date;
  recommendations: AllocationRecommendation[];
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
  isManualOverride: boolean;
  allocationType: 'AUTOMATIC' | 'MANUAL' | 'PRIORITY';
  lockedBy?: string;
  lockedDate?: Date;
  priority: number; // 1 = highest priority
}

export interface ManualAllocation {
  id?: number;
  woNumber: string;
  soNumber: string;
  partNumber: string;
  allocatedQuantity: number;
  allocationType: 'MANUAL' | 'PRIORITY';
  priority: number;
  lockedBy: string;
  lockedDate: Date;
  reason: string;
  isActive: boolean;
}

export interface AllocationAuditEntry {
  id: number;
  woNumber: string;
  soNumber: string;
  partNumber: string;
  action: 'ALLOCATE' | 'DEALLOCATE' | 'REASSIGN' | 'PRIORITY_CHANGE';
  previousAllocation?: string;
  newAllocation: string;
  quantity: number;
  userId: string;
  timestamp: Date;
  reason: string;
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
    private itemService: ItemService
  ) { }

  /**
   * Get all parts that have either work orders or sales orders
   */
  getAllPartsWithOrders(): Observable<string[]> {
    return this.http.get<string[]>('/operations/allocation/index.php?endpoint=parts-with-orders');
  }

  /**
   * Analyze allocation for a specific part using existing item service
   */
  analyzePartAllocation(partNumber: string): Observable<AllocationAnalysis> {
    return new Observable(observer => {
      this.itemService.getItemInfo(partNumber).then(data => {
        const analysis = this.processPartAllocation(partNumber, data);
        observer.next(analysis);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
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
   * Get allocation analysis directly from backend API
   */
  getBulkAllocationFromAPI(partNumbers: string[]): Observable<AllocationAnalysis[]> {
    return this.http.post<any[]>('/api/operations/allocation?endpoint=allocation-analysis', {
      partNumbers: partNumbers
    }).pipe(
      map(apiResults => apiResults.map(result => ({
        partNumber: result.partNumber,
        totalSoQuantity: result.totalSoQuantity,
        totalWoQuantity: result.totalWoQuantity,
        allocationGap: result.allocationGap,
        unmatchedSalesOrders: result.salesOrders || [],
        availableWorkOrders: result.workOrders || [],
        allocationStatus: result.allocationStatus,
        criticalDueDate: result.salesOrders?.length > 0 ? 
          new Date(Math.min(...result.salesOrders.map((so: any) => new Date(so.SOD_DUE_DATE).getTime()))) : 
          undefined,
        recommendations: this.generateAllocationRecommendations(
          result.partNumber, 
          result.workOrders || [], 
          result.salesOrders || []
        )
      })))
    );
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
    return this.http.get<any[]>('/api/operations/allocation?endpoint=unmatched-sales-orders').pipe(
      map(results => {
        // Group by part number
        const grouped = results.reduce((acc, order) => {
          if (!acc[order.pt_part]) {
            acc[order.pt_part] = [];
          }
          acc[order.pt_part].push({
            sod_nbr: order.sod_nbr,
            SOD_DUE_DATE: order.SOD_DUE_DATE,
            TOTALORDERED: order.TOTALORDERED,
            TOTALPICKED: 0,
            TOTALSHIPPED: order.TOTALSHIPPED,
            OPENBALANCE: order.OPENBALANCE,
            pt_part: order.pt_part
          });
          return acc;
        }, {} as any);

        return Object.keys(grouped).map(partNumber => ({
          partNumber,
          unmatchedOrders: grouped[partNumber],
          totalDemand: grouped[partNumber].reduce((sum: number, order: any) => sum + order.OPENBALANCE, 0),
          earliestDueDate: new Date(Math.min(...grouped[partNumber].map((o: any) => new Date(o.SOD_DUE_DATE).getTime())))
        })).sort((a, b) => a.earliestDueDate.getTime() - b.earliestDueDate.getTime());
      })
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
    return this.http.get<any[]>('/api/operations/allocation?endpoint=capacity-vs-demand').pipe(
      map(results => results.map(result => ({
        partNumber: result.part_number,
        totalDemand: Number(result.total_demand),
        totalCapacity: Number(result.total_capacity),
        gap: Number(result.gap),
        utilizationPercent: Number(result.utilization_percent),
        status: result.status as 'SHORTAGE' | 'MATCHED' | 'EXCESS'
      })))
    );
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
      allocationGap,
      unmatchedSalesOrders,
      availableWorkOrders: workOrders.filter(wo => (wo.WR_QTY_ORD - wo.WR_QTY_COMP) > 0),
      allocationStatus,
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
          woNumber: wo.wr_nbr,
          soNumber: so.sod_nbr,
          partNumber,
          recommendedQuantity: allocatableQuantity,
          confidence: this.calculateConfidence(new Date(so.SOD_DUE_DATE), new Date(wo.WR_DUE)),
          reason: this.getAllocationReason(new Date(so.SOD_DUE_DATE), new Date(wo.WR_DUE)),
          woCompletionDate: new Date(wo.WR_DUE),
          soDueDate: new Date(so.SOD_DUE_DATE),
          isManualOverride: false,
          allocationType: 'AUTOMATIC',
          priority: 999 // Default low priority for automatic allocations
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
      mergeMap(partNumbers => this.getBulkAllocationFromAPI(partNumbers)),
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

  // ==================== MANUAL ALLOCATION METHODS ====================

  /**
   * Create manual allocation override
   */
  createManualAllocation(allocation: Omit<ManualAllocation, 'id' | 'lockedDate' | 'isActive'>): Observable<ManualAllocation> {
    const newAllocation: ManualAllocation = {
      ...allocation,
      lockedDate: new Date(),
      isActive: true
    };

    return this.http.post<ManualAllocation>('/api/operations/allocation?endpoint=manual-allocations', newAllocation).pipe(
      mergeMap(result => {
        // Log the allocation change
        return this.logAllocationChange({
          woNumber: allocation.woNumber,
          soNumber: allocation.soNumber,
          partNumber: allocation.partNumber,
          action: 'ALLOCATE',
          newAllocation: `${allocation.woNumber} → ${allocation.soNumber}`,
          quantity: allocation.allocatedQuantity,
          userId: allocation.lockedBy,
          timestamp: new Date(),
          reason: allocation.reason
        }).pipe(map(() => result));
      })
    );
  }

  /**
   * Reassign work order from one sales order to another
   */
  reassignWorkOrder(
    woNumber: string, 
    fromSoNumber: string, 
    toSoNumber: string, 
    partNumber: string,
    quantity: number,
    priority: number,
    userId: string, 
    reason: string
  ): Observable<boolean> {
    
    const reassignRequest = {
      woNumber,
      fromSoNumber,
      toSoNumber,
      partNumber,
      quantity,
      priority,
      userId,
      reason
    };

    return this.http.post<{success: boolean}>('/api/operations/allocation?endpoint=reassign', reassignRequest).pipe(
      mergeMap(result => {
        if (result.success) {
          // Log the reassignment
          return this.logAllocationChange({
            woNumber,
            soNumber: toSoNumber,
            partNumber,
            action: 'REASSIGN',
            previousAllocation: `${woNumber} → ${fromSoNumber}`,
            newAllocation: `${woNumber} → ${toSoNumber}`,
            quantity,
            userId,
            timestamp: new Date(),
            reason
          }).pipe(map(() => true));
        }
        return new Observable<boolean>(observer => observer.next(false));
      })
    );
  }

  /**
   * Lock allocation to prevent automatic reallocation
   */
  lockAllocation(woNumber: string, soNumber: string, userId: string, reason: string): Observable<boolean> {
    return this.http.post<{success: boolean}>('/api/operations/allocation?endpoint=lock', {
      woNumber,
      soNumber,
      userId,
      reason,
      lockDate: new Date()
    }).pipe(map(result => result.success));
  }

  /**
   * Unlock allocation to allow automatic reallocation
   */
  unlockAllocation(woNumber: string, soNumber: string, userId: string): Observable<boolean> {
    return this.http.post<{success: boolean}>('/api/operations/allocation?endpoint=unlock', {
      woNumber,
      soNumber,
      userId,
      unlockDate: new Date()
    }).pipe(map(result => result.success));
  }

  /**
   * Get all manual allocations for a part
   */
  getManualAllocations(partNumber: string): Observable<ManualAllocation[]> {
    return this.http.get<ManualAllocation[]>(`/api/operations/allocation?endpoint=manual-allocations&partNumber=${partNumber}`);
  }

  /**
   * Update sales order priority
   */
  updateSalesOrderPriority(soNumber: string, priority: number, userId: string, reason: string): Observable<boolean> {
    return this.http.post<{success: boolean}>('/api/operations/allocation?endpoint=update-priority', {
      soNumber,
      priority,
      userId,
      reason,
      timestamp: new Date()
    }).pipe(
      mergeMap(result => {
        if (result.success) {
          return this.logAllocationChange({
            woNumber: '',
            soNumber,
            partNumber: '',
            action: 'PRIORITY_CHANGE',
            newAllocation: `Priority set to ${priority}`,
            quantity: 0,
            userId,
            timestamp: new Date(),
            reason
          }).pipe(map(() => true));
        }
        return new Observable<boolean>(observer => observer.next(false));
      })
    );
  }

  /**
   * Get allocation recommendations with manual overrides applied
   */
  getAllocationRecommendationsWithOverrides(partNumber: string): Observable<AllocationRecommendation[]> {
    return forkJoin({
      automatic: this.analyzePartAllocation(partNumber),
      manual: this.getManualAllocations(partNumber)
    }).pipe(
      map(({automatic, manual}) => {
        const recommendations = [...automatic.recommendations];
        
        // Apply manual overrides
        manual.filter(m => m.isActive).forEach(manualAlloc => {
          // Remove automatic allocations that conflict with manual ones
          const conflictIndex = recommendations.findIndex(r => 
            r.woNumber === manualAlloc.woNumber && r.soNumber !== manualAlloc.soNumber
          );
          
          if (conflictIndex >= 0) {
            recommendations.splice(conflictIndex, 1);
          }

          // Add manual allocation
          recommendations.push({
            woNumber: manualAlloc.woNumber,
            soNumber: manualAlloc.soNumber,
            partNumber: manualAlloc.partNumber,
            recommendedQuantity: manualAlloc.allocatedQuantity,
            confidence: 100, // Manual allocations are 100% confident
            reason: `Manual override: ${manualAlloc.reason}`,
            woCompletionDate: new Date(), // Would need to fetch from WO data
            soDueDate: new Date(), // Would need to fetch from SO data
            isManualOverride: true,
            allocationType: manualAlloc.allocationType,
            priority: manualAlloc.priority,
            lockedBy: manualAlloc.lockedBy,
            lockedDate: manualAlloc.lockedDate
          });
        });

        // Sort by priority (lower number = higher priority)
        return recommendations.sort((a, b) => a.priority - b.priority);
      })
    );
  }

  /**
   * Get allocation audit trail
   */
  getAllocationAuditTrail(partNumber?: string, woNumber?: string, soNumber?: string): Observable<AllocationAuditEntry[]> {
    const params = new URLSearchParams();
    if (partNumber) params.append('partNumber', partNumber);
    if (woNumber) params.append('woNumber', woNumber);
    if (soNumber) params.append('soNumber', soNumber);
    
    return this.http.get<AllocationAuditEntry[]>(`/api/operations/allocation?endpoint=audit-trail&${params.toString()}`);
  }

  /**
   * Log allocation change for audit trail
   */
  private logAllocationChange(entry: Omit<AllocationAuditEntry, 'id'>): Observable<AllocationAuditEntry> {
    return this.http.post<AllocationAuditEntry>('/api/operations/allocation?endpoint=audit-trail', entry);
  }
}