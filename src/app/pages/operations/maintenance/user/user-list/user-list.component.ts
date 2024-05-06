import { GridApi, ColumnApi } from 'ag-grid-community'
import { Component, Input, OnInit } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { NgSelectModule } from '@ng-select/ng-select'
import { AgGridModule } from 'ag-grid-angular'

import { SharedModule } from '@app/shared/shared.module'
import { agGridOptions } from '@app/shared/config/ag-grid.config'
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers'
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString'
import { ActivatedRoute, Router } from '@angular/router'
import { highlightRowView, autoSizeColumns } from 'src/assets/js/util'
import { NAVIGATION_ROUTE } from '../user-constant'
import { UserService } from '@app/core/api/field-service/user.service'

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
  ],
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {

  constructor(
    public api: UserService,
    public router: Router,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {

    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
      this.selectedViewTypeUserList = params['selectedViewTypeUserList'] || this.selectedViewTypeUserList;
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
    { field: 'first', headerName: 'First', filter: 'agMultiColumnFilter' },
    { field: 'last', headerName: 'Last', filter: 'agMultiColumnFilter' },
    { field: 'email', headerName: 'Email', filter: 'agMultiColumnFilter' },
    { field: 'area', headerName: 'Area', filter: 'agMultiColumnFilter' },
    { field: 'workArea', headerName: 'Work Area', filter: 'agMultiColumnFilter' },
    { field: 'createdDate', headerName: 'Created Date', filter: 'agMultiColumnFilter' },
    { field: 'lastLoggedIn', headerName: 'Last Logged In', filter: 'agMultiColumnFilter' },
    { field: 'title', headerName: 'Title', filter: 'agMultiColumnFilter' },
    { field: 'workPhone', headerName: 'Work Phone', filter: 'agMultiColumnFilter' },
    { field: 'active', headerName: 'Active', filter: 'agMultiColumnFilter' },
    { field: 'access', headerName: 'Access', filter: 'agMultiColumnFilter' },
    { field: 'leadInstaller', headerName: 'Lead Installer', filter: 'agMultiColumnFilter' },
  ]

  @Input() selectedViewTypeUserList = 'Active';

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

  title = 'Users';

  gridApi: GridApi;

  data: any[];

  id = null;

  gridOptions = {
    ...agGridOptions,
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
    getRowId: params => params.data.id,
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
      this.data = [];
      this.gridApi?.showLoadingOverlay()

      let params: any = {};
      if (this.selectedViewTypeUserList != 'All') {
        let status = this.selectedViewOptions.find(person => person.name == this.selectedViewTypeUserList)
        params = { active: status.value };
      }

      this.data = await this.api.find({ ...params });

      this.router.navigate(['.'], {
        queryParams: {
          selectedViewTypeUserList: this.selectedViewTypeUserList
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
