import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormControl, FormGroup } from '@angular/forms';
import { LabelService } from '@app/core/api/labels/label.service';
import { QadPartSearchComponent } from '@app/shared/components/qad-part-search/qad-part-search.component';
import moment from 'moment';
import { AuthenticationService } from '@app/core/services/auth.service';
import { QadWoSearchComponent } from '@app/shared/components/qad-wo-search/qad-wo-search.component';

@Injectable({
    providedIn: 'root'
})
export class IssueToWorkOrderLabelModalService {

    constructor(
        public modalService: NgbModal
    ) { }

    open(data) {
        let modalRef = this.modalService.open(IssueToWorkOrderLabelModalComponent, { size: 'md' });
        modalRef.componentInstance.data = data;
        return modalRef;
    }
}

@Component({
    standalone: true,
    imports: [SharedModule, QadPartSearchComponent, QadWoSearchComponent],
    selector: 'app-issue-to-work-order-label-modal',
    templateUrl: './issue-to-work-order-label-modal.component.html',
    styleUrls: []
})

export class IssueToWorkOrderLabelModalComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private ngbActiveModal: NgbActiveModal,
        private labelService: LabelService,
        private authenticationService: AuthenticationService
    ) {
    }

    form = new FormGroup<any>({
        partNumber: new FormControl(''),
        description: new FormControl(''),
        description2: new FormControl(''),
        qty: new FormControl(''),
        workOrderNumber: new FormControl(''),
        location: new FormControl(''),
        createdByUser: new FormControl(''),
        totalLabels: new FormControl(''),
    })

    @Input() data: any

    ngOnInit(): void {
    }

    dismiss() {
        this.ngbActiveModal.dismiss()
    }

    close() {
        this.ngbActiveModal.close()
    }

    async getData() {
        let data = await this.labelService.getCustomerInfo(this.form.value.partNumber);
        this.form.patchValue({
            partNumber: data.pt_part,
            customerPartNumber: data.cp_cust_part,
            description: data.pt_desc1,
            description2: data.pt_desc2
        })
    }

    notifyParent($event) {
        // this.form.value.partNumber = $event.pt_part;
        // this.getData();
    }

    onPrint() {
        let row = this.form.value;
        var cmds = `
            ^XA

            ^FX Top section with logo, name and address.
            ^CF0,37
            ^FO150,20^FD*** ISSUED TO WORK ORDER ***^FS
            ^FO30,60^GB750,3,3^FS
            
            ^FX second section with bar code.
            ^CF0,30
            ^FO50,70^FDItem #^FS
            ^CF0,50
            ^FO130,80^FD${row.partNumber}^FS
            ^BY2,2,60
            ^FO120,125^BY2,1.5^B3A,N,50,N,N,N,A^FD${row.partNumber}^FS^
            ^FO30,185^GB750,3,3^FS
            
            ^FX third section with bar code.
            ^CF0,40
            ^FO50,195^FDff^FS
            ^FO50,235^FDdf^FS
            ^FO30,275^GB750,3,3^FS
            
            ^FX Fourth section (the two boxes on the bottom).
            ^CF0,30
            ^FO50,290^FDQty.^FS
            ^CF0,60
            ^FO120,290^FD${row.partNumber}^FS
            ^FO120,350^BY2,1.5^B3A,N,60,N,N,N,A^FD${row.partNumber}^FS^
            
            ^FX Fifthsection (the two boxes on the bottom).
            ^FO400,275^GB3,140,3^FS
            ^CF0,20
            ^FO410,290^FDWO #^FS
            ^CF0,30
            ^FO410,320^FD${row.workOrderNumber}^FS
            ^CF0,20
            ^FO590,290^FDLOCN^FS
            ^CF0,30
            ^FO590,320^FD${row.location}^FS
            ^FO400,350^GB380,3,3^FS
            ^CF0,60
            
            ^FX Fifthsection (the two boxes on the bottom).
            ^CF0,22
            ^FO410,360^FDUser ID: ${this.authenticationService.currentUserValue.first_name}^FS
            ^FO590,360^FD${moment().format('HH:mm:ss')}^FS
            ^FO670,360^FD${moment().format('YYYY-MM-DD')}^FS
            
            ^XZ
        `;

        setTimeout(() => {
            var printwindow = window.open('', 'PRINT', 'height=500,width=600');
            printwindow.document.write(cmds);
            printwindow.document.close();
            printwindow.focus();
            printwindow.print();
            printwindow.close();
        }, 200);
    }

}
