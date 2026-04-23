import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AgGridModule } from 'ag-grid-angular';
import { AuthenticationService } from '@app/core/services/auth.service';

import { first } from 'rxjs/operators';

import moment from 'moment';

import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { agGridDateFilterdateFilter, currencyFormatter } from 'src/assets/js/util';
import { GridOptions, RowNode } from 'ag-grid-community';


function formatMoney(number) {
  if (!number) number = 0
  return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModule, AgGridModule],
  selector: 'app-inventory-valuation',
  templateUrl: './inventory-valuation.component.html',
  styleUrls: ['./inventory-valuation.component.scss']
})
export class InventoryValuationComponent implements OnInit {

  data: any;
  sub: any;

  theme = 'ag-theme-quartz';

  gridApi: any;
  gridColumnApi: any;

  fullscreen = false;

  tableConfig = {
    theme: this.theme,
    gridApi: null,
    fullscreen: false,
    setFullscreen: true,
    refreshData: this.getData.bind(this),
  };

  columnDefs = [
    {
      headerName: 'Additional Item Info',
      children: [
        { field: "pt_part", headerName: "Part", filter: "agMultiColumnFilter", pinned: 'left' },
        { field: "cp_cust", headerName: "Customer", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull },
        { field: "onhandqty", headerName: "OH Qty", filter: "agNumberColumnFilter", cellRenderer: this.ifValueIsNull },
        { field: "sct_cst_tot", headerName: "Standard Cost", filter: "agNumberColumnFilter", cellRenderer: this.convert1 },
        { field: "oh_value", headerName: "Current Ext Cost", filter: "agNumberColumnFilter", cellRenderer: this.convert },
        { field: "full_desc", headerName: "Description", filter: "agTextColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pt_status", headerName: "Part Status", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pt_sfty_stk", headerName: "Safety Stock Qty", filter: "agNumberColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pt_price", headerName: "Part Price", filter: "agNumberColumnFilter", cellRenderer: this.convert1, columnGroupShow: 'open' },
        { field: "pt_part_type", headerName: "Part Type", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pt_abc", headerName: "ABC", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pt_added", headerName: "Part Added", filter: "agDateColumnFilter", filterParams: agGridDateFilterdateFilter, cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pt_avg_int", headerName: "Avg Int", filter: "agNumberColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pl_desc", headerName: "Prod Line Desc", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pl_prod_line", headerName: "Prod Line", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pl_inv_acct", headerName: "Inventory Acct", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pt_iss_pol", headerName: "Issue Policy", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pt_buyer", headerName: "Buyer/Planner", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pt_pm_code", headerName: "Purchase/Manufacture", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pt_um", headerName: "UM", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "pt_avg_int", headerName: "PT Avg Int", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "is_coi", headerName: "COI", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "in_iss_date", headerName: "Last Issue", filter: "agMultiColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
      ],
    },
    {
      headerName: 'Purchase Order Info',
      marryChildren: true,
      children: [
        { field: "orderedqty", headerName: "Total PO Acty", filter: "agNumberColumnFilter", cellRenderer: this.convert1 },
        { field: "openpoqty", headerName: "Open PO Acty", filter: "agNumberColumnFilter", cellRenderer: this.convert1 },
        { field: "openpoqtycount", headerName: "Open PO QTY Count", filter: "agNumberColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
        { field: "last_due_date", headerName: "Last Due Date", filter: "agTextColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
      ],
    },
    {
      headerName: 'Sales Order Info',
      marryChildren: true,
      children: [
        { field: "open_balance", headerName: "Open Balance", filter: "agNumberColumnFilter", cellRenderer: this.convert1 },
        { field: "total_lines", headerName: "Total Open Lines", filter: "agNumberColumnFilter", cellRenderer: this.ifValueIsNull, columnGroupShow: 'open' },
      ],
    },
    {
      headerName: 'Work Order Info',
      marryChildren: true,
      children: [
        { field: "wod_qty_open", headerName: "Open Lines", filter: "agNumberColumnFilter", cellRenderer: this.ifValueIsNull },
      ],
    },
    {
      headerName: 'Annualized',
      marryChildren: true,
      children: [
        { field: "in_avg_iss", headerName: "Average Issues", filter: "agNumberColumnFilter", headerClass: 'bg-info-light', cellRenderer: this.fixed, pinned: 'right' },

        { field: "average_usage_value", headerName: "Average Usage Value", filter: "agNumberColumnFilter", cellRenderer: this.convert2, headerClass: 'bg-info-light', pinned: 'right' },

        {
          field: "inventory_turns", headerName: "Inventory Turns", filter: "agSetColumnFilter", cellRenderer: this.costValue11, cellStyle: this.scellStyle, headerClass: 'bg-info-light', aggFunc: "sum", pinned: 'right',
          filterValueGetter: params => {
            const turns = Number(params?.data?.inventory_turns);
            if (!Number.isFinite(turns)) {
              return null;
            }
            return turns >= 1 ? '>= 1' : '< 1';
          },
          filterParams: {
            values: ['>= 1', '< 1'],
            suppressMiniFilter: true
          }
        },
      ],
    },
  ];
  resultsq: any;
  lastUpdate: any;


  ifValueIsNull(params) {
    if (!params.value || params.value == "") {
      return '-'
    }
    return params.value
  }
  convert1(params) {
    if (params.value == 0) {
      return '-'
    }
    return formatMoney((params.value))
  }
  convert2(params) {
    return formatMoney((params.value))
  }
  convert(params) {
    if (params.value == 0) {
      return '-'
    }
    return formatMoney((params.value))
  }
  costValue(params) {
    if (params.data.inv_avg == 0) {
      return '-'
    } else if (!params.value || params.value == "") {
      return '0.0'
    }
    return params.value
  }
  costValue11(params) {
    if (params.data.inv_avg == 0) {
      return '-'
    } else if (!params.value || params.value == "") {
      return '0.0'
    }
    return params.value
  }


  fixed(params) {
    if (!params.value || params.value == "") {
      return '-'
    }
    return params.value.toFixed(4)
  }

  scellStyle(params) {
    return params.value < 1 ? { backgroundColor: '#FFE4E1', color: '#8b0000' } : params.value <= 2.9 ? { backgroundColor: '#ffdf00', color: '#967117' } : { backgroundColor: '#d0f0c0', color: '#228b22' }
  }

  scellHasValue(params) {
    return params.value ? { backgroundColor: '#ffdf00', color: '#000' } : null
  }

  gridOptions = {
    ...agGridOptions,
    columnDefs: this.columnDefs,
    onGridReady: this.onGridReady.bind(this),
    pagination: false,
    onFirstDataRendered: (params) => {
      const allColumnIds = this.getAllColumnIds(params);
      if (!allColumnIds.length) {
        return;
      }

      if (typeof params?.api?.autoSizeColumns === 'function') {
        params.api.autoSizeColumns(allColumnIds, false);
        return;
      }

      if (typeof params?.columnApi?.autoSizeColumns === 'function') {
        params.columnApi.autoSizeColumns(allColumnIds, false);
      }
    },
    getRowStyle: (params) => {
      if (params.node.rowPinned) {
        return { 'font-weight': 'bold' };
      }
      return {};
    },
  };

  sites = 'All';
  quickSearch = '';

  filterModal = {
    "pt_added": {
      "dateFrom": moment().subtract(1, 'years').format('YYYY-MM-DD'),
      "dateTo": null,
      "filterType": "date",
      "type": "lessThan"
    }
  };

  onFilterChanged(params: any) {
    if (!this.gridApi || !params?.api || !Array.isArray(this.data)) {
      return;
    }

    if (params.api.getModel().getRowCount() == this.data.length) {
      this.applyPinnedRows('top', []);
    } else {
      let pinnedBottomData = this.generatePinnedBottomData('top');
      this.applyPinnedRows('top', [pinnedBottomData]);
    }
  }

  constructor(
    private http: HttpClient,
    private authenticationService: AuthenticationService
  ) { }

  formatCurrency(value: any): string {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return '$0.00';
    }
    return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  onQuickSearchChange(value: string): void {
    this.quickSearch = value || '';
    this.applyQuickFilter();
  }

  clearQuickSearch(): void {
    this.quickSearch = '';
    this.applyQuickFilter();
  }

  private applyQuickFilter(): void {
    if (!this.gridApi) {
      return;
    }

    const quickFilterText = String(this.quickSearch || '').trim();
    if (typeof this.gridApi.setGridOption === 'function') {
      this.gridApi.setGridOption('quickFilterText', quickFilterText);
      return;
    }

    if (typeof this.gridApi.setQuickFilter === 'function') {
      this.gridApi.setQuickFilter(quickFilterText);
    }
  }

  getInventoryValuation(showAll): any {
    return this.http.get<any>(`apiV2/reports/inventory-valuation?showAll=${showAll}`);
  }

  ngOnInit(): void {
    this.getData();
  }

  private showHideOverlay(isShow) {
    if (this.gridApi) {
      isShow ? this.gridApi.showLoadingOverlay() : this.gridApi.hideOverlay();
    }
  }

  generatePinnedBottomData(v = 'bottom') {
    if (!this.gridApi) {
      return {};
    }

    // generate a row-data with null values
    let result: any = {};

    const allColumnIds = this.getAllColumnIds();
    for (const colId of allColumnIds) {
      result[colId] = null;
    }


    return this.calculatePinnedBottomData(result, v);
  }

  private applyPinnedRows(position: 'top' | 'bottom', rows: any[]): void {
    if (!this.gridApi) {
      return;
    }

    const methodName = position === 'top' ? 'setPinnedTopRowData' : 'setPinnedBottomRowData';
    if (typeof this.gridApi[methodName] === 'function') {
      this.gridApi[methodName](rows);
      return;
    }

    if (typeof this.gridApi.setGridOption === 'function') {
      const optionName = position === 'top' ? 'pinnedTopRowData' : 'pinnedBottomRowData';
      this.gridApi.setGridOption(optionName, rows);
    }
  }

  private getAllColumnIds(params?: any): string[] {
    const ids: string[] = [];

    const columnsFromApi = params?.api?.getColumns?.() || this.gridApi?.getColumns?.() || [];
    for (const col of columnsFromApi) {
      const id = typeof col?.getColId === 'function' ? col.getColId() : col?.colId;
      if (id) {
        ids.push(id);
      }
    }

    if (ids.length) {
      return ids;
    }

    const legacyCols = params?.columnApi?.getAllColumns?.()
      || this.gridColumnApi?.getAllColumns?.()
      || this.gridColumnApi?.getAllGridColumns?.()
      || [];

    for (const col of legacyCols) {
      const id = typeof col?.getColId === 'function' ? col.getColId() : col?.colId;
      if (id) {
        ids.push(id);
      }
    }

    return ids;
  }

  calculatePinnedBottomData(target: any, v = 'bottom') {
    //**list of columns for aggregation**
    const columnsWithAggregation = [
      'total_lines',
      'open_balance',
      'inv_avg',
      'gl_ext_amount_4',
      'gl_ext_amount_3',
      'gl_ext_amount_2',
      'gl_ext_amount_1',
      'oh_value',
      'orderedqty',
      'openpoqty',
      'usage_3_qty',
      'usage_3_months',
      'inventory_turns_test'
    ];

    const currencySummaryFields = new Set([
      'open_balance',
      'gl_ext_amount_4',
      'gl_ext_amount_3',
      'gl_ext_amount_2',
      'gl_ext_amount_1',
      'oh_value',
      'orderedqty',
      'openpoqty'
    ]);

    columnsWithAggregation.forEach(element => {
      let total = 0;

      this.gridApi.forEachNodeAfterFilter((rowNode: RowNode) => {
        const rawValue = Number(rowNode?.data?.[element]);
        if (Number.isFinite(rawValue)) {
          total += rawValue;
        }
      });

      target[element] = Number(total.toFixed(2));

      if (currencySummaryFields.has(element)) {
        target[element] = this.formatCurrency(target[element]);
      }

    });

    target.inventory_turns_testing = '-';
    target.inventory_turns = '-';
    target.sct_cst_tot = '-';
    target.pt_part = v == 'top' ? 'Filtered Summary' : 'Summary';
    return target;
  }

  greaterThanOne: any = 0;
  lessThanOrEqualToOne: any = 0;
  totalInventory: any = 0;
  other: any = 0;
  calculateTurnsSummary() {

    //inventory_turns
    let greaterThanOne = 0;
    let lessThanOrEqualToOne = 0;
    let totalInventory = 0;
    let other = 0;
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i].inventory_turns >= 1.0) {
        greaterThanOne += this.data[i].oh_value
      } else if (this.data[i].inventory_turns < 1) {
        lessThanOrEqualToOne += this.data[i].oh_value
      } else {
        other += this.data[i].oh_value

      }

      totalInventory += this.data[i].oh_value



    }

    this.greaterThanOne = Number(greaterThanOne.toFixed(2));
    this.lessThanOrEqualToOne = Number(lessThanOrEqualToOne.toFixed(2));
    this.totalInventory = Number(totalInventory.toFixed(2));
    this.other = Number(other.toFixed(2));
  }

  getData() {
    this.showHideOverlay(true);
    const showAll = this.sites || 'All';
    this.sub = this
      .getInventoryValuation(showAll)
      .pipe(first())
      .subscribe((data) => {
        this.showHideOverlay(false);
        this.lastUpdate = data.lastUpdate;
        this.data = data.results
        this.resultsq = data.resultsq;

        if (this.authenticationService.currentUser()?.id == 3)
          console.log(this.data);

        this.calculateTurnsSummary();
        this.applyQuickFilter();
        setTimeout(() => {
          if (!this.gridApi) {
            return;
          }
          let pinnedBottomData = this.generatePinnedBottomData();
          this.applyPinnedRows('bottom', [pinnedBottomData]);
        }, 500)


        // setTimeout(() => {
        //   if (this.filterModal) this.gridApi.setFilterModel(this.filterModal);
        // });

      }, () => this.showHideOverlay(true));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  showAll = false;
  showAllChange() {
    this.showAll = !this.showAll
    this.getData()
  }



  getMonthName1(this, num) {
    let e = moment().subtract(3, 'months').endOf('month').format('MMM YYYY')
    let ee = moment().subtract(1, 'months').endOf('month').format('MMM YYYY')
    return e + ' to ' + ee;

  }
  getMonthName(this, num) {
    let e = moment().subtract(parseInt(num), 'months').endOf('month').format('MMM YYYY')
    return e;

  }

  onGridReady(params: any) {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    this.tableConfig.gridApi = params.api;
    this.applyQuickFilter();

  }
}