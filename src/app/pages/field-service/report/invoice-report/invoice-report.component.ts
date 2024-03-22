import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { GridApi, ColumnApi } from 'ag-grid-community';
import moment from 'moment';
import { NAVIGATION_ROUTE } from '../../job/job-constant';
import { InvoiceReportChartComponent } from './invoice-report-chart/invoice-report-chart.component';
import { ReportService } from 'src/app/core/api/field-service/report.service';
import { LinkRendererComponent } from 'src/app/shared/ag-grid/cell-renderers';
import { agGridOptions } from 'src/app/shared/config/ag-grid.config';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { currencyFormatter, highlightRowView } from 'src/assets/js/util';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, DateRangeComponent, InvoiceReportChartComponent],
  selector: 'app-invoice-report',
  templateUrl: './invoice-report.component.html',
  styleUrls: []
})
export class InvoiceReportComponent implements OnInit {
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
      this.id = params['id'];
      this.dateRange = [this.dateFrom, this.dateTo];
    });


    this.getData()
  }

  title = 'Invoice Report';

  id = null;

  dateFrom = moment().subtract(12, 'months').startOf('month').format('YYYY-MM-DD');;
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

  chartData = []

  isLoading = false;

  view(fsid) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi, this.gridColumnApi);
    this.router.navigate([NAVIGATION_ROUTE.OVERVIEW], {
      queryParamsHandling: 'merge',
      queryParams: {
        id: fsid,
        gridParams,
        'start': this.dateFrom,
        'end': this.dateTo,
        goBackUrl: location.pathname,
        active: 2
      }
    });
  }

  columnDefs: any = [
    {
      field: "View", headerName: "View", filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererComponent,
      cellRendererParams: {
        onClick: (e: any) => this.view(e.rowData.id),
        value: 'SELECT'
      },
      maxWidth: 115,
      minWidth: 115
    },
    { field: 'id', headerName: 'id', filter: 'agMultiColumnFilter' },
    { field: 'request_date', headerName: 'Request Date', filter: 'agMultiColumnFilter' },
    { field: 'service_type', headerName: 'Service Type', filter: 'agMultiColumnFilter' },
    { field: 'customer', headerName: 'Customer', filter: 'agMultiColumnFilter' },
    { field: 'sign_theme', headerName: 'Sign Theme', filter: 'agMultiColumnFilter' },
    { field: 'billable', headerName: 'Billable', filter: 'agMultiColumnFilter' },
    { field: 'acc_status', headerName: 'Account Status', filter: 'agMultiColumnFilter' },
    { field: 'invoice_date', headerName: 'Invoice Date', filter: 'agMultiColumnFilter' },
    { field: 'invoice_notes', headerName: 'Invoice Notes', filter: 'agMultiColumnFilter', width: 300 },
    { field: 'invoice_number', headerName: 'Invoice Number', filter: 'agMultiColumnFilter' },
    { field: 'period', headerName: 'Period', filter: 'agMultiColumnFilter' },
    { field: 'vendor_cost', headerName: 'Vendor Cost', filter: 'agMultiColumnFilter', valueFormatter: currencyFormatter },
    { field: 'vendor_inv_number', headerName: 'Vendor Invoice Number', filter: 'agMultiColumnFilter' },
    { field: 'invoice', headerName: 'Invoice Amount', filter: 'agMultiColumnFilter', pinned: 'right', valueFormatter: currencyFormatter },
  ]

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
      highlightRowView(params, 'id', this.id);
      //autoSizeColumns(params)
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
      this.isLoading = true;
      this.gridApi?.showLoadingOverlay();
      this.data = await this.reportService.getInvoiceReport(this.dateFrom, this.dateTo)

      await this.getChartData()

      this.router.navigate(['.'], {
        queryParams: {
          dateFrom: this.dateFrom,
          dateTo: this.dateTo
        },
        relativeTo: this.activatedRoute,
        queryParamsHandling: 'merge'
      });
      this.isLoading = false;
      this.gridApi?.hideOverlay();
    } catch (err) {
      this.isLoading = false;
      this.gridApi?.hideOverlay();
    }
  }

  async getChartData() {
    this.chartData = await this.reportService.getInvoiceByCustomerChart(this.dateFrom, this.dateTo)
  }

}
