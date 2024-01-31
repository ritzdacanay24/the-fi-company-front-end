import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { SharedModule } from '@app/shared/shared.module';
import { autoSizeColumns,highlightRowView } from 'src/assets/js/util';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { currencyFormatter } from 'src/assets/js/util';
import { AgGridModule } from 'ag-grid-angular';
import { GridOptions } from 'ag-grid-community';
import { NgSelectModule } from '@ng-select/ng-select';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { ReportService } from '@app/core/api/operations/report/report.service';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    AgGridModule,
    NgSelectModule,
    DateRangeComponent
  ],
  selector: 'app-safety-stock-report',
  templateUrl: './safety-stock-report.component.html',
})
export class SafetyStockReportComponent implements OnInit {

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

  gridApi: any;

  gridColumnApi: any;

  id = null;

  title = "Safety Stock Report"

  columnDefs:any = [
    { field: "PT_PART", headerName: "Part #", filter: "agTextColumnFilter" },
    { field: "PT_DESC1", headerName: "Description 1", filter: "agTextColumnFilter" },
    { field: "PT_DESC2", headerName: "Description 2", filter: "agTextColumnFilter" },
    { field: "PT_PART_TYPE", headerName: "Part Type", filter: "agTextColumnFilter" },
    { field: "LOC_TYPE", headerName: "Location Type", filter: "agTextColumnFilter" },
    { field: "ONHANDQTY", headerName: "Qty OH", filter: "agTextColumnFilter" },
    { field: "SCT_CST_TOT", headerName: "Standard Cost", filter: "agTextColumnFilter", valueFormatter: currencyFormatter },
    { field: "TOTAL", headerName: "Ext Value", filter: "agTextColumnFilter", valueFormatter: currencyFormatter },
  ];

  gridOptions: GridOptions = {
    ...agGridOptions,
    columnDefs: [],
    getRowId: data => data.data.id,
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
    onFilterChanged: params => this.updateUrl(params),
    onSortChanged: params => this.updateUrl(params),
  };

  updateUrl = (params) => {
    let gridParams = _compressToEncodedURIComponent(params.api, params.columnApi);
    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: 'merge',
      queryParams: {
        gridParams
      }
    });
  }

  data: any;
  async getData() {
    try {
      this.gridApi?.showLoadingOverlay()
      this.data = await this.api.getSafetyStock();
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
      t += data[i].TOTAL;
    }

    this.totalWip = t;
  }

}
