import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SalesOrderInfoService } from '@app/core/api/sales-order/sales-order-info.service';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { AgGridModule } from 'ag-grid-angular';
import { SharedModule } from '@app/shared/shared.module';
import { LoadingComponent } from '@app/shared/loading/loading.component';
import { SoSearchComponent } from '../so-search/so-search.component';

@Injectable({
  providedIn: 'root'
})
export class SalesOrderInfoModalService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  open(salesOrderLineNumber: string) {
    this.modalRef = this.modalService.open(SalesOrderInfoModalComponent, { size: 'lg', windowClass: 'modal-xxl' });
    this.modalRef.componentInstance.salesOrderNumber = salesOrderLineNumber;
    this.getInstance();
  }

  getInstance() {
    return this.modalRef;
  }

}

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, LoadingComponent, SoSearchComponent],
  selector: 'app-sales-order-info-modal',
  templateUrl: `./sales-order-info-modal.component.html`,
  styleUrls: [],
})

export class SalesOrderInfoModalComponent {
  transactions: any = [];
  loadingIndicatorTransactions: boolean;

  constructor(
    private salesOrderInfoService: SalesOrderInfoService,
    private ngbActiveModal: NgbActiveModal
  ) { }

  @Input() public salesOrderNumber: string = '';
  @Output() passEntry: EventEmitter<any> = new EventEmitter();


  async notifyParent($event) {
    this.salesOrderNumber = $event.sod_nbr;
    this.getData()
  }

  data: any = {
    address: {},
    main: {},
    mainDetails: [],
    ship: [],
    trans: [],
  };
  isLoading = true;

  columnDefs: any = [
    { field: "sod_part", headerName: "Part #", filter: "agTextColumnFilter" },
    { field: "sod_custpart", headerName: "Customer Part", filter: "agTextColumnFilter" },
    { field: "sod_due_date", headerName: "Due Date", filter: "agTextColumnFilter" },
    { field: "sod_line", headerName: "Line #", filter: "agTextColumnFilter" },
    { field: "sod_order_category", headerName: "CO #", filter: "agTextColumnFilter" },
    { field: "sod_contr_id", headerName: "Customer PO #", filter: "agTextColumnFilter" },
    { field: "sod_qty_ord", headerName: "Ordered", filter: "agTextColumnFilter" },
    { field: "sod_qty_all", headerName: "Allocated", filter: "agTextColumnFilter" },
    { field: "sod_qty_pick", headerName: "Picked", filter: "agTextColumnFilter" },
    { field: "sod_qty_ship", headerName: "Shipped", filter: "agTextColumnFilter" },
    { field: "ABS_SHP_DATE", headerName: "Shipped Date", filter: "agTextColumnFilter" },
    { field: "SHORT", headerName: "Qty Short", filter: "agTextColumnFilter" },
    {
      field: "PERCENT", headerName: "% Complete", filter: "agTextColumnFilter", pinned: 'right', valueFormatter: this.formatNumber.bind(this),
      cellStyle: params => {
        if (params.value === 100) {
          //mark police cells as red
          return { color: '#fff', backgroundColor: '#50C878' };
        }
        return null;
      }
    },
    { field: "COMMENTSMAXHTML", headerName: "Last Comment", filter: "agTextColumnFilter" },
    { field: "CMT_CMMT", headerName: "QAD Comment", filter: "agTextColumnFilter" }
  ];

  gridApi: any;
  gridColumnApi: any;

  gridOptions = {
    ...agGridOptions,
    columnDefs: this.columnDefs,
    onFirstDataRendered: (params) => {
      this.autoSizeAll(false);
    },
    onGridReady: (params) => {
      this.gridApi = params.api;
      this.gridColumnApi = params.columnApi;
    },
    sideBar: false,
  };

  print() {

    setTimeout(() => {
      var printContents = document.getElementById('print').innerHTML;
      var popupWin = window.open('', '_blank', 'width=1000,height=600');
      popupWin.document.open();
      popupWin.document.write(`
      <html>
        <head>
          <title>Work Order Info</title>
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
          <style>
            @page {
              size: A3 portrait;
            }
            .table{
              font-size:12px
            }
            .col-print-1 {width:8%;  float:left;}
            .col-print-2 {width:16%; float:left;}
            .col-print-3 {width:25%; float:left;}
            .col-print-4 {width:33%; float:left;}
            .col-print-5 {width:42%; float:left;}
            .col-print-6 {width:50%; float:left;}
            .col-print-7 {width:58%; float:left;}
            .col-print-8 {width:66%; float:left;}
            .col-print-9 {width:75%; float:left;}
            .col-print-10{width:83%; float:left;}
            .col-print-11{width:92%; float:left;}
            .col-print-12{width:100%; float:left;}
          </style>
        </head>
        <body onload="window.print();window.close()">
          ${printContents}
        </body>
      </html>`
      );
      popupWin.document.close();

      popupWin.onfocus = function () {
        setTimeout(function () {
          popupWin.focus();
          popupWin.document.close();
        }, 300);
      };
    }, 200);
  }

  autoSizeAll(skipHeader) {
    var allColumnIds = [];
    this.gridColumnApi.getColumns().forEach(function (column) {
      allColumnIds.push(column.colId);
    });

    this.gridColumnApi.autoSizeColumns(allColumnIds, skipHeader);
  }

  formatNumber(row) {
    // this puts commas into the number eg 1000 goes to 1,000,
    // i pulled this from stack overflow, i have no idea how it works
    if (!row.value) {
      return '0.00 %'
    }

    return row.value.toFixed(2) + '%'
  }

  /**
   * Shipped Details
   */

  columnDefs1 = [
    { field: "abs_shipto", headerName: "Ship To", filter: "agTextColumnFilter" },
    { field: "abs_shp_date", headerName: "Ship Date", filter: "agTextColumnFilter" },
    { field: "abs_item", headerName: "Part #", filter: "agTextColumnFilter" },
    { field: "abs_line", headerName: "Line", filter: "agTextColumnFilter" },
    { field: "abs_ship_qty", headerName: "Ship Qty", filter: "agTextColumnFilter" },
    { field: "abs_inv_nbr", headerName: "Inv #", filter: "agTextColumnFilter" },
    { field: "abs_par_id", headerName: "Packing Slip #", filter: "agTextColumnFilter" }
  ];

  gridApi1: any;
  gridColumnApi1: any;

  gridOptions1 = {
    ...agGridOptions,
    columnDefs: this.columnDefs1,
    onFirstDataRendered: (params) => {
      params.api.sizeColumnsToFit();
    },
    onGridReady: (params) => {
      this.gridApi1 = params.api;
      this.gridColumnApi1 = params.columnApi;
    },
    sideBar: false,
  };

  /**
   * Trans Details
   */

  columnDefs2 = [
    {
      field: 'tr_date',
      headerName: 'Transaction Date',
      filter: 'agTextColumnFilter',
    },
    {
      field: 'tr_per_date',
      headerName: 'Performance Date',
      filter: 'agTextColumnFilter',
    },
    { field: 'tr_time', headerName: 'Time', filter: 'agTextColumnFilter' },
    {
      field: 'tr_nbr',
      headerName: 'Transaction #',
      filter: 'agTextColumnFilter',
    },
    { field: 'tr_type', headerName: 'Type', filter: 'agTextColumnFilter' },
    {
      field: 'tr_part',
      headerName: 'Part #',
      filter: 'agTextColumnFilter'
    },
    {
      field: 'tr_qty_loc',
      headerName: 'Qty Changed Location',
      filter: 'agTextColumnFilter',
    },
    { field: 'tr_rmks', headerName: 'Remarks', filter: 'agTextColumnFilter' },
    {
      field: 'tr_ship_id',
      headerName: 'Packing Slip',
      filter: 'agTextColumnFilter',
    },
    {
      field: 'tr_qty_chg',
      headerName: 'Qty Changed',
      filter: 'agTextColumnFilter',
    },
    {
      field: 'tr_qty_req',
      headerName: 'Qty Required',
      filter: 'agTextColumnFilter',
    },
    { field: 'tr_userid', headerName: 'User', filter: 'agTextColumnFilter' },
  ]

  gridApi2: any;
  gridColumnApi2: any;

  gridOptions2 = {
    ...agGridOptions,
    columnDefs: this.columnDefs2,
    onFirstDataRendered: (params) => {
      params.api.sizeColumnsToFit();
    },
    onGridReady: (params) => {
      this.gridApi2 = params.api;
      this.gridColumnApi2 = params.columnApi;
    },
    sideBar: false,
  };

  getTransactions() {
    this.loadingIndicatorTransactions = true;
    this.salesOrderInfoService.getTransactions(this.salesOrderNumber).subscribe(
      (data: any) => {
        this.transactions = data;
        this.loadingIndicatorTransactions = false;
      }, error => {
        this.loadingIndicatorTransactions = false;
      })

  }

  getData = () => {
    this.isLoading = true;
    this.salesOrderInfoService.getSalesOrderNumberDetails(this.salesOrderNumber).subscribe(
      (data: any) => {
        this.data = data;
        this.isLoading = false;
      }, error => {
        this.isLoading = false;
      })
  }
  ngOnInit() {
    this.getData();
  }

  dismiss() {
    this.ngbActiveModal.dismiss('dismiss');
  }

  close() {
    this.ngbActiveModal.close(this.data);
  }

}
