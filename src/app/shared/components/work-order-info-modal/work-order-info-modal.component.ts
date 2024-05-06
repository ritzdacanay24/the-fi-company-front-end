import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { WorkOrderInfoService } from '@app/core/api/operations/work-order/work-order-info.service';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { SharedModule } from '@app/shared/shared.module';
import { AgGridModule } from 'ag-grid-angular';
import { QadWoSearchComponent } from '../qad-wo-search/qad-wo-search.component';

@Injectable({
    providedIn: 'root'
})
export class WorkOrderInfoModalService {
    modalRef: any;

    constructor(
        public modalService: NgbModal
    ) { }

    public open(workOrderNumber: number) {
        this.modalRef = this.modalService.open(WorkOrderInfoModalComponent, { size: 'xl', fullscreen: false, backdrop: 'static', scrollable: true, centered: true });
        this.modalRef.componentInstance.workOrderNumber = workOrderNumber;
        return this.modalRef;
    }

}

@Component({
    standalone: true,
    imports: [SharedModule, AgGridModule, QadWoSearchComponent],
    selector: 'app-work-order-info-modal',
    templateUrl: `./work-order-info-modal.component.html`,
    styleUrls: []
})

export class WorkOrderInfoModalComponent {
    gridApi: any;
    isLoading = true;
    details = [];
    mainDetails: any = {
        wo_qty_ord: null,
        wo_part: null,
    };

    constructor(
        private workOrderInfoService: WorkOrderInfoService,
        private ngbActiveModal: NgbActiveModal
    ) { }

    @Input() public workOrderNumber: number;

    onGridReady(params) {
        this.gridApi = params.api;
    }

    notifyParent($event) {
        this.workOrderNumber = $event.wo_nbr
        this.getData();
    }

    firstDataRendered() {
        this.gridApi.autoSizeAllColumns();
    }

    columnDefs: any = [
        { field: "wod_part", headerName: "Part #", filter: "agMultiColumnFilter" },
        { field: "WOD_QTY_ISS", headerName: "Qty Issued", filter: "agTextColumnFilter" },
        {
            field: "WOD_QTY_REQ", headerName: "Qty Required", filter: "agTextColumnFilter",
            cellClass: params => {
                return params.value === 0 ? 'text-danger' : '';
            },
        },
        { field: "TOTALONHAND", headerName: "Qty On Hand", filter: "agTextColumnFilter" },
        { field: "QTY_OPEN", headerName: "Qty Open", filter: "agTextColumnFilter" },
        { field: "TOTALAVAIL", headerName: "Qty Available", filter: "agTextColumnFilter" },
        {
            field: "LINESTATUS", headerName: "% Complete", filter: "agTextColumnFilter", valueFormatter: params => params.data.LINESTATUS.toFixed(2),
            cellClass: params => {
                if (params.data.WOD_QTY_REQ === 0) {
                    return ['bg-warning-subtle text-warning'];
                } else if (params.value === 100) {
                    return ['bg-success-subtle text-success'];
                } else if (params.value > 100) {
                    return ['bg-danger-subtle text-danger'];
                }
                return null;
            }
        }
    ];

    percentComplete = 0.00
    calculatePercentCompleted() {
        let totalRequired = 0;
        let totalCompleted = 0
        for (let i = 0; i < this.details.length; i++) {
            totalRequired += this.details[i].WOD_QTY_REQ;
            totalCompleted += this.details[i].WOD_QTY_ISS;
        }
        return totalCompleted == 0 ? 0 : ((totalCompleted / totalRequired) * 100)
    };

    gridOptions = {
        ...agGridOptions,
        columnDefs: this.columnDefs,
        onGridReady: this.onGridReady.bind(this),
        onFirstDataRendered: this.firstDataRendered.bind(this),
        sideBar: false
    };

    getData = async () => {
        try {
            this.isLoading = true;
            let data = await this.workOrderInfoService.getDataByWorkOrderNumber(this.workOrderNumber);
            this.mainDetails = data.mainDetails;
            this.details = data.details;
            this.percentComplete = this.calculatePercentCompleted();
            this.isLoading = false;
        } catch (err) {
            this.isLoading = false;
        }
    }

    ngOnInit() {
        this.getData();
    }

    dismiss() {
        this.ngbActiveModal.dismiss('dismiss');
    }

    close() {
        this.ngbActiveModal.close(this.workOrderNumber);
    }

    public print() {
        var printContents = document.getElementById('printSheet').innerHTML;
        var popupWin = window.open('', '_blank', 'width=1000,height=600');
        popupWin.document.open();
        popupWin.document.write(`
        <html>
            <head>
            <title>Work Order Info</title>
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
            <style>          
                @page {
                size: landscape;
                }
            </style>
            </head>
            <body onload="window.print();window.close()">
            ${printContents}
            </body>
        </html>`
        );
        popupWin.document.close();
        popupWin.onload = function () {
            popupWin.print();
            popupWin.close();

        };
    }

}


