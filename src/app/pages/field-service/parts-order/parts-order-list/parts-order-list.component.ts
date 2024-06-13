import { Component, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { AgGridModule } from 'ag-grid-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { WorkOrderService } from '@app/core/api/field-service/work-order.service';
import moment from 'moment';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers';
import { agGridOptions, AG_THEME } from '@app/shared/config/ag-grid.config';
import { highlightRowView } from 'src/assets/js/util';
import { _decompressFromEncodedURIComponent, _compressToEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { PartsOrderService } from '@app/core/api/field-service/parts-order/parts-order.service';
import { NAVIGATION_ROUTE } from '../parts-order-constant';
import { CommentsModalService } from '@app/shared/components/comments/comments-modal.service';
import { CommentsRendererComponent } from '@app/shared/ag-grid/comments-renderer/comments-renderer.component';
import { GridFiltersComponent } from '@app/shared/grid-filters/grid-filters.component';
import { GridSettingsComponent } from '@app/shared/grid-settings/grid-settings.component';
import { SalesOrderInfoModalService } from '@app/shared/components/sales-order-info-modal/sales-order-info-modal.component';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        AgGridModule,
        NgSelectModule,
        DateRangeComponent,
        GridSettingsComponent,
        GridFiltersComponent,
    ],
    selector: 'app-parts-order-list',
    templateUrl: `./parts-order-list.component.html`
})
export class PartsOrderListComponent implements OnInit {

    constructor(
        private api: WorkOrderService,
        public router: Router,
        private activatedRoute: ActivatedRoute,
        private partsOrderService: PartsOrderService,
        private commentsModalService: CommentsModalService,
        private salesOrderInfoModalService: SalesOrderInfoModalService,
    ) {
    }
    title = "Parts Orders";

    pageId = '/list-parts-order'

    viewComment = (salesOrderLineNumber: any, id: string, so?) => {
        let modalRef = this.commentsModalService.open(salesOrderLineNumber, 'Sales Order')
        modalRef.result.then((result: any) => {
            let rowNode = this.gridApi.getRowNode(id);
            rowNode.data.recent_comments = result;
            this.gridApi.redrawRows({ rowNodes: [rowNode] });

            this.router.navigate([`.`], {
                relativeTo: this.activatedRoute,
                queryParamsHandling: 'merge',
                queryParams: {
                    comment: null
                }
            });
        }, () => {

            this.router.navigate([`.`], {
                relativeTo: this.activatedRoute,
                queryParamsHandling: 'merge',
                queryParams: {
                    comment: null
                }
            });
        });
    }


    ngOnInit(): void {

        this.activatedRoute.queryParams.subscribe(params => {
            this.dateFrom = params['dateFrom'] || this.dateFrom;
            this.dateTo = params['dateTo'] || this.dateTo;
            this.dateRange = [this.dateFrom, this.dateTo];

            this.id = params['id'];
            this.isAll = params['isAll'] ? params['isAll'].toLocaleLowerCase() === 'true' : false;
            this.selectedViewType = params['selectedViewType'] || this.selectedViewType;
        });
        this.getData()
    }

    columnDefs: any = [
        {
            field: '', headerName: 'View', filter: 'agNumberColumnFilter', cellRenderer: LinkRendererComponent,
            cellRendererParams: {
                onClick: e => { this.openWorkOrder(e.rowData.id) },
                value: "View"
            },
            pinned: 'left',
            maxWidth: 115,
            minWidth: 115,
            suppressHeaderMenuButton: true,
            floatingFilter: false
        },
        {
            field: "STATUS", headerName: "Status", filter: "agSetColumnFilter",
            cellRenderer: (params: any) => {
                if (params.data) {
                    if (params.data.isPastDue == 'Yes')
                        return `<span class="badge bg-danger-subtle text-danger mb-0"> Past Due </span>`;
                }
                return null
            }
        },
        {
            field: 'so_number', headerName: 'SV Number', filter: 'agMultiColumnFilter',
            cellRenderer: LinkRendererComponent,
            cellRendererParams: {
                onClick: e => this.salesOrderInfoModalService.open(e.rowData.so_number),
                isLink: true
            }
        },
        { field: 'id', headerName: 'ID', filter: 'agMultiColumnFilter' },
        { field: 'casino_name', headerName: 'Casino Name', filter: 'agMultiColumnFilter' },
        { field: 'contact_name', headerName: 'Contact Name', filter: 'agMultiColumnFilter' },
        { field: 'contact_phone_number', headerName: 'Contact Phone Number', filter: 'agMultiColumnFilter' },
        { field: 'created_by', headerName: 'Created By', filter: 'agMultiColumnFilter' },
        { field: 'created_date', headerName: 'Created Date', filter: 'agMultiColumnFilter' },
        { field: 'instructions', headerName: 'Instructions', filter: 'agMultiColumnFilter' },
        { field: 'oem', headerName: 'OEM', filter: 'agMultiColumnFilter' },
        { field: 'part_number', headerName: 'Part Number', filter: 'agMultiColumnFilter' },
        { field: 'part_qty', headerName: 'Qty', filter: 'agMultiColumnFilter' },
        { field: 'tracking_number', headerName: 'Tracking Number', filter: 'agMultiColumnFilter' },
        { field: 'tracking_number_carrier', headerName: 'Carrier', filter: 'agMultiColumnFilter' },
        { field: 'isPastDue', headerName: 'Past Due', filter: 'agMultiColumnFilter' },
        { field: 'ship_via_account', headerName: 'Ship Vi Account', filter: 'agMultiColumnFilter' },
        { field: 'arrival_date', headerName: 'Arrival Date', filter: 'agMultiColumnFilter' },
        { field: 'qad_info.so_ord_date', headerName: 'QAD Ordered Date', filter: 'agMultiColumnFilter' },
        { field: 'qad_info.sod_due_date', headerName: 'QAD Due Date', filter: 'agMultiColumnFilter' },
        { field: 'qad_info.qty_open', headerName: 'QAD Qty Open', filter: 'agMultiColumnFilter' },
        { field: 'qad_info.abs_shp_date', headerName: 'QAD Last Shipped Date', filter: 'agMultiColumnFilter' },
        { field: 'qad_info.abs_ship_qty', headerName: 'QAD Total Shipped Qty', filter: 'agMultiColumnFilter' },
        // {
        //     field: "Comments", headerName: "Comments", filter: "agMultiColumnFilter",
        //     cellRenderer: CommentsRendererComponent,
        //     cellRendererParams: {
        //         onClick: (params: any) => this.viewComment(params.rowData.so_number, params.rowData.id, params.rowData.so_number),
        //     }
        //     , valueGetter: (params) => {
        //         if (params.data)
        //             if (params.data.recent_comments?.bg_class_name == 'bg-info') {
        //                 return 'Has Comments'
        //             } if (params.data.recent_comments?.bg_class_name == 'bg-success') {
        //                 return 'New Comments'
        //             } else {
        //             return 'No Comments'
        //         }
        //     },
        //     filterParams: {
        //         valueGetter: params => {
        //             let data = params.value;
        //             if (data !== '') {
        //                 return 'Has Comments'
        //             } else {
        //                 return 'No Comments';
        //             }
        //         }
        //     }
        // },
    ]

    gridOptions = {
        ...agGridOptions,
        columnDefs: [],
        onGridReady: (params: any) => {
            this.gridApi = params.api;
            let data = this.activatedRoute.snapshot.queryParams['gridParams']
            _decompressFromEncodedURIComponent(data, params);
        },
        onFirstDataRendered: (params) => {
            highlightRowView(params, 'id', this.id);
        },
        getRowId: params => params.data.id,
        onFilterChanged: params => {
            let gridParams = _compressToEncodedURIComponent(this.gridApi);
            this.router.navigate([`.`], {
                relativeTo: this.activatedRoute,
                queryParamsHandling: 'merge',
                queryParams: {
                    gridParams
                }
            });

        },
        onSortChanged: params => {
            let gridParams = _compressToEncodedURIComponent(this.gridApi);
            this.router.navigate([`.`], {
                relativeTo: this.activatedRoute,
                queryParamsHandling: 'merge',
                queryParams: {
                    gridParams
                }
            });
        },
        getRowClass: (params: any) => {
            if (params.data.isPastDue == 'Yes') {
                return ['border border-danger bg-opacity-10 bg-danger']
            }
            return null;
        },
    };

    searchName = ''

    isAll = false;

    selectedViewType = 'Open';

    selectedViewOptions = [
        {
            name: "Open",
            value: 1,
            selected: false
        },
        {
            name: "Closed",
            value: 0,
            selected: false
        },
        {
            name: "All",
            selected: false
        }
    ]

    data: any;

    id: any;

    theme = AG_THEME;

    gridApi: any;

    dateFrom = moment().startOf('month').format('YYYY-MM-DD');
    dateTo = moment().endOf('month').format('YYYY-MM-DD');
    dateRange = [this.dateFrom, this.dateTo];

    onChangeDate($event) {
        this.dateFrom = $event['dateFrom']
        this.dateTo = $event['dateTo']
        this.getData()
    }

    changeIsAll() {
        this.router.navigate(['.'], {
            relativeTo: this.activatedRoute,
            queryParams: {
                isAll: this.isAll
            },
            queryParamsHandling: 'merge'
        });
        this.getData()
    }

    async getData() {
        try {
            this.gridApi?.showLoadingOverlay()


            this.data = await this.partsOrderService.getAll()

            this.router.navigate(['.'], {
                queryParams: {
                    dateFrom: this.dateFrom,
                    dateTo: this.dateTo,
                    selectedViewType: this.selectedViewType
                },
                relativeTo: this.activatedRoute
                , queryParamsHandling: 'merge'
            });

            this.gridApi?.hideOverlay()

        } catch (err) {
            this.gridApi?.hideOverlay()
        }

    }

    openWorkOrder(id) {
        let gridParams = _compressToEncodedURIComponent(this.gridApi);
        this.router.navigate([NAVIGATION_ROUTE.EDIT], {
            queryParamsHandling: 'merge',
            queryParams: {
                id: id,
                gridParams
            }
        });
    }


}
