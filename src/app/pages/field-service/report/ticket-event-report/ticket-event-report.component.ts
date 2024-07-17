import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import moment from 'moment';
import { TicketEventReportChartComponent } from './ticket-event-report-chart/ticket-event-report-chart.component';
import { ReportService } from 'src/app/core/api/field-service/report.service';
import { LinkRendererComponent } from 'src/app/shared/ag-grid/cell-renderers';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { autoSizeColumns } from 'src/assets/js/util';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { AgGridModule } from 'ag-grid-angular';
import { NAVIGATION_ROUTE as TICKET_NAVIGATION_ROUTE } from '../../ticket/ticket-constant';

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, DateRangeComponent, TicketEventReportChartComponent],
  selector: 'app-ticket-event-report',
  templateUrl: './ticket-event-report.component.html',
  styleUrls: []
})
export class TicketEventReportComponent implements OnInit {
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

  title = 'Ticket Event Report';

  dateFrom = moment().subtract(12, 'months').startOf('month').format('YYYY-MM-DD');;
  dateTo = moment().endOf('month').format('YYYY-MM-DD');
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event['dateFrom']
    this.dateTo = $event['dateTo']
    this.getData()
  }

  gridApi: GridApi;

  data: any[];

  chartData = [];

  isLoading = false;

  view(fsid) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([TICKET_NAVIGATION_ROUTE.OVERVIEW], {
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

  columnDefs: ColDef[] = [
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
    { field: 'fs_scheduler_id', headerName: 'FSID', filter: 'agMultiColumnFilter' },
    { field: 'workOrderId', headerName: 'Ticket ID', filter: 'agMultiColumnFilter' },
    { field: 'label', headerName: 'Label', filter: 'agMultiColumnFilter' },
    { field: 'event_name', headerName: 'Event Name', filter: 'agMultiColumnFilter' },
    { field: 'projectStart', headerName: 'Start', filter: 'agMultiColumnFilter' },
    { field: 'projectFinish', headerName: 'Finish', filter: 'agMultiColumnFilter' },
    { field: 'qtr_hrs', headerName: 'Qtr Hrs', filter: 'agMultiColumnFilter' },
    { field: 'mins', headerName: 'Mins', filter: 'agMultiColumnFilter' },
    { field: 'time', headerName: 'Time', filter: 'agMultiColumnFilter' },
    { field: 'userId', headerName: 'User ID', filter: 'agMultiColumnFilter' },
    { field: 'description', headerName: 'Description', filter: 'agMultiColumnFilter', maxWidth: 300 },
    { field: 'include_calculation', headerName: 'Billable', filter: 'agMultiColumnFilter' },
  ]

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;

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
      this.data = await this.reportService.getTicketEventReport(this.dateFrom, this.dateTo)

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
    this.chartData = await this.reportService.getTicketEventReportChart(this.dateFrom, this.dateTo)
  }

}
