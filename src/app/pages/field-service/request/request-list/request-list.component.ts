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

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule
  ],
  selector: 'app-request-list',
  templateUrl: `./request-list.component.html`
})
export class RequestsListComponent implements OnInit {

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
    });

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
      this.router.navigate([`.`], {
        relativeTo: this.activatedRoute,
        queryParamsHandling: 'merge',
        queryParams: {
          gridParams
        }
      });

    },
    onSortChanged: params => {
      let gridParams = _compressToEncodedURIComponent(this.gridApi, this.gridColumnApi);
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

  gridColumnApi: any;

  title = "Request List";

  async getData() {
    try {
      this.data = [];
      this.gridApi?.showLoadingOverlay()

      let params: any = {};
      if (this.selectedViewType != 'All') {
        let status = this.selectedViewOptions.find(person => person.name == this.selectedViewType)
        params = { active: status.value };
      }

      this.data = await this.api.getAllRequests(this.selectedViewType)

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

  openWorkOrder(id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi, this.gridColumnApi);
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: 'merge',
      queryParams: {
        id: id,
        gridParams
      }
    });
  }


}
