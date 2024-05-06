import { GridApi, ColumnApi } from 'ag-grid-community'
import { Component, OnInit } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { NgSelectModule } from '@ng-select/ng-select'
import { AgGridModule } from 'ag-grid-angular'

import { SharedModule } from '@app/shared/shared.module'
import { agGridOptions } from '@app/shared/config/ag-grid.config'
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers'
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { ActivatedRoute, Router } from '@angular/router'
import { highlightRowView, autoSizeColumns } from 'src/assets/js/util'
import { NAVIGATION_ROUTE } from '../event-constant'
import { SchedulerEventService } from '@app/core/api/field-service/scheduler-event.service'
import moment from 'moment'
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component'

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    DateRangeComponent,
  ],
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
})
export class EventListComponent implements OnInit {

  constructor(
    public api: SchedulerEventService,
    public router: Router,
    private activatedRoute: ActivatedRoute,
  ) { }

  isDatesFound = false
  ngOnInit(): void {

    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
      this.dateFrom = params['dateFrom'] || this.dateFrom;
      this.dateTo = params['dateTo'] || this.dateTo;
      this.dateRange = [this.dateFrom, this.dateTo];
    });
    this.getData()
  }

  columnDefs: any = [
    {
      field: "View", headerName: "View", filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererComponent,
      cellRendererParams: {
        onClick: (e: any) => this.onEdit(e.rowData.id),
        value: 'SELECT'
      },
      maxWidth: 115,
      minWidth: 115
    },
    { field: 'id', headerName: 'ID', filter: 'agMultiColumnFilter' },
    { field: 'title', headerName: 'Title', filter: 'agMultiColumnFilter' },
    { field: 'description', headerName: 'Description', filter: 'agMultiColumnFilter' },
    { field: 'start', headerName: 'Start Time', filter: 'agMultiColumnFilter' },
    { field: 'end', headerName: 'End Time', filter: 'agMultiColumnFilter' },
    { field: 'type', headerName: 'Type', filter: 'agMultiColumnFilter' },
    { field: 'allDay', headerName: 'All Day', filter: 'agMultiColumnFilter' },
    { field: 'techRelated', headerName: 'Tech Related', filter: 'agMultiColumnFilter' },
    { field: 'backgroundColor', headerName: 'Background Color', filter: 'agMultiColumnFilter' },
    { field: 'borderColor', headerName: 'Border Color', filter: 'agMultiColumnFilter' },
  ]

  title = 'Events';

  gridApi: GridApi;

  data: any[];

  id = null;

  dateFrom = moment().startOf('month').format('YYYY-MM-DD');
  dateTo = moment().endOf('month').format('YYYY-MM-DD');
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event['dateFrom']
    this.dateTo = $event['dateTo']
    this.getData()
  }

  gridOptions = {
    ...agGridOptions,
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;

      let data = this.activatedRoute.snapshot.queryParams['gridParams']
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params) => {
      highlightRowView(params, 'id', this.id);
      autoSizeColumns(params)
    },
    getRowId: params => params.data.id,
    onFilterChanged: params => {
      let gridParams = _compressToEncodedURIComponent(this.gridApi);
      this.router.navigate([`.`], {
        relativeTo: this.activatedRoute,
        queryParamsHandling: 'merge',
        queryParams: {
          gridParams
        }
      });

    },
    onSortChanged: params => {
      let gridParams = _compressToEncodedURIComponent(this.gridApi);
      this.router.navigate([`.`], {
        relativeTo: this.activatedRoute,
        queryParamsHandling: 'merge',
        queryParams: {
          gridParams
        }
      });
    }
  };

  onEdit(id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: 'merge',
      queryParams: {
        id: id,
        gridParams
      }
    });
  }

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay()

      this.data = await this.api.getAllRequests(this.dateFrom, this.dateTo);

      this.router.navigate(['.'], {
        queryParams: {
          dateFrom: this.dateFrom,
          dateTo: this.dateTo
        },
        relativeTo: this.activatedRoute
        , queryParamsHandling: 'merge'
      });

      this.gridApi?.hideOverlay()

    } catch (err) {
      this.gridApi?.hideOverlay()
    }

  }
}
