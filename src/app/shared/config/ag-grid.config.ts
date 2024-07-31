import { GridOptions } from "ag-grid-community";

let popupParent: HTMLElement | null = document.querySelector("card");
export const agGridOptions: GridOptions = {
  groupTotalRow: null,
  singleClickEdit: true,
  columnDefs: [],
  rowData: null,
  groupDisplayType: "groupRows",
  groupSuppressBlankHeader: true,
  enableRangeHandle: true,
  suppressMenuHide: false,
  suppressCopyRowsToClipboard: true,
  enableRangeSelection: true,
  rowSelection: "multiple",
  // undoRedoCellEditing: true,
  // undoRedoCellEditingLimit: 5,
  suppressDragLeaveHidesColumns: false,
  defaultCsvExportParams: {
    skipPinnedTop: true,
    skipPinnedBottom: true,
  },
  popupParent: popupParent,
  autoSizeStrategy: {
    type: "fitCellContents",
  },

  // autoGroupColumnDef: {
  //   headerName: "Athlete",
  //   field: "athlete",
  //   minWidth: 250,
  //   cellRenderer: "agGroupCellRenderer",
  //   cellRendererParams: {
  //     checkbox: true,
  //   } as IGroupCellRendererParams,
  // },

  defaultExcelExportParams: {
    skipPinnedTop: true,
    skipPinnedBottom: true,
  },
  defaultColDef: {
    
    cellDataType: false,
    sortable: true,
    filter: true,
    resizable: true,
    enableValue: true,
    enableRowGroup: true,
    enablePivot: false,
    floatingFilter: true,
    enableCellChangeFlash: true,
    // filterParams: {
    //   buttons: ['reset'],
    //   inRangeInclusive: true,
    //   debounceMs: 200,
    //   applyMiniFilterWhileTyping: true,
    //   defaultToNothingSelected: true
    // },
    cellRenderer: (params: any) => {
      if (params.valueFormatted) return params.valueFormatted;
      return params.value !== null && params.value !== "" ? params.value : "-";
    },
  },
  allowDragFromColumnsToolPanel: true,
  stopEditingWhenCellsLoseFocus: true,
  animateRows: true,
  pagination: false,
  onGridReady: function (params: any) {},
  suppressChangeDetection: true,
  columnMenu: "new",
  sideBar: {
    toolPanels: [
      {
        id: "columns",
        labelDefault: "Columns",
        labelKey: "columns",
        iconKey: "columns",
        toolPanel: "agColumnsToolPanel",
        toolPanelParams: {
          syncLayoutWithGrid: true,
        },
      },
      {
        id: "filters",
        labelDefault: "Filters",
        labelKey: "filters",
        iconKey: "filter",
        toolPanel: "agFiltersToolPanel",
        toolPanelParams: {
          syncLayoutWithGrid: true,
        },
      },
    ],
  },
  enableCharts: true,
  statusBar: {
    statusPanels: [
      { statusPanel: "agTotalAndFilteredRowCountComponent", align: "left" },
      { statusPanel: "agFilteredRowCountComponent" },
      // { statusPanel: 'agSelectedRowCountComponent' },
      {
        statusPanel: "agAggregationComponent",
        statusPanelParams: {
          aggFuncs: ["count", "sum", "min", "max", "avg"],
        },
      },
    ],
  },
  suppressScrollOnNewData: true,
  overlayLoadingTemplate:
    '<span class="ag-overlay-loading-center">Please wait while we load the data.</span>',
  suppressColumnVirtualisation: true,
};

export const isDarkTheme = () => {
  return localStorage.getItem("myapp-theme") == "Dark";
};

export function autoSizeAll(gridColumnApi: { getAllColumns: () => any[] }) {
  var allColumnIds: any[] = [];
  gridColumnApi.getAllColumns().forEach(function (column: { colId: any }) {
    allColumnIds.push(column.colId);
  });
  return allColumnIds;
}
