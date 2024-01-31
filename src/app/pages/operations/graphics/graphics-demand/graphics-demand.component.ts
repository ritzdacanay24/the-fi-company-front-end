import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { SharedModule } from '@app/shared/shared.module';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { AgGridModule } from 'ag-grid-angular';
import { GridOptions } from 'ag-grid-community';
import { NgSelectModule } from '@ng-select/ng-select';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { ReportService } from '@app/core/api/operations/report/report.service';
import { GraphicsService } from '@app/core/api/operations/graphics/graphics.service';
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers';
import { agGridDateFilterdateFilter, highlightRowView, autoSizeColumns } from 'src/assets/js/util';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        AgGridModule,
        NgSelectModule,
        DateRangeComponent
    ],
    selector: 'app-graphics-demand',
    templateUrl: './graphics-demand.component.html',
})
export class GraphicsDemandComponent implements OnInit {

    constructor(
        public router: Router,
        private api: GraphicsService,
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

    title = "Graphics Demand"

    columnDefs:any = [
        {
            field: 'woNumber', headerName: 'WO Number', filter: 'agMultiColumnFilter',
            editable: true,
            pinned: 'left',
            lockPinned: true,
            cellRendererFramework: LinkRendererComponent,
            cellRendererParams: {
                iconName: 'mdi mdi-pencil'
            },
            cellClass: 'lock-pinned'
        }
        , { field: 'part', headerName: 'Part Needed', filter: 'agMultiColumnFilter' }
        , { field: 'qtyNeeded', headerName: 'Qty Needed', filter: 'agTextColumnFilter', valueFormatter: params => this.formatNumber(params.data.qtyNeeded) }
        , { field: 'id', headerName: 'Id', filter: 'agTextColumnFilter', hide: true }
        , { field: 'pt_bom_code', headerName: 'BOM Code', filter: 'agTextColumnFilter', hide: false }
        , { field: 'checkedId', headerName: 'Checked Id', filter: 'agTextColumnFilter', hide: true }
        , { field: 'salesOrderQty', headerName: 'Sales Order Qty', filter: 'agTextColumnFilter', valueFormatter: params => this.formatNumber(params.data.salesOrderQty) }
        , { field: 'qtyPer', headerName: 'Component Qty Per', filter: 'agTextColumnFilter', valueFormatter: params => this.formatNumber(params.data.qtyPer) }
        , { field: 'parentQtyPer', headerName: 'Parent Qty Per', filter: 'agTextColumnFilter', valueFormatter: params => this.formatNumber(params.data.parentQtyPer) }
        , { field: 'pt_desc', headerName: 'Desc', filter: 'agTextColumnFilter' }
        , { field: 'sod_due_date', headerName: 'Due Date', filter: 'agDateColumnFilter', sort: 'asc', filterParams: agGridDateFilterdateFilter }
        , { field: 'sod_nbr', headerName: 'SO #', filter: 'agMultiColumnFilter' }
        , { field: 'SOItem', headerName: 'SO Item', filter: 'agMultiColumnFilter' }
        , { field: 'level', headerName: 'Level', filter: 'agSetColumnFilter', hide: true }
        , { field: 'sod_line', headerName: 'SO Line', filter: 'agTextColumnFilter' }
        , { field: 'parentComponent', headerName: 'Parent Component', filter: 'agTextColumnFilter' }
        , { field: 'code', headerName: 'Code', filter: 'agTextColumnFilter' }
        , { field: 'so_ord_date', headerName: 'SO Ordered Date', filter: 'agDateColumnFilter', filterParams: agGridDateFilterdateFilter }
        , { field: 'poNumber', headerName: 'PO Number', filter: 'agSetColumnFilter', hide: true }
        , { field: 'poEnteredBy', headerName: 'PO Entered By', filter: 'agMultiColumnFilter' }
        , { field: 'graphicsWorkOrderNumber', headerName: 'Graphics Work #', filter: 'agTextColumnFilter' }
        , { field: 'graphicsStatus', headerName: 'Graphics Status', filter: 'agSetColumnFilter' }
        , { field: 'graphicsSalesOrder', headerName: 'Graphics Sales #', filter: 'agTextColumnFilter', hide: true }
        , { field: 'COMMENTS', headerName: 'Comments', filter: 'agSetColumnFilter', hide: true }
        , { field: 'COMMENTSMAX', headerName: 'Recent Comment', filter: 'agTextColumnFilter', hide: true }
        , { field: 'SOItem', headerName: 'View Work Order Routing', filter: 'agTextColumnFilter' }
        , { field: 'parent_ps_end', headerName: 'PS End', filter: 'agTextColumnFilter' }
        , { field: 'so_ship', headerName: 'Ship To', filter: 'agTextColumnFilter' }
        , { field: 'sod_contr_id', headerName: 'PO #', filter: 'agTextColumnFilter' }
        , { field: 'PT_PART_TYPE', headerName: 'Part Type', filter: 'agTextColumnFilter' }
    ];

    formatNumber(value) {
        return parseFloat(value).toFixed(2)
    }

    gridOptions: GridOptions = {
        ...agGridOptions,
        columnDefs: [],
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
            let data = await this.api.getGraphicsDemand();
            this.data = data
            this.gridApi?.hideOverlay();
        } catch (err) {
            this.gridApi?.hideOverlay()
        }
    }

}
