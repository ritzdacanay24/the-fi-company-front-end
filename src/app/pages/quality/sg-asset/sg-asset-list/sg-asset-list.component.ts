import { ColDef, GridApi, GridOptions } from 'ag-grid-community'
import { Component, Input, OnInit } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { NgSelectModule } from '@ng-select/ng-select'
import { AgGridModule } from 'ag-grid-angular'

import { ActivatedRoute, Router } from '@angular/router'
import moment from 'moment'
import { SgAssetService } from '@app/core/api/quality/sg-asset.service'
import { NAVIGATION_ROUTE, NAVIGATION_ROUTE_ID_TEMPLATE } from '../sg-asset-constant'
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component'
import { SharedModule } from '@app/shared/shared.module'
import { highlightRowView, autoSizeColumns } from 'src/assets/js/util'
import { _decompressFromEncodedURIComponent, _compressToEncodedURIComponent } from 'src/assets/js/util/jslzString'
import { LinkRendererV2Component } from '@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component'

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule
  ],
  selector: 'app-sg-asset-list',
  templateUrl: './sg-asset-list.component.html',
})
export class SgAssetListComponent implements OnInit {

  constructor(
    public api: SgAssetService,
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

  columnDefs: ColDef[] = [
    {
      headerName: "Actions",
      pinned: "left",
      lockPosition: 'left',
      cellRenderer: 'agGroupCellRenderer',
      cellRendererParams: {
        innerRenderer: (params: any) => {
          return `
            <div class="d-flex justify-content-center align-items-center gap-2">
              <button class="btn btn-outline-primary btn-sm view-btn" data-id="${params.data.id}" title="View Details">
                <i class="mdi mdi-eye"></i>
              </button>
              <button class="btn btn-outline-secondary btn-sm edit-btn" data-id="${params.data.id}" title="Edit Record">
                <i class="mdi mdi-pencil"></i>
              </button>
            </div>
          `;
        },
        suppressCount: true
      },
      onCellClicked: (event: any) => {
        const target = event.event?.target;
        if (!target) return;
        
        const viewBtn = target.closest('.view-btn');
        const editBtn = target.closest('.edit-btn');
        
        if (viewBtn) {
          const id = viewBtn.getAttribute('data-id');
          this.onView(id);
        } else if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          this.onEdit(id);
        }
      },
      maxWidth: 130,
      minWidth: 130,
      sortable: false,
      filter: false,
      suppressMenu: true
    },
    { field: 'id', headerName: 'ID', filter: 'agMultiColumnFilter' },
    { field: 'generated_SG_asset', headerName: 'Asset Number', filter: 'agMultiColumnFilter' },
    { field: 'inspectorName', headerName: 'Inspector Name', filter: 'agMultiColumnFilter' },
    { field: 'lastUpdate', headerName: 'Last Update', filter: 'agMultiColumnFilter' },
    { field: 'manualUpdate', headerName: 'Manual Update', filter: 'agMultiColumnFilter', cellDataType: 'text' },
    { field: 'poNumber', headerName: 'WO Number', filter: 'agMultiColumnFilter', cellDataType: 'text' },
    { field: 'property_site', headerName: 'Property Site', filter: 'agMultiColumnFilter' },
    { field: 'serialNumber', headerName: 'Serial Number', filter: 'agMultiColumnFilter' },
    { field: 'sgPartNumber', headerName: 'SG Part Number', filter: 'agMultiColumnFilter' },
    { field: 'timeStamp', headerName: 'Created Date', filter: 'agMultiColumnFilter' },
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

  title = 'SG Asset List';

  gridApi: GridApi;

  data: any[];

  id = null;

  isAll = false

  quickFilter = '';

  changeIsAll() { }

  dateFrom = moment().subtract(1, 'months').startOf('month').format('YYYY-MM-DD')
  dateTo = moment().endOf('month').format('YYYY-MM-DD')
  dateRange = [this.dateFrom, this.dateTo];

  onChangeDate($event) {
    this.dateFrom = $event['dateFrom']
    this.dateTo = $event['dateTo']
    this.getData()
  }

  onQuickFilterChange(filter: string) {
    this.gridApi?.setGridOption('quickFilterText', filter);
  }

  getActiveCount(): number {
    return this.data?.filter(item => item.active === 1 || item.active === true)?.length || 0;
  }

  gridOptions: GridOptions = {
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

  onView(id) {
    let gridParams = _compressToEncodedURIComponent(this.gridApi);
    this.router.navigate([NAVIGATION_ROUTE.VIEW, id], {
      queryParamsHandling: 'merge',
      queryParams: {
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
