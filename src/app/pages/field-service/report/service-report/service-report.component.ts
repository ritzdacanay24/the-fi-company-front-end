import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AgGridModule } from 'ag-grid-angular';
import { GridApi, ColumnApi } from 'ag-grid-community';
import moment from 'moment';
import { ServiceReportChartComponent } from './service-report-chart/service-report-chart.component';
import { ReportService } from 'src/app/core/api/field-service/report.service';
import { agGridOptions } from 'src/app/shared/config/ag-grid.config';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { autoSizeColumns } from 'src/assets/js/util';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, DateRangeComponent, ServiceReportChartComponent],
  selector: 'app-service-report',
  templateUrl: './service-report.component.html',
  styleUrls: []
})
export class ServiceReportComponent implements OnInit {
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

  title = 'Service Report';

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

  data: any[] = [];

  chartData = []

  isLoading = false;

  columnDefs:any = [
    { field: 'completed_jobs', headerName: 'Completed Jobs', filter: 'agMultiColumnFilter' },
    { field: 'hits', headerName: 'Total Jobs', filter: 'agMultiColumnFilter' },
    { field: 'service_type', headerName: 'Service Type', filter: 'agMultiColumnFilter' },
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

  async getData() {
    try {
      this.isLoading = true;
      this.gridApi?.showLoadingOverlay();
      this.data = await this.reportService.getServiceReport(this.dateFrom, this.dateTo)

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
    this.chartData = await this.reportService.getServiceReportChart(this.dateFrom, this.dateTo)
  }
}
