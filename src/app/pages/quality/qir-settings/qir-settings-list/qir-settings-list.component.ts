import { GridApi } from 'ag-grid-community'
import { Component, Input, OnInit } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { NgSelectModule } from '@ng-select/ng-select'
import { AgGridModule } from 'ag-grid-angular'

import { ActivatedRoute, Router } from '@angular/router'
import { NAVIGATION_ROUTE } from '../qir-settings-constant'
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component'
import { QirSettingsService } from '@app/core/api/quality/qir-settings.service'
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers'
import { SharedModule } from '@app/shared/shared.module'
import { highlightRowView, autoSizeColumns } from 'src/assets/js/util'
import { _decompressFromEncodedURIComponent, _compressToEncodedURIComponent } from 'src/assets/js/util/jslzString'

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    DateRangeComponent,
  ],
  selector: 'app-qir-settings-list',
  templateUrl: './qir-settings-list.component.html',
})
export class QirSettingsListComponent implements OnInit {

  constructor(
    public api: QirSettingsService,
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

  columnDefs:any = [
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
    { field: "category", headerName: "Category", filter: "agTextColumnFilter" },
    { field: "name", headerName: "Name", filter: "agTextColumnFilter" },
    { field: "description", headerName: "Description", filter: "agTextColumnFilter", maxWidth: 300 },
    { field: "code", headerName: "Code", filter: "agTextColumnFilter" },
    { field: "active", headerName: "Active", filter: "agTextColumnFilter" },
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

  title = 'QIR Settings List';

  gridApi: GridApi;

  data: any[];

  id = null;

  changeIsAll() { }

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

      this.data = await this.api.find(params);

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
