import { GridOptions } from "ag-grid-community";

export const agGridOptions: GridOptions = {
  groupIncludeFooter: true,
  groupIncludeTotalFooter: false,
  singleClickEdit: true,
  columnDefs: [],
  rowData: null,
  suppressMenuHide: false,
  suppressCopyRowsToClipboard: true,
  enableRangeSelection: true,
  rowSelection: 'multiple',
  // undoRedoCellEditing: true,
  // undoRedoCellEditingLimit: 5,
  suppressDragLeaveHidesColumns: false,
  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true,
    enableValue: true,
    enableRowGroup: true,
    enablePivot: false,
    floatingFilter: true,
    filterParams: {
      buttons: ['reset'],
      inRangeInclusive: true,
      debounceMs: 200,
      applyMiniFilterWhileTyping: true,
      defaultToNothingSelected: true
    },
    cellRenderer: (params: any) => {
      if (params.valueFormatted) return params.valueFormatted
      return params.value !== null && params.value !== '' ? params.value : '-'
    }
  },
  stopEditingWhenCellsLoseFocus: true,
  animateRows: true,
  pagination: false,
  onGridReady: function (params: any) { },
  suppressChangeDetection: true,
  columnMenu: "new",
  sideBar: {
    toolPanels: [
      {
        id: 'columns',
        labelDefault: 'Columns',
        labelKey: 'columns',
        iconKey: 'columns',
        toolPanel: 'agColumnsToolPanel',
        toolPanelParams: {
          syncLayoutWithGrid: true
        }
      },
      {
        id: 'filters',
        labelDefault: 'Filters',
        labelKey: 'filters',
        iconKey: 'filter',
        toolPanel: 'agFiltersToolPanel',
        toolPanelParams: {
          syncLayoutWithGrid: true
        }
      }
    ],
  },
  enableCharts: false,
  enableCellChangeFlash: true,
  statusBar: {
    statusPanels: [
      { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
      { statusPanel: 'agFilteredRowCountComponent' },
      // { statusPanel: 'agSelectedRowCountComponent' },
      {
        statusPanel: 'agAggregationComponent',
        statusPanelParams: {
          aggFuncs: ['count', 'sum', 'min', 'max', 'avg'],
        },
      },
    ],
  },
  suppressScrollOnNewData: true,
  overlayLoadingTemplate:
    '<span class="ag-overlay-loading-center">Please wait while we load the data.</span>',
  suppressColumnVirtualisation: true
}

export const TABLE_GRID_CONFIG = {
  gridApi: false,
  gridColumnApi: false,
  theme: localStorage.getItem('myapp-theme') == 'Dark' ? 'ag-theme-balham-' + localStorage.getItem('myapp-theme').toLocaleLowerCase() : 'ag-theme-balham',
  refreshData: false,
  setFullscreen: true,
  fullscreen: false,
  setUserGrid: true,
  onGridReady: function (params: any) {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;

    this.theme = localStorage.getItem('myapp-theme') == 'Dark' ? 'ag-theme-balham-' + localStorage.getItem('myapp-theme').toLocaleLowerCase() : 'ag-theme-balham'
  }
}

export const isDarkTheme = () => {
  return TABLE_GRID_CONFIG.theme.includes('dark');
}

export function autoSizeAll(gridColumnApi: { getAllColumns: () => any[]; }) {
  var allColumnIds: any[] = [];
  gridColumnApi.getAllColumns().forEach(function (column: { colId: any; }) {
    allColumnIds.push(column.colId);
  });
  return allColumnIds
}

export const AG_THEME = 'balham';
