import { Component, OnInit } from '@angular/core';
import { RequestService } from '@app/core/api/field-service/request.service';
import { SharedModule } from '@app/shared/shared.module';
import { AgGridModule } from 'ag-grid-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { NAVIGATION_ROUTE } from '../request-constant';
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers';
import { agGridOptions, AG_THEME } from '@app/shared/config/ag-grid.config';
import { highlightRowView, autoSizeColumns } from 'src/assets/js/util';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { RequestChartComponent } from '../request-chart/request-chart.component';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { GridFiltersComponent } from '@app/shared/grid-filters/grid-filters.component';
import { GridSettingsComponent } from '@app/shared/grid-settings/grid-settings.component';
import moment from 'moment';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule,
    RequestChartComponent,
    DateRangeComponent,
    GridSettingsComponent,
    GridFiltersComponent,
    RequestChartComponent
  ],
  selector: 'app-request-list',
  templateUrl: `./request-list.component.html`
})
export class RequestsListComponent implements OnInit {

  pageId = '/request/list-request'
  average = 0
  typeOfView = 'Weekly';

  dateFrom = moment().subtract(6, "months").format('YYYY-MM-DD');
  dateTo = moment().format('YYYY-MM-DD');
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event['dateFrom']
    this.dateTo = $event['dateTo']
    this.getData()
  }


  constructor(
    private api: RequestService,
    public router: Router,
    private activatedRoute: ActivatedRoute,
  ) {
  }

  ngOnInit(): void {

    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
      this.selectedViewType = params['selectedViewType'] || this.selectedViewType;
      this.dateRange = [this.dateFrom, this.dateTo];
      this.displayCustomers = params['displayCustomers'];
      this.typeOfView = params['typeOfView'] || this.typeOfView;
    });

    if (!this.displayCustomers || this.displayCustomers != 'Show All') {
      this.showAll = false
    }
    if (!this.displayCustomers) {
      this.showAll = true
    }

    this.getData()
  }

  columnDefs: any = [
    {
      field: '', headerName: 'View', filter: 'agNumberColumnFilter', cellRenderer: LinkRendererComponent,
      cellRendererParams: {
        onClick: e => { this.openWorkOrder(e.rowData.id) },
        value: "View"
      },
      pinned: 'left',
      maxWidth: 115,
      minWidth: 115,
      suppressHeaderMenuButton: true,
      floatingFilter: false
    },
    { field: 'id', headerName: 'Request ID', filter: 'agMultiColumnFilter' },
    {
      field: 'total_days'
      , headerName: 'Age'
      , filter: 'agMultiColumnFilter'
      , cellRenderer: params => {
        return (params.data.fs_scheduler_id || params.data.active == null) ? '-' : params.value
      }
      , cellClass: params => {
        if (!params.data.fs_scheduler_id && params.data.active == 1) {
          if (params.value == 0) {
            return ['bg-success bg-opacity-50'];
          } else if (params.value >= 2) {
            return ['bg-danger bg-opacity-75'];
          } else if (params.value == 1) {
            return ['bg-warning bg-opacity-50'];
          }
        } else {
          return {}
        }
        return null;
      }
    },
    { field: 'fs_scheduler_id', headerName: 'FSID', filter: 'agMultiColumnFilter' },
    { field: 'address1', headerName: 'Address', filter: 'agMultiColumnFilter' },
    { field: 'address2', headerName: 'STE', filter: 'agMultiColumnFilter' },
    { field: 'city', headerName: 'City', filter: 'agMultiColumnFilter' },
    { field: 'property', headerName: 'Property', filter: 'agMultiColumnFilter' },
    { field: 'state', headerName: 'State', filter: 'agMultiColumnFilter' },
    { field: 'zip', headerName: 'Zip Code', filter: 'agMultiColumnFilter' },
    { field: 'ceiling_height', headerName: 'Ceiling Height', filter: 'agMultiColumnFilter' },
    { field: 'created_date', headerName: 'Created Date', filter: 'agMultiColumnFilter' },
    { field: 'date_of_service', headerName: 'Date Of Service', filter: 'agMultiColumnFilter' },
    { field: 'eyefi_customer_sign_part', headerName: 'Eyfi Customer Sign Part', filter: 'agMultiColumnFilter' },
    { field: 'licensing_required', headerName: 'Licensing Required', filter: 'agMultiColumnFilter' },
    { field: 'onsite_customer_name', headerName: 'Onsite Customer Name', filter: 'agMultiColumnFilter' },
    { field: 'onsite_customer_phone_number', headerName: 'Onsite Customer Phone Number', filter: 'agMultiColumnFilter' },
    { field: 'po_number', headerName: 'PO Number', filter: 'agMultiColumnFilter' },
    { field: 'requested_by', headerName: 'Requested By', filter: 'agMultiColumnFilter' },
    { field: 'configuration', headerName: 'Configuration', filter: 'agMultiColumnFilter' },
    { field: 'so_number', headerName: 'SO Number', filter: 'agMultiColumnFilter' },
    { field: 'special_instruction', headerName: 'Special Instruction', filter: 'agMultiColumnFilter', minWidth: 300, maxWidth: 300 },
    { field: 'start_time', headerName: 'Start Time', filter: 'agMultiColumnFilter' },
    { field: 'type_of_service', headerName: 'Type Of Service', filter: 'agMultiColumnFilter' },
    { field: 'type_of_sign', headerName: 'Type Of Sign', filter: 'agMultiColumnFilter' },
    { field: 'bolt_to_floor', headerName: 'Bolt To Floor', filter: 'agMultiColumnFilter' },
    { field: 'active', headerName: 'Active', filter: 'agMultiColumnFilter' },

  ]

  gridOptions = {
    ...agGridOptions,
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

  searchName = "";

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

  theme = AG_THEME;

  gridApi: any;

  title = "Request List";

  displayCustomers = "false"

  dataChart

  summary

  showAll = true;

  async onCustomerChange(row) {
    this.showAll = false;
    this.displayCustomers = row.label

    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: 'merge',
      queryParams: {
        displayCustomers: this.displayCustomers,
        showAll: this.showAll
      }
    });

    try {
      this.isLoading = true;
      let data = await this.api.getChart(this.dateFrom, this.dateTo, this.displayCustomers, this.typeOfView)

      this.dataChart = data?.chartData
      this.summary = data?.summary
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;

    }
  }


  async onChange() {
    if (this.showAll) {
      this.displayCustomers = "Show All"
    }

    this.showAll = false

    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: 'merge',
      queryParams: {
        displayCustomers: this.displayCustomers,
        showAll: this.showAll
      }
    });
    try {
      this.isLoading = true;
      let data = await this.api.getChart(this.dateFrom, this.dateTo, this.displayCustomers, this.typeOfView)

      this.dataChart = data?.chartData
      this.summary = data?.summary
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;

    }

  }


  summaryObject: any = {
    total_cancelled: 0,
    value: 0,
  }

  setSummaryFooter() {
    let total_cancelled = 0;
    let value = 0;
    for (let i = 0; i < this.summary.length; i++) {
      total_cancelled += parseInt(this.summary[i]['total_cancelled'])
      value += parseInt(this.summary[i]['value'])
    }

    this.summaryObject = {
      total_cancelled: total_cancelled,
      value: value
    }
  }


  isLoading = false;

  async getData() {
    try {
      this.data = [];
      this.gridApi?.showLoadingOverlay()
      this.isLoading = true;

      let params: any = {};
      if (this.selectedViewType != 'All') {
        let status = this.selectedViewOptions.find(person => person.name == this.selectedViewType)
        params = { active: status.value };
      }

      this.data = await this.api.getAllRequests(this.selectedViewType)

      this.router.navigate(['.'], {
        queryParams: {
          selectedViewType: this.selectedViewType,
          dateFrom: this.dateFrom,
          dateTo: this.dateTo,
          displayCustomers: this.displayCustomers,
          typeOfView: this.typeOfView
        },
        relativeTo: this.activatedRoute
        , queryParamsHandling: 'merge'
      });

      let data = await this.api.getChart(this.dateFrom, this.dateTo, this.displayCustomers, this.typeOfView)

      this.dataChart = data?.chartData
      this.summary = data?.summary

      this.setSummaryFooter()

      this.gridApi?.hideOverlay()
      this.isLoading = false;

    } catch (err) {
      this.gridApi?.hideOverlay()
      this.isLoading = false;
    }

  }

  openWorkOrder(id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: 'merge',
      queryParams: {
        id: id,
        gridParams
      }
    });
  }


}
