import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { autoSizeColumns } from 'src/assets/js/util';
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
    selector: 'app-empty-location-report',
    templateUrl: './empty-location-report.component.html',
})
export class EmptyLocationReportComponent implements OnInit {

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

    title = "Empty Location Report"

    columnDefs:any = [
        { field: "LOC_LOC", headerName: "Location", filter: "agTextColumnFilter" },
        { field: "TAG_LOC_TEST", headerName: "Location Test", filter: "agTextColumnFilter" },
        { field: "LD_QTY_OH", headerName: "Qty On Hand", filter: "agTextColumnFilter" },
        { field: "loc_date", headerName: "Date", filter: "agTextColumnFilter" },
        { field: "loc_desc", headerName: "Description", filter: "agTextColumnFilter" },
        { field: "loc_single", headerName: "Single Location?", filter: "agTextColumnFilter" },
        { field: "loc_status", headerName: "Status", filter: "agTextColumnFilter" },
        { field: "loc_type", headerName: "Type", filter: "agTextColumnFilter" },
    ];

    gridOptions: GridOptions = {
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
            this.data = await this.api.getEmptyLocations();
            this.gridApi?.hideOverlay();
        } catch (err) {
            this.gridApi?.hideOverlay()
        }
    }

}
