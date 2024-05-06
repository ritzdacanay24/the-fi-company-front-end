import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { GridApi, ColumnApi } from 'ag-grid-community';
import moment from 'moment';
import { JobByUserReportChartComponent } from './job-by-user-report-chart/job-by-user-report-chart.component';
import { ReportService } from 'src/app/core/api/field-service/report.service';
import { agGridOptions } from 'src/app/shared/config/ag-grid.config';
import { SharedModule } from 'src/app/shared/shared.module';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, DateRangeComponent, JobByUserReportChartComponent],
  selector: 'app-job-by-user-report',
  templateUrl: './job-by-user-report.component.html',
  styleUrls: []
})
export class JobByUserReportComponent implements OnInit {
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


    this.getData();
  }

  title = 'Jobs by user';

  dateFrom = moment().subtract(6, 'months').startOf('month').format('YYYY-MM-DD');;
  dateTo = moment().endOf('month').format('YYYY-MM-DD');
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event['dateFrom']
    this.dateTo = $event['dateTo']
    this.getData()
  }

  gridApi: GridApi;

  data: any[];

  chartData = []

  isLoading = false;

  columnDefs:any = [
    { field: 'user', headerName: 'Tech', filter: 'agMultiColumnFilter' },
    { field: 'in_town', headerName: 'In Town Jobs', filter: 'agMultiColumnFilter' },
    { field: 'out_of_town', headerName: 'Out Of Town Jobs', filter: 'agMultiColumnFilter' },
    { field: 'total', headerName: 'Total Jobs', filter: 'agMultiColumnFilter' },
  ]

  gridOptions = {
    ...agGridOptions,
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;

      let data = this.activatedRoute.snapshot.queryParams['gridParams']
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params) => {
      //autoSizeColumns(params)
    },
    onFilterChanged: params => this.updateUrl(params),
    onSortChanged: params => this.updateUrl(params),
  };

  updateUrl = (params) => {
    let gridParams = _compressToEncodedURIComponent(params.api);
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
      this.data = await this.reportService.getJobByUserReport(this.dateFrom, this.dateTo)

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
    this.chartData = await this.reportService.getJobByUserReportChart(this.dateFrom, this.dateTo)
  }
}
