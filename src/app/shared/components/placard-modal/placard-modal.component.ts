import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { PlacardFormComponent } from '@app/pages/operations/forms/placard/placard-form/placard-form.component';
import { PlacardService } from '@app/core/api/operations/placard/placard.service';
import moment from 'moment';
import { TokenStorageService } from '@app/core/services/token-storage.service';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { ToastrService } from 'ngx-toastr';

@Injectable({
    providedIn: 'root'
})
export class PlacardModalService {
    constructor(
        public modalService: NgbModal,
    ) { }

    open(soNumber, lineNumber, partNumber) {
        let modalRef = this.modalService.open(PlacardModalComponent, { size: 'lg' });
        modalRef.componentInstance.soNumber = soNumber;
        modalRef.componentInstance.lineNumber = lineNumber;
        modalRef.componentInstance.partNumber = partNumber;
        return modalRef;
    }

}

@Component({
    standalone: true,
    imports: [SharedModule, PlacardFormComponent],
    selector: 'app-placard-modal',
    templateUrl: './placard-modal.component.html',
})

export class PlacardModalComponent {
    constructor(
        private ngbActiveModal: NgbActiveModal,
        private placardService: PlacardService,
        private tokenStorageService: TokenStorageService,
        private api: PlacardService,
        private toastrService: ToastrService,
    ) { }

    @Input({ required: true }) public soNumber: string = '';
    @Input({ required: true }) public lineNumber: string = '';
    @Input({ required: true }) public partNumber: string = '';

    data: any;
    isLoading = false;

    form: any;

    id

    setFormEmitter($event) {
        this.form = $event;
        this.form.patchValue({
            created_date: moment().format('YYYY-MM-DD HH:mm:ss'),
            created_by: this.userData.id,
        }, { emitEvent: false })
    }


    submitted = false;

    userData: any;

    ngOnInit() {
        this.userData = this.tokenStorageService.getUser();
        if (this.soNumber && this.lineNumber && this.partNumber)
            this.getData();
    }

    dismiss() {
        this.ngbActiveModal.dismiss('dismiss');
    }

    close() {
        this.ngbActiveModal.close(this.data);
    }

    async getData() {
        try {
            this.isLoading = true;
            let data: any = await this.placardService.getPlacardBySoSearch(this.soNumber, this.partNumber, this.lineNumber);

            if (data)
                this.form.patchValue({
                    description: data.FULLDESC,
                    location: data.LOCATION,
                    line_number: data.SOD_LINE,
                    customer_name: data.SO_CUST,
                    customer_part_number: data.SOD_CUSTPART || null,
                    po_number: data.SO_PO,
                    eyefi_so_number: data.SOD_NBR,
                    eyefi_part_number: data.SOD_PART
                })

            this.isLoading = false;
        } catch (err) {
            this.isLoading = false;
        }
    }

    async onSubmit() {
        this.submitted = true;
        if (this.form.invalid) {
            getFormValidationErrors()
            return;
        };

        if(this.id){
            this.update()
        }else{
            this.create()
        }
    }

    async create(){
        try {
            this.isLoading = true;
            let { insertId } = await this.api.create(this.form.value);
            this.id = insertId
            this.onPrint()
            this.isLoading = false;
            this.toastrService.success('Successfully Created');
        } catch (err) {
            this.isLoading = false;
        }
    }

    async update(){
        try {
            this.isLoading = true;
             await this.api.update(this.id, this.form.value);
            this.onPrint()
            this.isLoading = false;
            this.toastrService.success('Successfully Updated');
        } catch (err) {
            this.isLoading = false;
        }
    }


    onPrint() {
        var printContents = document.getElementById('pickSheet').innerHTML;
        var popupWin = window.open('', '_blank', 'width=1000,height=600');
        popupWin.document.open();
        var pathCss = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css';
        popupWin.document.write(
            '<html><head><link type="text/css" rel="stylesheet" media="screen, print" href="' +
            pathCss +
            '" /></head><body onload="window.print()">' +
            printContents +
            '</body></html>'
        );
        popupWin.document.close();
        popupWin.onload = function () {
            popupWin.print();
            popupWin.close();
        };
    }

}
