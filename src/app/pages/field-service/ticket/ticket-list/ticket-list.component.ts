import { Component, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { AgGridModule } from 'ag-grid-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { NAVIGATION_ROUTE } from '../ticket-constant';
import { WorkOrderService } from '@app/core/api/field-service/work-order.service';
import moment from 'moment';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers';
import { highlightRowView, autoSizeColumns } from 'src/assets/js/util';
import { _decompressFromEncodedURIComponent, _compressToEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { TicketModalService } from '../ticket-modal/ticket-modal.component';
import { ColDef, GridApi, GridOptions } from 'ag-grid-community';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule,
    DateRangeComponent
  ],
  selector: 'app-ticket-list',
  templateUrl: `./ticket-list.component.html`
})
export class TicketListComponent implements OnInit {

  constructor(
    private api: WorkOrderService,
    public router: Router,
    private activatedRoute: ActivatedRoute,
    private ticketModalService: TicketModalService
  ) {
  }

  ngOnInit(): void {

    this.activatedRoute.queryParams.subscribe(params => {
      this.dateFrom = params['dateFrom'] || this.dateFrom;
      this.dateTo = params['dateTo'] || this.dateTo;
      this.dateRange = [this.dateFrom, this.dateTo];

      this.id = params['id'];
      this.isAll = params['isAll'] ? params['isAll'].toLocaleLowerCase() === 'true' : false;
      this.selectedViewType = params['selectedViewType'] || this.selectedViewType;
    });
    this.getData()
  }

  columnDefs: ColDef[] = [
    {
      field: '', headerName: 'View', filter: 'agNumberColumnFilter', cellRenderer: LinkRendererComponent,
      cellRendererParams: {
        onClick: e => { this.openWorkOrder(e.rowData.fs_scheduler_id) },
        value: "View"
      },
      pinned: 'left',
      maxWidth: 115,
      minWidth: 115,
      suppressHeaderMenuButton: true,
      floatingFilter: false
    },
    { field: 'id', headerName: 'Ticket ID', filter: 'agMultiColumnFilter' },
    { field: 'fs_scheduler_id', headerName: 'FSID', filter: 'agMultiColumnFilter' },
    { field: 'request_date', headerName: 'Request Date', filter: 'agMultiColumnFilter' },
    { field: 'createdDate', headerName: 'Ticket Created Date', filter: 'agMultiColumnFilter' },
    { field: 'customerName1', headerName: 'Customer name', filter: 'agMultiColumnFilter' },
    { field: 'dateSubmitted', headerName: 'Date Submitted', filter: 'agMultiColumnFilter' },
    { field: 'workCompleted', headerName: 'Work Completed', filter: 'agMultiColumnFilter' },
    { field: 'status', headerName: 'Status', filter: 'agMultiColumnFilter' },
    { field: 'workCompletedComment', headerName: 'Comments', filter: 'agMultiColumnFilter', maxWidth: 300 },
  ]

  gridOptions: GridOptions = {
    columnDefs: [],
    onGridReady: (params: any) => {
      this.gridApi = params.api;
      let data = this.activatedRoute.snapshot.queryParams['gridParams']
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params) => {
      highlightRowView(params, 'id', this.id);
      autoSizeColumns(params)
    },
    getRowId: params => params.data.id?.toString(),
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

  searchName = ''

  isAll = false;

  selectedViewType = 'Open';

  selectedViewOptions = [
    {
      name: "Open",
      value: 1,
      selected: false
    },
    {
      name: "Closed",
      value: 0,
      selected: false
    },
    {
      name: "All",
      selected: false
    }
  ]

  data: any;

  id: any;
  
  gridApi: GridApi;

  title = "Ticket List";

  dateFrom = moment().startOf('month').format('YYYY-MM-DD');
  dateTo = moment().endOf('month').format('YYYY-MM-DD');
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event['dateFrom']
    this.dateTo = $event['dateTo']
    this.getData()
  }

  changeIsAll() {
    this.router.navigate(['.'], {
      relativeTo: this.activatedRoute,
      queryParams: {
        isAll: this.isAll
      },
      queryParamsHandling: 'merge'
    });
    this.getData()
  }

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay()

      let params: any = {};
      if (this.selectedViewType != 'All') {
        let status = this.selectedViewOptions.find(person => person.name == this.selectedViewType)
        params = { active: status.value };
      }

      if(this.selectedViewType == 'Open'){
        this.isAll = true;
      }

      this.data = await this.api.getAllRequests(this.selectedViewType, this.dateFrom, this.dateTo, this.isAll)

      this.router.navigate(['.'], {
        queryParams: {
          dateFrom: this.dateFrom,
          dateTo: this.dateTo,
          selectedViewType: this.selectedViewType
        },
        relativeTo: this.activatedRoute
        , queryParamsHandling: 'merge'
      });

      this.gridApi?.hideOverlay()

    } catch (err) {
      this.gridApi?.hideOverlay()
    }

  }

  openWorkOrder(id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.OVERVIEW], {
      queryParamsHandling: 'merge',
      queryParams: {
        id: id,
        gridParams
      }
    });


    // this.ticketModalService.open(id)
    // let gridParams = _compressToEncodedURIComponent(this.gridApi);
    // this.router.navigate([NAVIGATION_ROUTE.OVERVIEW], {
    //   queryParamsHandling: 'merge',
    //   queryParams: {
    //     id: id,
    //     gridParams
    //   }
    // });

  }


}
