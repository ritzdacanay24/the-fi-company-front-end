import { Component, Injectable, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { CalendarFormComponent } from '../calendar-form/calendar-form.component';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';
import { ReceivingService } from '@app/core/api/receiving/receiving.service';
import { first } from 'rxjs';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';

@Injectable({
    providedIn: 'root'
})
export class CalendarModalCreateService {

    constructor(
        public modalService: NgbModal
    ) { }

    open(data) {
        let modalRef = this.modalService.open(CalendarModalCreateComponent, { size: 'lg' });
        modalRef.componentInstance.data = data;
        return modalRef;
    }
}
@Component({
    standalone: true,
    imports: [
        SharedModule,
        ReactiveFormsModule,
        CalendarFormComponent
    ],
    selector: 'app-calendar-modal-create',
    templateUrl: './calendar-modal-create.component.html',
    styleUrls: []
})
export class CalendarModalCreateComponent {

    constructor(
        private ngbActiveModal: NgbActiveModal,
        private api: ReceivingService,

    ) { }

    form: FormGroup;

    @Input() data: any

    setFormEmitter($event) {
        this.form = $event;
        this.form.patchValue(this.data)
    }

    ngOnInit(): void {
    }

    @Input() submitted = false;

    onSubmit() {
        this.submitted = true;

        if (this.form.invalid) {
            getFormValidationErrors()
            return
        };

        this.create()
    }

    loadingIndicator = false;

    id = null
    create() {
        this.form.value.start_date = moment(this.form.value.start_date).format('YYYY-MM-DD');
        this.form.value.end_date = moment(this.form.value.end_date).format('YYYY-MM-DD');
        this.form.value.created_date = moment().format('YYYY-MM-DD HH:mm:ss');

        this.api
            .create(this.form.value)
            .pipe(first())
            .subscribe(async (data) => {
                if (this.file) {
                    await this.api.uploadfile(data, this.file)
                }
                this.ngbActiveModal.close({ transaction: "CREATE", id: data })
                this.loadingIndicator = false
            }, () => this.loadingIndicator = false);
    }


    file: File = null;

    onFilechange(event: any) {
        this.file = event.target.files[0]
    }

    dismiss() {
        this.ngbActiveModal.dismiss()
    }

}
