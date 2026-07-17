import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ComputerService } from '@app/core/api/operations/computer/computer.service';
import { NAVIGATION_ROUTE } from '../computer-constant';
import { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { LinkRendererV2Component } from '@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component';
import { autoSizeColumns } from 'src/assets/js/util';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-computer-list',
  templateUrl: './computer-list.component.html',
})
export class ComputerListComponent implements OnInit {
  constructor(
    private readonly api: ComputerService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  title = 'Computer Management';
  selectedViewType = 'Active';
  data: any[] = [];
  isLoading = false;
  searchTerm = '';
  gridApi: GridApi;

  columnDefs: ColDef[] = [
    {
      field: 'action',
      headerName: 'Actions',
      pinned: 'left',
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.onEdit(e.rowData.id),
        value: 'Edit',
      },
      maxWidth: 130,
      minWidth: 120,
      sortable: false,
      filter: false,
      floatingFilter: false,
      suppressColumnsToolPanel: true,
    },
    { field: 'id', headerName: 'ID', filter: 'agNumberColumnFilter', maxWidth: 110 },
    { field: 'computer_type', headerName: 'Type', filter: 'agMultiColumnFilter', minWidth: 170 },
    { field: 'asset_tag', headerName: 'Asset Tag', filter: 'agMultiColumnFilter', minWidth: 150 },
    { field: 'computer_name', headerName: 'Computer Name', filter: 'agMultiColumnFilter', minWidth: 190 },
    { field: 'model_name', headerName: 'Model', filter: 'agMultiColumnFilter', minWidth: 170 },
    { field: 'department', headerName: 'Department', filter: 'agMultiColumnFilter', minWidth: 160 },
    { field: 'assigned_to', headerName: 'Assigned To', filter: 'agMultiColumnFilter', minWidth: 170 },
    {
      field: 'active',
      headerName: 'Active',
      filter: 'agSetColumnFilter',
      maxWidth: 130,
      valueGetter: (params) => (Number(params?.data?.active) === 1 ? 'Yes' : 'No'),
    },
  ];

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    defaultColDef: {
      sortable: true,
      resizable: true,
      floatingFilter: true,
    },
    onGridReady: (params: any) => {
      this.gridApi = params.api;
    },
    onFirstDataRendered: (params) => {
      autoSizeColumns(params);
    },
  };

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.selectedViewType = params['selectedViewType'] || this.selectedViewType;
      this.getData();
    });
  }

  async getData(): Promise<void> {
    this.isLoading = true;
    this.gridApi?.showLoadingOverlay();
    try {
      this.data = await this.api.getList(this.selectedViewType);
      this.gridApi?.hideOverlay();
    } finally {
      this.gridApi?.hideOverlay();
      this.isLoading = false;
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm = value || '';
    this.gridApi?.setGridOption('quickFilterText', this.searchTerm);
  }

  clearSearch(): void {
    this.onSearchChange('');
  }

  onCreate(): void {
    this.router.navigate([NAVIGATION_ROUTE.CREATE], { queryParamsHandling: 'merge' });
  }

  onEdit(id: number): void {
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: 'merge',
      queryParams: { id },
    });
  }
}
