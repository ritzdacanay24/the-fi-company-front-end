import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { SharedModule } from '@app/shared/shared.module';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { AgGridModule } from 'ag-grid-angular';
import { GridOptions } from 'ag-grid-community';
import { NgSelectModule } from '@ng-select/ng-select';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { MasterSchedulingService } from '@app/core/api/operations/master-scheduling/master-scheduling.service';
import moment from 'moment';
import { agGridDateFilterdateFilter, currencyFormatter, highlightRowView, autoSizeColumns, isEmpty } from 'src/assets/js/util';
import { CommentsModalService } from '@app/shared/components/comments/comments-modal.service';
import { CommentsRendererComponent } from '@app/shared/ag-grid/comments-renderer/comments-renderer.component';
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers';
import { WorkOrderRoutingModalService } from '@app/shared/components/work-order-routing-modal/work-order-routing-modal.component';
import { IconRendererComponent } from '@app/shared/ag-grid/icon-renderer/icon-renderer.component';
import { FgLabelPrintModalService } from '@app/shared/components/fg-label-print-modal/fg-label-print-modal.component';
import { AddressInfoModalService } from '@app/shared/components/address-info-modal/address-info-modal.component';
import { OwnerRendererComponent } from '@app/shared/ag-grid/owner-renderer/owner-renderer.component';
import { OwnerTransactionsService } from '@app/shared/components/owner-transactions/owner-transactions.component';
import { CustomerOrderInfoModalService } from '@app/shared/components/customer-order-info/customer-order-info.component';
import { SalesOrderInfoModalService } from '@app/shared/components/sales-order-info-modal/sales-order-info-modal.component';
import { ItemInfoModalService } from '@app/shared/components/iitem-info-modal/item-info-modal.component';
import { PorLabelPrintModalService } from '@app/shared/components/por-label-print-modal/por-label-print-modal.component';
import { PlacardModalService } from '@app/shared/components/placard-modal/placard-modal.component';
import { LateReasonCodeRendererComponent } from '@app/shared/ag-grid/cell-renderers/late-reason-code-renderer/late-reason-code-renderer.component';
import { LateReasonCodeModalService } from '@app/shared/components/last-reason-code-modal/late-reason-code-modal.component';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        AgGridModule,
        NgSelectModule,
        DateRangeComponent
    ],
    selector: 'app-shipping',
    templateUrl: './shipping.component.html',
})
export class ShippingComponent implements OnInit {

    constructor(
        public router: Router,
        private api: MasterSchedulingService,
        public activatedRoute: ActivatedRoute,
        private commentsModalService: CommentsModalService,
        private workOrderRoutingModalService: WorkOrderRoutingModalService,
        private fgLabelPrintModal: FgLabelPrintModalService,
        private addressInfoModalService: AddressInfoModalService,
        private ownerTransactionsService: OwnerTransactionsService,
        private customerOrderInfoModalService: CustomerOrderInfoModalService,
        private salesOrderInfoModalService: SalesOrderInfoModalService,
        private itemInfoModalService: ItemInfoModalService,
        private porLabelPrintModalService: PorLabelPrintModalService,
        private placardModalService: PlacardModalService,
        private lateReasonCodeModalService: LateReasonCodeModalService
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

    title = "Shipping"

    public isInspection(data: any) {
        return data.source_inspection_required == "Yes" &&
            (data.source_inspection_completed == "No" || data.source_inspection_completed == "" || data.source_inspection_completed == null)
    }

    viewComment = (workOrderNumber) => {
        let modalRef = this.commentsModalService.open(workOrderNumber, 'Sales Order')
        modalRef.result.then((result: any) => {
        }, () => { });
    }

    viewRouting = (partNumber) => {
        let modalRef = this.workOrderRoutingModalService.open(partNumber)
        modalRef.result.then((result: any) => {
        }, () => { });
    }

    viewPlacard = (so, line, partNumber) => {
        let modalRef = this.placardModalService.open(so, line, partNumber)
        modalRef.result.then((result: any) => {
        }, () => { });
    }

    viewReasonCode = (key, misc, soLineNumber, rowData) => {
        let modalRef = this.lateReasonCodeModalService.open(key, misc, soLineNumber, "Shipping")
        modalRef.result.then((result: any) => {
            this.getData();
        }, () => { });
    }


    columnDefs: any = [{
        field: "shipAccountEdit", headerName: "Ship Account Edit", filter: "agSetColumnFilter"
        , valueGetter: (params) => {
            return `SO#: ${params?.data?.sales_order_line_number}`;
        }
    },
    { field: "STATUS", headerName: "Status", filter: "agSetColumnFilter" },
    {
        field: "SOD_PART", headerName: "Part", filter: "agMultiColumnFilter",
        cellRenderer: LinkRendererComponent,
        cellRendererParams: {
            onClick: e => this.itemInfoModalService.open(e.rowData.SOD_PART),
            isLink: true
        }
    },
    { field: "FULLDESC", headerName: "Desc", filter: "agMultiColumnFilter" },
    { field: "CP_CUST_PART", headerName: "Cust Part #", filter: "agMultiColumnFilter" },
    {
        field: "SOD_NBR", headerName: "SO #", filter: "agMultiColumnFilter",
        cellStyle: (e) => {
            if (e.data && e.data.SOD_NBR && e.data.SOD_NBR.toString().includes("SV")) return { borderColor: "#0074D9", borderWidth: "1px" }
            return null;
        },
        cellRenderer: LinkRendererComponent,
        cellRendererParams: {
            onClick: e => this.salesOrderInfoModalService.open(e.rowData.SOD_NBR),
            isLink: true
        }
    },
    { field: "SOD_LINE", headerName: "Line #", filter: "agSetColumnFilter" },
    { field: "SOD_CONTR_ID", headerName: "PO #", filter: "agMultiColumnFilter" },
    { field: "SO_CUST", headerName: "Customer", filter: "agMultiColumnFilter" },
    {
        field: "SO_SHIP", headerName: "Ship To", filter: "agMultiColumnFilter",
        cellRenderer: LinkRendererComponent,
        cellRendererParams: {
            onClick: e => this.addressInfoModalService.open(e.rowData.SO_SHIP),
            isLink: true
        }
    },
    { field: "SOD_QTY_ORD", headerName: "Qty Ordered", filter: "agNumberColumnFilter" },
    { field: "SOD_QTY_ALL", headerName: "Qty Allocated", filter: "agNumberColumnFilter" },
    { field: "SOD_QTY_SHIP", headerName: "Qty Shipped", filter: "agNumberColumnFilter" },
    { field: "QTYOPEN", headerName: "Qty Open", filter: "agNumberColumnFilter" },
    {
        field: "LD_QTY_OH", headerName: "Qty OH", filter: "agSetColumnFilter",
        cellStyle: (e) => {
            if (e.data && e.data.LD_QTY_OH <= 0)
                return { "background-color": "#B22222", color: "#fff" }
            return null
        }, filterParams: {
            valueGetter: params => {
                if (params.data && params.data.LD_QTY_OH <= 0) {
                    return 'No qty on hand'
                } else {
                    return 'On hand qty available'
                }
            }
        }
    },
    {
        field: "SOD_DUE_DATE", headerName: "Due Date", filter: "agDateColumnFilter",
        filterParams: agGridDateFilterdateFilter,
        cellStyle: params => {
            if (params.data && this.isInspection(params.data?.misc)) {
                return {
                    'background-color': '#0074D9',
                    color: '#fff',
                };
            }
            return null
        },
        cellRenderer: params => {
            if (params.data) {
                if (params.data && this.isInspection(params.data?.misc)) {
                    let startdate = moment(params.data.SOD_DUE_DATE);
                    const dow = startdate.day();

                    if (dow == 1) {
                        startdate = startdate.subtract(3, "days");
                        return startdate.format("YYYY-MM-DD");
                    } else {
                        startdate = startdate.subtract(1, "days");
                        return startdate.format("YYYY-MM-DD");
                    }
                } else {
                    return params.data.SOD_DUE_DATE
                }
            }
        }
    },
    {
        field: "SOD_ORDER_CATEGORY", headerName: "Customer CO #", filter: "agTextColumnFilter",
        cellRenderer: LinkRendererComponent,
        cellRendererParams: {
            onClick: e => { this.customerOrderInfoModalService.open(e.rowData.SOD_ORDER_CATEGORY) },
            isLink: true
        }
    },
    {
        field: "SO_ORD_DATE", headerName: "Ordered Date", filter: "agDateColumnFilter",
        filterParams: agGridDateFilterdateFilter
    },
    { field: "PT_ROUTING", headerName: "Routing", filter: "agSetColumnFilter" },
    {
        field: "Comments", headerName: "Comments", filter: "agMultiColumnFilter",
        cellRenderer: CommentsRendererComponent,
        cellRendererParams: {
            onClick: (e: any) => this.viewComment(e.rowData.sales_order_line_number),
        }
        , valueGetter: function (params) {
            return {
                title: `SO#: ${params.data.sales_order_line_number}`,
            }
        },
    },

    { field: "recent_comments.comments_html", headerName: "Recent Comment", filter: "agTextColumnFilter", autoHeight: false, wrapText: false, maxWidth: 300 },
    {
        field: "CMT_CMMT", headerName: "QAD Comments", filter: "agMultiColumnFilter",
        filterParams: {
            valueGetter: params => {
                let data = params.data.CMT_CMMT;
                if (data !== '') {
                    return 'Has Comments'
                } else {
                    return 'No Comments';
                }
            }
        }
    },
    {
        field: "misc.userName", headerName: "Owner", filter: "agMultiColumnFilter"
    },
    {
        field: "ownerTransactions", headerName: "Owner Transactions", filter: "agSetColumnFilter",
        cellRenderer: OwnerRendererComponent,
        cellRendererParams: {
            onClick: e => { this.ownerTransactionsService.open(`${e.rowData.SOD_NBR}-${e.rowData.SOD_LINE}`) },
        },
        filterParams: {
            valueGetter: params => {
                if (params.data && !isEmpty(params.data.recent_owner_changes)) {
                    return 'New Owners'
                } else {
                    return 'Show All'
                }
            }
        }
    },
    { field: "shippingChanges", headerName: "Shipping Changes", filter: "agSetColumnFilter" },
    {
        field: "SOD_LIST_PR", headerName: "List Price", filter: "agSetColumnFilter", valueFormatter: currencyFormatter, aggFunc: "sum", filterParams: {
            valueGetter: params => {
                if (params.data.SOD_LIST_PR == 0.00) {
                    return 'No cost list price'
                } else {
                    return 'Has list price'
                }
            }
        }
    },
    {
        field: "SOD_LIST_PR", headerName: "No Cost List Price", filter: "agSetColumnFilter", valueFormatter: currencyFormatter,
        cellStyle: function (e) {
            if (e.data && 0 == e.data.SOD_LIST_PR) return { borderColor: "red", borderWidth: "1px", display: 'inline' }
            return null;
        },
        filterParams: {
            valueGetter: params => {
                if (params.data.SOD_LIST_PR == 0.00) {
                    return 'No cost list price'
                } else {
                    return 'Has list price'
                }
            }
        }
    },
    { field: "OPENBALANCE", headerName: "Open Balance", filter: "agNumberColumnFilter", valueFormatter: currencyFormatter, aggFunc: "sum" },
    {
        field: "WORK_ORDER_ROUTING", headerName: "View Work Order Routing", filter: "agMultiColumnFilter",
        cellRenderer: LinkRendererComponent,
        cellRendererParams: {
            onClick: e => this.viewRouting(e.rowData.SOD_PART),
            isLink: true
        }
    },
    { field: "LEADTIME", headerName: "Lead Time", filter: "agTextColumnFilter" },
    { field: "AGE", headerName: "Age", filter: "agSetColumnFilter" },
    { field: "RFQ", headerName: "RFQ", filter: "agSetColumnFilter" },
    {
        field: "misc.arrivalDate", headerName: "Arrival Date", filter: "agDateColumnFilter",
        filterParams: agGridDateFilterdateFilter
    },
    { field: "misc.shipViaAccount", headerName: "Ship Via Account", filter: "agSetColumnFilter" },
    { field: "sod_acct", headerName: "Sod Account", filter: "agSetColumnFilter" },
    {
        field: "generate_placard", headerName: "Generate Placard", filter: "agSetColumnFilter",
        cellRenderer: IconRendererComponent,
        cellRendererParams: {
            onClick: e => { this.viewPlacard(e.rowData.SOD_NBR, e.rowData.SOD_LINE, e.rowData.SOD_PART) },
            iconName: 'mdi mdi-printer'
        }
    },
    {
        field: "misc.source_Inspection", headerName: "Source Inspection", filter: "agSetColumnFilter"
        , valueGetter: (params) => {
            if (params.data) return `SO#: ${params.data.sales_order_line_number}`;
            return null;
        }
    },
    {
        field: "misc.source_inspection_required", headerName: "Source Inspection Required", filter: "agSetColumnFilter",
        cellRenderer: (params) => {
            if (params.data) {
                if (params.data.misc.source_inspection_required == "Yes" &&
                    (params.data.misc.source_inspection_completed == "Yes")
                ) {
                    return `${params.data.misc.source_inspection_waived === 'true' ? 'Completed & Waived' : 'Completed!'}`;
                } else {
                    return params.data.misc.source_inspection_required
                }
            }
        }
    },
    {
        field: "recent_notes.notes", headerName: "Notes", filter: "agSetColumnFilter",
        filterParams: {
            valueGetter: params => {
                let isEMpty = isEmpty(params.data.recent_notes);
                if (!isEMpty) {
                    return 'Has Notes'
                } else {
                    return 'No Notes';
                }
            }
        }
    },
    { field: "SO_SHIPVIA", headerName: "Ship Via", filter: "agMultiColumnFilter" },
    { field: "misc.container", headerName: "Container", filter: "agMultiColumnFilter" },
    { field: "misc.container_due_date", headerName: "Container due date", filter: "agSetColumnFilter" },
    { field: "misc.tj_po_number", headerName: "TJ PO #", filter: "agMultiColumnFilter" },
    { field: "misc.tj_due_date", headerName: "TJ Due Date", filter: "agSetColumnFilter" },
    { field: "misc.pallet_count", headerName: "Pallet Count", filter: "agSetColumnFilter" },
    {
        field: "FG-Label", headerName: "FG Label", filter: "agSetColumnFilter",
        cellRenderer: IconRendererComponent,
        cellRendererParams: {
            onClick: e => { this.fgLabelPrintModal.open(e.rowData.CP_CUST_PART, e.rowData.SOD_CONTR_ID, e.rowData.SOD_PART, e.rowData.PT_DESC1, e.rowData.PT_DESC2, e.rowData) },
            iconName: 'mdi mdi-printer'
        }
    },
    {
        field: "POR-Label", headerName: "POR Label", filter: "agSetColumnFilter",
        cellRenderer: IconRendererComponent,
        cellRendererParams: {
            onClick: e => { this.porLabelPrintModalService.open(e.rowData.CP_CUST_PART, e.rowData.SOD_CONTR_ID, e.rowData.SOD_PART, e.rowData.PT_DESC1, e.rowData.PT_DESC2) },
            iconName: 'mdi mdi-printer'
        }
    },
    { field: "misc.g2e_comments", headerName: "G2E", filter: "agMultiColumnFilter" },
    {
        field: 'misc.shortages_review',
        headerName: 'Shortages Review',
        filter: 'agSetColumnFilter'
    },
    {
        field: 'misc.recoveryDate',
        headerName: 'Production Commit date',
        filter: 'agSetColumnFilter'
    },
    {
        field: 'misc.lateReasonCodePerfDate',
        headerName: 'Late Reason Code (Perf Date)',
        filter: 'agSetColumnFilter',
        cellRenderer: LateReasonCodeRendererComponent,
        cellRendererParams: {
            onClick: e => {
                this.viewReasonCode('lateReasonCodePerfDate', e.rowData.misc, e.rowData.SOD_NBR + '-' + e.rowData.SOD_LINE, e.rowData)
            }
        }
    },
    {
        field: 'misc.lateReasonCode',
        headerName: 'Late Reason Code',
        filter: 'agSetColumnFilter',
        cellRenderer: LateReasonCodeRendererComponent,
        cellRendererParams: {
            onClick: e => {
                this.viewReasonCode('lateReasonCode', e.rowData.misc, e.rowData.SOD_NBR + '-' + e.rowData.SOD_LINE, e.rowData)
            }
        }
    },
    {
        field: 'misc.supplyReview',
        headerName: 'Supply Review',
        filter: 'agSetColumnFilter'
    },
    {
        field: 'misc.clear_to_build_status',
        headerName: 'Clear to build status',
        filter: 'agSetColumnFilter',
        cellEditor: 'agRichSelectCellEditor',
        editable: true,
        cellRenderer: params => {
            if (params.data) {
                if (params.value && params.value !== 'NA') {
                    return params.value
                }
                return '--Select status--'
            }
        },
        cellStyle: (params: any) => {
            if (params.value == 'Clear To Build') {
                return { 'background-color': '#32de84' };
            } else if (params.value == 'At Risk') {
                return { 'background-color': '#AA0000' };
            } else if (params.value == 'Miss') {
                return { 'background-color': '#c90016', color: 'white' };
            } else {
                return { 'background-color': 'unset' };
            }
        },

        cellEditorParams: {
            values: ['Clear To Build', 'At Risk', 'Miss', 'NA'],
            cellEditorPopup: false,
        },

        valueGetter: (params) => {
            if (params?.data?.misc?.clear_to_build_status != 'NA') return params?.data?.misc?.clear_to_build_status
            return ""
        }
    },
    {
        field: 'clear_to_build_period',
        headerName: 'Clear to build period',
        filter: 'agMultiColumnFilter',
        cellRenderer: (params) => {
            return moment(params?.data?.SOD_DUE_DATE).format('MM-YYYY')
        },
        valueGetter: (params) => {
            return moment(params?.data?.SOD_DUE_DATE).format('MM-YYYY')
        }
    },
    { field: 'sod_type', headerName: 'SOD Type', filter: 'agSetColumnFilter' },
    { field: 'oid_ordered_dateTime', headerName: 'SO Ordered Date & Time', filter: 'agTextColumnFilter' },
    { field: 'OID_SO_MSTR', headerName: 'OID SO MSTR', filter: 'agTextColumnFilter' },
    { field: 'sod_per_date', headerName: 'Performance Date', filter: 'agDateColumnFilter' },
    { field: "sod_req_date", headerName: "Request Date", filter: "agDateColumnFilter", filterParams: agGridDateFilterdateFilter },
    { field: "REQ_DUE_DIFF", headerName: "Request and Due Date Diff", filter: "agMultiColumnFilter" }
    ];

    gridOptions: GridOptions = {
        ...agGridOptions,
        rowBuffer: 0,
        animateRows: true,
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
            this.data = await this.api.getShipping();
            this.gridApi?.hideOverlay();
        } catch (err) {
            this.gridApi?.hideOverlay()
        }
    }

}
