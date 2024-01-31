import { GridApi, ColumnApi } from 'ag-grid-community'
import { Component, Input, OnInit } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import {
  NgbDatepickerModule,
  NgbDropdownModule,
  NgbNavModule
} from '@ng-bootstrap/ng-bootstrap'
import { NgSelectModule } from '@ng-select/ng-select'
import { AgGridModule } from 'ag-grid-angular'

import { ActivatedRoute, Router } from '@angular/router'
import { NAVIGATION_ROUTE } from '../property-constant'
import { PropertyService } from '@app/core/api/field-service/property.service'
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers'
import { agGridOptions } from '@app/shared/config/ag-grid.config'
import { SharedModule } from '@app/shared/shared.module'
import { highlightRowView, autoSizeColumns } from 'src/assets/js/util'
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString'

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    NgbNavModule,
    NgSelectModule,
    AgGridModule,
  ],
  selector: 'app-property-list',
  templateUrl: `./property-list.component.html`
})
export class PropertyListComponent implements OnInit {

  constructor(
    public api: PropertyService,
    public router: Router,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {

    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
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
        onClick: (e: any) => this.onEdit(e.rowData),
        value: 'SELECT'
      },
      maxWidth: 115,
      minWidth: 115
    },
    { field: 'address_complete', headerName: 'Address Complete', filter: 'agMultiColumnFilter' },
    { field: 'id', headerName: 'ID', filter: 'agMultiColumnFilter' },
    { field: 'license_required', headerName: 'Licensing Required', filter: 'agMultiColumnFilter' },
    { field: 'license_notes', headerName: 'Licensing Notes', filter: 'agMultiColumnFilter', maxWidth: 300, tooltipField: 'license_notes', },
    { field: 'notes', headerName: 'Notes', filter: 'agMultiColumnFilter', maxWidth: 300, tooltipField: 'notes', },
    { field: 'property', headerName: 'Property', filter: 'agMultiColumnFilter' },
    { field: 'address1', headerName: 'Address 1', filter: 'agMultiColumnFilter' },
    { field: 'address2', headerName: 'STE', filter: 'agMultiColumnFilter' },
    { field: 'city', headerName: 'City', filter: 'agMultiColumnFilter' },
    { field: 'state', headerName: 'State', filter: 'agMultiColumnFilter' },
    { field: 'zip_code', headerName: 'Zip Code', filter: 'agMultiColumnFilter' },
    { field: 'country', headerName: 'Country', filter: 'agMultiColumnFilter' },
    { field: 'out_of_town', headerName: 'Out Of Town', filter: 'agMultiColumnFilter' },
    { field: 'property_phone', headerName: 'Property Phone', filter: 'agMultiColumnFilter' },
    { field: 'active', headerName: 'Active', filter: 'agMultiColumnFilter' }
  ]

  @Input() selectedViewType: 'Active' | 'Inactive' | 'All' | string = 'Active';

  selectedViewOptions = [
    {
      name: "Active",
      selected: false
    },
    {
      name: "Inactive",
      selected: false
    },
    {
      name: "All",
      selected: false
    }
  ]

  title = 'Properties';

  gridApi: GridApi;

  gridColumnApi: ColumnApi;

  data: any[];

  id = null;

  gridOptions = {
    ...agGridOptions,
    enableBrowserTooltips: true,
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;
      this.gridColumnApi = params.columnApi;

      let data = this.activatedRoute.snapshot.queryParams['gridParams']
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params) => {
      highlightRowView(params, 'id', this.id);
      autoSizeColumns(params)
    },
    getRowId: params => params.data.id,
    onFilterChanged: params => {
      let gridParams = _compressToEncodedURIComponent(this.gridApi, this.gridColumnApi);
      this.router.navigate([NAVIGATION_ROUTE.LIST], {
        queryParamsHandling: 'merge',
        queryParams: {
          gridParams
        }
      });

    },
    onSortChanged: params => {
      let gridParams = _compressToEncodedURIComponent(this.gridApi, this.gridColumnApi);
      this.router.navigate([NAVIGATION_ROUTE.LIST], {
        queryParamsHandling: 'merge',
        queryParams: {
          gridParams
        }
      });

    }
  };

  onEdit(data) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi, this.gridColumnApi);
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: 'merge',
      queryParams: {
        id: data.id,
        gridParams
      }
    });
  }

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay()
      this.data = await this.api.getAll(this.selectedViewType);

      this.router.navigate(['.'], {
        queryParams: {
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

}
