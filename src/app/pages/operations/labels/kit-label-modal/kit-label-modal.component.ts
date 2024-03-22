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

@Injectable({
    providedIn: 'root'
})
export class KitLabelModalService {

    constructor(
        public modalService: NgbModal
    ) { }

    open(data) {
        let modalRef = this.modalService.open(KitLabelModalComponent, { size: 'md' });
        modalRef.componentInstance.data = data;
        return modalRef;
    }
}

@Component({
    standalone: true,
    imports: [SharedModule, QadPartSearchComponent],
    selector: 'app-kit-label-modal',
    templateUrl: './kit-label-modal.component.html',
    styleUrls: []
})

export class KitLabelModalComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private ngbActiveModal: NgbActiveModal,
        private labelService: LabelService
    ) {
    }

    form = new FormGroup<any>({
        partNumber: new FormControl(''),
        description: new FormControl(''),
        description2: new FormControl(''),
        qty: new FormControl(''),
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
        this.form.value.partNumber = $event.pt_part;
        this.getData();
    }

    onPrint() {
        let row = this.form.value;
        var cmds = `
            ^XA^SZ2^MCY~TA0~JSN^MD0^LT0^MFN,C^JZY^PR4,4^PMN^JMA^LH0,0^LRN^XZ
            ^XA
            ^FO30,30^A0N,30,20^FD${row.partNumber.toUpperCase()}^FS
            ^FO350,23^BXN,4,200,,,,,^FD${row.partNumber.toUpperCase()}^FS
            ^FO30,60^A0N,28,20^FD${row.description || ''}^FS
            ^FO30,85^A0N,28,20^FD${row.description2 || ''}^FS
            ^FO30,113^A0N,28,20^FDQTY: ${row.qty}^FS
            ^FO30,138^A0N,28,20^FDDate: ${moment().format('MM/DD/YYYY')}^FS
            ^PQ${row.totalLabels}^FS
            ^XZ
            ^XA^XZ
            EOL
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
