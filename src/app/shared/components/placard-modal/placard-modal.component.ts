import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { PlacardFormComponent } from '@app/pages/operations/forms/placard/placard-form/placard-form.component';
import { IPlacardForm } from '@app/pages/operations/forms/placard/placard-form/placard-form.type';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';
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

    setFormEmitter($event) {
        this.form = $event;
        console.log(this.form)
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

        try {
            this.isLoading = true;
            await this.api.create(this.form.value);
            this.isLoading = false;
            this.toastrService.success('Successfully Created');
            this.close();
        } catch (err) {
            this.isLoading = false;
        }
    }

}
