import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { FormBuilder, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";

@Component({
  selector: "app-bom-graphics",
  templateUrl: "./bom-graphics.component.html",
  styleUrls: ["./bom-graphics.component.scss"],
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, AgGridModule],
})
export class BomGraphicsComponent implements OnInit {
  constructor(private http: HttpClient, private fb: FormBuilder) { }

  bomData: any[] = [];
  processedData: any[] = [];
  loading = false;
  error: string = "";
  filterForm: FormGroup;
  gridApi: GridApi;

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

  columnDefs: ColDef[] = [
    // Priority/Urgency indicator
    {
      field: "urgency",
      headerName: "🚨",
      width: 50,
      cellRenderer: (params) => {
        const dueDate = params.data.due_date || params.data.details?.bom_start_date;
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
      hide: true, // Hide the column since it's grouped
      cellRenderer: (params) => {
        const partType = params.data?.details?.part_type || params.data?.part_type || '';
        const revision = params.data?.details?.revision || '';
        return `${params.value} ${partType} ${revision ? `Rev: ${revision}` : ''}`;
      }
    },

    {
      field: "item_description",
      headerName: "Description",
      filter: "agTextColumnFilter",
      width: 250
    },

    {
      field: "qty_needed",
      headerName: "Quantity",
      filter: "agNumberColumnFilter",
      width: 120,
      aggFunc: 'sum', // Built-in aggregation
      cellRenderer: (params) => {
        const qty = parseFloat(params.value || 0);
        const uom = params.data?.details?.pt_um || 'EA';
        return `${qty.toFixed(2)} ${uom}`;
      }
    },

    {
      field: "line_value",
      headerName: "Line Value",
      width: 120,
      valueGetter: (params) => {
        // Calculate line value
        const qty = parseFloat(params.data.qty_needed || 0);
        const price = parseFloat(params.data.details?.pt_price || 0);
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
      headerName: "Status",
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
        if (params.data) { return params.data.sales_order || params.data.so_part || '' }
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
      valueGetter: (params) => params.data.buyer || params.data.details?.pt_buyer || ''
    },

    {
      field: "woNumber",
      headerName: "WO Number",
      editable: true,
      filter: "agTextColumnFilter",
      width: 120,
      cellEditor: "agTextCellEditor",
      onCellValueChanged: (params) => this.onWoNumberChanged(params),
      cellStyle: { backgroundColor: "#f0f8ff" }
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
        innerRenderer: (params: any) => {
          if (params.data) {
            // Leaf node - show sales order info
            const so = params.data.sales_order || params.data.so_part || '';
            const line = params.data.line_number || '';
            return `SO: ${so} ${line ? `Line: ${line}` : ''}`;
          } else {
            // Group node - show part number with count
            const partType = params.node.allLeafChildren?.[0]?.data?.details?.part_type || '';
            return `${params.value} ${partType ? `(${partType})` : ''}`;
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
    suppressAggFuncInHeader: true,
    enableCellTextSelection: true,
    rowSelection: "multiple",
    enableRangeSelection: true,

    // Group display type
    groupDisplayType: 'groupRows'
  };

  fetchBOM() {
    this.loading = true;
    this.error = "";
    const formValues = this.filterForm.value;

    const url = `https://dashboard.eye-fi.com/tasks/GraphicsDemandsV1%20copy.php?days=300&debug=0&graphics_only=1&so=${encodeURIComponent(
      formValues.so || ''
    )}&nested=0&part=${encodeURIComponent(formValues.part || '')}`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.bomData = data.map((item) => ({
          ...item,
          woNumber: item.details?.graphics_status_info?.woNumber || item.woNumber || "",
          checked: item.checked || "Not Ordered",
          // ...existing fields...
        }));

        // Set the data directly - AG Grid will handle grouping
        this.processedData = this.bomData;
        this.loading = false;

        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', this.processedData);
        }
      },
      error: (err) => {
        this.error = "Failed to load BOM data.";
        this.loading = false;
      },
    });
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

  // Expand/collapse all groups
  expandAllGroups() {
    if (this.gridApi) {
      this.gridApi.expandAll();
    }
  }

  collapseAllGroups() {
    if (this.gridApi) {
      this.gridApi.collapseAll();
    }
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
