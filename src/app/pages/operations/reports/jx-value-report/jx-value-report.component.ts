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
  selector: 'app-jx-value-report',
  templateUrl: './jx-value-report.component.html',
})
export class JxValueReportComponent implements OnInit {

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

  title = "JX Value Report"

  columnDefs:any = [
    { headerName: "Item Number", field: "ld_part", filter: "agMultiColumnFilter" },
    { headerName: "Description", field: "PT_DESC1", filter: "agTextColumnFilter" },
    { headerName: "Qty On Hand - Inv Detail", field: "ld_qty_oh", filter: "agTextColumnFilter" },
    { headerName: "Last Receipt", field: "LAST_RECEIPT", filter: "agTextColumnFilter" },
    { headerName: "Lot/Serial", field: "ld_lot", filter: "agTextColumnFilter" },
    { headerName: "Supplier", field: "PT_VEND", filter: "agTextColumnFilter" },
    { headerName: "Unit Cost", field: "SCT_CST_TOT", filter: "agTextColumnFilter", valueFormatter: currencyFormatter },
    { headerName: "Ext Cost", field: "EXT_COST", filter: "agTextColumnFilter", valueFormatter: currencyFormatter, pinned: 'right', },
  ];

  gridOptions: GridOptions = {
    ...agGridOptions,
    columnDefs: [],
    // getRowId: params => params.data.id?.toString(),
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
      this.data = await this.api.getJxValueReport();
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
      t += data[i].EXT_COST;
    }

    this.totalWip = t;
  }

}
