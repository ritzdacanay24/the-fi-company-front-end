import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { SharedModule } from '@app/shared/shared.module';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { AgGridModule } from 'ag-grid-angular';
import { GridOptions } from 'ag-grid-community';
import { NgSelectModule } from '@ng-select/ng-select';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { GraphicsService } from '@app/core/api/operations/graphics/graphics.service';
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers';
import { agGridDateFilterdateFilter, highlightRowView, autoSizeColumns } from 'src/assets/js/util';
import { ItemInfoModalService } from '@app/shared/components/iitem-info-modal/item-info-modal.component';
import { EditIconComponent } from '@app/shared/ag-grid/edit-icon/edit-icon.component';
import { GridSettingsComponent } from '@app/shared/grid-settings/grid-settings.component';
import { GridFiltersComponent } from '@app/shared/grid-filters/grid-filters.component';
import { GraphicsBomModalService } from '../graphics-production/graphics-bom-modal/graphics-bom-modal.component';
import moment from 'moment';
import { AuthenticationService } from '@app/core/services/auth.service';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        AgGridModule,
        NgSelectModule,
        DateRangeComponent,
        GridSettingsComponent,
        GridFiltersComponent
    ],
    selector: 'app-graphics-demand',
    templateUrl: './graphics-demand.component.html',
})
export class GraphicsDemandComponent implements OnInit {

    constructor(
        public router: Router,
        private api: GraphicsService,
        public activatedRoute: ActivatedRoute,
        private itemInfoModalService: ItemInfoModalService,
        private graphicsBomModalService: GraphicsBomModalService,
        private authenticationService: AuthenticationService,
    ) {
    }

    ngOnInit(): void {
        this.activatedRoute.queryParams.subscribe(params => {
            this.id = params['id'];
        })

        this.getData()
    }

    pageId = '/graphics/graphics-demand'

    tableList

    query

    defaultFilters

    gridApi: any;

    id = null;

    title = "Graphics Demand";

    async openGraphicsBom(row) {
        const modalRef = this.graphicsBomModalService.open(row);
        modalRef.result.then((result: any) => {
            this.getData();
        }, () => { });
    }

    columnDefs: any = [
        {
            field: 'woNumber', headerName: 'WO Number', filter: 'agMultiColumnFilter',
            editable: true,
            pinned: 'left',
            lockPinned: true,
            cellRenderer: EditIconComponent,
            cellRendererParams: {
                iconName: 'mdi mdi-pencil'
            },
            cellClass: 'lock-pinned',
            cellDataType: 'text'
        }
        , {
            field: 'part', headerName: 'Part Needed', filter: 'agMultiColumnFilter',
            cellRenderer: LinkRendererComponent,
            cellRendererParams: {
                isLink: true,
                onClick: e => this.itemInfoModalService.open(e.rowData.part),
            }
        }
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
        , {
            field: 'graphicsWorkOrderNumber', headerName: 'Graphics Work #', filter: 'agTextColumnFilter',
            cellRenderer: LinkRendererComponent,
            cellRendererParams: {
                isLink: true,
                onClick: e => this.openGraphicsBom(e.rowData.graphicsWorkOrderNumber),
            }
        }
        , { field: 'graphicsStatus', headerName: 'Graphics Status', filter: 'agSetColumnFilter' }
        , { field: 'graphicsSalesOrder', headerName: 'Graphics Sales #', filter: 'agTextColumnFilter', hide: true }
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
        getRowId: data => data?.data.id,
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
        onCellEditingStarted: (event) => { },
        onCellEditingStopped: (event) => {
            if (event.oldValue === event.newValue || event.value === undefined) return;
            this.update(event.data);
        },
    };

    async update(data: any) {
        let uniqueId = `${data.sod_nbr}-${data.sod_line}-${data.parentComponent}-${data.part}`;

        let params: any = {
            createOrUpdate: 1,
            id: data.checkedId,
            so: data.sod_nbr,
            line: data.sod_line,
            part: data.part,
            parentComponent: data.parentComponent,
            uniqueId: uniqueId,
            poNumber: data.poNumber,
            checked: data.checked,
            graphicsWorkOrderNumber: data.graphicsWorkOrderNumber || '',
            graphicsSalesOrder: data.graphicsSalesOrder || '',
            woNumber: data.woNumber,
            createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
            createdBy: this.authenticationService.currentUserValue.id,
            active: 1,
            lastModBy: this.authenticationService.currentUserValue.id,
            lastModDate: moment().format('YYYY-MM-DD HH:mm:ss')
        }

        /**
         *  Save data to database
        */
        try {
            this.gridApi.showLoadingOverlay()
            let res: any = await this.api.saveGraphicsDemand(params)
            var rowNode = this.gridApi.getRowNode(data.id);
            rowNode.data.checked = data.checked;
            rowNode.data.checkedId = parseFloat(res.idLast)
            rowNode.data.graphicsWorkOrderNumber = res.graphicsWorkOrderNumber;
            rowNode.data.graphicsStatus = res.graphicsStatus;
            rowNode.data.poEnteredBy = this.authenticationService.currentUserValue.full_name

            this.gridApi.applyTransaction({ update: [rowNode.data] });
            this.gridApi.hideOverlay();
        } catch (err) {
            this.gridApi.hideOverlay();

        }


    }

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
            let data = await this.api.getGraphicsDemand();
            this.data = data
            this.gridApi?.hideOverlay();
        } catch (err) {
            this.gridApi?.hideOverlay()
        }
    }

}
