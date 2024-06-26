import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { GridApi } from 'ag-grid-community';
import moment from 'moment';
import { ContractorVsTechReportChartComponent } from './contractor-vs-tech-report-chart/contractor-vs-tech-report-chart.component';
import { ReportService } from 'src/app/core/api/field-service/report.service';
import { agGridOptions } from 'src/app/shared/config/ag-grid.config';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { autoSizeColumns } from 'src/assets/js/util';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { NAVIGATION_ROUTE } from '../../job/job-constant';
import { LinkRendererComponent } from 'src/app/shared/ag-grid/cell-renderers/link-renderer/link-renderer.component';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    ContractorVsTechReportChartComponent,
    DateRangeComponent
  ],
  selector: 'app-contractor-vs-tech-report',
  templateUrl: './contractor-vs-tech-report.component.html',
  styleUrls: []
})
export class ContractorVsTechComponent implements OnInit {
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

  title = 'Contractor Vs Tech Report';

  dateFrom = moment().subtract(12, 'months').startOf('month').format('YYYY-MM-DD');;
  dateTo = moment().endOf('month').format('YYYY-MM-DD');
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event: { [x: string]: string; }) {
    this.dateFrom = $event['dateFrom']
    this.dateTo = $event['dateTo']
    this.getData()
  }

  gridApi: GridApi;

  data: any[];

  chartData: any[] = [];

  isLoading = false;

  view(fsid: any) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
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
    // {
    //   field: "View", headerName: "View", filter: "agMultiColumnFilter",
    //   pinned: "left",
    //   cellRenderer: LinkRendererComponent,
    //   cellRendererParams: {
    //     onClick: (e: any) => this.view(e.rowData.fs_scheduler_id),
    //     value: 'SELECT'
    //   },
    //   maxWidth: 115,
    //   minWidth: 115
    // },
    { field: 'request_date', headerName: 'Request Date', filter: 'agMultiColumnFilter' },
    { field: 'contractor', headerName: 'Is Contractor', filter: 'agMultiColumnFilter', cellRenderer: (params: { value: any; }) => params.value ? 'Yes' : 'No' },
    { field: 'contractor_assigned', headerName: 'Jobs Assigned To Contractor', filter: 'agMultiColumnFilter' },
    { field: 'contractor_code', headerName: 'Contractor Code', filter: 'agMultiColumnFilter' },
    { field: 'tech_jobs_assigned', headerName: 'Jobs Assigned To Tech', filter: 'agMultiColumnFilter' },
    { field: 'total', headerName: 'Total Jobs', filter: 'agMultiColumnFilter' },
    { field: 'month', headerName: 'Month', filter: 'agMultiColumnFilter' },
    { field: 'year', headerName: 'Year', filter: 'agMultiColumnFilter' },
  ]

  gridOptions = {
    ...agGridOptions,
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;

      let data = this.activatedRoute.snapshot.queryParams['gridParams']
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params: any) => {
      autoSizeColumns(params)
    },
    onFilterChanged: (params: any) => this.updateUrl(params),
    onSortChanged: (params: any) => this.updateUrl(params),
  };

  updateUrl = (params: { api: any }) => {
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
      this.data = await this.reportService.getContractorVsTechReport(this.dateFrom, this.dateTo)

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
    this.chartData = await this.reportService.getContractorVsTechReportChart(this.dateFrom, this.dateTo)
  }

}
