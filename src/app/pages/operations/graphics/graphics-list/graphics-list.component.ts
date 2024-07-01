import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { GraphicsService } from '@app/core/api/operations/graphics/graphics.service';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { SharedModule } from '@app/shared/shared.module';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers';
import { AgGridModule } from 'ag-grid-angular';
import { GridApi } from 'ag-grid-community';
import moment from 'moment';
import { NAVIGATION_ROUTE } from '../graphics-constant';
import { agGridDateFilterdateFilter, highlightRowView, autoSizeColumns } from 'src/assets/js/util';

@Component({
    standalone: true,
    imports: [SharedModule, AgGridModule, DateRangeComponent],
    selector: 'app-graphics-list',
    templateUrl: './graphics-list.component.html',
    styleUrls: []
})
export class GraphicsListComponent implements OnInit {

    constructor(
        public activatedRoute: ActivatedRoute,
        public router: Router,
        public api: GraphicsService
    ) {
    }

    ngOnInit(): void {
        this.activatedRoute.queryParams.subscribe(params => {
            this.dateFrom = params['dateFrom'] || this.dateFrom;
            this.dateTo = params['dateTo'] || this.dateTo;
            this.dateRange = [this.dateFrom, this.dateTo];
            this.id = params['id'];
        });
        this.getData()
    }

    query: any;

    setFilter = (q: string) => this.gridApi.setGridOption('quickFilterText', q)

    title = 'Graphics List';

    dateFrom = moment().subtract(0, 'months').startOf('month').format('YYYY-MM-DD');;
    dateTo = moment().endOf('month').format('YYYY-MM-DD');
    dateRange = [this.dateFrom, this.dateTo];

    onChangeDate($event) {
        this.dateFrom = $event['dateFrom']
        this.dateTo = $event['dateTo']
        this.getData()
    }

    gridApi: GridApi;

    data: any[];

    id = null;

    onEdit(id) {
        let gridParams = _compressToEncodedURIComponent(this.gridApi);
        this.router.navigate([NAVIGATION_ROUTE.EDIT], {
            queryParamsHandling: 'merge',
            queryParams: {
                id: id,
                gridParams
            }
        });
    }

    columnDefs: any = [
        {
            field: "View", headerName: "View", filter: "agMultiColumnFilter",
            pinned: "left",
            cellRenderer: LinkRendererComponent,
            cellRendererParams: {
                onClick: (e: any) => this.onEdit(e.rowData.id),
                value: 'SELECT'
            },
            maxWidth: 115,
            minWidth: 115
        }
        , { field: 'graphicsWorkOrder', headerName: 'Work Order', filter: 'agTextColumnFilter' }
        , { field: 'itemNumber', headerName: 'Item Number', filter: 'agTextColumnFilter' }
        , { field: 'statusText', headerName: 'Queue', filter: 'agSetColumnFilter' }
        , { field: 'dueDate', headerName: 'Due Date', filter: 'agDateColumnFilter', filterParams: agGridDateFilterdateFilter }
        , { field: 'shippedOn', headerName: 'Shipped On', filter: 'agDateColumnFilter' }
        , { field: 'qty', headerName: 'Qty', filter: 'agSetColumnFilter' }
        , { field: 'qtyShipped', headerName: 'Qty Shipped', filter: 'agSetColumnFilter' }
        , { field: 'openQty', headerName: 'Qty Open', filter: 'agSetColumnFilter' }
        , { field: 'createdDate', headerName: 'Created Date', filter: 'agDateColumnFilter', filterParams: agGridDateFilterdateFilter }
        , { field: 'createdBy', headerName: 'Created By', filter: 'agSetColumnFilter' }
    ];

    gridOptions = {
        ...agGridOptions,
        columnDefs: this.columnDefs,
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
        getRowId: params => params.data.id?.toString(),
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

    async getData() {
        try {
            this.gridApi?.showLoadingOverlay();
            this.data = await this.api.getGraphicsList(this.dateFrom, this.dateTo)
            this.router.navigate(['.'], {
                queryParams: {
                    dateFrom: this.dateFrom,
                    dateTo: this.dateTo
                },
                relativeTo: this.activatedRoute,
                queryParamsHandling: 'merge'
            });

            this.gridApi?.hideOverlay();
        } catch (err) {
            this.gridApi?.hideOverlay();
        }

    }
}
