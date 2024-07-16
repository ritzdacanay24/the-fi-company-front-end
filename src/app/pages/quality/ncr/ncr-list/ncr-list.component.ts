import { GridApi } from 'ag-grid-community'
import { Component, Input, OnInit } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { NgSelectModule } from '@ng-select/ng-select'
import { AgGridModule } from 'ag-grid-angular'

import { ActivatedRoute, Router } from '@angular/router'
import moment from 'moment'
import { NAVIGATION_ROUTE } from '../ncr-constant'
import { NcrService } from '@app/core/api/quality/ncr-service'
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component'
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers'
import { SharedModule } from '@app/shared/shared.module'
import { highlightRowView, autoSizeColumns } from 'src/assets/js/util'
import { _decompressFromEncodedURIComponent, _compressToEncodedURIComponent } from 'src/assets/js/util/jslzString'
import { GridSettingsComponent } from '@app/shared/grid-settings/grid-settings.component'
import { GridFiltersComponent } from '@app/shared/grid-filters/grid-filters.component'
import { NcrOtdChartComponent } from './ncr-otd-chart/ncr-otd-chart.component'

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    DateRangeComponent,
    GridSettingsComponent,
    GridFiltersComponent,
    NcrOtdChartComponent
  ],
  selector: 'app-ncr-list',
  templateUrl: './ncr-list.component.html',
})
export class NcrListComponent implements OnInit {

  pageId = '/ncr/list-ncr'

  constructor(
    public api: NcrService,
    public router: Router,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {

    this.activatedRoute.queryParams.subscribe(params => {
      this.dateFrom = params['dateFrom'] || this.dateFrom;
      this.dateTo = params['dateTo'] || this.dateTo;
      this.dateRange = [this.dateFrom, this.dateTo];

      this.id = params['id'];
      this.isAll = params['isAll'] ? params['isAll'].toLocaleLowerCase() === 'true' : false;
      this.selectedViewType = params['selectedViewType'] || this.selectedViewType;
    });

    this.getData();
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
    {
      headerName: 'Main Info',
      children: [
        { field: 'id', headerName: 'ID', filter: 'agMultiColumnFilter' },
        { field: "ncr_type", headerName: "Type", filter: "agTextColumnFilter" },
        { field: "source", headerName: "Source", filter: "agTextColumnFilter" },
        { field: "qir_number", headerName: "QIR#", filter: "agTextColumnFilter" },
        { field: "initiated_by", headerName: "Initiated By", filter: "agTextColumnFilter" },
        { field: "wo_nbr", headerName: "WO#", filter: "agTextColumnFilter", cellDataType: 'text' },
        { field: "submitted_date", headerName: "Submitted Date", filter: "agTextColumnFilter" },
        { field: "po_nbr", headerName: "PO #", filter: "agTextColumnFilter", cellDataType: 'text' },
        { field: "pt_nbr", headerName: "Part #", filter: "agTextColumnFilter" },
        { field: "created_date", headerName: "Created Date", filter: "agTextColumnFilter" },
        { field: "created_by", headerName: "Created By", filter: "agTextColumnFilter" },
      ]
    },
    {
      headerName: 'Corrective Actions',
      children: [
        {
          field: "View", headerName: "View CA", filter: "agMultiColumnFilter",
          cellRenderer: LinkRendererComponent,
          cellRendererParams: {
            onClick: (e: any) => this.onEdit(e.rowData.id, 2),
            isLink: true,
            value: 'View CA'
          },
          maxWidth: 115,
          minWidth: 115
        },
        { field: "ca_iss_to", headerName: "CA Issued To", filter: "agSetColumnFilter" },
        { field: "ca_due_dt", headerName: "CA Issued Due Date", filter: "agTextColumnFilter" },
        { field: "ca_action_req", headerName: "Action Required", filter: "agTextColumnFilter" },
        { field: "iss_by", headerName: "Issued By", filter: "agTextColumnFilter" },
        { field: "iss_dt", headerName: "Issued Date", filter: "agTextColumnFilter" },
        { field: "planned_ca_impl_dt", headerName: "Planned Implementation Date ", filter: "agTextColumnFilter" },
        { field: "ca_by", headerName: "User", filter: "agTextColumnFilter" },
        { field: "ca_title", headerName: "Title", filter: "agTextColumnFilter" },
        { field: "ca_dt", headerName: "CA Issued Date", filter: "agTextColumnFilter" },
        { field: "ca_impl_by", headerName: "Implementation By", filter: "agTextColumnFilter" },
        { field: "ca_impl_title", headerName: "Implementation Title", filter: "agTextColumnFilter" },
        { field: "ca_impl_dt", headerName: "Implementation Date", filter: "agTextColumnFilter" },
        { field: "ca_submitted_date", headerName: "Submitted Date", filter: "agTextColumnFilter" },
      ],
    },
    {
      headerName: 'Verification',
      children: [
        {
          field: "View", headerName: "View Verification", filter: "agMultiColumnFilter",
          cellRenderer: LinkRendererComponent,
          cellRendererParams: {
            onClick: (e: any) => this.onEdit(e.rowData.id, 3),
            isLink: true,
            value: 'View Verification'
          },
          maxWidth: 115,
          minWidth: 115
        },
        { field: "verif_of_ca_by", headerName: "Verified By", filter: "agTextColumnFilter" },
        { field: "verif_of_ca_dt", headerName: "Verified Date", filter: "agTextColumnFilter" },
        { field: "eff_verif_of_ca_by", headerName: "Effectiveness Verification of CA By", filter: "agTextColumnFilter" },
        { field: "eff_verif_of_ca_dt", headerName: "Effectiveness Verification of CA Date", filter: "agTextColumnFilter" },
        { field: "cmt_cls_by", headerName: "Comments/Closure By", filter: "agTextColumnFilter" },
        { field: "cmt_cls_dt", headerName: "Comments/Closure Date", filter: "agTextColumnFilter" },
      ]
    },
  ]


  selectJohnAndKenny(department) {
    if (department == 'All') {
      this.gridApi!.setColumnFilterModel("ca_iss_to", null).then(() => {
        this.gridApi!.onFilterChanged();
      });
    } else {

      this.gridApi!
        .setColumnFilterModel("ca_iss_to", {
          values: [department],
        })
        .then(() => {
          this.gridApi!.onFilterChanged();
        });
    }
  }

  @Input() selectedViewType = 'Open';

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

  title = 'NCR List';

  gridApi: GridApi;

  data: any[];

  id = null;

  isAll = false

  changeIsAll() { }

  dateFrom = moment().subtract(1, 'months').startOf('month').format('YYYY-MM-DD')
  dateTo = moment().endOf('month').format('YYYY-MM-DD')
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event['dateFrom']
    this.dateTo = $event['dateTo']
    this.getData()
  }

  gridOptions = {
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
    getRowId: params => params.data.id?.toString(),
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

  onEdit(id, active = 1) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.OVERVIEW], {
      queryParamsHandling: 'merge',
      queryParams: {
        id: id,
        gridParams,
        active: active
      }
    });
  }

  summaryInfo: any
  async getOpenSummary() {
    this.summaryInfo = await this.api.getOpenSummary();
  }

  displayCustomers = 'Show All';
  typeOfView = "Daily"
  dataChart
  async getChartData() {
    let data: any = await this.api.getchart(this.dateFrom, this.dateTo, this.displayCustomers, this.typeOfView);
    this.dataChart = data
  }

  average = 0;

  isLoading = false;
  goal = 0;

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay()

      let params: any = {};
      if (this.selectedViewType != 'All') {
        let status = this.selectedViewOptions.find(person => person.name == this.selectedViewType)
        params = { active: status.value };
      }

      if (this.selectedViewType == 'Open') {
        this.isAll = true;
      }

      this.data = await this.api.getList(this.selectedViewType, this.dateFrom, this.dateTo, this.isAll);

      this.router.navigate(['.'], {
        queryParams: {
          selectedViewType: this.selectedViewType,
          isAll: this.isAll,
          dateFrom: this.dateFrom,
          dateTo: this.dateTo
        },
        relativeTo: this.activatedRoute
        , queryParamsHandling: 'merge'
      });

      this.gridApi?.hideOverlay()

      this.getChartData();
      this.getOpenSummary();

    } catch (err) {
      this.gridApi?.hideOverlay()
    }

  }

}
