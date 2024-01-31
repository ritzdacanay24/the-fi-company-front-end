import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { GridApi, ColumnApi } from 'ag-grid-community';
import moment from 'moment';
import { NAVIGATION_ROUTE } from '../../job/job-constant';
import { ExpenseReportChartComponent } from './expense-report-chart/expense-report-chart.component';
import { BaseChartDirective } from 'ng2-charts';
import { NgSelectModule } from '@ng-select/ng-select';
import { ReportService } from 'src/app/core/api/field-service/report.service';
import { LinkRendererComponent } from 'src/app/shared/ag-grid/cell-renderers';
import { agGridOptions } from 'src/app/shared/config/ag-grid.config';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { currencyFormatter, autoSizeColumns } from 'src/assets/js/util';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, DateRangeComponent, ExpenseReportChartComponent, NgSelectModule],
  selector: 'app-expense-report',
  templateUrl: './expense-report.component.html',
  styleUrls: []
})
export class ExpenseReportComponent implements OnInit {
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

  chart: BaseChartDirective | undefined;

  changeSelectedCar() {
    for (let i = 0; i < this.chart.data.datasets.length; i++) {
      this.chart.hideDataset(i, false)

      for (let ii = 0; ii < this.selectedCar.length; ii++) {
        if (this.selectedCar[ii] == this.chart.data.datasets[i].label) {
            this.chart.hideDataset(i, true)

        }
      }
    }

    setTimeout(() => {
      console.log('jjj')
      this.chart.update(5)
    }, 1000);
  }

  title = 'Expense Report';

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

  chartData: any;

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
        active: 3
      }
    });
  }

  columnDefs:any = [
    {
      field: "View", headerName: "View", filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererComponent,
      cellRendererParams: {
        onClick: (e: any) => this.view(e.rowData.fs_scheduler_id),
        value: 'SELECT'
      },
      maxWidth: 115,
      minWidth: 115
    },
    { field: 'name', headerName: 'Name', filter: 'agMultiColumnFilter' },
    { field: 'fs_scheduler_id', headerName: 'FSID', filter: 'agMultiColumnFilter' },
    { field: 'workOrderId', headerName: 'Ticket ID', filter: 'agMultiColumnFilter' },
    { field: 'request_date', headerName: 'Request Date', filter: 'agMultiColumnFilter' },
    { field: 'mark_up', headerName: 'Mark Up Amount', filter: 'agMultiColumnFilter', valueFormatter: currencyFormatter },
    { field: 'mark_up_percent', headerName: 'Mark Up Percent', filter: 'agMultiColumnFilter' },
    { field: 'billing', headerName: 'Billing Amount', filter: 'agMultiColumnFilter', valueFormatter: currencyFormatter },
    { field: 'total_cost', headerName: 'Total Cost', filter: 'agMultiColumnFilter', valueFormatter: currencyFormatter },
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

  selectedCar: any

  async getData() {
    try {
      this.isLoading = true;
      this.gridApi?.showLoadingOverlay();
      this.data = await this.reportService.getExpenseReport(this.dateFrom, this.dateTo)

      await this.getChartData()
      this.changeSelectedCar()

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
    this.chartData = await this.reportService.getExpenseReportChart(this.dateFrom, this.dateTo)
  }

}
