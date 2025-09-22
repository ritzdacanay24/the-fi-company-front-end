import { Component, Input, OnInit, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridOptions, GridApi, RowDropZoneParams } from 'ag-grid-community';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { PartAllocationService, AllocationRecommendation, ManualAllocation } from '../../../core/api/operations/allocation/part-allocation.service';

interface AllocationTableRow {
    id: string;
    partNumber: string;
    totalWoQuantity: number;
    totalSoQuantity: number;
    allocationGap: number;
    allocationStatus: 'SHORTAGE' | 'MATCHED' | 'EXCESS';
    allocations?: AllocationDetailRow[]; // Detail rows
    
    // Traffic light decision system
    decisionSummary?: string;
    decisionCategory?: 'STOCK_SUFFICIENT' | 'URGENT_COVERED' | 'URGENT_SHORTAGE' | 'FUTURE_ONLY' | 'NO_DEMAND' | 'MANUAL_REVIEW';
    trafficLightStatus?: 'GREEN' | 'YELLOW' | 'RED' | 'GRAY';
    actionRecommendations?: {
        primary: string;
        secondary?: string;
        urgent?: boolean;
    };
}

interface AllocationDetailRow {
    id: string;
    woNumber: string;
    woQuantity: number;
    woAvailable: number;
    woRemainingQty?: number; // Track progressive consumption
    woDueDate: Date;
    woStatus: string;
    soNumber: string;
    soQuantity: number;
    soDueDate: Date;
    soStatus: string;
    allocatedQuantity: number;
    allocationType: 'AUTOMATIC' | 'MANUAL' | 'PRIORITY';
    priority: number;
    isLocked: boolean;
    timingRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendation?: string;
}

@Component({
    selector: 'app-allocation-table',
    standalone: true,
    imports: [CommonModule, AgGridModule],
    template: `
    <div class="allocation-container">
      <div class="allocation-header">
        <h3>Work Order to Sales Order Allocation</h3>
        <div class="allocation-controls">
          <button class="btn btn-primary" (click)="refreshAllocations()">
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
          <button class="btn btn-success" (click)="saveAllocations()">
            <i class="fas fa-save"></i> Save Changes
          </button>
          <button class="btn btn-warning" (click)="showAuditTrail()">
            <i class="fas fa-history"></i> Audit Trail
          </button>
        </div>
      </div>
      
      <div class="allocation-summary" *ngIf="allocationSummary">
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-label">Total Allocations</div>
            <div class="card-value">{{ totalAllocations }}</div>
          </div>
          <div class="summary-card manual">
            <div class="card-label">Manual Overrides</div>
            <div class="card-value">{{ manualAllocations }}</div>
          </div>
          <div class="summary-card locked">
            <div class="card-label">Locked</div>
            <div class="card-value">{{ lockedAllocations }}</div>
          </div>
          <div class="summary-card high-risk">
            <div class="card-label">High Risk</div>
            <div class="card-value">{{ highRiskAllocations }}</div>
          </div>
        </div>
      </div>

      <ag-grid-angular
        class="ag-theme-quartz no-border"
        style="width: 100%;height: calc(100vh - 300px);"
        [rowData]="rowData"
        [columnDefs]="columnDefs"
        [gridOptions]="gridOptions"
        [defaultColDef]="defaultColDef"
        (gridReady)="onGridReady($event)"
        (cellValueChanged)="onCellValueChanged($event)"
        (rowDragEnd)="onRowDragEnd($event)"
        [rowSelection]="'multiple'"
        [rowDragManaged]="true"
        [suppressRowClickSelection]="true"
        [enableRangeSelection]="true"
        [enableCellChangeFlash]="true"
        [animateRows]="true">
      </ag-grid-angular>
    </div>
    `,
    
})
export class AllocationTableComponent implements OnInit, OnDestroy, AfterViewInit {
    @Input() partNumber: string = '';
    @Input() showAllParts: boolean = true;

    private destroy$ = new Subject<void>();

    rowData: AllocationTableRow[] = [];
    columnDefs: ColDef[] = [];
    detailColumnDefs: ColDef[] = [];
    defaultColDef: ColDef = {
        sortable: true,
        filter: true,
        resizable: true,
        editable: false
    };

    gridOptions: GridOptions = {};
    gridApi!: GridApi;

    allocationSummary = true;
    totalAllocations = 0;
    manualAllocations = 0;
    lockedAllocations = 0;
    highRiskAllocations = 0;

    constructor(private allocationService: PartAllocationService) {
        this.setupColumnDefs();
        this.setupGridOptions();
    }

    ngOnInit() {
        this.setupColumnDefs();
        this.setupGridOptions();
        this.loadAllocations();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private setupColumnDefs() {
        // Master row columns - part-level summary
        this.columnDefs = [
            {
                headerName: 'Part Number',
                field: 'partNumber',
                width: 150,
                pinned: 'left',
                cellClass: 'font-weight-bold',
                cellRenderer: 'agGroupCellRenderer', // Enables expand/collapse for master-detail
                showRowGroup: true
            },
            {
                headerName: 'WO Total',
                field: 'totalWoQuantity',
                width: 100,
                type: 'numericColumn',
                cellClass: 'text-center'
            },
            {
                headerName: 'SO Total',
                field: 'totalSoQuantity',
                width: 100,
                type: 'numericColumn',
                cellClass: 'text-center'
            },
            {
                headerName: 'Gap',
                field: 'allocationGap',
                width: 100,
                type: 'numericColumn',
                cellClass: 'text-center',
                cellStyle: (params: any) => {
                    const value = params.value;
                    if (value < 0) return { backgroundColor: '#ffebee', color: '#c62828' };
                    if (value > 0) return { backgroundColor: '#e8f5e8', color: '#2e7d32' };
                    return { backgroundColor: '#fff3e0', color: '#ef6c00' };
                }
            },
            {
                headerName: 'Status',
                field: 'allocationStatus',
                width: 120,
                cellRenderer: (params: any) => {
                    const badges: { [key: string]: string } = {
                        'SHORTAGE': '<span class="badge badge-danger">SHORTAGE</span>',
                        'EXCESS': '<span class="badge badge-success">EXCESS</span>',
                        'MATCHED': '<span class="badge badge-warning">MATCHED</span>'
                    };
                    return badges[params.value] || params.value;
                }
            },
            {
                headerName: 'Decision Summary',
                field: 'decisionSummary',
                width: 250,
                cellRenderer: (params: any) => {
                    const summary = params.value || '';
                    const trafficLight = params.data.trafficLightStatus || 'GRAY';
                    
                    // Color coding based on traffic light status
                    const colorMap: { [key: string]: string } = {
                        'GREEN': '#4caf50',   // Success green
                        'YELLOW': '#ff9800',  // Warning orange  
                        'RED': '#f44336',     // Error red
                        'GRAY': '#9e9e9e'     // Neutral gray
                    };
                    
                    const bgColorMap: { [key: string]: string } = {
                        'GREEN': '#e8f5e8',
                        'YELLOW': '#fff3e0', 
                        'RED': '#ffebee',
                        'GRAY': '#f5f5f5'
                    };
                    
                    return `
                        <div style="
                            display: flex; 
                            align-items: center; 
                            background-color: ${bgColorMap[trafficLight]}; 
                            color: ${colorMap[trafficLight]};
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-weight: 500;
                        ">
                            <span style="margin-right: 6px;">●</span>
                            ${summary}
                        </div>
                    `;
                },
                tooltipField: 'decisionSummary'
            },
            {
                headerName: 'Actions',
                field: 'actions',
                width: 200,
                cellRenderer: (params: any) => {
                    const data = params.data;
                    const category = data.decisionCategory || 'MANUAL_REVIEW';
                    const urgent = data.actionRecommendations?.urgent || false;
                    
                    // Define action buttons based on decision category
                    let buttons = '';
                    
                    switch (category) {
                        case 'STOCK_SUFFICIENT':
                            buttons = `
                                <button class="btn btn-sm btn-success me-1" onclick="window.useStockOnly('${data.partNumber}')">
                                    <i class="fas fa-check"></i> Use Stock
                                </button>
                            `;
                            break;
                            
                        case 'URGENT_SHORTAGE':
                            buttons = `
                                <button class="btn btn-sm btn-danger me-1" onclick="window.createUrgentWO('${data.partNumber}')">
                                    <i class="fas fa-bolt"></i> Create WO Now
                                </button>
                            `;
                            break;
                            
                        case 'URGENT_COVERED':
                            buttons = `
                                <button class="btn btn-sm btn-warning me-1" onclick="window.scheduleWOLater('${data.partNumber}')">
                                    <i class="fas fa-calendar"></i> Schedule Later
                                </button>
                                <button class="btn btn-sm btn-success me-1" onclick="window.useStockFirst('${data.partNumber}')">
                                    <i class="fas fa-box"></i> Use Stock
                                </button>
                            `;
                            break;
                            
                        case 'FUTURE_ONLY':
                            buttons = `
                                <button class="btn btn-sm btn-info me-1" onclick="window.scheduleFutureWO('${data.partNumber}')">
                                    <i class="fas fa-clock"></i> Plan WO
                                </button>
                            `;
                            break;
                            
                        case 'NO_DEMAND':
                            buttons = `
                                <button class="btn btn-sm btn-secondary me-1" onclick="window.reviewExistingWO('${data.partNumber}')">
                                    <i class="fas fa-search"></i> Review WO
                                </button>
                            `;
                            break;
                            
                        default:
                            buttons = `
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="window.manualReview('${data.partNumber}')">
                                    <i class="fas fa-eye"></i> Review
                                </button>
                            `;
                    }
                    
                    return `<div class="d-flex">${buttons}</div>`;
                },
                pinned: 'right'
            }
        ];

        // Detail column definitions for the expandable rows
        this.detailColumnDefs = [
            {
                headerName: 'Work Order',
                field: 'woNumber',
                width: 140,
                cellRenderer: (params: any) => {
                    const woNumber = params.value;
                    const data = params.data;
                    
                    // Check if this is a shortage, excess, or normal allocation
                    if (woNumber.includes('SHORTAGE') || woNumber.includes('URGENT SHORTAGE') || woNumber.includes('FUTURE NEED')) {
                        return `<span class="text-danger fw-bold">${woNumber}</span>`;
                    }
                    
                    if (!data.soNumber) {
                        // This is excess capacity
                        return `<span class="text-success">${woNumber}</span> <small class="text-muted">(excess)</small>`;
                    }
                    
                    // Normal allocation - show if this WO is part of multi-WO fulfillment
                    const isPartOfMultiWO = this.isPartOfMultiWorkOrderFulfillment(data, params.api?.getRowNode(params.node.parent?.id)?.data);
                    
                    if (isPartOfMultiWO.isMulti) {
                        return `
                            <span class="text-primary fw-bold">${woNumber}</span>
                            <br>
                            <small class="text-info">
                                <i class="fas fa-link me-1"></i>
                                Part ${isPartOfMultiWO.sequence} of ${isPartOfMultiWO.total} WOs for SO ${data.soNumber}
                            </small>
                        `;
                    }
                    
                    return `<span class="text-primary">${woNumber}</span>`;
                },
                cellClass: 'text-primary'
            },
            {
                headerName: 'WO Qty',
                field: 'woQuantity',
                width: 80,
                type: 'numericColumn'
            },
            {
                headerName: 'WO Available',
                field: 'woAvailable',
                width: 100,
                type: 'numericColumn'
            },
            {
                headerName: 'Remaining Qty',
                field: 'woRemainingQty',
                width: 100,
                type: 'numericColumn',
                cellRenderer: (params: any) => {
                    const remaining = params.value;
                    const data = params.data;
                    
                    // Show different content based on allocation type
                    if (data.woNumber.includes('SHORTAGE') || data.woNumber.includes('URGENT SHORTAGE') || data.woNumber.includes('FUTURE NEED')) {
                        return '<span class="text-muted">N/A</span>';
                    }
                    
                    if (!data.soNumber) {
                        // This is excess capacity - show the remaining quantity
                        return `<span class="text-success">${data.woAvailable || 0}</span>`;
                    }
                    
                    if (remaining === undefined || remaining === null) {
                        // Fallback to woAvailable for allocations without remaining qty tracked
                        const fallbackRemaining = (data.woAvailable || 0) - (data.allocatedQuantity || 0);
                        return `<span class="text-info">${Math.max(0, fallbackRemaining)}</span>`;
                    }
                    
                    // Color coding based on remaining quantity
                    let className = 'text-muted';
                    if (remaining === 0) {
                        className = 'text-danger fw-bold'; // Fully consumed
                    } else if (remaining < (data.woAvailable || 0) * 0.2) {
                        className = 'text-warning fw-bold'; // Low remaining
                    } else {
                        className = 'text-success'; // Good remaining capacity
                    }
                    
                    return `<span class="${className}">${remaining}</span>`;
                },
                tooltipValueGetter: (params: any) => {
                    const remaining = params.value;
                    const allocated = params.data.allocatedQuantity;
                    const available = params.data.woAvailable;
                    const data = params.data;
                    
                    if (data.woNumber.includes('SHORTAGE')) {
                        return 'Shortage - no work order capacity available';
                    }
                    
                    if (!data.soNumber) {
                        return `Excess capacity: ${available} units not allocated to any sales order`;
                    }
                    
                    if (remaining !== undefined && remaining !== null) {
                        return `After allocating ${allocated} units, ${remaining} units remain available from original ${available}`;
                    }
                    
                    const fallbackRemaining = Math.max(0, (available || 0) - (allocated || 0));
                    return `Calculated remaining: ${fallbackRemaining} units (${available} available - ${allocated} allocated)`;
                }
            },
            {
                headerName: 'WO Due',
                field: 'woDueDate',
                width: 100,
                cellRenderer: (params: any) => {
                    return params.value ? new Date(params.value).toLocaleDateString() : '';
                }
            },
            {
                headerName: 'Sales Order',
                field: 'soNumber',
                width: 120,
                cellClass: 'text-info'
            },
            {
                headerName: 'SO Qty',
                field: 'soQuantity',
                width: 80,
                type: 'numericColumn'
            },
            {
                headerName: 'SO Due',
                field: 'soDueDate',
                width: 100,
                cellRenderer: (params: any) => {
                    return params.value ? new Date(params.value).toLocaleDateString() : '';
                }
            },
            {
                headerName: 'Allocated',
                field: 'allocatedQuantity',
                width: 100,
                type: 'numericColumn',
                editable: true,
                cellClass: 'text-center',
                cellRenderer: (params: any) => {
                    const allocated = params.value || 0;
                    const data = params.data;
                    
                    if (!data.soNumber || allocated === 0) {
                        return allocated.toString();
                    }
                    
                    // For multi-WO fulfillment, show progress
                    const masterRowData = params.api?.getRowNode(params.node.parent?.id)?.data;
                    if (masterRowData?.allocations) {
                        const sameSOAllocations = masterRowData.allocations.filter((allocation: any) => 
                            allocation.soNumber === data.soNumber && 
                            allocation.allocatedQuantity > 0 &&
                            !allocation.woNumber.includes('SHORTAGE') &&
                            !allocation.woNumber.includes('EXCESS')
                        );
                        
                        if (sameSOAllocations.length > 1) {
                            const totalAllocated = sameSOAllocations.reduce((sum: number, allocation: any) => 
                                sum + allocation.allocatedQuantity, 0);
                            const totalNeeded = parseFloat(data.soQuantity || '0');
                            const progressPercent = Math.round((totalAllocated / totalNeeded) * 100);
                            
                            return `
                                <div class="text-center">
                                    <div class="fw-bold">${allocated}</div>
                                    <small class="text-muted">
                                        ${totalAllocated}/${totalNeeded} (${progressPercent}%)
                                    </small>
                                </div>
                            `;
                        }
                    }
                    
                    return allocated.toString();
                }
            },
            {
                headerName: 'Priority',
                field: 'priority',
                width: 80,
                type: 'numericColumn',
                editable: true
            },
            {
                headerName: 'Type',
                field: 'allocationType',
                width: 90,
                cellRenderer: (params: any) => {
                    const badges: { [key: string]: string } = {
                        'AUTOMATIC': '<span class="badge badge-primary">AUTO</span>',
                        'MANUAL': '<span class="badge badge-warning">MANUAL</span>',
                        'PRIORITY': '<span class="badge badge-success">PRIORITY</span>'
                    };
                    return badges[params.value] || params.value;
                }
            },
            {
                headerName: 'Risk',
                field: 'timingRisk',
                width: 80,
                cellRenderer: (params: any) => {
                    const icons: { [key: string]: string } = {
                        'LOW': '<i class="fas fa-check-circle text-success"></i>',
                        'MEDIUM': '<i class="fas fa-exclamation-triangle text-warning"></i>',
                        'HIGH': '<i class="fas fa-times-circle text-danger"></i>'
                    };
                    return icons[params.value] || '';
                }
            },
            {
                headerName: 'Recommendation',
                field: 'recommendation',
                width: 250,
                tooltipField: 'recommendation'
            }
        ];
    }

    private setupGridOptions() {
        this.gridOptions = {
            enableCellTextSelection: true,
            suppressMenuHide: true,
            rowHeight: 40,
            headerHeight: 40,
            defaultColDef: this.defaultColDef,
            getRowId: (params) => params.data.id,
            
            // Master-Detail configuration
            masterDetail: true,
            detailCellRendererParams: {
                detailGridOptions: {
                    columnDefs: this.detailColumnDefs,
                    defaultColDef: this.defaultColDef,
                    rowHeight: 35,
                    domLayout: 'autoHeight' // Auto-size to content height
                },
                getDetailRowData: (params) => {
                    params.successCallback(params.data.allocations || []);
                }
            },
            detailRowAutoHeight: true, // Enable auto-height for detail rows
            isRowMaster: (dataItem) => {
                return dataItem && dataItem.allocations && dataItem.allocations.length > 0;
            },
            
            rowClassRules: {
                'row-shortage': (params) => params.data.allocationStatus === 'SHORTAGE',
                'row-excess': (params) => params.data.allocationStatus === 'EXCESS',
                'row-matched': (params) => params.data.allocationStatus === 'MATCHED'
            }
        };
    }

    onGridReady(params: any) {
        this.gridApi = params.api;
        this.gridApi.sizeColumnsToFit();
    }

    loadAllocations() {
        if (this.partNumber) {
            this.loadPartAllocations();
        } else if (this.showAllParts) {
            this.loadAllAllocations();
        }
    }

    private loadPartAllocations() {
        this.allocationService.getAllocationRecommendationsWithOverrides(this.partNumber)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (recommendations) => {
                    this.rowData = this.transformRecommendationsToRows(recommendations);
                    this.updateSummaryStats();
                },
                error: (error) => {
                    console.error('Error loading allocations:', error);
                }
            });
    }

    private loadAllAllocations() {
        this.allocationService.getAllPartsWithOrders()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (partNumbers) => {
                    console.log('Retrieved part numbers:', partNumbers);
                    
                    if (partNumbers.length === 0) {
                        this.rowData = [];
                        return;
                    }

                    // Call allocation-analysis API directly with all part numbers
                    this.allocationService.getAllocationAnalysis(partNumbers)
                        .pipe(takeUntil(this.destroy$))
                        .subscribe({
                            next: (analysisResults) => {
                                console.log('Analysis results:', analysisResults);
                                this.rowData = this.transformAnalysisToRows(analysisResults);
                                this.updateSummaryStats();
                                console.log(`Loaded ${this.rowData.length} allocation rows`);
                            },
                            error: (error) => {
                                console.error('Error loading allocation analysis:', error);
                                this.rowData = [];
                            }
                        });
                },
                error: (error) => {
                    console.error('Error loading part numbers:', error);
                    this.rowData = [];
                }
            });
    }

    private transformRecommendationsToRows(recommendations: AllocationRecommendation[]): AllocationTableRow[] {
        // Group recommendations by part number
        const partGroups = new Map<string, AllocationRecommendation[]>();
        
        recommendations.forEach(rec => {
            if (!partGroups.has(rec.partNumber)) {
                partGroups.set(rec.partNumber, []);
            }
            partGroups.get(rec.partNumber)!.push(rec);
        });
        
        // Create master rows with details
        return Array.from(partGroups.entries()).map(([partNumber, recs]) => {
            const details: AllocationDetailRow[] = recs.map((rec, index) => ({
                id: `alloc-${index}`,
                woNumber: rec.woNumber,
                woQuantity: 0, // Would need to fetch from work order data
                woAvailable: rec.recommendedQuantity,
                woDueDate: rec.woCompletionDate,
                woStatus: 'Released',
                soNumber: rec.soNumber,
                soQuantity: 0, // Would need to fetch from sales order data
                soDueDate: rec.soDueDate,
                soStatus: '',
                allocatedQuantity: rec.recommendedQuantity,
                allocationType: 'AUTOMATIC' as const,
                priority: 1,
                isLocked: false,
                timingRisk: this.calculateTimingRisk(rec.woCompletionDate, rec.soDueDate),
                recommendation: rec.reason
            }));
            
            const totalWoQuantity = details.reduce((sum, d) => sum + d.woAvailable, 0);
            const totalSoQuantity = details.reduce((sum, d) => sum + d.soQuantity, 0);
            const allocationGap = totalWoQuantity - totalSoQuantity;
            
            return {
                id: `part-${partNumber}`,
                partNumber: partNumber,
                totalWoQuantity: totalWoQuantity,
                totalSoQuantity: totalSoQuantity,
                allocationGap: allocationGap,
                allocationStatus: allocationGap === 0 ? 'MATCHED' : (allocationGap > 0 ? 'EXCESS' : 'SHORTAGE'),
                allocations: details
            };
        });
    }

    /**
     * Transform allocation analysis from backend API into master-detail rows
     * Implements First-In-First-Out (FIFO) allocation logic
     */
    private transformAnalysisToRows(analysisResults: any[]): AllocationTableRow[] {
        const masterRows: AllocationTableRow[] = [];
        
        analysisResults.forEach(analysis => {
            const partNumber = analysis.partNumber;
            const workOrders = analysis.workOrders || [];
            const salesOrders = analysis.salesOrders || [];
            
            // Sort sales orders by urgency (due date) for intelligent allocation
            const sortedSalesOrders = [...salesOrders].sort((a, b) => 
                new Date(a.SOD_DUE_DATE).getTime() - new Date(b.SOD_DUE_DATE).getTime()
            );
            
            // Sort work orders by due date for FIFO allocation (earliest first)
            const sortedWorkOrders = [...workOrders].sort((a, b) => 
                new Date(a.WR_DUE).getTime() - new Date(b.WR_DUE).getTime()
            );
            
            // Calculate part-level totals (convert strings to numbers)
            const totalWoQuantity = workOrders.reduce((sum: number, wo: any) => sum + parseFloat(wo.AVAILABLE_QTY || '0'), 0);
            const totalSoQuantity = salesOrders.reduce((sum: number, so: any) => sum + parseFloat(so.OPENBALANCE || '0'), 0);
            const allocationGap = totalWoQuantity - totalSoQuantity;
            
            // Analyze urgency and timing for better recommendations
            const urgencyAnalysis = this.analyzeUrgencyAndTiming(sortedSalesOrders, sortedWorkOrders);
            
            let allocationStatus: 'SHORTAGE' | 'MATCHED' | 'EXCESS' = 'MATCHED';
            if (allocationGap < 0) {
                allocationStatus = 'SHORTAGE';
            } else if (allocationGap > 0) {
                allocationStatus = 'EXCESS';
            }
            
            // FIFO Allocation Logic: Allocate work orders sequentially to sales orders
            const { allocations, woRemaining, soShortages } = this.performFIFOAllocation(sortedWorkOrders, sortedSalesOrders);
            
            // Create detail rows from FIFO allocation results
            const details: AllocationDetailRow[] = [];
            
            // Add allocated rows (WO -> SO mappings)
            allocations.forEach(allocation => {
                const urgencyLevel = this.getUrgencyLevel(allocation.so.SOD_DUE_DATE);
                const priority = urgencyLevel === 'URGENT' ? 1 : urgencyLevel === 'NORMAL' ? 2 : 3;
                
                // Check if this allocation is part of multi-WO fulfillment
                const totalSoNeed = parseFloat(allocation.so.OPENBALANCE || '0');
                const soAllocationsCount = allocations.filter(a => a.so.sod_nbr === allocation.so.sod_nbr).length;
                const isPartOfMultiWO = soAllocationsCount > 1;
                
                details.push({
                    id: `${allocation.wo.wo_nbr}-${allocation.so.sod_nbr}`,
                    woNumber: allocation.wo.wo_nbr,
                    woQuantity: parseFloat(allocation.wo.WR_QTY_ORD || '0'),
                    woAvailable: parseFloat(allocation.wo.AVAILABLE_QTY || '0'),
                    woRemainingQty: allocation.woRemainingAfterAllocation, // Show remaining after this allocation
                    woDueDate: new Date(allocation.wo.WR_DUE),
                    woStatus: allocation.wo.WR_STATUS || '',
                    soNumber: allocation.so.sod_nbr,
                    soQuantity: parseFloat(allocation.so.TOTALORDERED || '0'),
                    soDueDate: new Date(allocation.so.SOD_DUE_DATE),
                    soStatus: allocation.so.SOD_STATUS || '',
                    allocatedQuantity: allocation.allocatedQty,
                    allocationType: 'AUTOMATIC' as const,
                    priority: priority,
                    isLocked: false,
                    timingRisk: this.calculateTimingRisk(new Date(allocation.wo.WR_DUE), new Date(allocation.so.SOD_DUE_DATE)),
                    recommendation: this.generateEnhancedRecommendation(
                        allocation.wo, 
                        allocation.so, 
                        allocation.allocatedQty, 
                        totalSoNeed, 
                        isPartOfMultiWO
                    )
                });
            });
            
            // Add unallocated work order capacity (excess WO)
            woRemaining.forEach(remaining => {
                const hasUrgentOrders = urgencyAnalysis.urgentQuantity > 0;
                const hasUrgentShortage = urgencyAnalysis.urgentQuantity > urgencyAnalysis.totalWoCapacity;
                
                let recommendation = '';
                let priority = 3;
                let timingRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
                
                if (hasUrgentShortage) {
                    recommendation = '🚨 CRITICAL: Urgent orders need this capacity - prioritize production!';
                    priority = 1;
                    timingRisk = 'HIGH';
                } else if (hasUrgentOrders) {
                    recommendation = '✅ Good capacity for urgent orders - proceed with production';
                    priority = 2;
                    timingRisk = 'MEDIUM';
                } else {
                    recommendation = '📅 Only future orders in pipeline - consider delaying production';
                    priority = 3;
                    timingRisk = 'LOW';
                }
                
                details.push({
                    id: `${remaining.wo.wo_nbr}-EXCESS`,
                    woNumber: remaining.wo.wo_nbr,
                    woQuantity: parseFloat(remaining.wo.WR_QTY_ORD || '0'),
                    woAvailable: remaining.remainingQty,
                    woRemainingQty: remaining.remainingQty, // For excess, remaining = available
                    woDueDate: new Date(remaining.wo.WR_DUE),
                    woStatus: remaining.wo.WR_STATUS || '',
                    soNumber: '',
                    soQuantity: 0,
                    soDueDate: new Date(),
                    soStatus: '',
                    allocatedQuantity: 0,
                    allocationType: 'AUTOMATIC' as const,
                    priority: priority,
                    isLocked: false,
                    timingRisk: timingRisk,
                    recommendation: recommendation
                });
            });
            
            // Add unmatched sales orders (shortages)
            soShortages.forEach(shortage => {
                const urgencyLevel = this.getUrgencyLevel(shortage.so.SOD_DUE_DATE);
                const daysUntilDue = Math.ceil((new Date(shortage.so.SOD_DUE_DATE).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                
                let recommendation = '';
                let shortageType = 'SHORTAGE';
                let timingRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
                let priority = 2;
                
                if (urgencyLevel === 'URGENT') {
                    recommendation = `🔥 CRITICAL: Need ${shortage.shortageQty} units in ${daysUntilDue} days - EXPEDITE PRODUCTION!`;
                    shortageType = 'URGENT SHORTAGE';
                    timingRisk = 'HIGH';
                    priority = 1;
                } else if (urgencyLevel === 'FUTURE') {
                    recommendation = `📅 FUTURE PLANNING: ${shortage.shortageQty} units needed in ${daysUntilDue} days - schedule when capacity allows`;
                    shortageType = 'FUTURE NEED';
                    timingRisk = 'LOW';
                    priority = 3;
                } else {
                    recommendation = `⚠️ NORMAL: Plan production of ${shortage.shortageQty} units for delivery in ${daysUntilDue} days`;
                    timingRisk = 'MEDIUM';
                    priority = 2;
                }
                
                details.push({
                    id: `SHORTAGE-${shortage.so.sod_nbr}`,
                    woNumber: shortageType,
                    woQuantity: 0,
                    woAvailable: 0,
                    woDueDate: new Date(),
                    woStatus: '',
                    soNumber: shortage.so.sod_nbr,
                    soQuantity: parseFloat(shortage.so.TOTALORDERED || '0'),
                    soDueDate: new Date(shortage.so.SOD_DUE_DATE),
                    soStatus: shortage.so.SOD_STATUS || '',
                    allocatedQuantity: 0,
                    allocationType: 'AUTOMATIC' as const,
                    priority: priority,
                    isLocked: false,
                    timingRisk: timingRisk,
                    recommendation: recommendation
                });
            });
            
            // Create the master row
            masterRows.push({
                id: `part-${partNumber}`,
                partNumber: partNumber,
                totalWoQuantity: totalWoQuantity,
                totalSoQuantity: totalSoQuantity,
                allocationGap: allocationGap,
                allocationStatus: allocationStatus,
                allocations: details,
                
                // Map decision summary from backend analysis
                decisionSummary: analysis.decisionSummary || this.generateFallbackDecisionSummary(allocationStatus, allocationGap),
                decisionCategory: analysis.decisionCategory || this.mapStatusToCategory(allocationStatus, urgencyAnalysis),
                trafficLightStatus: this.mapCategoryToTrafficLight(analysis.decisionCategory || this.mapStatusToCategory(allocationStatus, urgencyAnalysis)),
                actionRecommendations: analysis.actionRecommendations || this.generateFallbackActions(allocationStatus, urgencyAnalysis)
            });
        });
        
        return masterRows;
    }

    /**
     * Perform First-In-First-Out allocation of work orders to sales orders
     * Ensures no work order quantity is double-allocated
     * Enhanced to track remaining quantities for progressive display
     */
    private performFIFOAllocation(workOrders: any[], salesOrders: any[]) {
        // Track remaining quantities for work orders (FIFO consumption)
        const woTracker = workOrders.map(wo => ({
            wo: wo,
            originalQty: parseFloat(wo.AVAILABLE_QTY || '0'),
            remainingQty: parseFloat(wo.AVAILABLE_QTY || '0')
        }));
        
        // Track remaining demand for sales orders (by urgency priority)
        const soTracker = salesOrders.map(so => ({
            so: so,
            remainingDemand: parseFloat(so.OPENBALANCE || '0')
        }));
        
        const allocations: Array<{
            wo: any;
            so: any;
            allocatedQty: number;
            woRemainingAfterAllocation: number; // Track remaining qty after this allocation
        }> = [];
        
        // FIFO Allocation Algorithm
        // For each sales order (by urgency), allocate from earliest available work orders
        soTracker.forEach(soItem => {
            let demandToFill = soItem.remainingDemand;
            
            // Go through work orders in FIFO order until demand is satisfied
            for (let woItem of woTracker) {
                if (demandToFill <= 0 || woItem.remainingQty <= 0) {
                    continue; // Move to next WO if no demand left or WO is exhausted
                }
                
                // Allocate the minimum of remaining WO capacity and remaining SO demand
                const allocationQty = Math.min(woItem.remainingQty, demandToFill);
                
                if (allocationQty > 0) {
                    // Update remaining quantities (FIFO consumption)
                    woItem.remainingQty -= allocationQty;
                    demandToFill -= allocationQty;
                    
                    // Record the allocation with remaining quantity snapshot
                    allocations.push({
                        wo: woItem.wo,
                        so: soItem.so,
                        allocatedQty: allocationQty,
                        woRemainingAfterAllocation: woItem.remainingQty
                    });
                }
            }
            
            // Update the SO tracker with any unfulfilled demand
            soItem.remainingDemand = demandToFill;
        });
        
        // Collect unallocated work order capacity (excess)
        const woRemaining = woTracker
            .filter(woItem => woItem.remainingQty > 0)
            .map(woItem => ({
                wo: woItem.wo,
                remainingQty: woItem.remainingQty
            }));
        
        // Collect unfulfilled sales order demand (shortages)
        const soShortages = soTracker
            .filter(soItem => soItem.remainingDemand > 0)
            .map(soItem => ({
                so: soItem.so,
                shortageQty: soItem.remainingDemand
            }));
        
        return {
            allocations,
            woRemaining,
            soShortages
        };
    }

    /**
     * Determine if a work order allocation is part of a multi-WO fulfillment for a single SO
     */
    private isPartOfMultiWorkOrderFulfillment(allocationData: any, masterRowData: any): { isMulti: boolean; sequence: number; total: number } {
        if (!allocationData.soNumber || !masterRowData?.allocations) {
            return { isMulti: false, sequence: 0, total: 0 };
        }
        
        // Find all allocations for the same sales order
        const sameSOAllocations = masterRowData.allocations.filter((allocation: any) => 
            allocation.soNumber === allocationData.soNumber && 
            allocation.allocatedQuantity > 0 &&
            !allocation.woNumber.includes('SHORTAGE') &&
            !allocation.woNumber.includes('EXCESS')
        );
        
        if (sameSOAllocations.length <= 1) {
            return { isMulti: false, sequence: 0, total: 0 };
        }
        
        // Sort by work order due date to determine sequence
        const sortedAllocations = sameSOAllocations.sort((a: any, b: any) => 
            new Date(a.woDueDate).getTime() - new Date(b.woDueDate).getTime()
        );
        
        const sequence = sortedAllocations.findIndex((allocation: any) => 
            allocation.woNumber === allocationData.woNumber
        ) + 1;
        
        return {
            isMulti: true,
            sequence: sequence,
            total: sameSOAllocations.length
        };
    }

    private generateReason(wo: any, so: any): string {
        const woDue = new Date(wo.WR_DUE);
        const soDue = new Date(so.SOD_DUE_DATE);
        const daysDiff = (soDue.getTime() - woDue.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff < 0) {
            return `Late delivery: WO due ${Math.abs(daysDiff).toFixed(0)} days after SO due`;
        } else if (daysDiff < 7) {
            return `Tight schedule: ${daysDiff.toFixed(0)} days buffer`;
        } else {
            return `Good timing: ${daysDiff.toFixed(0)} days early`;
        }
    }

    private calculateConfidence(soDue: Date, woDue: Date): number {
        const daysDiff = (soDue.getTime() - woDue.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff < 0) return 0.3; // Late delivery
        if (daysDiff < 3) return 0.6; // Tight schedule
        if (daysDiff < 7) return 0.8; // Good timing
        return 0.95; // Plenty of time
    }

    private calculateTimingRisk(woDate: Date, soDate: Date): 'LOW' | 'MEDIUM' | 'HIGH' {
        const daysDiff = (soDate.getTime() - woDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysDiff < 0) return 'HIGH';
        if (daysDiff < 7) return 'MEDIUM';
        return 'LOW';
    }

    private updateSummaryStats() {
        const allDetails = this.rowData.flatMap(row => row.allocations || []);
        this.totalAllocations = allDetails.length;
        this.manualAllocations = allDetails.filter(detail => detail.allocationType === 'MANUAL').length;
        this.lockedAllocations = allDetails.filter(detail => detail.isLocked).length;
        this.highRiskAllocations = allDetails.filter(detail => detail.timingRisk === 'HIGH').length;
    }

    onCellValueChanged(event: any) {
        const data = event.data;
        const field = event.colDef.field;
        const newValue = event.newValue;
        const oldValue = event.oldValue;

        console.log(`Cell changed: ${field} from ${oldValue} to ${newValue}`);

        // Master-detail structure will handle changes differently
        // For now, just log the change
    }

    onRowDragEnd(event: any) {
        console.log('Row drag ended:', event);
        // Handle drag-drop reallocation
    }

    private reassignToSalesOrder(data: AllocationTableRow, newSoNumber: string, oldSoNumber: string) {
        // TODO: Implement for master-detail structure 
        console.log('Reassign to sales order - needs master-detail implementation');
        /*
        this.allocationService.reassignWorkOrder({
            woNumber: data.woNumber,
            fromSoNumber: oldSoNumber,
            toSoNumber: newSoNumber,
            partNumber: data.partNumber,
            quantity: data.allocatedQuantity,
            priority: data.priority,
            userId: 'current-user', // Would get from auth service
            reason: 'Manual reassignment via allocation table'
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (success) => {
                    console.log('Work order reassigned successfully');
                    this.loadAllocations();
                },
                error: (error) => {
                    console.error('Error reassigning work order:', error);
                }
            });
        */
    }

    private updateAllocation(data: AllocationTableRow, newQuantity: number, oldQuantity: number) {
        // Update allocation logic here
        console.log(`Updating allocation from ${oldQuantity} to ${newQuantity} for ${data.id}`);
    }

    private updatePriority(data: AllocationTableRow, newPriority: number) {
        // TODO: Implement for master-detail structure
        console.log('Update priority - needs master-detail implementation');
        /*
        this.allocationService.updateSalesOrderPriority({
            soNumber: data.soNumber,
            priority: newPriority,
            userId: 'current-user',
            timestamp: new Date().toISOString(),
            reason: 'Priority updated via allocation table'
        }).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (success) => {
                    console.log('Priority updated successfully');
                    data.priority = newPriority;
                },
                error: (error) => {
                    console.error('Error updating priority:', error);
                    // Revert the change on error
                    this.gridApi.refreshCells();
                }
            });
        */
    }

    /**
     * Analyze urgency and timing for intelligent allocation recommendations
     */
    private analyzeUrgencyAndTiming(salesOrders: any[], workOrders: any[]) {
        const today = new Date();
        const urgentThreshold = 30; // Days - orders due within 30 days are urgent
        const futureThreshold = 180; // Days - orders due beyond 6 months are future planning
        
        // Categorize sales orders by urgency
        const urgentOrders = salesOrders.filter(so => {
            const daysUntilDue = Math.ceil((new Date(so.SOD_DUE_DATE).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilDue <= urgentThreshold;
        });
        
        const futureOrders = salesOrders.filter(so => {
            const daysUntilDue = Math.ceil((new Date(so.SOD_DUE_DATE).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilDue > futureThreshold;
        });
        
        const normalOrders = salesOrders.filter(so => {
            const daysUntilDue = Math.ceil((new Date(so.SOD_DUE_DATE).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilDue > urgentThreshold && daysUntilDue <= futureThreshold;
        });
        
        // Calculate quantities by urgency
        const urgentQuantity = urgentOrders.reduce((sum, so) => sum + parseFloat(so.OPENBALANCE || '0'), 0);
        const futureQuantity = futureOrders.reduce((sum, so) => sum + parseFloat(so.OPENBALANCE || '0'), 0);
        const normalQuantity = normalOrders.reduce((sum, so) => sum + parseFloat(so.OPENBALANCE || '0'), 0);
        
        // Calculate available work order capacity
        const totalWoCapacity = workOrders.reduce((sum, wo) => sum + parseFloat(wo.AVAILABLE_QTY || '0'), 0);
        
        // Generate intelligent recommendations
        const recommendations = [];
        
        if (urgentQuantity > totalWoCapacity) {
            recommendations.push(`URGENT: Need ${urgentQuantity - totalWoCapacity} more units for orders due within ${urgentThreshold} days`);
        }
        
        if (futureQuantity > 0 && urgentQuantity <= totalWoCapacity) {
            recommendations.push(`PLANNING: ${futureQuantity} units needed for future orders (6+ months out) - can delay production`);
        }
        
        if (totalWoCapacity > urgentQuantity + normalQuantity) {
            const excess = totalWoCapacity - (urgentQuantity + normalQuantity);
            recommendations.push(`EFFICIENCY: ${excess} units of excess capacity - consider delaying ${futureQuantity} future units`);
        }
        
        return {
            urgentOrders,
            normalOrders, 
            futureOrders,
            urgentQuantity,
            normalQuantity,
            futureQuantity,
            totalWoCapacity,
            recommendations,
            priorityScore: this.calculatePriorityScore(urgentQuantity, normalQuantity, futureQuantity, totalWoCapacity)
        };
    }
    
    /**
     * Calculate a priority score for the part based on timing needs
     */
    private calculatePriorityScore(urgent: number, normal: number, future: number, capacity: number): number {
        // Higher score = higher priority
        let score = 0;
        
        // Heavy weight for urgent shortages
        if (urgent > capacity) {
            score += (urgent - capacity) * 100;
        }
        
        // Medium weight for normal shortages
        if (urgent + normal > capacity) {
            score += (urgent + normal - capacity) * 50;
        }
        
        // Negative score for excess capacity on future orders
        if (capacity > urgent + normal && future > 0) {
            score -= Math.min(future, capacity - urgent - normal) * 10;
        }
        
        return score;
    }

    refreshAllocations() {
        this.loadAllocations();
    }

    saveAllocations() {
        console.log('Saving allocations...');
    }

    showAuditTrail() {
        console.log('Showing audit trail...');
    }

    /**
     * Classify sales order urgency based on due date
     */
    private getUrgencyLevel(dueDateStr: string): 'URGENT' | 'NORMAL' | 'FUTURE' {
        const dueDate = new Date(dueDateStr);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue <= 30) return 'URGENT';      // Orders due within 30 days
        if (daysUntilDue <= 180) return 'NORMAL';     // Orders due within 6 months  
        return 'FUTURE';                              // Orders due beyond 6 months
    }

    /**
     * Generate smart recommendations based on timing, urgency, and stock availability
     * Enhanced to show multi-WO fulfillment context
     */
    private generateTimingRecommendation(wo: any, so: any, stockAvailable: number = 0): string {
        const urgencyLevel = this.getUrgencyLevel(so.SOD_DUE_DATE);
        const woDue = new Date(wo.WR_DUE);
        const soDue = new Date(so.SOD_DUE_DATE);
        const daysDiff = Math.ceil((soDue.getTime() - woDue.getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilSoDue = Math.ceil((soDue.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const soNeed = parseFloat(so.OPENBALANCE || '0');
        
        // Check if stock can cover this sales order
        if (stockAvailable >= soNeed) {
            if (urgencyLevel === 'URGENT') {
                return `📦 STOCK COVERS: ${stockAvailable} units in stock can fulfill this urgent order - no WO needed immediately`;
            } else if (urgencyLevel === 'FUTURE') {
                return `📦 STOCK + FUTURE: Stock available, consider delaying WO until closer to ${daysUntilSoDue}-day due date`;
            }
            return `📦 STOCK AVAILABLE: ${stockAvailable} units in stock - WO provides additional buffer`;
        }
        
        // Stock insufficient - WO needed
        const shortfall = soNeed - stockAvailable;
        
        if (urgencyLevel === 'URGENT') {
            if (daysDiff < 0) {
                return `🚨 CRITICAL: WO completes ${Math.abs(daysDiff)} days LATE + only ${stockAvailable} units in stock!`;
            }
            if (daysDiff < 3) {
                return `⚡ URGENT: Very tight timing - WO needed for ${shortfall} units (stock covers ${stockAvailable})`;
            }
            return `🔥 URGENT: High priority WO needed for ${shortfall} units in ${daysUntilSoDue} days`;
        }
        
        if (urgencyLevel === 'FUTURE') {
            return `📅 FUTURE: Can delay WO for ${shortfall} units - order not due for ${daysUntilSoDue} days`;
        }
        
        // Normal timing
        if (daysDiff >= 14) {
            return `✅ Good planning: WO for ${shortfall} units with ${daysDiff} days buffer`;
        } else if (daysDiff >= 7) {
            return `👍 Adequate timing: WO for ${shortfall} units with ${daysDiff} days buffer`;
        } else if (daysDiff >= 0) {
            return `⚠️ Tight timing: WO for ${shortfall} units with only ${daysDiff} days buffer`;
        } else {
            return `❌ RISK: WO completes ${Math.abs(daysDiff)} days late for ${shortfall} units`;
        }
    }

    /**
     * Enhanced recommendation generation that includes multi-WO fulfillment context
     */
    private generateEnhancedRecommendation(wo: any, so: any, allocationQty: number, totalSoNeed: number, isPartOfMultiWO: boolean): string {
        const baseRecommendation = this.generateTimingRecommendation(wo, so);
        
        if (isPartOfMultiWO) {
            const fulfillmentPercentage = Math.round((allocationQty / totalSoNeed) * 100);
            return `${baseRecommendation} | 🔗 Multi-WO: This WO covers ${fulfillmentPercentage}% (${allocationQty}/${totalSoNeed}) of SO demand`;
        }
        
        return baseRecommendation;
    }

    // Action handler methods for allocation decisions
    ngAfterViewInit() {
        // Attach action handlers to window for use in cell renderers
        (window as any).useStockOnly = (partNumber: string) => this.useStockOnly(partNumber);
        (window as any).createUrgentWO = (partNumber: string) => this.createUrgentWO(partNumber);
        (window as any).scheduleWOLater = (partNumber: string) => this.scheduleWOLater(partNumber);
        (window as any).useStockFirst = (partNumber: string) => this.useStockFirst(partNumber);
        (window as any).scheduleFutureWO = (partNumber: string) => this.scheduleFutureWO(partNumber);
        (window as any).reviewExistingWO = (partNumber: string) => this.reviewExistingWO(partNumber);
        (window as any).manualReview = (partNumber: string) => this.manualReview(partNumber);
    }

    private useStockOnly(partNumber: string) {
        console.log(`Using stock only for part: ${partNumber}`);
        // TODO: Implement stock allocation logic
        // - Mark inventory as allocated to sales orders
        // - Update allocation table to show stock coverage
        // - Show confirmation message
    }

    private createUrgentWO(partNumber: string) {
        console.log(`Creating urgent WO for part: ${partNumber}`);
        // TODO: Implement urgent WO creation
        // - Open WO creation dialog with urgent priority
        // - Pre-fill part number and required quantity
        // - Set due date based on most urgent sales order
        // - Auto-assign to appropriate production line
    }

    private scheduleWOLater(partNumber: string) {
        console.log(`Scheduling WO later for part: ${partNumber}`);
        // TODO: Implement scheduled WO creation
        // - Open scheduling dialog
        // - Show recommended timeline based on future orders
        // - Allow user to select optimal production slot
        // - Create scheduled WO with future due date
    }

    private useStockFirst(partNumber: string) {
        console.log(`Using stock first for part: ${partNumber}`);
        // TODO: Implement hybrid allocation strategy
        // - Allocate available stock to urgent orders first
        // - Schedule WO for remaining demand
        // - Update allocation table with mixed strategy
        // - Show breakdown of stock vs WO coverage
    }

    private scheduleFutureWO(partNumber: string) {
        console.log(`Scheduling future WO for part: ${partNumber}`);
        // TODO: Implement future WO planning
        // - Analyze future demand timeline
        // - Suggest optimal WO timing and quantities
        // - Consider production efficiency and batching
        // - Create planned WO with appropriate lead time
    }

    private reviewExistingWO(partNumber: string) {
        console.log(`Reviewing existing WO for part: ${partNumber}`);
        // TODO: Implement WO review workflow
        // - Show all existing WOs for this part
        // - Highlight over-production or redundant orders
        // - Suggest cancellation or modification
        // - Allow WO quantity adjustments
    }

    private manualReview(partNumber: string) {
        console.log(`Manual review required for part: ${partNumber}`);
        // TODO: Implement manual review workflow
        // - Open detailed allocation analysis dialog
        // - Show all relevant data (WOs, SOs, inventory)
        // - Provide manual allocation tools
        // - Allow custom decision entry with reasoning
    }

    // Helper methods for decision summary mapping
    private generateFallbackDecisionSummary(allocationStatus: 'SHORTAGE' | 'MATCHED' | 'EXCESS', allocationGap: number): string {
        switch (allocationStatus) {
            case 'SHORTAGE':
                return `🚨 SHORTAGE: Need ${Math.abs(allocationGap)} more units`;
            case 'EXCESS':
                return `✅ EXCESS: ${allocationGap} units over requirement`;
            case 'MATCHED':
                return `🟡 MATCHED: Supply exactly meets demand`;
            default:
                return `❓ REVIEW: Manual analysis needed`;
        }
    }

    private mapStatusToCategory(allocationStatus: 'SHORTAGE' | 'MATCHED' | 'EXCESS', urgencyAnalysis: any): 'STOCK_SUFFICIENT' | 'URGENT_COVERED' | 'URGENT_SHORTAGE' | 'FUTURE_ONLY' | 'NO_DEMAND' | 'MANUAL_REVIEW' {
        if (urgencyAnalysis.urgentQuantity === 0 && urgencyAnalysis.totalSoQuantity === 0) {
            return 'NO_DEMAND';
        }
        
        if (allocationStatus === 'SHORTAGE') {
            return urgencyAnalysis.urgentQuantity > 0 ? 'URGENT_SHORTAGE' : 'FUTURE_ONLY';
        }
        
        if (allocationStatus === 'MATCHED' || allocationStatus === 'EXCESS') {
            return urgencyAnalysis.urgentQuantity > 0 ? 'URGENT_COVERED' : 'STOCK_SUFFICIENT';
        }
        
        return 'MANUAL_REVIEW';
    }

    private mapCategoryToTrafficLight(category: 'STOCK_SUFFICIENT' | 'URGENT_COVERED' | 'URGENT_SHORTAGE' | 'FUTURE_ONLY' | 'NO_DEMAND' | 'MANUAL_REVIEW'): 'GREEN' | 'YELLOW' | 'RED' | 'GRAY' {
        switch (category) {
            case 'STOCK_SUFFICIENT':
                return 'GREEN';
            case 'URGENT_COVERED':
            case 'FUTURE_ONLY':
                return 'YELLOW';
            case 'URGENT_SHORTAGE':
                return 'RED';
            case 'NO_DEMAND':
            case 'MANUAL_REVIEW':
                return 'GRAY';
            default:
                return 'GRAY';
        }
    }

    private generateFallbackActions(allocationStatus: 'SHORTAGE' | 'MATCHED' | 'EXCESS', urgencyAnalysis: any): { primary: string; secondary?: string; urgent?: boolean } {
        if (allocationStatus === 'SHORTAGE' && urgencyAnalysis.urgentQuantity > 0) {
            return {
                primary: 'Create urgent work order',
                secondary: 'Check emergency stock',
                urgent: true
            };
        }
        
        if (allocationStatus === 'EXCESS') {
            return {
                primary: 'Use available stock',
                secondary: 'Delay work order'
            };
        }
        
        return {
            primary: 'Review allocation',
            secondary: 'Manual adjustment'
        };
    }
}