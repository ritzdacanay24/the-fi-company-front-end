import { Injectable, Input } from "@angular/core";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { MasterSchedulingService } from "@app/core/api/operations/master-scheduling/master-scheduling.service";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { UserSearchComponent } from "@app/shared/components/user-search/user-search.component";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { NgxBarcode6Module } from "ngx-barcode6";

@Injectable({
    providedIn: 'root'
})
export class WorkOrderPickSheetModalService {

    constructor(
        public modalService: NgbModal
    ) { }

    open(workOrderNumber: number) {
        let modalRef = this.modalService.open(WorkOrderPickSheetModalComponent, { size: 'xl', fullscreen: false, backdrop: 'static', scrollable: true, centered: true, keyboard: false });
        modalRef.componentInstance.workOrderNumber = workOrderNumber;
        return modalRef;
    }
}
@Component({
    standalone: true,
    imports: [SharedModule, NgxBarcode6Module, UserSearchComponent],
    selector: 'app-work-order-pick-sheet-modal',
    templateUrl: './work-order-pick-sheet-modal.component.html',
    styleUrls: ['./work-order-pick-sheet-modal.component.scss']
})
export class WorkOrderPickSheetModalComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private ngbActiveModal: NgbActiveModal,
        private api: MasterSchedulingService,
        private fb: FormBuilder,
        private authenticationService: AuthenticationService,
    ) {
    }

    ngOnInit(): void {
        this.form = this.fb.group({
            assignedTo: [null, Validators.required],
            comments: [''],
        })
        this.getData();
    }

    get f() {
        return this.form.controls
    }

    notifyParent($event) {
        this.form.patchValue({ assignedTo: $event.username })
    }

    @Input() workOrderNumber: number;

    title: string = 'Work Order Pick Sheet';

    icon = 'mdi-account-group';

    isLoading = false;

    filterSelections: string[] = ['Open Picks'];

    data: any;

    form: FormGroup;

    comments = ""

    filterOptionns = [
        { name: 'Open Picks', checked: true },
        { name: 'Completed Picks', checked: false }
    ]

    checkAll() {
        let filters = [];
        for (let i = 0; i < this.filterOptionns.length; i++) {
            if (this.filterOptionns[i].checked) {
                filters.push(this.filterOptionns[i].name)
            }
        }
        this.filterSelections = filters;
        this.getData()
    }


    getData = async () => {
        try {
            this.isLoading = true;
            this.data = await this.api.getPickingByWorkOrderId(this.workOrderNumber, this.filterSelections);
            this.form.patchValue(this.data.printDetails);
            this.errorCheck();
            this.isLoading = false;
        } catch (err) {
            this.isLoading = false;
        }
    }

    dismiss() {
        this.ngbActiveModal.dismiss()
    }

    close() {
        this.ngbActiveModal.close()
    }

    errors = [];
    errorCheck() {
        this.errors = [];
        for (var i = 0; i < this.data.details.length; i++) {
            let op = parseInt(this.data.details[i].wod_op);
            if (op != 100) {
                this.errors.push(
                    this.data.details[i].wod_part
                );
            }
        }
    }

    submitted = false;

    async onSubmit() {


        this.submitted = true;

        if (this.form.invalid) {
            getFormValidationErrors()
            return;
        }

        /**
         * Validation
         */
        if (this.data.mainDetails.wo_status != 'R') {
            alert('Work order must be in R status before printing.')
            return;
        } else if (this.errors.length > 0) {
            alert('One of the items in this work order is not in OPS 100. Please fix before printing.')
            return;
        } else if (this.data?.printDetails?.printedDate) {
            if (!confirm('Did work order was already printed. You wish to re-print?')) return;
        }

        /**
     * Save to database and print work order
     */
        let params: any = {
            assignedTo: this.form.value.assignedTo,
            createdBy: this.authenticationService.currentUserValue.id,
            createdByName: this.authenticationService.currentUserValue.full_name,
            printedDate: moment().format('YYYY-MM-DD HH:mm:ss'),
            workOrder: this.workOrderNumber,
            comments: this.form.value.comments,
            print: 1
        }

        try {
            this.isLoading = true;
            await this.api.printWorkOrder(params);
            this.onPrint();
            this.isLoading = false;
            this.ngbActiveModal.close(params);
        } catch (err) {
            this.isLoading = false;
        }

    }

    public onPrint() {
        var printContents = document.getElementById('pickSheet').innerHTML;
        var popupWin = window.open('', '_blank', 'width=1000,height=600');
        popupWin.document.open();
        popupWin.document.write(`
          <html>
            <head>
              <title>Work Order Picking</title>
              <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
              <style>          
              @page {
                size: landscape;
                margin-top: 48px;
                margin-bottom: 48px;
              }
              @media print {
                footer {
                  position: fixed;
                  bottom:0px
                }
                .table > tbody > tr > td {
                  vertical-align: middle;
                }
                .table > thead > tr > th {
                  text-align:center
                }
              }
              </style>
            </head>
            <body onload="window.print();window.close()">
              ${printContents}
              <footer>
                Work order number:  ${this.data.mainDetails.wo_nbr}
              </footer>
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

