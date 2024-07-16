import { GridApi } from 'ag-grid-community'
import { Component, Input, OnInit } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { NgSelectModule } from '@ng-select/ng-select'
import { AgGridModule } from 'ag-grid-angular'

import { SharedModule } from '@app/shared/shared.module'
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers'
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString'
import { ActivatedRoute, Router } from '@angular/router'
import { highlightRowView, autoSizeColumns } from 'src/assets/js/util'
import moment from 'moment'
import { NAVIGATION_ROUTE } from '../shipping-request-constant'
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component'
import { ShippingRequestService } from '@app/core/api/operations/shippging-request/shipping-request.service'

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    DateRangeComponent
  ],
  selector: 'app-shipping-request-list',
  templateUrl: './shipping-request-list.component.html',
})
export class ShippingRequestListComponent implements OnInit {

  constructor(
    public api: ShippingRequestService,
    public router: Router,
    private activatedRoute: ActivatedRoute,
  ) { }

  disable = false;

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

    if (this.selectedViewType == 'Open') {
      this.disable = true;
      this.isAll = true;
    }
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
    { field: 'createdDate', headerName: 'Created Date', filter: 'agMultiColumnFilter' },
    {
      headerName: 'Contact Info',
      children: [
        { field: 'companyName', headerName: 'Company Name', filter: 'agMultiColumnFilter' },
        { field: 'contactName', headerName: 'Contact Name', filter: 'agMultiColumnFilter' },
      ]
    },
    {
      headerName: 'Shipping Info',
      children: [
        { field: 'trackingNumber', headerName: 'Tracking Number', filter: 'agMultiColumnFilter' },
        { field: 'freightCharges', headerName: 'Freight Charges', filter: 'agMultiColumnFilter' },
        { field: 'phoneNumber', headerName: 'Phone Number', filter: 'agMultiColumnFilter', cellDataType: 'text' },
        { field: 'saturdayDelivery', headerName: 'Saturday Delivery', filter: 'agMultiColumnFilter' },
        { field: 'sendTrackingNumberTo', headerName: 'Send Tracking Number To', filter: 'agMultiColumnFilter' },
        { field: 'serviceType', headerName: 'Service Type', filter: 'agMultiColumnFilter' },
        { field: 'serviceTypeName', headerName: 'Service Type Name', filter: 'agMultiColumnFilter' },
        { field: 'thridPartyAccountNumber', headerName: 'Thrid Party Account Number', filter: 'agMultiColumnFilter' },
        { field: 'cost', headerName: 'Cost', filter: 'agMultiColumnFilter' },
      ]
    },
    {
      headerName: 'Address',
      children: [
        { field: 'streetAddress', headerName: 'Street Address', filter: 'agMultiColumnFilter' },
        { field: 'state', headerName: 'State', filter: 'agMultiColumnFilter' },
        { field: 'city', headerName: 'City', filter: 'agMultiColumnFilter' },
        { field: 'zipCode', headerName: 'Zip Code', filter: 'agMultiColumnFilter' },
      ]
    },
    {
      headerName: 'Additional Information',
      children: [
        { field: 'requestorName', headerName: 'Requestor Name', filter: 'agMultiColumnFilter' },
        { field: 'emailAddress', headerName: 'Email Address', filter: 'agMultiColumnFilter' },
        { field: 'completedBy', headerName: 'Completed By', filter: 'agMultiColumnFilter', cellDataType: 'text' },
        { field: 'completedDate', headerName: 'Completed Date', filter: 'agMultiColumnFilter' },
        { field: 'createdById', headerName: 'Created By Id', filter: 'agMultiColumnFilter' },
        { field: 'active', headerName: 'Active', filter: 'agMultiColumnFilter' },
      ]
    },
  ]

  @Input() selectedViewType = 'Open';

  selectedViewOptions = [
    {
      name: "Open",
      value: 0,
      selected: false
    },
    {
      name: "Active",
      value: 1,
      selected: false
    },
    {
      name: "Inactive",
      value: 0,
      selected: false
    },
    {
      name: "All",
      selected: false
    }
  ]

  title = 'Shipping Request List';

  gridApi: GridApi;

  data: any[];

  id = null;

  isAll = false

  changeIsAll() { }

  dateFrom = moment().subtract(1, 'months').startOf('month').format('YYYY-MM-DD');
  dateTo = moment().endOf('month').format('YYYY-MM-DD');
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

    if (this.selectedViewType == 'Open') {
      this.disable = true;
      this.isAll = true;
    } else {
      this.disable = false;
    }

    try {
      this.gridApi?.showLoadingOverlay()

      let params: any = {};
      if (this.selectedViewType != 'All') {
        let status = this.selectedViewOptions.find(person => person.name == this.selectedViewType)
        params = { active: status.value };
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

    } catch (err) {
      this.gridApi?.hideOverlay()
    }

  }

}
