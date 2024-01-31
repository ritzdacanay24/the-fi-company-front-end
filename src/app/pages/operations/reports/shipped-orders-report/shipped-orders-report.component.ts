import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { ReportService } from '@app/core/api/operations/report/report.service';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { SharedModule } from '@app/shared/shared.module';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { AgGridModule } from 'ag-grid-angular';
import { GridApi, ColumnApi } from 'ag-grid-community';
import moment from 'moment';
import { currencyFormatter, autoSizeColumns } from 'src/assets/js/util';

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, DateRangeComponent],
  selector: 'app-shipped-orders-report',
  templateUrl: './shipped-orders-report.component.html',
  styleUrls: []
})
export class ShippedOrdersReportComponent implements OnInit {
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public reportService: ReportService
  ) {
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.dateFrom = params['dateFrom'] || this.dateFrom;
      this.dateTo = params['dateTo'] || this.dateTo;
      this.dateRange = [this.dateFrom, this.dateTo];
    });


    this.getData()
  }

  title = 'Shipped Orders Report';

  dateFrom = moment().subtract(0, 'months').startOf('month').format('YYYY-MM-DD');;
  dateTo = moment().endOf('month').format('YYYY-MM-DD');
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event['dateFrom']
    this.dateTo = $event['dateTo']
    this.getData()
  }

  gridApi: GridApi;

  gridColumnApi: ColumnApi;

  data: any[];

  columnDefs:any = [
    { field: "STATUS", headerName: "Status" },
    { field: "SOD_PART", headerName: "Part", filter: "agTextColumnFilter" },
    { field: "FULLDESC", headerName: "Desc", filter: "agTextColumnFilter" },
    { field: "CP_CUST_PART", headerName: "Cust Part #", filter: "agTextColumnFilter" },
    { field: "SOD_NBR", headerName: "SO #", filter: "agTextColumnFilter", pinned: "left" },
    { field: "SOD_LINE", headerName: "Line #", filter: "agSetColumnFilter" },
    { field: "SOD_CONTR_ID", headerName: "PO #", filter: "agTextColumnFilter" },
    { field: "SO_CUST", headerName: "Cust", filter: "agMultiColumnFilter" },
    { field: "SO_SHIP", headerName: "Ship To", filter: "agTextColumnFilter" },
    { field: "SOD_QTY_ORD", headerName: "Qty Ordered", filter: "agTextColumnFilter" },
    { field: "SOD_QTY_SHIP", headerName: "Qty Shipped (MSTR)", filter: "agTextColumnFilter" },
    { field: "QTYOPEN", headerName: "Qty Open", filter: "agTextColumnFilter" },
    { field: "LD_QTY_OH", headerName: "Qty OH", filter: "agTextColumnFilter" },
    { field: "SOD_DUE_DATE", headerName: "Due Date", filter: "agSetColumnFilter" },
    { field: "SOD_ORDER_CATEGORY", headerName: "Customer CO #", filter: "agTextColumnFilter" },
    { field: "FG-Label", headerName: "FG Label", filter: "agSetColumnFilter" },
    { field: "SO_ORD_DATE", headerName: "Ordered Date", filter: "agSetColumnFilter" },
    { field: "PT_ROUTING", headerName: "Routing", filter: "agSetColumnFilter" },
    { field: "WORKORDERS", headerName: "WO #", filter: "agTextColumnFilter" },
    { field: "add_comments", headerName: "Comments", filter: "agSetColumnFilter" },
    { field: "recent_comments.comments_html", headerName: "Recent Comment", filter: "agTextColumnFilter" },
    { field: "CMT_CMMT", headerName: "QAD Comments", filter: "agTextColumnFilter" },
    { field: "OWNER", headerName: "Owner", filter: "agSetColumnFilter" },
    { field: "ABS_SHIP_QTY", headerName: "Qty Shipped", filter: "agTextColumnFilter" },
    { field: "ABS_PAR_ID", headerName: "Shipper", filter: "agTextColumnFilter" },
    { field: "ABS_SHP_DATE", headerName: "Shipped On", filter: "agTextColumnFilter" },
    { field: "TRANSACTIONTIME", headerName: "Transaction Time", filter: "agTextColumnFilter" },
    { field: "ABS_INV_NBR", headerName: "Inv #", filter: "agTextColumnFilter" },
    { field: "EXT", headerName: "Extended Amount", filter: "agTextColumnFilter", valueFormatter: currencyFormatter },
    { field: "sod_acct", headerName: "SOD Account", filter: "agSetColumnFilter" },
    { field: "shipViaAccount", headerName: "Ship Via Account", filter: "agSetColumnFilter" },
    { field: "arrivalDate", headerName: "Arrival Date", filter: "agTextColumnFilter" },
    { field: "sod_type", headerName: "Type", filter: "agTextColumnFilter" }
  ];

  gridOptions = {
    ...agGridOptions,
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;
      this.gridColumnApi = params.columnApi;

      let data = this.activatedRoute.snapshot.queryParams['gridParams']
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params) => {
      autoSizeColumns(params)
    },
    onFilterChanged: params => this.updateUrl(params),
    onSortChanged: params => this.updateUrl(params),
  };

  updateUrl = (params) => {
    let gridParams = _compressToEncodedURIComponent(params.api, params.columnApi);
    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: 'merge',
      queryParams: {
        gridParams
      }
    });
  }

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();
      let data: any = await this.reportService.getShippedOrdersReport(this.dateFrom, this.dateTo)
      this.data = data.orderInfo;
      this.router.navigate(['.'], {
        queryParams: {
          dateFrom: this.dateFrom,
          dateTo: this.dateTo
        },
        relativeTo: this.activatedRoute,
        queryParamsHandling: 'merge'
      });

      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }

  }
}
