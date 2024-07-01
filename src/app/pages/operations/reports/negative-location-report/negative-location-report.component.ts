import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { SharedModule } from '@app/shared/shared.module';
import { autoSizeColumns,highlightRowView } from 'src/assets/js/util';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
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
    selector: 'app-negative-location-report',
    templateUrl: './negative-location-report.component.html',
})
export class NegativeLocationReportComponent implements OnInit {

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

    title = "Negative Location Report"

    columnDefs:any = [
        { field: "ld_part", headerName: "Part #", filter: "agTextColumnFilter" },
        { field: "ld_loc", headerName: "Location", filter: "agTextColumnFilter" },
        { field: "ld_qty_oh", headerName: "Qty On Hand", filter: "agTextColumnFilter" },
        { field: "ld_status", headerName: "Status", filter: "agTextColumnFilter" },
        { field: "ld_date", headerName: "Date", filter: "agTextColumnFilter" },
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
            this.data = await this.api.getNegativeLcations();
            this.gridApi?.hideOverlay();
        } catch (err) {
            this.gridApi?.hideOverlay()
        }
    }

}
