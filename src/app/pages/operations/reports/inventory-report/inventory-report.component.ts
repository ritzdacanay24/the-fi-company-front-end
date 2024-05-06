import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { SharedModule } from '@app/shared/shared.module';
import { autoSizeColumns,currencyFormatter,highlightRowView } from 'src/assets/js/util';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
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
    selector: 'app-inventory-report',
    templateUrl: './inventory-report.component.html',
})
export class InventoryReportComponent implements OnInit {

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

    id = null;

    title = "Inventory Report"

    columnDefs:any = [
        { field: "ld_part", headerName: "Part #", filter: "agMultiColumnFilter" },
        { field: "FULLDESC", headerName: "Description", filter: "agMultiColumnFilter" },
        { field: "PT_ARTICLE", headerName: "Article", filter: "agMultiColumnFilter" },
        { field: "PT_PROD_LINE", headerName: "Prod Line", filter: "agMultiColumnFilter" },
        { field: "QTYOH", headerName: "Qty On Hand", filter: "agMultiColumnFilter" },
        { field: "TOTALVALUE", headerName: "Total Value", filter: "agMultiColumnFilter", valueFormatter: currencyFormatter, pinned: 'right',  },
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
            let data = await this.api.getInventoryReport();
            this.data = data.details
            this.gridApi?.hideOverlay();
        } catch (err) {
            this.gridApi?.hideOverlay()
        }
    }

}
