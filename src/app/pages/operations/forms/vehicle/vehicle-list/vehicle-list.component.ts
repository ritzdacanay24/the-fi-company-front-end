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
import { NAVIGATION_ROUTE } from '../vehicle-constant'
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component'
import { VehicleService } from '@app/core/api/operations/vehicle/vehicle.service'

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    DateRangeComponent
  ],
  selector: 'app-vehicle-list',
  templateUrl: './vehicle-list.component.html',
})
export class VehicleListComponent implements OnInit {

  constructor(
    public api: VehicleService,
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
    { field: 'id', headerName: 'ID', filter: 'agMultiColumnFilter' },
    {
      field: "expiresInDays", headerName: "Days before expired", pinned: 'right',
      cellClass: (e) => {
        if (e.data && e.data.expiresInDays >= 20) {
          return ['bg-success bg-opacity-50'];
        } else if (e.data && e.data.expiresInDays >= 18) {
          return ['bg-danger bg-opacity-75'];
        } else if (e.data && e.data.expiresInDays >= 0) {
          return ['bg-warning bg-opacity-50'];
        } else {
          return null
        }
      }
    },
    { field: 'department', headerName: 'Department', filter: 'agMultiColumnFilter' },
    { field: 'exp', headerName: 'Expiration Date', filter: 'agMultiColumnFilter' },
    { field: 'fuelType', headerName: 'Fuel Type', filter: 'agMultiColumnFilter' },
    { field: 'lastServiceDate', headerName: 'Last Service Date', filter: 'agMultiColumnFilter' },
    { field: 'licensePlate', headerName: 'License Plate', filter: 'agMultiColumnFilter' },
    { field: 'mileage', headerName: 'Mileage', filter: 'agMultiColumnFilter' },
    { field: 'typeOfService', headerName: 'Type Of Service', filter: 'agMultiColumnFilter' },
    { field: 'vehicleMake', headerName: 'Vehicle Make', filter: 'agMultiColumnFilter' },
    { field: 'vehicleNumber', headerName: 'Vehicle Number', filter: 'agMultiColumnFilter' },
    { field: 'vin', headerName: 'VIN', filter: 'agMultiColumnFilter' },
    { field: 'year', headerName: 'Year', filter: 'agMultiColumnFilter', cellDataType: 'text' },
    { field: 'createdBy', headerName: 'Created By', filter: 'agMultiColumnFilter' },
    { field: 'createdDate', headerName: 'Created Date', filter: 'agMultiColumnFilter' },
    { field: 'active', headerName: 'Active', filter: 'agMultiColumnFilter' },
  ]

  @Input() selectedViewType = 'Active';

  selectedViewOptions = [
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

  searchName = '';

  title = 'Vehicle List';

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
