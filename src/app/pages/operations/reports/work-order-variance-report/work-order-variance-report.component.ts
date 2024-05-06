import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { SharedModule } from '@app/shared/shared.module';
import { autoSizeColumns } from 'src/assets/js/util';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { AgGridModule } from 'ag-grid-angular';
import { GridOptions } from 'ag-grid-community';
import { NgSelectModule } from '@ng-select/ng-select';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { WorkOrderInfoService } from '@app/core/api/operations/work-order/work-order-info.service';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        AgGridModule,
        NgSelectModule,
        DateRangeComponent
    ],
    selector: 'app-work-order-variance-report',
    templateUrl: './work-order-variance-report.component.html',
})
export class WorkOrderVarianceReport implements OnInit {

    constructor(
        public router: Router,
        private api: WorkOrderInfoService,
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

    title = "Work Order Variance Report"

    columnDefs:any = [
        { field: "wo_nbr", headerName: "WO", filter: "agTextColumnFilter" },
        { field: "wo_line", headerName: "Line", filter: "agTextColumnFilter" },
        { field: "wo_due_date", headerName: "Due Date", filter: "agTextColumnFilter" },
        { field: "wo_part", headerName: "Part Number", filter: "agTextColumnFilter" },
        { field: "wo_qty_ord", headerName: "Ordered Qty", filter: "agTextColumnFilter" },
        { field: "wo_qty_comp", headerName: "Qty Completed", filter: "agTextColumnFilter" },
        { field: "wod_qty_req", headerName: "Qty Required", filter: "agTextColumnFilter" },
        { field: "wod_qty_iss", headerName: "Qty Issued", filter: "agTextColumnFilter" },
        { field: "wod_status", headerName: "Over Issued", filter: "agTextColumnFilter" },
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
            this.data = await this.api.getCompletedWorkers();
            this.gridApi?.hideOverlay();
        } catch (err) {
            this.gridApi?.hideOverlay()
        }
    }

}
