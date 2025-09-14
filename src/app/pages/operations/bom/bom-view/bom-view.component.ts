import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { FormBuilder, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { auto } from "@popperjs/core";

@Component({
  selector: "app-bom-view",
  templateUrl: "./bom-view.component.html",
  styleUrls: ["./bom-view.component.scss"],
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, AgGridModule],
})
export class BomViewComponent implements OnInit {
  constructor(private http: HttpClient, private fb: FormBuilder) { }

  bomData: any[] = [];
  private allBomData: any[] = []; // Store complete dataset
  loading = false;
  error: string = "";
  filterForm: FormGroup;
  viewMode: "table" | "tree" = "table";
  gridApi: GridApi;

  // Add new properties
  showAdvancedOptions = false;
  isFullscreen = false;
  showFilters: boolean = true; // <-- Added property

  // Toast notification state
  toastMessage: string = "";
  showToast: boolean = false;
  toastTimeout: any;

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      so: [""],
      part: ["VWL-03398-400"], // Set default part number
      maxLevels: [6],
      days: [300],
      graphicsOnly: [false],
      nested: [false],
      debug: [false]
    });
    
    // Automatically fetch BOM data for the default part number
    this.fetchBOM();
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
          "#e8f4fd", // Level 0 (Parent)
          "#d1ecf1", // Level 1
          "#bee5eb", // Level 2
          "#a2d9ce", // Level 3
          "#85c1e9", // Level 4
          "#ddb3ff", // Level 5
          "#b3f0e6", // Level 6
          "#ffb3e6", // Level 7
          "#d6d8db", // Level 8
          "#b3e5fc", // Level 9
          "#f8f9fa", // Level 10
          "#e9ecef", // Level 11
          "#d7ccc8", // Level 12
          "#cfd8dc", // Level 13
          "#ffccbc"  // Level 14+
        ];
        return {
          backgroundColor: colors[Math.min(bomLevel, colors.length - 1)],
        };
      },
      valueGetter: (params) => {
        // Check if params.data exists (group nodes might not have data)
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
      cellRenderer: (params) => {
        return parseFloat(params.value || 0).toFixed(4);
      },
    },
    {
      field: "item_status",
      headerName: "Status",
      filter: "agSetColumnFilter",
      width: 100,
      valueGetter: (params) => {
        // Check if params.data exists
        if (!params.data) return "ACTIVE";
        // Try multiple sources for status
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
        // Check if params.data exists
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
    // Add Unit of Measure column
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
    // Add Phantom column
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
    // Add Issue Method column
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
    // Add ABC Class column
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
    // Add Price column
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
      field: "dates",
      headerName: "BOM Dates",
      filter: false,
      width: 150,
      cellRenderer: (params: any) => {
        if (!params.data) return "";
        const startDate = params.data.details?.bom_start_date || "";
        const endDate = params.data.details?.bom_end_date || "";
        const modDate = params.data.details?.bom_mod_date || "";

        return `
          <div class="small">
            ${startDate ? `<div>Start: ${startDate}</div>` : ""}
            ${endDate ? `<div>End: ${endDate}</div>` : ""}
            ${modDate ? `<div class="text-muted">Mod: ${modDate}</div>` : ""}
          </div>
        `;
      },
    },
    {
      field: "last_user",
      headerName: "Last User",
      filter: "agTextColumnFilter",
      width: 100,
      valueGetter: (params) => {
        if (!params.data) return "";
        return params.data.details?.bom_last_user || params.data.details?.last_user || "";
      },
    },
    {
      field: "parent_component",
      headerName: "Parent Component",
      filter: "agTextColumnFilter",
      width: 150,
      hide: true, // Hidden by default
    },
  ];

  gridOptions: GridOptions = {
    animateRows: false,
    columnDefs: this.columnDefs,
    onGridReady: (params) => {
      this.gridApi = params.api;
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

    // Add auto group column definition to control how tree is displayed 
    autoGroupColumnDef: {
      headerName: "Item Part (Tree)",
      // width: 300, // Remove fixed width
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

            // Group nodes are always folders since they contain children
            const icon = "📂"; // Open folder for group nodes

            // Try to determine level from the group depth or use a default color
            const iconColor = '#007bff'; // Default blue for group nodes

            return `<span style="color: ${iconColor}; font-size: 16px;">${icon}</span> ${groupValue}`;
          }
        }
      }
    },

    // Master-Detail Configuration - FIXED
    masterDetail: true,
    isRowMaster: (dataItem: any) => {
      // Enable master-detail for all data rows that have actual data
      return dataItem && dataItem.item_part && !dataItem.group;
    },
    detailCellRendererParams: {
      detailGridOptions: {
        columnDefs: this.getDetailColumnDefs(),
        defaultColDef: {
          flex: 1,
          resizable: true,
          sortable: true,
          minWidth: 100,
        },
        suppressRowClickSelection: true,
        rowSelection: 'single',
        domLayout: 'autoHeight',
        headerHeight: 35,
      },
      getDetailRowData: (params: any) => {
        console.log('Master-detail getDetailRowData called for:', params.data?.item_part);
        if (params.data && params.data.item_part) {
          const detailRows = this.createDetailRows(params.data);
          console.log('Detail rows created:', detailRows.length);
          params.successCallback(detailRows);
        } else {
          console.log('No data available for detail view');
          params.successCallback([]);
        }
      },
    },

    // Performance settings
    enableCellTextSelection: true,
    suppressRowClickSelection: true,
    rowBuffer: 10,
    suppressAnimationFrame: true,

    // Add this to ensure master-detail works with tree data
    suppressAggFuncInHeader: true,
    onFirstDataRendered: (params) => {
      // Temporarily disable row virtualization
      const prevSuppressRowVirtualisation = this.gridOptions.suppressRowVirtualisation;
      this.gridOptions.suppressRowVirtualisation = true;
      this.gridApi.refreshClientSideRowModel && this.gridApi.refreshClientSideRowModel('everything');
      setTimeout(() => {
        const allColumnIds: string[] = [];
        this.gridApi.getColumnDefs().forEach((col: any) => {
          if (col.field || col.colId) {
            allColumnIds.push(col.field || col.colId);
          }
        });
        // Auto-size all normal columns
        allColumnIds.forEach(colId => this.gridApi.autoSizeColumn(colId, false));
        
        // Custom sizing for the tree column
        this.autoSizeTreeColumn();
        
        // Restore row virtualization
        this.gridOptions.suppressRowVirtualisation = prevSuppressRowVirtualisation;
        this.gridApi.refreshClientSideRowModel && this.gridApi.refreshClientSideRowModel('everything');
      }, 500);
    }
  };

  // Build the path from root to the given item - ENHANCED FOR DUPLICATES
  private buildPathToItem(item: any, allData: any[]): string[] {
    const path: string[] = [];
    let currentItem = item;

    // For duplicate parts, we need to create unique paths
    // Include the unique ID in the path to distinguish between different instances
    const uniqueSuffix = `_${item._uniqueId || item.bom_reference || item.qty_needed}`;

    // Walk up the parent chain
    while (currentItem && currentItem.parent_component && currentItem.parent_component !== currentItem.item_part) {
      const parent = allData.find(p => p.item_part === currentItem.parent_component);
      if (parent) {
        const parentSuffix = `_${parent._uniqueId || parent.bom_reference || parent.qty_needed}`;
        path.unshift(`${parent.item_part}${parentSuffix}`);
        currentItem = parent;
      } else {
        break;
      }
    }

    // Add the current item at the end with its unique identifier
    path.push(`${item.item_part}${uniqueSuffix}`);

    return path;
  }

  fetchBOM() {
    this.loading = true;
    this.error = "";
    const formValues = this.filterForm.value;

    // Build URL with all parameters
    const params = new URLSearchParams({
      so: (formValues.so || '').toUpperCase(),
      part: (formValues.part || '').toUpperCase(),
      days: formValues.days.toString(),
      max_levels: formValues.maxLevels.toString(),
      debug: formValues.debug ? '1' : '0',
      graphics_only: formValues.graphicsOnly ? '1' : '0',
      nested: formValues.nested ? '1' : '0'
    });

    const url = `https://dashboard.eye-fi.com/tasks/GraphicsDemandsV1%20copy.php?${params.toString()}`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        const processedData = data.map((item, index) => ({
          ...item,
          bom_level: parseInt(item.bom_level) || 0,
          woNumber:
            item.details?.graphics_status_info?.woNumber ||
            item.woNumber ||
            "",
          checked: item.checked || "Not Ordered",
          // Enhanced unique identifier that includes more context for duplicates
          _uniqueId: `${item.item_part}_${item.parent_component || 'ROOT'}_${item.bom_level || 0}_${item.bom_reference || 'NOREF'}_${item.qty_needed || 0}_${index}_${Math.random().toString(36).substr(2, 5)}`
        }));

        this.allBomData = processedData;
        this.bomData = processedData;
        this.loading = false;
        this.showFilters = false; // Collapse filter after search

        // Enhanced debugging - group by part and parent to see structure
        const treeStructure = {};
        processedData.forEach((item, index) => {
          const key = `${item.item_part}_${item.parent_component || 'ROOT'}`;
          if (!treeStructure[key]) {
            treeStructure[key] = [];
          }
          treeStructure[key].push({
            index,
            level: item.bom_level,
            qty: item.qty_needed,
            reference: item.bom_reference,
            uniqueId: item._uniqueId
          });
        });

        console.log('Tree structure:', treeStructure);

        // Specific check for FAB-03505-082 and its hierarchy
        const fabParts = processedData.filter(item => item.item_part === 'FAB-03505-082');
        if (fabParts.length > 0) {
          console.log('FAB-03505-082 occurrences with paths:');
          fabParts.forEach(part => {
            const path = this.buildPathToItem(part, processedData);
            console.log(`  Level ${part.bom_level}, Parent: ${part.parent_component}, Path: ${path.join(' > ')}, Qty: ${part.qty_needed}`);
          });
        }

        // Check what children exist for parents that should have them
        const parentsWithChildren = {};
        processedData.forEach(item => {
          if (item.parent_component) {
            if (!parentsWithChildren[item.parent_component]) {
              parentsWithChildren[item.parent_component] = [];
            }
            parentsWithChildren[item.parent_component].push(item.item_part);
          }
        });
        console.log('Parents with children:', parentsWithChildren);

        // Auto-size columns after data load (ensure all rows are rendered for sizing)
        if (this.gridApi) {
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
            
            // Custom sizing for the tree column to account for badges and icons
            this.autoSizeTreeColumn();
            
            // Restore row virtualization
            this.gridOptions.suppressRowVirtualisation = prevSuppressRowVirtualisation;
            this.gridApi.refreshClientSideRowModel && this.gridApi.refreshClientSideRowModel('everything');
          }, 200);
        }
      },
      error: (err) => {
        this.error = "Failed to load BOM data.";
        this.loading = false;
        this.showUserToast(this.error, true);
      },
    });
  }

  // Define detail grid columns
  private getDetailColumnDefs(): ColDef[] {
    return [
      {
        field: "category",
        headerName: "Category",
        width: 150,
        cellStyle: { fontWeight: 'bold' },
      },
      {
        field: "property",
        headerName: "Property",
        width: 200,
      },
      {
        field: "value",
        headerName: "Value",
        flex: 1,
        cellRenderer: (params: any) => {
          // Format different types of values
          if (params.data.type === 'date' && params.value) {
            return new Date(params.value).toLocaleDateString();
          }
          if (params.data.type === 'boolean') {
            return params.value ? 'Yes' : 'No';
          }
          if (params.data.type === 'badge') {
            const colorMap = {
              'ACTIVE': 'success',
              'PROTO': 'warning',
              'INACTIVE': 'secondary',
              'Required': 'danger',
              'Optional': 'secondary',
            };
            const color = colorMap[params.value] || 'secondary';
            return `<span class="badge bg-${color}">${params.value}</span>`;
          }
          return params.value || 'N/A';
        },
      },
    ];
  }

  // Create detail rows from master data
  private createDetailRows(masterData: any): any[] {
    const details = masterData.details || {};

    return [
      // Basic Information
      { category: "Basic Info", property: "Part Number", value: masterData.item_part, type: "text" },
      { category: "Basic Info", property: "Description", value: masterData.item_description, type: "text" },
      { category: "Basic Info", property: "Description 2", value: details.description2, type: "text" },
      { category: "Basic Info", property: "Status", value: details.status || masterData.item_status, type: "badge" },
      { category: "Basic Info", property: "Part Type", value: details.part_type || masterData.part_type, type: "text" },
      { category: "Basic Info", property: "Product Line", value: details.product_line, type: "text" },
      { category: "Basic Info", property: "Unit of Measure", value: details.pt_um, type: "text" },

      // Quantities & Pricing
      { category: "Quantities", property: "Qty Needed", value: masterData.qty_needed, type: "number" },
      { category: "Quantities", property: "Qty Per", value: details.qty_per || masterData.qty_per, type: "number" },
      { category: "Quantities", property: "Cumulative Qty", value: details.cumulative_qty, type: "number" },
      { category: "Pricing", property: "Unit Price", value: details.pt_price, type: "number" },
      { category: "Pricing", property: "ABC Classification", value: details.pt_abc, type: "text" },

      // Planning & Inventory
      { category: "Planning", property: "Order Policy", value: details.pt_ord_pol, type: "text" },
      { category: "Planning", property: "Order Quantity", value: details.pt_ord_qty, type: "number" },
      { category: "Planning", property: "Safety Stock", value: details.pt_sfty_stk, type: "number" },
      { category: "Planning", property: "Reorder Point", value: details.pt_rop, type: "number" },
      { category: "Planning", property: "MRP Active", value: details.pt_mrp === "1", type: "boolean" },

      // Lead Times
      { category: "Lead Times", property: "Manufacturing Lead Time", value: details.pt_mfg_lead, type: "number" },
      { category: "Lead Times", property: "Purchase Lead Time", value: details.pt_pur_lead, type: "number" },
      { category: "Lead Times", property: "Inspection Lead Time", value: details.pt_insp_lead, type: "number" },
      { category: "Lead Times", property: "Cumulative Lead Time", value: details.pt_cum_lead, type: "number" },

      // BOM Information
      { category: "BOM Info", property: "BOM Level", value: masterData.bom_level, type: "number" },
      { category: "BOM Info", property: "Parent Component", value: masterData.parent_component, type: "text" },
      { category: "BOM Info", property: "BOM Reference", value: masterData.bom_reference, type: "text" },
      { category: "BOM Info", property: "BOM Operation", value: masterData.bom_operation, type: "text" },
      { category: "BOM Info", property: "Mandatory", value: masterData.bom_mandatory === "1" ? "Required" : "Optional", type: "badge" },
      { category: "BOM Info", property: "BOM Remarks", value: masterData.bom_remarks, type: "text" },

      // Technical Details
      { category: "Technical", property: "Revision", value: details.revision, type: "text" },
      { category: "Technical", property: "Drawing", value: details.pt_draw, type: "text" },
      { category: "Technical", property: "Routing", value: details.pt_routing, type: "text" },
      { category: "Technical", property: "Phantom", value: details.pt_phantom === "1", type: "boolean" },
      { category: "Technical", property: "Issue Policy", value: details.pt_iss_pol, type: "text" },
      { category: "Technical", property: "Yield Percentage", value: details.pt_yield_pct, type: "number" },

      // Supply Chain
      { category: "Supply Chain", property: "Buyer", value: details.pt_buyer, type: "text" },
      { category: "Supply Chain", property: "Vendor", value: details.pt_vend, type: "text" },
      { category: "Supply Chain", property: "PM Code", value: details.pt_pm_code, type: "text" },
      { category: "Supply Chain", property: "Site", value: details.pt_site, type: "text" },

      // Dates & Tracking
      { category: "Tracking", property: "BOM Start Date", value: details.bom_start_date, type: "date" },
      { category: "Tracking", property: "BOM End Date", value: details.bom_end_date, type: "date" },
      { category: "Tracking", property: "Date Added", value: details.date_added, type: "date" },
      { category: "Tracking", property: "Date Modified", value: details.date_modified, type: "date" },
      { category: "Tracking", property: "Last User", value: details.last_user, type: "text" },
      { category: "Tracking", property: "BOM Last User", value: details.bom_last_user, type: "text" },

      // System Information
      { category: "System", property: "Domain", value: details.pt_domain, type: "text" },
      { category: "System", property: "Debug Source", value: masterData.debug_source, type: "text" },
      { category: "System", property: "SO Part", value: masterData.so_part, type: "text" },
      { category: "System", property: "OID", value: details.oid_pt_mstr, type: "text" },

    ].filter(row => row.value !== undefined && row.value !== null && row.value !== "");
  }

  // Copy text to clipboard
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showUserToast('Copied to clipboard: ' + text);
    }).catch(err => {
      this.showUserToast('Failed to copy: ' + text, true);
    });
  }

  showUserToast(message: string, isError: boolean = false) {
    this.toastMessage = message;
    this.showToast = true;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.showToast = false;
    }, isError ? 4000 : 2000);
  }

  // Add methods to control master-detail expansion for all rows
  expandAllDetails(): void {
    if (this.gridApi) {
      let expandedNodes: any[] = [];
      this.gridApi.forEachNode((node) => {
        if (node.master !== undefined && !node.expanded) {
          node.setExpanded(true);
          expandedNodes.push(node);
        }
      });
      setTimeout(() => {
        this.gridApi.refreshCells({
          columns: ['actions'],
          force: true
        });
        this.gridApi.redrawRows({ rowNodes: expandedNodes });
      }, 150);
    }
  }

  // Toggle detail expansion for a specific row - ENHANCED FIX
  toggleRowDetails(node: any): void {
    if (node) {
      if (node.master !== undefined) {
        const isExpanded = node.expanded;
        node.setExpanded(!isExpanded);
        setTimeout(() => {
          if (this.gridApi) {
            this.gridApi.refreshCells({
              rowNodes: [node],
              columns: ['actions'],
              force: true
            });
          }
        }, 100);
      } else {
        this.gridApi.refreshCells({
          rowNodes: [node],
          force: true
        });
        setTimeout(() => {
          if (node.master !== undefined) {
            node.setExpanded(!node.expanded);
          }
        }, 200);
      }
    }
  }

  collapseAllDetails(): void {
    if (this.gridApi) {
      let collapsedCount = 0;
      this.gridApi.forEachNode((node) => {
        if (node.master !== undefined && node.expanded) {
          node.setExpanded(false);
          collapsedCount++;
        }
      });
      setTimeout(() => {
        this.gridApi.refreshCells({
          columns: ['actions'],
          force: true
        });
      }, 100);
    }
  }

  // --- UI/UX Improvements for BOM Print ---
  printBOM(): void {
    if (!this.gridApi) return;
    type PrintRow = {
      itemPart: string;
      description: string;
      level: number;
      uom: string;
      qtyPer: string | number;
      children: PrintRow[];
    };
    function buildTreeFromNodes(nodes: any[]): PrintRow[] {
      const result: PrintRow[] = [];
      for (const node of nodes) {
        if (!node.data) continue;
        const row: PrintRow = {
          itemPart: node.data.item_part,
          description: node.data.item_description || (node.data.details?.description2 ? `${node.data.item_description} ${node.data.details.description2}` : ''),
          level: node.data.bom_level,
          uom: node.data.details?.pt_um || node.data.details?.unit_of_measure || node.data.unit_of_measure || node.data.uom || "EA",
          qtyPer: node.data.details?.qty_per || node.data.qty_per || '',
          children: buildTreeFromNodes(node.childrenAfterGroup || [])
        };
        result.push(row);
      }
      return result;
    }
    const rootNodes: any[] = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      if (node.level === 0) rootNodes.push(node);
    });
    const tree = buildTreeFromNodes(rootNodes);
    function renderTreeHtml(nodes: PrintRow[], depth = 0, parentLastArr: boolean[] = []): string {
      let html = '';
      nodes.forEach((node, idx) => {
        const isLast = idx === nodes.length - 1;
        let lineHtml = '';
        for (let i = 0; i < depth; i++) {
          if (parentLastArr[i]) {
            lineHtml += `<span style="display:inline-block;width:14px;height:22px;"></span>`;
          } else {
            lineHtml += `<span style="display:inline-block;width:14px;height:22px;border-left:2px solid #bbb;position:relative;top:1px;"></span>`;
          }
        }
        lineHtml += `<span style="display:inline-block;width:16px;height:22px;position:relative;top:1px;">${isLast ? '<span style="border-bottom:2px solid #bbb;display:inline-block;width:12px;position:relative;top:10px;left:0;"></span><span style="display:inline-block;width:4px;"></span>' : '<span style="border-bottom:2px solid #bbb;display:inline-block;width:12px;position:relative;top:10px;left:0;"></span><span style="border-left:2px solid #bbb;display:inline-block;height:12px;position:relative;top:-6px;left:-12px;"></span>'}</span>`;
        html += `
          <div style="display:flex;align-items:baseline;font-size:13px;line-height:22px;background:${depth % 2 === 0 ? '#f9f9fc' : '#f3f3f7'};border-radius:4px;margin-bottom:2px;padding:1px 0;box-shadow:0 1px 2px rgba(0,0,0,0.03);">
            ${lineHtml}
            <span style="font-family:Consolas,monospace;font-weight:bold;min-width:120px;">${node.itemPart}</span>
            <span style="margin-left:1em;color:#555;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${node.description}</span>
            <span style="margin-left:1em;background:#e3e3e3;border-radius:3px;padding:0 6px;font-size:12px;">L${node.level}</span>
            <span style="margin-left:1em;background:#e3e3e3;border-radius:3px;padding:0 6px;font-size:12px;">UOM: ${node.uom}</span>
            <span style="margin-left:1em;background:#e3e3e3;border-radius:3px;padding:0 6px;font-size:12px;">Qty/Per: ${node.qtyPer}</span>
          </div>
        `;
        if (node.children && node.children.length > 0) {
          html += renderTreeHtml(node.children, depth + 1, [...parentLastArr, isLast]);
        }
      });
      return html;
    }
    let html = `
      <html>
      <head>
        <title>BOM Print</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; font-size: 13px; background: #f5f6fa; }
          h2 { margin-bottom: 16px; font-size: 18px; }
          @media print {
            body { margin: 0; background: #fff; }
            div { background: none !important; }
          }
        </style>
      </head>
      <body>
        <h2 style="letter-spacing:1px;text-align:center;margin-bottom:24px;">Bill of Materials</h2>
        <div style="max-width:900px;margin:0 auto;">
          ${renderTreeHtml(tree)}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 300);
    }
  }



  // exportToCsv() {
  //   if (!this.gridApi || this.bomData.length === 0) return;

  //   // Get all displayed rows with their tree structure
  //   const exportData: any[] = [];

  //   this.gridApi.forEachNodeAfterFilterAndSort((node) => {
  //     if (node.data) {
  //       const rowData = node.data;
  //       const bomLevel = rowData.bom_level || 0;
  //       const hasChildren = this.allBomData.some(
  //         (child) => child.parent_component === rowData.item_part
  //       );

  //       // Create indentation for tree structure
  //       const indent = '  '.repeat(bomLevel);
  //       const icon = hasChildren ? '📁' : '📄';
  //       const levelDisplay = rowData.bom_level_hierarchical === "Parent" ? "Parent" : `L${bomLevel}`;

  //       // Format the data exactly as displayed
  //       exportData.push({
  //         'Item Part (Tree)': `${indent}${icon} ${rowData.item_part} [${levelDisplay}]`,
  //         'Description': this.getFormattedDescription(rowData),
  //         'Level': rowData.bom_level_hierarchical === "Parent" ? "Parent" : rowData.bom_level || 0,
  //         'Qty Needed': parseFloat(rowData.qty_needed || 0).toFixed(4),
  //         'Status': this.getFormattedStatus(rowData),
  //         'Part Type': this.getFormattedPartType(rowData),
  //         'Revision': rowData.details?.revision || rowData.revision || "",
  //         'Buyer': rowData.details?.pt_buyer || rowData.details?.buyer || rowData.buyer || "",
  //         'Vendor': rowData.details?.pt_vend || rowData.details?.vendor || rowData.vendor || "",
  //         'Drawing': rowData.details?.pt_draw || rowData.details?.drawing || rowData.drawing || "",
  //         'UOM': rowData.details?.pt_um || rowData.details?.unit_of_measure || rowData.unit_of_measure || rowData.uom || "EA",
  //         'Phantom': this.getFormattedPhantom(rowData),
  //         'Issue Method': this.getFormattedIssueMethod(rowData),
  //         'ABC Class': rowData.details?.pt_abc || "",
  //         'Price': this.getFormattedPrice(rowData),
  //         'BOM Reference': rowData.bom_reference || "",
  //         'Mandatory': rowData.bom_mandatory === "1" || rowData.bom_mandatory === 1 ? "Required" : "Optional",
  //         'BOM Dates': this.getFormattedDates(rowData),
  //         'Last User': rowData.details?.bom_last_user || rowData.details?.last_user || "",
  //         'Parent Component': rowData.parent_component || ""
  //       });
  //     }
  //   });

  //   // Convert to CSV
  //   this.downloadCsv(exportData, 'bom-hierarchy-export.csv');
  // }

  // Toggle fullscreen mode for results panel
  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    setTimeout(() => {
      if (this.gridApi) {
        this.gridApi.sizeColumnsToFit();
      }
    }, 200);
  }

  // Handle AG Grid row selection event
  onSelectionChanged(): void {
    // You can implement logic here, e.g., get selected rows:
    if (this.gridApi) {
      const selectedRows = this.gridApi.getSelectedRows();
      console.log('Selected rows:', selectedRows);
      // Add your custom logic here (e.g., enable/disable actions)
    }
  }

  getMaxBomLevel(): number {
    if (!this.bomData || this.bomData.length === 0) return 0;
    return Math.max(...this.bomData.map(row => Number(row.bom_level) || 0));
  }

  get hasNoResults(): boolean {
    return !this.loading && this.bomData && this.bomData.length === 0 && !this.error;
  }

  getActiveBomCount(): number {
    if (!this.bomData) return 0;
    // Adjust the condition below to match your definition of 'active' item
    return this.bomData.filter(item => item.active === true || item.status === 'Active').length;
  }

  // Add new method to handle tree column auto-sizing with badge consideration
  private autoSizeTreeColumn(): void {
    if (!this.gridApi) return;

    let maxWidth = 250; // Increased minimum width
    const headerWidth = 180; // Increased width for header text "Item Part (Tree)"

    // Calculate the maximum content width by examining all visible nodes
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      if (node.data) {
        const itemPart = node.data.item_part || '';
        const bomLevel = node.data.bom_level || 0;
        const levelDisplay = node.data.bom_level_hierarchical === "Parent" ? "Parent" : `L${bomLevel}`;
        
        // Calculate text width considering:
        // - Icon (20px + 6px spacing) - increased spacing
        // - Item part text (increased per-character width)
        // - Badge width (increased estimate for padding and styling)
        // - Tree indentation (level * 24px) - increased indentation width
        // - Expansion/collapse icon (20px) - increased size
        
        const iconWidth = 26; // Increased from 20
        const treeIndentation = node.level * 24; // Increased from 20
        const expansionIconWidth = (node.childrenAfterGroup && node.childrenAfterGroup.length > 0) ? 20 : 0; // Increased from 16
        const itemPartWidth = itemPart.length * 10; // Increased from 8px per character
        const badgeWidth = levelDisplay.length * 10 + 35; // Increased badge padding and text width
        const spacing = 20; // Increased additional spacing
        
        const totalWidth = iconWidth + treeIndentation + expansionIconWidth + itemPartWidth + badgeWidth + spacing;
        maxWidth = Math.max(maxWidth, totalWidth);
      }
    });

    // Ensure we don't exceed reasonable bounds and consider header width
    maxWidth = Math.max(maxWidth, headerWidth);
    maxWidth = Math.min(maxWidth, 600); // Increased cap from 500px to 600px

    // Apply the calculated width
    this.gridApi.setColumnWidth('ag-Grid-AutoColumn', maxWidth);
  }
}
