import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { GridApi, GridOptions } from 'ag-grid-community';
import { NgSelectModule } from '@ng-select/ng-select';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { ReportService } from '@app/core/api/operations/report/report.service';
import { autoSizeColumns, currencyFormatter, highlightRowView } from 'src/assets/js/util';
import { SharedModule } from '@app/shared/shared.module';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule,
    DateRangeComponent
  ],
  selector: 'app-wip-report',
  templateUrl: './wip-report.component.html',
})
export class WipReportComponent implements OnInit {

  constructor(
    public router: Router,
    private api: ReportService,
    public activatedRoute: ActivatedRoute,
  ) {
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    })

    this.getData()
  }

  gridApi: GridApi;

  id = null;

  title = "WIP Report"

  columnDefs:any = [
    {
      field: 'WO_WIP_TOT', headerName: 'WIP Total', filter: 'agMultiColumnFilter',
      pinned: 'right',
      valueFormatter: currencyFormatter
    },
    { field: 'wo_due_date', headerName: 'Due Date', filter: 'agMultiColumnFilter' },
    { field: 'wo_line', headerName: 'Line Number', filter: 'agMultiColumnFilter' },
    { field: 'wo_nbr', headerName: 'WO Number', filter: 'agMultiColumnFilter' },
    { field: 'wo_need_date', headerName: 'Need Date', filter: 'agMultiColumnFilter' },
    { field: 'wo_part', headerName: 'Part Number', filter: 'agMultiColumnFilter' },
    { field: 'wo_qty_comp', headerName: 'Qty Completed', filter: 'agMultiColumnFilter' },
    { field: 'wo_qty_ord', headerName: 'Qty Ordered', filter: 'agMultiColumnFilter' },
    { field: 'wo_rel_date', headerName: 'WO Released Date', filter: 'agMultiColumnFilter' },
    { field: 'wo_routing', headerName: 'Routing', filter: 'agMultiColumnFilter' },
    { field: 'wo_so_job', headerName: 'SO/Job', filter: 'agMultiColumnFilter' },
    { field: 'wo_status', headerName: 'Status', filter: 'agMultiColumnFilter' },
  ];

  gridOptions: GridOptions = {
    columnDefs: [],
    getRowId: params => params.data.id?.toString(),
    onGridReady: (params: any) => {
      this.gridApi = params.api;

      let data = this.activatedRoute.snapshot.queryParams['gridParams']
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params) => {
      highlightRowView(params, 'id', this.id);
      autoSizeColumns(params)
    },
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

  data: any
  async getData() {
    try {
      this.gridApi?.showLoadingOverlay()
      this.data = await this.api.getWipReport();
      this.gridApi?.hideOverlay();

      this.sumTotal(this.data)
    } catch (err) {
      this.gridApi?.hideOverlay()
    }
  }


  totalWip = 0
  sumTotal(data) {
    let t = 0;
    for (let i = 0; i < data.length; i++) {
      t += data[i].WO_WIP_TOT;
    }

    this.totalWip = t;
  }

}
