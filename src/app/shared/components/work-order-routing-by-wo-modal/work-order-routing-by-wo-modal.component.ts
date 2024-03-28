import { Component, EventEmitter, Input, Output } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IconRendererComponent } from '@app/shared/ag-grid/icon-renderer/icon-renderer.component';
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { WorkOrderInfoModalService } from '../work-order-info-modal/work-order-info-modal.component';
import { isEmpty } from 'src/assets/js/util/util';
import { WorkOrderPickSheetModalService } from '@app/pages/operations/master-scheduling/work-order-pick-sheet-modal/work-order-pick-sheet-modal.component';
import { WorkOrderRoutingService } from '@app/core/api/work-order-routing/work-order-routing.service';
import { SharedModule } from '@app/shared/shared.module';
import { AgGridModule } from 'ag-grid-angular';

@Injectable({
    providedIn: 'root'
})
export class WorkOrderRoutingByWoModalService {
    modalRef: any;

    constructor(
        public modalService: NgbModal
    ) { }

    public open(wo_nbr?) {
        this.modalRef = this.modalService.open(WorkOrderRoutingByWoComponent, { size: 'xl', backdrop: 'static', scrollable: true, centered: true, keyboard: false });
        this.modalRef.componentInstance.wo_nbr = wo_nbr;
        return this.modalRef;
    }

    public getInstance() {
        return this.modalRef;
    }

}


@Component({
    standalone: true,
    imports: [SharedModule, AgGridModule],
    selector: 'app-work-order-routing-by-wo-modal',
    templateUrl: `./work-order-routing-by-wo-modal.component.html`,
    styleUrls: []
})

export class WorkOrderRoutingByWoComponent {

    data = [];
    isLoading = true;
    gridApi: any;
    gridColumnApi: any;

    constructor(
        private workOrderRoutingService: WorkOrderRoutingService,
        private ngbActiveModal: NgbActiveModal,
        private workOrderInfoModalService: WorkOrderInfoModalService,
        private workOrderPickSheetModalService: WorkOrderPickSheetModalService,
    ) { }

    @Input() public wo_nbr: string;
    @Output() passEntry: EventEmitter<any> = new EventEmitter();

    onGridReady(params: { api: any; columnApi: any; }) {
        this.gridApi = params.api;
        this.gridColumnApi = params.columnApi;
    }

    firstDataRendered() {
        this.gridColumnApi.autoSizeAllColumns();
    }

    columnDefs = [
        {
            field: "pick_sheet", headerName: "Pick Sheet", filter: "agSetColumnFilter",
            cellRenderer: IconRendererComponent,
            cellRendererParams: {
                onClick: (params) => this.openPickSheet(params.rowData.WR_NBR),
                iconName: 'mdi-clipboard-outline'
            },
            valueGetter: function (params) {
                return `WO#: ${params.data.WR_NBR}`;
            },
            filterParams: {
                valueGetter: params => {
                    if (isEmpty(params.data.print_details)) {
                        return 'Not printed'
                    } else if (params.data.LINESTATUS == 0) {
                        return 'Completed Picks'
                    } else if (params.data.LINESTATUS > 0) {
                        return 'Partially completed'
                    } else if (params.data.LINESTATUS < 0) {
                        return 'Over issued'
                    }
                    return null
                }
            }
        },
        // { field: 'WR_PART', headerName: 'Part #', filter: 'agTextColumnFilter' },
        {
            field: 'WR_NBR', headerName: 'WO #', filter: 'agTextColumnFilter',
            cellRenderer: LinkRendererComponent,
            cellRendererParams: {
                onClick: e => this.workOrderInfoModalService.open(e.rowData.WR_NBR),
                isLink: true
            }
        },
        { field: 'WR_OP', headerName: 'OP', filter: 'agTextColumnFilter' },
        { field: 'WO_SO_JOB', headerName: 'SO/Job', filter: 'agTextColumnFilter' },
        { field: 'DUEBY', headerName: 'Due By', filter: 'agTextColumnFilter' },
        { field: 'WR_DUE', headerName: 'Work Order Due', filter: 'agTextColumnFilter' },
        { field: 'OPENQTY', headerName: 'Qty Open', filter: 'agTextColumnFilter' },
    ]

    openPickSheet(workOrderNumber: number) {
        const modalRef = this.workOrderPickSheetModalService.open(workOrderNumber);
        modalRef.result.then((result: any) => {
        }, (reason) => { });
    }

    gridOptions = {
        ...agGridOptions,
        columnDefs: this.columnDefs,
        onGridReady: this.onGridReady.bind(this),
        onFirstDataRendered: this.firstDataRendered.bind(this),
        sideBar: false,
        defaultColDef: {
            ...agGridOptions.defaultColDef,
            floatingFilter: true
        }
    };

    getData = () => {
        this.isLoading = true;
        this.workOrderRoutingService.getRoutingByWoNumber(this.wo_nbr).subscribe(
            (data: any) => {
                this.data = data;
                this.isLoading = false;
            }, error => {
                this.isLoading = false;
            })
    }
    ngOnInit() {
        this.getData();
    }

    public dismiss() {
        this.ngbActiveModal.dismiss('dismiss');
    }

    public close() {
        this.ngbActiveModal.close(this.wo_nbr);
    }

}
