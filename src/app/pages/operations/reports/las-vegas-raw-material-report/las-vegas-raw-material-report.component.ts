import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { SharedModule } from '@app/shared/shared.module';
import { autoSizeColumns,highlightRowView } from 'src/assets/js/util';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { currencyFormatter } from 'src/assets/js/util';
import { AgGridModule } from 'ag-grid-angular';
import { GridApi, GridOptions } from 'ag-grid-community';
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
  selector: 'app-las-vegas-raw-material-report',
  templateUrl: './las-vegas-raw-material-report.component.html',
})
export class LasVegasRawMaterialReportComponent implements OnInit {

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

  title = "Las Vegas Raw Material Report"

  columnDefs:any = [
    { field: "ld_part", headerName: "Part #", filter: "agTextColumnFilter" },
    { field: "FULLDESC", headerName: "Description", filter: "agTextColumnFilter" },
    { field: "TOTALVALUE", headerName: "Ext Value", filter: "agTextColumnFilter", valueFormatter: currencyFormatter },
    { field: "QTYOH", headerName: "Qty OH", filter: "agTextColumnFilter" },
    { field: "PT_PROD_LINE", headerName: "Prod Line", filter: "agTextColumnFilter" },
    { field: "PL_DESC", headerName: "Prod Line Description", filter: "agTextColumnFilter" },
    { field: "PT_ARTICLE", headerName: "Customer", filter: "agTextColumnFilter" }
  ];

  gridOptions: GridOptions = {
    ...agGridOptions,
    columnDefs: [],
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

  data: any;
  async getData() {
    try {
      this.gridApi?.showLoadingOverlay()
      this.data = await this.api.getLasVegasRawMaterial();
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
      t += data[i].TOTALVALUE;
    }

    this.totalWip = t;
  }

}
