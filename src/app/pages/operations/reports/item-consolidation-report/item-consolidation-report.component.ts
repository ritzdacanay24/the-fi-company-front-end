import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { SharedModule } from '@app/shared/shared.module';
import { autoSizeColumns } from 'src/assets/js/util';
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
    selector: 'app-item-consolidation-report',
    templateUrl: './item-consolidation-report.component.html',
})
export class ItemConsolidationReportComponent implements OnInit {

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

    title = "Item Consolidation Report"

    columnDefs:any = [
        { field: "ld_part", headerName: "Part Number", filter: "agTextColumnFilter", rowGroup: true, enableRowGroup: true },
        { field: "ld_loc", headerName: "Location" },
        { field: "total_items_in_location", headerName: "Items In Location", filter: "agTextColumnFilter" },
        { field: "ld_qty_all", headerName: "Qty Allocated", filter: "agTextColumnFilter" },
        { field: "ld_qty_oh", headerName: "Qty in Location", filter: "agTextColumnFilter" },
        { field: "sct_cst_tot", headerName: "Std Cost", filter: "agTextColumnFilter", valueFormatter: currencyFormatter },
        { field: "extcost", headerName: "Ext Cost", filter: "agTextColumnFilter", valueFormatter: currencyFormatter },
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
            autoSizeColumns(params)
        },
        onFilterChanged: params => this.updateUrl(params),
        onSortChanged: params => this.updateUrl(params),
        // all 'country' row groups will be open by default
        groupDefaultExpanded: 1,
        groupTotalRow: null,
        // includes grand total
        autoGroupColumnDef: {
            filter: 'agGroupColumnFilter',
        },
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
            let data = await this.api.getItemConsolidationReport();
            this.data = data
            this.gridApi?.hideOverlay();
        } catch (err) {
            this.gridApi?.hideOverlay()
        }
    }

}
