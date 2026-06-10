import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { FormBuilder, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { GraphicsService } from "@app/core/api/operations/graphics/graphics.service";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { Router } from "@angular/router";
import { ItemInfoModalService } from "@app/shared/components/item-info-modal/item-info-modal.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { CommentOffcanvasComponent } from "@app/shared/components/comment-offcanvas/comment-offcanvas.component";
import { CommentsModalService } from "@app/shared/components/comments/comments-modal.service";

@Component({
  selector: "app-bom-graphics",
  templateUrl: "./bom-graphics.component.html",
  styleUrls: ["./bom-graphics.component.scss"],
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, AgGridModule, CommentOffcanvasComponent],
})
export class BomGraphicsComponent implements OnInit {
  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private router: Router,
    private graphicsService: GraphicsService,
    private itemInfoModalService: ItemInfoModalService,
    private commentsModalService: CommentsModalService,
  ) { }

  bomData: any[] = [];
  processedData: any[] = [];
  loading = false;
  error: string = "";
  filterForm: FormGroup;
  gridApi: GridApi;
  query = "";
  groupsExpanded = true;
  showOpenOnly = false;
  isCommentPanelOpen = false;
  selectedCommentOrderNum: string | null = null;
  selectedCommentRowId: string | null = null;
  commentViewMode: "offcanvas" | "modal" = "offcanvas";
  commentPanelWidth = 420;

  // New properties for enhanced workflow
  viewMode: 'grouped' | 'detailed' = 'grouped';
  showUrgentOnly = false;
  selectedItems = new Set<string>();

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      so: [""],
      part: [""],
      urgentDays: [14], // Show items due within X days as urgent
    });
    this.fetchBOM();
  }

  goToLegacyDemand(): void {
    this.router.navigateByUrl("/operations/graphics/demand");
  }

  goToDemandV1(): void {
    this.router.navigateByUrl("/operations/graphics/demand-v1");
  }

  onQuickFilter(value: string): void {
    this.query = value;
    this.gridApi?.setGridOption("quickFilterText", value || "");
  }

  columnDefs: ColDef[] = [
    {
      headerName: "#",
      width: 70,
      pinned: "left",
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { textAlign: "center", fontWeight: "600" },
      valueGetter: (params) => {
        const node = params.node;
        if (!node || node.group) {
          return "";
        }

        const parentNode = node.parent;
        if (parentNode?.group) {
          const siblings = parentNode.childrenAfterSort || parentNode.childrenAfterFilter || [];
          const idx = siblings.findIndex((childNode: any) => childNode?.id === node.id);
          return idx >= 0 ? idx + 1 : "";
        }

        return (node.rowIndex ?? 0) + 1;
      },
    },

    {
      field: "ignoredFromPlanning",
      headerName: "Ignore",
      width: 80,
      pinned: "left",
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      editable: (params) => Boolean(params?.data),
      cellRenderer: "agCheckboxCellRenderer",
      cellEditor: "agCheckboxCellEditor",
      cellStyle: { textAlign: "center" },
      onCellValueChanged: (params) => this.onIgnorePlanningChanged(params),
    },

    // Priority/Urgency indicator
    {
      field: "urgency",
      headerName: "🚨",
      width: 50,
      cellRenderer: (params) => {
        const dueDate = params?.data?.due_date || params?.data?.details?.bom_start_date;
        if (!dueDate) {
          return '';
        }
        const daysUntilDue = this.calculateDaysUntilDue(dueDate);
        if (daysUntilDue <= 7) return '<span class="text-danger fs-5">🔴</span>';
        if (daysUntilDue <= 14) return '<span class="text-warning fs-5">🟡</span>';
        return '<span class="text-success fs-5">🟢</span>';
      },
      cellStyle: { textAlign: 'center' },
      pinned: 'left'
    },

    // Part Number - this will be grouped
    {
      field: "item_part",
      headerName: "Part Number",
      filter: "agTextColumnFilter",
      width: 180,
      rowGroup: true, // Enable grouping on this column
      hide: false,
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        isLink: true,
        onClick: (e) => {
          const partNumber = e?.rowData?.item_part;
          if (partNumber) {
            this.itemInfoModalService.open(partNumber);
          }
        },
      },
    },

    {
      field: "item_description",
      headerName: "Description",
      filter: "agTextColumnFilter",
      width: 250
    },

    {
      field: "qty_needed",
      headerName: "Qty Needed",
      filter: "agNumberColumnFilter",
      width: 120,
      aggFunc: 'sum', // Built-in aggregation
      cellRenderer: (params) => {
        if (params?.node?.group) {
          const qty = this.toNumber(params?.node?.aggData?.qty_needed ?? params?.value);
          const firstLeaf = params?.node?.allLeafChildren?.[0]?.data;
          const uom = firstLeaf?.details?.pt_um || 'EA';
          return `${qty.toFixed(2)} ${uom}`;
        }
        if (!params?.data) {
          return '';
        }
        const qty = parseFloat(params.value || 0);
        const uom = params.data?.details?.pt_um || 'EA';
        return `${qty.toFixed(2)} ${uom}`;
      }
    },

    {
      field: "masterOnHandQty",
      headerName: "On Hand (Master)",
      filter: "agNumberColumnFilter",
      width: 150,
      hide: true,
      aggFunc: 'max',
      cellRenderer: (params) => {
        if (params?.node?.footer && (params.value === undefined || params.value === null)) {
          return '';
        }
        const qty = this.toNumber(params.value);
        return qty.toFixed(2);
      },
    },

    {
      field: "onHandQtyDepleting",
      headerName: "Available Now",
      filter: "agNumberColumnFilter",
      width: 165,
      aggFunc: 'min',
      cellRenderer: (params) => {
        if (params?.node?.group) {
          const firstLeaf = params?.node?.allLeafChildren?.[0]?.data;
          const qty = this.toNumber(firstLeaf?.masterOnHandQty);
          return qty.toFixed(2);
        }
        if (params?.node?.footer && (params.value === undefined || params.value === null)) {
          return '';
        }
        if (params?.data?.ignoredFromPlanning) {
          return '-';
        }
        const qty = this.toNumber(params.value);
        return qty.toFixed(2);
      },
    },

    {
      field: "openWoQtyMaster",
      headerName: "Open WO Qty (In Work)",
      filter: "agNumberColumnFilter",
      width: 145,
      aggFunc: 'max',
      cellRenderer: (params) => {
        if (params?.node?.group) {
          const firstLeaf = params?.node?.allLeafChildren?.[0]?.data;
          const qty = this.toNumber(firstLeaf?.openWoQtyMaster);
          return qty.toFixed(2);
        }
        if (params?.node?.footer && (params.value === undefined || params.value === null)) {
          return '';
        }
        if (params?.data?.ignoredFromPlanning) {
          return '-';
        }
        const qty = this.toNumber(params.value);
        return qty.toFixed(2);
      },
    },

    {
      field: "shortageQty",
      headerName: "Still Short",
      filter: "agNumberColumnFilter",
      width: 120,
      aggFunc: 'sum',
      cellRenderer: (params) => {
        if (params?.node?.group) {
          const qty = this.toNumber(params?.node?.aggData?.shortageQty ?? params?.value);
          const firstLeaf = params?.node?.allLeafChildren?.[0]?.data;
          const uom = firstLeaf?.details?.pt_um || 'EA';
          return `${qty.toFixed(2)} ${uom}`;
        }
        if (!params?.data && !params?.node?.footer) {
          return '';
        }
        if (params?.data?.ignoredFromPlanning) {
          return '-';
        }
        const qty = this.toNumber(params.value);
        const uom = params.data?.details?.pt_um || 'EA';
        return `${qty.toFixed(2)} ${uom}`;
      },
    },

    {
      field: "coverageStatus",
      headerName: "Coverage",
      filter: "agSetColumnFilter",
      width: 150,
      cellRenderer: (params) => {
        if (params?.node?.group) {
          const shortageTotal = this.toNumber(params?.node?.aggData?.shortageQty);
          if (shortageTotal <= 0) {
            return '<span class="badge bg-success">Covered</span>';
          }
          return `<span class="badge bg-danger">Need ${shortageTotal.toFixed(2)}</span>`;
        }
        if (params?.node?.footer) {
          const shortageTotal = this.toNumber(params?.node?.aggData?.shortageQty);
          if (shortageTotal <= 0) {
            return '<span class="badge bg-success">Covered</span>';
          }
          return `<span class="badge bg-danger">Need ${shortageTotal.toFixed(2)}</span>`;
        }

        const status = String(params.value || "Short");
        const color = status === "Covered"
          ? "success"
          : status === "Partial"
            ? "warning"
            : status === "Ignored"
              ? "secondary"
              : "danger";
        return `<span class="badge bg-${color}">${status}</span>`;
      },
    },

    {
      field: "openWoQtyAtLine",
      headerName: "WO Available By Need Date",
      filter: "agNumberColumnFilter",
      width: 135,
      hide: false,
      aggFunc: 'min',
      cellRenderer: (params) => {
        if (params?.node?.footer && (params.value === undefined || params.value === null)) {
          return '';
        }
        if (params?.data?.ignoredFromPlanning) {
          return '-';
        }
        const qty = this.toNumber(params.value);
        return qty.toFixed(2);
      },
    },

    {
      field: "projectedAvailableAtLine",
      headerName: "Projected Avail",
      filter: "agNumberColumnFilter",
      width: 145,
      hide: true,
      aggFunc: 'min',
      cellRenderer: (params) => {
        if (params?.node?.footer && (params.value === undefined || params.value === null)) {
          return '';
        }
        if (params?.data?.ignoredFromPlanning) {
          return '-';
        }
        const qty = this.toNumber(params.value);
        return qty.toFixed(2);
      },
    },

    {
      field: "line_value",
      headerName: "Line Value",
      width: 120,
      valueGetter: (params) => {
        // Calculate line value
        const qty = parseFloat(params?.data?.qty_needed || 0);
        const price = parseFloat(params?.data?.details?.pt_price || 0);
        return qty * price;
      },
      aggFunc: 'sum', // Built-in aggregation for totals
      cellRenderer: (params) => {
        const value = parseFloat(params.value || 0);
        return value > 0 ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '';
      }
    },

    {
      field: "due_date",
      headerName: "Due Date",
      filter: "agDateColumnFilter",
      width: 120,
      aggFunc: (params) => {
        // Custom aggregation for earliest date
        if (!params.values.length) return null;
        return params.values.reduce((earliest, current) => {
          if (!current) return earliest;
          if (!earliest) return current;
          return current < earliest ? current : earliest;
        });
      },
      cellRenderer: (params) => {
        if (!params.value) return '';
        const daysUntilDue = this.calculateDaysUntilDue(params.value);
        const urgencyClass = daysUntilDue <= 7 ? 'text-danger' : daysUntilDue <= 14 ? 'text-warning' : 'text-success';
        return `<span class="${urgencyClass}">${params.value} (${daysUntilDue}d)</span>`;
      }
    },

    {
      field: "checked",
      headerName: "Order Status",
      filter: "agSetColumnFilter",
      width: 120,
      cellRenderer: (params) => {
        const status = params.value || "Not Ordered";
        const color = status === "Not Ordered" ? "danger" : status === "Ordered" ? "warning" : "success";
        return `<span class="badge bg-${color}">${status}</span>`;
      }
    },

    {
      field: "sales_order",
      headerName: "Sales Order",
      filter: "agTextColumnFilter",
      width: 120,
      valueGetter: (params) => {
        if (!params?.data) {
          return '';
        }
        return params.data.sales_order || params.data.so_part || '';
      },
    },

    {
      field: "line_number",
      headerName: "Line #",
      filter: "agNumberColumnFilter",
      width: 80
    },

    {
      field: "buyer",
      headerName: "Buyer",
      filter: "agTextColumnFilter",
      width: 100,
      valueGetter: (params) => {
        if (!params?.data) {
          return '';
        }
        return params.data.buyer || params.data.details?.pt_buyer || '';
      },
    },

    {
      field: "woNumber",
      headerName: "WO Number",
      editable: true,
      filter: "agTextColumnFilter",
      width: 120,
      cellEditor: "agTextCellEditor",
      onCellValueChanged: (params) => this.onWoNumberChanged(params),
      cellClass: "wo-number-cell"
    },

    {
      field: "commentAction",
      headerName: "Comments",
      width: 110,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellRenderer: (params) => {
        if (!params?.data || params?.node?.group || params?.node?.footer) {
          return '';
        }

        const hasRecentComment = Boolean(params.data?.recentComment);
        const icon = hasRecentComment ? 'mdi-comment-text-outline' : 'mdi-comment-plus-outline';
        const label = hasRecentComment ? 'View' : 'Add';
        return `<button type="button" class="btn btn-link btn-sm p-0 comment-action-btn"><i class="mdi ${icon} me-1"></i>${label}</button>`;
      },
      onCellClicked: (params) => {
        if (!params?.data || params?.node?.group || params?.node?.footer) {
          return;
        }

        this.openCommentsPanel(params.data);
      },
    },
  ];

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params) => {
      this.gridApi = params.api;
    },
    // Built-in grouping configuration
    autoGroupColumnDef: {
      headerName: "Part Number",
      width: 250,
      pinned: 'left',
      cellRendererParams: {
        suppressCount: false,
        footerValueGetter: (params: any) => {
          const label = params?.value ? String(params.value) : 'Group';
          return `${label} Ending Balance`;
        },
        innerRenderer: (params: any) => {
          if (params.data) {
            // Leaf node - show sales order info
            const so = params.data.sales_order || params.data.so_part || '';
            const line = params.data.line_number || '';
            return `SO: ${so} ${line ? `Line: ${line}` : ''}`;
          } else {
            // Group node - show part number with starting balance
            const firstLeaf = params.node.allLeafChildren?.[0]?.data;
            const partType = firstLeaf?.details?.part_type || '';
            const startingBalance = this.toNumber(firstLeaf?.masterOnHandQty);
            return `${params.value} ${partType ? `(${partType})` : ''} | Start: ${startingBalance.toFixed(2)}`;
          }
        }
      }
    },

    // Enhanced unique row IDs to handle duplicate part numbers at different locations
    getRowId: (params) => {
      // Use the full bom_path as the primary identifier
      const bomPath = params.data.id

      return bomPath
    },
    groupDefaultExpanded: -1, // Start collapsed
    groupTotalRow: 'bottom',
    suppressAggFuncInHeader: true,
    enableCellTextSelection: true,
    rowSelection: "multiple",
    enableRangeSelection: true,

    // Use standard grouped rows so aggregate values can render in normal columns.
    groupDisplayType: 'singleColumn'
  };

  fetchBOM() {
    this.loading = true;
    this.error = "";
    const formValues = this.filterForm.value;

    const url = `apiV2/bom-structure?days=300&max_levels=0&debug=0&graphics_only=1&so=${encodeURIComponent(
      formValues.so || ''
    )}&nested=0&part=${encodeURIComponent(formValues.part || '')}`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        const rows = data.map((item) => ({
          ...item,
          woNumber: item.details?.graphics_status_info?.woNumber || item.woNumber || "",
          checked: item.checked || "Not Ordered",
          commentOrderNum: this.buildCommentOrderNum(item),
          ignoredFromPlanning: this.extractIgnoredFromPlanning(item),
          coverageStatus: "Short",
          shortageQty: 0,
          masterOnHandQty: this.extractMasterOnHandQty(item),
          onHandQtyDepleting: this.extractMasterOnHandQty(item),
          openWoQtyMaster: this.extractOpenWoMasterQty(item),
          openWoQtyAtLine: 0,
          projectedAvailableAtLine: this.extractMasterOnHandQty(item),
        }));

        this.applyOnHandFifo(rows);
        this.bomData = rows;
        this.applyVisibilityFilter();
        this.loading = false;
      },
      error: (err) => {
        this.error = "Failed to load BOM data.";
        this.loading = false;
      },
    });
  }

  private applyOnHandFifo(rows: any[]): void {
    const grouped = new Map<string, any[]>();

    for (const row of rows) {
      const key = String(row?.item_part || "").trim();
      if (!key) {
        row.masterOnHandQty = 0;
        row.onHandQtyDepleting = 0;
        row.openWoQtyMaster = 0;
        row.openWoQtyAtLine = 0;
        row.projectedAvailableAtLine = 0;
        row.shortageQty = this.toNumber(row?.qty_needed);
        continue;
      }

      const bucket = grouped.get(key) || [];
      bucket.push(row);
      grouped.set(key, bucket);
    }

    for (const partRows of grouped.values()) {
      const sortedRows = [...partRows].sort((a, b) => this.compareFifoOrder(a, b));
      const master = this.toNumber(sortedRows[0]?.masterOnHandQty);
      const openWorkOrders = this.extractOpenWorkOrders(sortedRows[0]);
      const totalOpenWo = openWorkOrders.reduce((sum, workOrder) => sum + this.toNumber(workOrder?.open_qty), 0);
      let remaining = master;
      const remainingWorkOrders = openWorkOrders.map((workOrder) => ({
        ...workOrder,
        remainingQty: this.toNumber(workOrder?.open_qty),
      }));

      for (const row of sortedRows) {
        const needed = this.toNumber(row?.qty_needed);
        const ignoredFromPlanning = Boolean(row?.ignoredFromPlanning);
        const lineDueTs = this.parseDateToTs(row?.due_date || row?.details?.bom_start_date);
        const remainingOpenWoTotal = remainingWorkOrders.reduce(
          (sum, workOrder) => sum + this.toNumber(workOrder?.remainingQty),
          0
        );
        const availableWoAtLine = remainingWorkOrders.reduce((sum, workOrder) => {
          const workOrderDueTs = this.parseDateToTs(workOrder?.due_date);
          if (workOrderDueTs <= lineDueTs) {
            return sum + this.toNumber(workOrder?.remainingQty);
          }
          return sum;
        }, 0);

        const allocateOnHand = Math.min(remaining, Math.max(0, needed));
        let remainingDemand = Math.max(0, needed - allocateOnHand);

        row.masterOnHandQty = master;
        row.onHandQtyDepleting = remaining;
        row.openWoQtyMaster = remainingOpenWoTotal;
        row.openWoQtyAtLine = availableWoAtLine;
        row.projectedAvailableAtLine = remaining + availableWoAtLine;

        if (ignoredFromPlanning) {
          row.shortageQty = 0;
          row.coverageStatus = "Ignored";
          continue;
        }

        remaining = Math.max(0, remaining - allocateOnHand);

        if (remainingDemand > 0) {
          for (const workOrder of remainingWorkOrders) {
            const workOrderDueTs = this.parseDateToTs(workOrder?.due_date);
            if (workOrderDueTs > lineDueTs) {
              continue;
            }

            const workOrderRemaining = this.toNumber(workOrder?.remainingQty);
            if (workOrderRemaining <= 0) {
              continue;
            }

            const allocateFromWo = Math.min(workOrderRemaining, remainingDemand);
            workOrder.remainingQty = Math.max(0, workOrderRemaining - allocateFromWo);
            remainingDemand = Math.max(0, remainingDemand - allocateFromWo);

            if (remainingDemand <= 0) {
              break;
            }
          }
        }

        row.shortageQty = remainingDemand;
        row.coverageStatus = this.computeCoverageStatus(row.projectedAvailableAtLine, needed);
      }
    }
  }

  private computeShortageQty(availableAtLine: number, qtyNeeded: number): number {
    const available = this.toNumber(availableAtLine);
    const needed = Math.max(0, this.toNumber(qtyNeeded));
    return Math.max(0, needed - available);
  }

  private computeCoverageStatus(availableAtLine: number, qtyNeeded: number): "Covered" | "Partial" | "Short" {
    const available = this.toNumber(availableAtLine);
    const needed = Math.max(0, this.toNumber(qtyNeeded));

    if (available >= needed) {
      return "Covered";
    }

    if (available > 0) {
      return "Partial";
    }

    return "Short";
  }

  private compareFifoOrder(a: any, b: any): number {
    const aDate = this.parseDateToTs(a?.due_date || a?.details?.bom_start_date);
    const bDate = this.parseDateToTs(b?.due_date || b?.details?.bom_start_date);
    if (aDate !== bDate) {
      return aDate - bDate;
    }

    const aSo = String(a?.sales_order || a?.so_part || a?.sod_nbr || "");
    const bSo = String(b?.sales_order || b?.so_part || b?.sod_nbr || "");
    if (aSo !== bSo) {
      return aSo.localeCompare(bSo);
    }

    const aLine = this.toNumber(a?.line_number || a?.sod_line);
    const bLine = this.toNumber(b?.line_number || b?.sod_line);
    return aLine - bLine;
  }

  private parseDateToTs(value: any): number {
    if (!value) {
      return Number.MAX_SAFE_INTEGER;
    }
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
  }

  private extractMasterOnHandQty(row: any): number {
    const candidates = [
      row?.ld_qty_oh,
      row?.masterOnHandQty,
      row?.onHandQty,
      row?.qty_oh,
      row?.LD_QTY_OH,
      row?.ld_qty_oh,
      row?.QTY_OH,
      row?.details?.masterOnHandQty,
      row?.details?.onHandQty,
      row?.details?.qty_oh,
      row?.details?.ld_qty_oh,
      row?.details?.LD_QTY_OH,
      row?.details?.ld_qty_oh,
      row?.details?.pt_qty_oh,
      row?.details?.PT_QTY_OH,
    ];

    for (const candidate of candidates) {
      const qty = this.toNumber(candidate);
      if (qty > 0) {
        return qty;
      }
    }

    return 0;
  }

  private extractOpenWoMasterQty(row: any): number {
    const candidates = [
      row?.open_wo_qty,
      row?.openWoQtyMaster,
      row?.details?.open_wo_qty,
      row?.details?.openWoQtyMaster,
    ];

    for (const candidate of candidates) {
      const qty = this.toNumber(candidate);
      if (qty > 0) {
        return qty;
      }
    }

    return 0;
  }

  private extractIgnoredFromPlanning(row: any): boolean {
    const candidates = [
      row?.ignoredFromPlanning,
      row?.details?.ignoredFromPlanning,
      row?.details?.graphics_status_info?.ignoredFromPlanning,
    ];

    return candidates.some((candidate) => Number(candidate) === 1 || candidate === true);
  }

  private extractOpenWorkOrders(row: any): any[] {
    const candidates = [
      row?.open_work_orders,
      row?.details?.open_work_orders,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length) {
        return [...candidate].sort((a, b) => {
          const aDue = this.parseDateToTs(a?.due_date);
          const bDue = this.parseDateToTs(b?.due_date);
          if (aDue !== bDue) {
            return aDue - bDue;
          }

          return String(a?.wo_number || '').localeCompare(String(b?.wo_number || ''));
        });
      }
    }

    return [];
  }

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private handleActionClick(params: any) {
    const target = params.event.target as HTMLElement;

    if (target.closest('.mark-ordered')) {
      params.data.checked = "Ordered";
      this.gridApi.refreshCells({ rowNodes: [params.node] });
    } else if (target.closest('.copy-part')) {
      navigator.clipboard.writeText(params.data.item_part);
    }
  }

  private async saveIgnoredFromPlanning(rowData: any, previousValue: boolean): Promise<void> {
    try {
      const response: any = await this.graphicsService.saveGraphicsDemand({
        id: Number(rowData?.checkedId || 0),
        so: String(rowData?.sales_order || rowData?.so_part || ''),
        line: Number(rowData?.line_number || 0),
        part: String(rowData?.item_part || ''),
        parentComponent: String(rowData?.parent_component || ''),
        uniqueId: String(rowData?.unique_id_legacy || ''),
        poNumber: String(rowData?.poNumber || ''),
        woNumber: String(rowData?.woNumber || ''),
        graphicsWorkOrderNumber: String(rowData?.graphicsWorkOrderNumber || ''),
        graphicsSalesOrder: String(rowData?.graphicsSalesOrder || ''),
        active: rowData?.checked === 'Ordered' ? 1 : 0,
        ignoredFromPlanning: rowData?.ignoredFromPlanning ? 1 : 0,
      });

      rowData.checkedId = Number(response?.idLast || rowData?.checkedId || 0);
      rowData.ignoredFromPlanning = Number(response?.ignoredFromPlanning) === 1;

      if (rowData?.details?.graphics_status_info) {
        rowData.details.graphics_status_info.ignoredFromPlanning = rowData.ignoredFromPlanning;
      }
    } catch (error) {
      rowData.ignoredFromPlanning = previousValue;
      if (rowData?.details?.graphics_status_info) {
        rowData.details.graphics_status_info.ignoredFromPlanning = previousValue;
      }
      this.applyOnHandFifo(this.bomData);
      this.applyVisibilityFilter();
      console.error('Failed to save ignore flag for graphics demand row.', error);
    }
  }

  toggleOpenGroups() {
    this.showOpenOnly = !this.showOpenOnly;
    this.applyVisibilityFilter();
  }

  onIgnorePlanningChanged(params: any) {
    if (!params?.data) {
      return;
    }

    this.applyOnHandFifo(this.bomData);
    this.applyVisibilityFilter();
    void this.saveIgnoredFromPlanning(params.data, Boolean(params.oldValue));
  }

  openCommentsPanel(rowData: any, focusCommentId?: number | null) {
    const orderNum = String(rowData?.commentOrderNum || this.buildCommentOrderNum(rowData) || '').trim();
    if (!orderNum) {
      return;
    }

    this.selectedCommentOrderNum = orderNum;
    this.selectedCommentRowId = String(rowData?.id || '');

    if (this.commentViewMode === 'modal') {
      this.openCommentModal(orderNum, focusCommentId);
      return;
    }

    this.isCommentPanelOpen = true;
  }

  setCommentViewMode(mode: "offcanvas" | "modal") {
    if (this.commentViewMode === mode) {
      return;
    }

    this.commentViewMode = mode;

    if (mode === 'modal' && this.isCommentPanelOpen && this.selectedCommentOrderNum) {
      const activeOrderNum = this.selectedCommentOrderNum;
      this.isCommentPanelOpen = false;
      this.openCommentModal(activeOrderNum);
    }
  }

  closeCommentPanel() {
    this.isCommentPanelOpen = false;
    this.selectedCommentOrderNum = null;
    this.selectedCommentRowId = null;
  }

  onCommentSaved(result: any) {
    if (!this.selectedCommentRowId || !this.gridApi || result?.isPrivate) {
      return;
    }

    const rowNode = this.gridApi.getRowNode(this.selectedCommentRowId);
    if (!rowNode?.data) {
      return;
    }

    rowNode.data.recentComment = result;
    this.gridApi.redrawRows({ rowNodes: [rowNode] });
  }

  get commentPanelPushWidth(): number {
    if (!this.isCommentPanelOpen || window.innerWidth <= 991.98) {
      return 0;
    }

    return this.commentPanelWidth;
  }

  onCommentPanelWidthChange(width: number) {
    if (!Number.isFinite(width)) {
      return;
    }

    this.commentPanelWidth = Math.round(width);
  }

  private openCommentModal(orderNum: string, focusCommentId?: number | null): void {
    const modalRef = this.commentsModalService.open(
      orderNum,
      'Graphics Demand',
      'Graphics Demand Comments',
      undefined,
      undefined,
      focusCommentId ?? null,
    );

    modalRef.componentInstance.showCommentViewActions = true;
    modalRef.componentInstance.commentViewMode = this.commentViewMode;

    modalRef.result.then(
      (result: any) => {
        if (result?.__commentViewMode === 'offcanvas' || result?.__commentViewMode === 'modal') {
          const requestedMode = result.__commentViewMode;
          const reopenOrderNum = this.selectedCommentOrderNum || orderNum;
          this.setCommentViewMode(requestedMode);
          if (requestedMode === 'offcanvas' && reopenOrderNum) {
            setTimeout(() => {
              this.selectedCommentOrderNum = reopenOrderNum;
              this.isCommentPanelOpen = true;
            }, 0);
          }
          return;
        }

        if (result) {
          this.onCommentSaved(result);
        }

        this.closeCommentPanel();
      },
      () => {
        this.closeCommentPanel();
      }
    );
  }

  private buildCommentOrderNum(row: any): string {
    const salesOrder = String(row?.sales_order || row?.so_part || '').trim();
    const lineNumber = String(row?.line_number || '').trim();
    const itemPart = String(row?.item_part || '').trim();
    const parentComponent = String(row?.parent_component || '').trim();

    if (!salesOrder || !lineNumber || !itemPart) {
      return '';
    }

    const legacyParent = !parentComponent || parentComponent === 'SO Part'
      ? itemPart
      : parentComponent;

    return `${salesOrder}-${lineNumber}-${legacyParent}-${itemPart}`;
  }

  private applyVisibilityFilter() {
    const sourceRows = this.showOpenOnly
      ? this.filterRowsWithOpenShortage(this.bomData)
      : [...this.bomData];

    this.processedData = sourceRows;

    if (!this.gridApi) {
      return;
    }

    this.gridApi.setGridOption('rowData', this.processedData);
    this.gridApi.setGridOption('quickFilterText', this.query || '');

    if (this.groupsExpanded) {
      this.gridApi.expandAll();
    } else {
      this.gridApi.collapseAll();
    }
  }

  private filterRowsWithOpenShortage(rows: any[]): any[] {
    const shortageByPart = new Map<string, number>();

    for (const row of rows) {
      const key = String(row?.item_part || '').trim();
      if (!key) {
        continue;
      }

      const current = shortageByPart.get(key) || 0;
      shortageByPart.set(key, current + this.toNumber(row?.shortageQty));
    }

    return rows.filter((row) => {
      const key = String(row?.item_part || '').trim();
      if (!key) {
        return false;
      }

      return this.toNumber(shortageByPart.get(key)) > 0;
    });
  }

  // Toggle grouping on/off
  toggleGrouping() {
    if (this.gridApi) {
      const groupColumns = this.gridApi.getRowGroupColumns();
      if (groupColumns.length > 0) {
        this.gridApi.setRowGroupColumns([]);
      } else {
        this.gridApi.setRowGroupColumns(['item_part']);
      }
    }
  }

  toggleAllGroups() {
    if (!this.gridApi) {
      return;
    }

    if (this.groupsExpanded) {
      this.gridApi.collapseAll();
    } else {
      this.gridApi.expandAll();
    }

    this.groupsExpanded = !this.groupsExpanded;
  }

  private calculateDaysUntilDue(dueDate: string): number {
    if (!dueDate) return 999;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  onWoNumberChanged(params: any) {
    const rowData = params.data;
    const newWoNumber = params.newValue;

    console.log(`WO Number updated for ${rowData.item_part}: ${newWoNumber}`);

    // Update the nested object structure
    if (rowData.details && rowData.details.graphics_status_info) {
      rowData.details.graphics_status_info.woNumber = newWoNumber;
    }

    // Here you would typically call an API to save the change
    this.saveWoNumber(rowData.id, newWoNumber);
  }

  saveWoNumber(itemId: string, woNumber: string) {
    // TODO: Implement API call to save WO number
    console.log(`Saving WO Number ${woNumber} for item ${itemId}`);

    // Example API call (implement according to your backend)
    // this.http.put(`/api/graphics-status/${itemId}`, { woNumber }).subscribe({
    //   next: (response) => console.log('WO Number saved successfully'),
    //   error: (error) => console.error('Error saving WO Number:', error)
    // });
  }

  exportToCsv() {
    this.gridApi.exportDataAsCsv({
      fileName: "graphics-bom-export.csv",
    });
  }

  onSelectionChanged() {
    const selectedRows = this.gridApi.getSelectedRows();
    console.log("Selected rows:", selectedRows);
  }
}
