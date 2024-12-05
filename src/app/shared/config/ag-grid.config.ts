import {
  GetContextMenuItemsParams,
  GridOptions,
  ModelUpdatedEvent,
} from "ag-grid-community";
import { GridFiltersToolPanel } from "../ag-grid/grid-filters-tool-panel/grid-filters-tool-panel.component";
import { GridSettingsToolPanel } from "../ag-grid/grid-settings-tool-panel/grid-settings-tool-panel.component";
import { ClearFilterStatusBarComponent } from "../ag-grid/cell-renderers/clear-filter/clear-filter-bar.component";
import { MenuItem } from "./menuItem";
import { MenuPin } from "./menuPin";

let popupParent: HTMLElement | null = document.querySelector("card");
export const agGridOptions: GridOptions = {
  groupTotalRow: null,
  singleClickEdit: true,
  columnDefs: [],
  rowData: null,
  groupDisplayType: "groupRows",
  groupSuppressBlankHeader: true,
  // enableRangeHandle: true,
  suppressMenuHide: false,
  // suppressCopyRowsToClipboard: true,
  // enableRangeSelection: true,

  rowSelection: {
    mode: "multiRow",
    checkboxes: false,
    enableClickSelection: true,
    copySelectedRows: false,
    headerCheckbox: false,
  },

  cellSelection: {
    suppressMultiRanges: false,
    handle: {
      mode: "range",
    },
  },
  // turns OFF row hover, it's on by default
  suppressRowHoverHighlight: false,
  // turns ON column hover, it's off by default
  columnHoverHighlight: false,

  // rowSelection: "multiple",
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
    skipHeader: false,
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
    filterParams: {
      buttons: ["reset"],
      inRangeInclusive: true,
      debounceMs: 0,
      applyMiniFilterWhileTyping: true,
      defaultToNothingSelected: true,
    },
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

  getContextMenuItems: (params: GetContextMenuItemsParams) => {
    return [
      ...(params.defaultItems || []),
      "separator",
      {
        name: "Copy Selected Row(s)",
        suppressCloseOnSelect: false,
        menuItem: MenuItem,
        menuItemParams: {
          buttonValue: "Copy",
          params: params,
        },
        icon: "ag-icon icon-copy",
      },
      {
        name: "Pinned To Top",
        suppressCloseOnSelect: false,
        menuItem: MenuPin,
        menuItemParams: {
          buttonValue: "Pin Row To Top",
          params: params,
        },
        icon: "ag-icon icon-copy",
      },
    ];
  },
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
      // {
      //   id: "grid-settings",
      //   labelDefault: "Grid Settings",
      //   labelKey: "grid-settings",
      //   iconKey: "pivot",
      //   toolPanel: GridSettingsToolPanel,
      //   minWidth: 310,
      //   width: 310,
      // },
      // {
      //   id: "grid-custom-filters",
      //   labelDefault: "Custom Filter",
      //   labelKey: "grid-customer-filter",
      //   iconKey: "filter",
      //   toolPanel: GridFiltersToolPanel,
      //   minWidth: 310,
      //   width: 310,
      // },
    ],
  },
  enableCharts: true,
  statusBar: {
    statusPanels: [
      { statusPanel: "agTotalAndFilteredRowCountComponent", align: "left" },
      { statusPanel: "agFilteredRowCountComponent" },
      // { statusPanel: "agSelectedRowCountComponent" },
      {
        statusPanel: "agAggregationComponent",
        statusPanelParams: {
          aggFuncs: ["count", "sum", "min", "max", "avg"],
        },
      },
      {
        statusPanel: ClearFilterStatusBarComponent,
      },
    ],
  },
  suppressScrollOnNewData: true,
  overlayLoadingTemplate:
    '<span class="ag-overlay-loading-center">Please wait while we load the data.</span>',
  suppressColumnVirtualisation: false,
  onModelUpdated: (event: ModelUpdatedEvent) => {
    event.api.getDisplayedRowCount() === 0
      ? event.api.showNoRowsOverlay()
      : event.api.hideOverlay();
  },
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
