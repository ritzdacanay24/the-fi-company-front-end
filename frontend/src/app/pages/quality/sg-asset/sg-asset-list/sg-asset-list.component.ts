import { ColDef, GridApi, GridOptions } from 'ag-grid-community'
import { Component, Input, OnInit } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { NgSelectModule } from '@ng-select/ng-select'
import { AgGridModule } from 'ag-grid-angular'

import { ActivatedRoute, Router } from '@angular/router'
import { SgAssetService } from '@app/core/api/quality/sg-asset.service'
import { NAVIGATION_ROUTE } from '../sg-asset-constant'
import { SharedModule } from '@app/shared/shared.module'
import { highlightRowView, autoSizeColumns } from 'src/assets/js/util'
import { SgAssetActionDropdownRendererComponent } from './sg-asset-action-dropdown-renderer.component'

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
  styleUrls: ['./sg-asset-list.component.scss']
})
export class SgAssetListComponent implements OnInit {

  constructor(
    public api: SgAssetService,
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

  columnDefs: ColDef[] = [
    {
      headerName: "Actions",
      pinned: "left",
      lockPosition: 'left',
      cellRenderer: SgAssetActionDropdownRendererComponent,
      cellRendererParams: {
        onEdit: (id: string) => {
          this.onEdit(id);
        }
      },
      maxWidth: 115,
      minWidth: 115,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true
    },
    { field: 'id', headerName: 'ID', filter: 'agMultiColumnFilter', width: 90, minWidth: 90 },
    { field: 'generated_SG_asset', headerName: 'Asset Number', filter: 'agMultiColumnFilter', minWidth: 170, flex: 1 },
    {
      field: 'serialNumber', headerName: 'EyeFi Serial Number', filter: 'agMultiColumnFilter', minWidth: 170, flex: 1,

      cellRenderer: (params: any) => {
        if (!params.value) return '';
        const serialNumber = params.value.toString();
        return `<code style="
          font-family: 'Courier New', monospace;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          color: #495057;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 2px;
          padding: 1px 4px;
          text-transform: uppercase;
        ">${serialNumber}</code>`;
      }
    },
    { field: 'sgPartNumber', headerName: 'SG Part Number', filter: 'agMultiColumnFilter', minWidth: 150, flex: 1 },
    { field: 'inspectorName', headerName: 'Inspector Name', filter: 'agMultiColumnFilter', minWidth: 150, flex: 1 },
    { field: 'timeStamp', headerName: 'Created Date', filter: 'agMultiColumnFilter', minWidth: 160, sort: 'desc' },
    { field: 'active', headerName: 'Status', filter: 'agMultiColumnFilter', width: 110, minWidth: 110 },

    // Secondary operational fields kept available but hidden by default.
    { field: 'poNumber', headerName: 'WO Number', filter: 'agMultiColumnFilter', cellDataType: 'text', hide: true },
    { field: 'lastUpdate', headerName: 'Last Update', filter: 'agMultiColumnFilter', hide: true },
    { field: 'manualUpdate', headerName: 'Manual Update', filter: 'agMultiColumnFilter', cellDataType: 'text', hide: true },
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

  quickFilter = '';

  searchTerm = '';

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
    },
    onFirstDataRendered: (params) => {
      highlightRowView(params, 'id', this.id);
      autoSizeColumns(params)
    },
    getRowId: params => params.data.id?.toString(),
  };

  onEdit(id) {
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: 'merge',
      queryParams: {
        id: id
      }
    });
  }

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay()

      this.data = await this.api.getList(this.selectedViewType, null, null, true);

      this.router.navigate(['.'], {
        queryParams: {
          selectedViewType: this.selectedViewType
        },
        relativeTo: this.activatedRoute
        , queryParamsHandling: 'merge'
      });

      this.gridApi?.hideOverlay()

    } catch {
      this.gridApi?.hideOverlay()
    }

  }

  // Filter Helper Methods
  hasActiveFilters(): boolean {
    return this.selectedViewType !== 'All' ||
      !!this.searchTerm;
  }

  clearStatusFilter() {
    this.selectedViewType = 'All';
    this.getData();
  }

  clearSearchFilter() {
    this.searchTerm = '';
    this.getData();
  }

}
