import { Component, Input, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { FormBuilder, FormGroup } from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ToastrService } from "ngx-toastr";

@Injectable({
  providedIn: "root",
})
export class BomViewModalService {
  modalRef: any;

  constructor(public modalService: NgbModal) {}

  open(partNumber: string, soNumber?: string) {
    this.modalRef = this.modalService.open(BomViewModalComponent, {
      size: "xl",
      centered: true,
      scrollable: true,
      fullscreen: true,
      windowClass: "modal-fullwidth", // Add custom class for full width
      backdrop: 'static', // Prevent closing on backdrop click for better UX
    });
    this.modalRef.componentInstance.partNumber = partNumber;
    this.modalRef.componentInstance.soNumber = soNumber;
    return this.modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule],
  selector: "app-bom-view-modal",
  templateUrl: "./bom-view-modal.component.html",
  styleUrls: ["./bom-view-modal.component.scss"],
})
export class BomViewModalComponent implements OnInit {
  @Input() public partNumber: string;
  @Input() public soNumber?: string;
  
  bomData: any[] = [];
  private allBomData: any[] = []; // Store complete dataset like original BOM view
  loading = false;
  error: string = "";
  filterForm: FormGroup;
  gridApi: GridApi;

  constructor(
    private activeModal: NgbActiveModal,
    private http: HttpClient,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      part: [this.partNumber || ""],
      maxLevels: [6],
      days: [300],
      graphicsOnly: [false],
      nested: [false],
      debug: [false]
    });

    if (this.partNumber) {
      this.fetchBOM();
    }
  }

  columnDefs: ColDef[] = [
    {
      field: "item_part",
      headerName: "Item Part",
      filter: "agTextColumnFilter",
      width: 300,
      pinned: "left",
      hide: true // Hide this column since autoGroupColumnDef will show the tree structure
    },
    {
      field: "item_description",
      headerName: "Description",
      filter: "agTextColumnFilter",
      width: 250,
      cellRenderer: (params: any) => {
        if (!params.data) return "";
        const desc = params.value || "";
        const desc2 = params.data.details?.description2 || "";
        const fullDesc = desc2 ? `${desc} ${desc2}` : desc;
        return `<span title="${fullDesc}">${fullDesc}</span>`;
      },
    },
    {
      field: "bom_level",
      headerName: "Level",
      filter: "agNumberColumnFilter",
      width: 80,
      cellStyle: (params) => {
        // Use API-provided bom_level for styling
        const bomLevel = params.data?.bom_level || 0;
        const colors = [
          "#e8f4fd", "#d1ecf1", "#bee5eb", "#a2d9ce", "#85c1e9", 
          "#ddb3ff", "#b3f0e6", "#ffb3e6", "#d6d8db", "#b3e5fc",
          "#f8f9fa", "#e9ecef", "#d7ccc8", "#cfd8dc", "#ffccbc"
        ];
        return {
          backgroundColor: colors[Math.min(bomLevel, colors.length - 1)],
        };
      },
      valueGetter: (params) => {
        if (!params.data) return "";
        // Use "Parent" for level 0, otherwise show level number  
        return params.data.bom_level_hierarchical === "Parent" ? "Parent" : params.data.bom_level || 0;
      },
    },
    {
      field: "qty_needed",
      headerName: "Qty Needed",
      filter: "agNumberColumnFilter",
      width: 100,
      cellStyle: { textAlign: "right" },
      cellRenderer: (params) => {
        return parseFloat(params.value || 0).toFixed(4);
      }
    },
    {
      field: "item_status", 
      headerName: "Status",
      filter: "agSetColumnFilter",
      width: 100,
      valueGetter: (params) => {
        if (!params.data) return "ACTIVE";
        return params.data.details?.status ||
          params.data.item_status ||
          params.data.status ||
          "ACTIVE";
      },
      cellRenderer: (params: any) => {
        const status = params.value;
        const colorMap = {
          ACTIVE: "success",
          PROTO: "warning", 
          INACTIVE: "secondary",
        };
        const color = colorMap[status] || "success";
        return `<span class="badge bg-${color}">${status}</span>`;
      },
    },
    {
      field: "part_type",
      headerName: "Part Type",
      filter: "agSetColumnFilter",
      width: 120,
      valueGetter: (params) => {
        if (!params.data) return "";
        // Try details first, then main object, then extract from part name
        const partType = params.data.details?.part_type || params.data.part_type;
        if (partType) return partType;

        // Extract from item_part prefix if no explicit part_type
        const itemPart = params.data.item_part || "";
        return itemPart.split('-')[0] || "";
      },
      cellRenderer: (params: any) => {
        const partType = params.value;
        if (!partType) return "";
        const colorMap = {
          "PurcAssy": "primary",
          "PurcPart": "info",
          "MakeAssy": "success",
          "MakePart": "warning",
          "FINGOOD": "danger",
          "Electron": "info",
          "HDW": "dark",
          "ELE": "info",
          "FAB": "success",
          "WLD": "warning",
          "ASY": "primary",
          "KIT": "secondary",
          "SGN": "danger"
        };
        const color = colorMap[partType] || "secondary";
        return `<span class="badge bg-${color}">${partType}</span>`;
      },
    },
    {
      field: "revision",
      headerName: "Rev",
      filter: "agTextColumnFilter",
      width: 80,
      valueGetter: (params) => {
        if (!params.data) return "";
        return params.data.details?.revision || params.data.revision || "";
      },
    },
    {
      field: "buyer",
      headerName: "Buyer",
      filter: "agTextColumnFilter",
      width: 100,
      valueGetter: (params) => {
        if (!params.data) return "";
        return params.data.details?.pt_buyer ||
          params.data.details?.buyer ||
          params.data.buyer ||
          "";
      },
    },
    {
      field: "vendor",
      headerName: "Vendor",
      filter: "agTextColumnFilter",
      width: 120,
      valueGetter: (params) => {
        if (!params.data) return "";
        return params.data.details?.pt_vend ||
          params.data.details?.vendor ||
          params.data.vendor ||
          "";
      },
    },
    {
      field: "drawing",
      headerName: "Drawing",
      filter: "agTextColumnFilter",
      width: 150,
      valueGetter: (params) => {
        if (!params.data) return "";
        return params.data.details?.pt_draw ||
          params.data.details?.drawing ||
          params.data.drawing ||
          "";
      },
    },
    {
      field: "unit_of_measure",
      headerName: "UOM",
      filter: "agTextColumnFilter",
      width: 80,
      valueGetter: (params) => {
        if (!params.data) return "EA";
        return params.data.details?.pt_um ||
          params.data.details?.unit_of_measure ||
          params.data.unit_of_measure ||
          params.data.uom ||
          "EA";
      },
      cellRenderer: (params: any) => {
        const uom = params.value;
        return uom ? `<span class="badge bg-light text-dark">${uom}</span>` : "";
      },
    },
    {
      field: "phantom",
      headerName: "Phantom",
      filter: "agSetColumnFilter",
      width: 90,
      valueGetter: (params) => {
        if (!params.data) return false;
        const phantom = params.data.details?.pt_phantom || params.data.details?.phantom || params.data.phantom;
        return phantom === "1" || phantom === 1 || phantom === true;
      },
      cellRenderer: (params: any) => {
        const isPhantom = params.value;
        if (isPhantom) {
          return `<span class="badge bg-warning text-dark">Phantom</span>`;
        }
        return `<span class="badge bg-light text-muted">Normal</span>`;
      },
    },
    {
      field: "issue_method",
      headerName: "Issue Method",
      filter: "agSetColumnFilter",
      width: 120,
      valueGetter: (params) => {
        if (!params.data) return "Manual";
        const issueMethod = params.data.details?.pt_iss_pol ||
          params.data.details?.pt_pm_code ||
          params.data.pm_code ||
          params.data.details?.issue_method;

        // Convert issue policy codes to readable values
        if (issueMethod === "1") {
          return "Backflush";
        } else if (issueMethod === "0") {
          return "No Issue";
        } else if (issueMethod === "2" || issueMethod === "P") {
          return "Manual";
        }
        return issueMethod || "Manual";
      },
      cellRenderer: (params: any) => {
        const method = params.value;
        const colorMap = {
          "Backflush": "success",
          "No Issue": "secondary",
          "Manual": "primary",
          "1": "success",
          "0": "secondary",
          "2": "primary",
          "P": "primary"
        };
        const color = colorMap[method] || "primary";
        return `<span class="badge bg-${color}">${method}</span>`;
      },
    },
    {
      field: "abc_class",
      headerName: "ABC",
      filter: "agSetColumnFilter",
      width: 70,
      valueGetter: (params) => {
        if (!params.data) return "";
        return params.data.details?.pt_abc || "";
      },
      cellRenderer: (params: any) => {
        const abc = params.value;
        if (!abc) return "";
        const colorMap = {
          "A": "danger",
          "B": "warning",
          "C": "success"
        };
        const color = colorMap[abc] || "secondary";
        return `<span class="badge bg-${color}">${abc}</span>`;
      },
    },
    {
      field: "price",
      headerName: "Price",
      filter: "agNumberColumnFilter",
      width: 100,
      valueGetter: (params) => {
        if (!params.data) return 0;
        const price = params.data.details?.pt_price;
        return price ? parseFloat(price) : 0;
      },
      cellRenderer: (params: any) => {
        const price = params.value;
        return price > 0 ? `$${price.toFixed(2)}` : "";
      },
    },
    {
      field: "bom_reference",
      headerName: "BOM Reference",
      filter: "agTextColumnFilter",
      width: 200,
      cellRenderer: (params: any) => {
        const ref = params.value || "";
        return ref ? `<span class="text-muted small">${ref}</span>` : "";
      },
    },
    {
      field: "bom_mandatory",
      headerName: "Mandatory",
      filter: "agSetColumnFilter",
      width: 100,
      cellRenderer: (params: any) => {
        const mandatory = params.value === "1" || params.value === 1;
        return mandatory
          ? `<span class="badge bg-danger">Required</span>`
          : `<span class="badge bg-secondary">Optional</span>`;
      },
    },
    {
      field: "parent_component",
      headerName: "Parent Component",
      filter: "agTextColumnFilter",
      width: 150,
      hide: true, // Hidden by default
    }
  ];

  gridOptions: GridOptions = {
    animateRows: false,
    tooltipShowDelay: 0,
    columnDefs: this.columnDefs,
    enableBrowserTooltips: true,
    suppressColumnMoveAnimation: true,
    onGridReady: (params) => {
      this.gridApi = params.api;
    },
    onFirstDataRendered: (params) => {
      // Auto-size columns after data load (ensure all rows are rendered for sizing)
      const prevSuppressRowVirtualisation = this.gridOptions.suppressRowVirtualisation;
      this.gridOptions.suppressRowVirtualisation = true;
      this.gridApi.refreshClientSideRowModel && this.gridApi.refreshClientSideRowModel('everything');
      setTimeout(() => {
        // Auto-size all normal columns first
        const allColumnIds: string[] = [];
        this.gridApi.getColumnDefs().forEach((col: any) => {
          if (col.field || col.colId) {
            allColumnIds.push(col.field || col.colId);
          }
        });
        allColumnIds.forEach(colId => this.gridApi.autoSizeColumn(colId, false));
        
        // Custom sizing for the tree column
        this.autoSizeTreeColumn();
        
        // Restore row virtualization
        this.gridOptions.suppressRowVirtualisation = prevSuppressRowVirtualisation;
        this.gridApi.refreshClientSideRowModel && this.gridApi.refreshClientSideRowModel('everything');
      }, 500);
    },

    // Use AG Grid's built-in tree data feature
    treeData: true,
    getDataPath: (data: any) => {
      // Use the existing bom_path from the backend WITHOUT making it unique
      // This preserves the tree structure for expansion
      if (data.bom_path) {
        return data.bom_path.split(' > ');
      }

      // Fallback for items without bom_path
      return [data.item_part];
    },

    // Configure to show data in leaf nodes AND group nodes
    groupDisplayType: 'singleColumn',
    showOpenedGroup: true,
    groupHideOpenParents: false,
    groupDefaultExpanded: -1,

    // Enhanced unique row IDs to handle duplicate part numbers at different locations
    getRowId: (params) => {
      // Use the bom_path + unique ID to create unique row IDs
      // This handles duplicates without breaking the tree structure
      const bomPath = params.data.bom_path || params.data.item_part;
      return `${bomPath}_${params.data._uniqueId}`;
    },

    // Add event handlers for tree expansion/collapse
    onRowGroupOpened: (event) => {
      if (this.gridApi) {
        // Re-size the tree column when nodes are expanded/collapsed
        setTimeout(() => {
          this.autoSizeTreeColumn();
        }, 100);
      }
    },

    // Performance settings
    enableCellTextSelection: true,
    suppressRowClickSelection: true,
    rowBuffer: 10,
    suppressAnimationFrame: true,

    // Add auto group column definition to control how tree is displayed 
    autoGroupColumnDef: {
      headerName: "Item Part (Tree)",
      flex: 1, // Allow the column to expand
      minWidth: 300, // Set minimum width to accommodate content
      pinned: "left",
      cellRendererParams: {
        suppressCount: true,
        innerRenderer: (params: any) => {
          if (params.data) {
            // This is a leaf node with actual data
            const itemPart = params.data.item_part;

            // Check for children by looking at the actual data structure
            const hasChildren = this.allBomData.some(
              (child) => child.parent_component === itemPart
            );

            const bomLevel = params.data.bom_level || 0;
            const levelColors = [
              '#007bff', '#28a745', '#ffc107', '#fd7e14', '#dc3545', '#6f42c1', '#20c997',
              '#e83e8c', '#6c757d', '#17a2b8', '#f8f9fa', '#343a40', '#795548', '#607d8b', '#ff5722'
            ];
            const iconColor = levelColors[Math.min(bomLevel, levelColors.length - 1)];

            // Different icons based on node type and hierarchy
            let icon = "📄"; // Default for leaf components
            if (params.data.bom_level_hierarchical === "Parent" || bomLevel === 0) {
              icon = "🏠"; // House icon for root/parent items
            } else if (hasChildren) {
              icon = "📁"; // Folder icon for assemblies with sub-components
            } else {
              // Different icons based on part type for leaf components
              const partType = params.data.details?.part_type || params.data.part_type || "";
              if (partType.includes("Graphic") || partType === "Graphic") {
                icon = "🎨"; // Art palette for graphics
              } else if (partType.includes("HDW") || partType.includes("Hardware")) {
                icon = "🔧"; // Wrench for hardware
              } else if (partType.includes("ELE") || partType.includes("Electron")) {
                icon = "⚡"; // Lightning for electronics
              } else if (partType.includes("FAB") || partType.includes("Fabric")) {
                icon = "🧵"; // Thread for fabric
              } else {
                icon = "📄"; // Document for other parts
              }
            }

            const levelDisplay = params.data.bom_level_hierarchical === "Parent" ? "Parent" : `L${bomLevel}`;
            const levelBadge = `<span class="ms-1 badge bg-primary" style="background-color: ${iconColor} !important; color: ${bomLevel >= 10 ? '#000' : '#fff'};">${levelDisplay}</span>`;

            return `<span style="color: ${iconColor}; font-size: 16px;">${icon}</span> ${itemPart} ${levelBadge}`;
          } else {
            // This is a group node without data - show folder icon and group name
            const groupValue = params.value || 'Unknown';
            const icon = "📂"; // Open folder for group nodes
            const iconColor = '#007bff'; // Default blue for group nodes
            return `<span style="color: ${iconColor}; font-size: 16px;">${icon}</span> ${groupValue}`;
          }
        }
      }
    },
  };

  async fetchBOM() {
    this.loading = true;
    this.error = "";
    
    const formValue = this.filterForm.value;
    
    // Build URL with all parameters matching the original BOM view
    const params = new URLSearchParams({
      so: (this.soNumber || '').toUpperCase(),
      part: (formValue.part || '').toUpperCase(),
      days: formValue.days.toString(),
      max_levels: formValue.maxLevels.toString(),
      debug: formValue.debug ? '1' : '0',
      graphics_only: formValue.graphicsOnly ? '1' : '0',
      nested: formValue.nested ? '1' : '0'
    });

    const url = `https://dashboard.eye-fi.com/tasks/GraphicsDemandsV1%20copy.php?${params.toString()}`;

    try {
      const data = await this.http.get<any[]>(url).toPromise();
      
      if (data && Array.isArray(data)) {
        this.bomData = this.processBomData(data);
        this.toastr.success(`Found ${this.bomData.length} BOM items`);
      } else {
        this.bomData = [];
        this.error = "No BOM data found for this part";
      }
    } catch (error) {
      console.error("Error fetching BOM data:", error);
      this.error = "Failed to fetch BOM data. Please try again.";
      this.toastr.error("Failed to fetch BOM data");
    } finally {
      this.loading = false;
    }
  }

  private processBomData(data: any[]): any[] {
    // Enhanced data processing to match original BOM view
    const processedData = data.map((item, index) => ({
      ...item,
      bom_level: parseInt(item.bom_level) || 0,
      woNumber: item.details?.graphics_status_info?.woNumber || item.woNumber || "",
      checked: item.checked || "Not Ordered",
      // Enhanced unique identifier that includes more context for duplicates
      _uniqueId: `${item.item_part}_${item.parent_component || 'ROOT'}_${item.bom_level || 0}_${item.bom_reference || 'NOREF'}_${item.qty_needed || 0}_${index}_${Math.random().toString(36).substr(2, 5)}`
    }));

    // Store complete dataset for tree structure references
    this.allBomData = processedData;
    return processedData;
  }

  private autoSizeTreeColumn() {
    if (this.gridApi) {
      const allColumns = this.gridApi.getColumns();
      const treeColumn = allColumns?.find(col => col.getColId() === 'ag-Grid-AutoColumn');
      if (treeColumn) {
        this.gridApi.autoSizeColumns([treeColumn]);
      }
    }
  }

  getMaxBomLevel(): number {
    if (!this.bomData || this.bomData.length === 0) return 0;
    return Math.max(...this.bomData.map(item => item.bom_level || 0));
  }

  getActiveBomCount(): number {
    if (!this.bomData || this.bomData.length === 0) return 0;
    return this.bomData.filter(item => 
      item.status?.toLowerCase() === "active" || 
      item.part_status?.toLowerCase() === "active" ||
      !item.status // Consider items without status as active
    ).length;
  }

  onRefresh() {
    this.fetchBOM();
  }

  onExport() {
    if (this.gridApi) {
      this.gridApi.exportDataAsExcel({
        fileName: `BOM_${this.partNumber}_${new Date().toISOString().split('T')[0]}.xlsx`
      });
    }
  }

  closeModal() {
    this.activeModal.dismiss();
  }
}
