import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PartsOrderService } from '@app/core/api/field-service/parts-order/parts-order.service';
import { QadService } from '@app/core/api/qad/sales-order-search.service';
import { AddressSearchComponent } from '@app/shared/components/address-search/address-search.component';
import { QadPartSearchComponent } from '@app/shared/components/qad-part-search/qad-part-search.component';
import { QirSearchComponent } from '@app/shared/components/qir-search/qir-search.component';
import { SharedModule } from '@app/shared/shared.module';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { AutosizeModule } from 'ngx-autosize';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        ReactiveFormsModule,
        QirSearchComponent,
        QadPartSearchComponent,
        AddressSearchComponent,
        AutosizeModule,
        QadPartSearchComponent,
        NgSelectModule
    ],
    selector: 'app-parts-order-form',
    templateUrl: './parts-order-form-component.html'
})
export class PartsOrderFormComponent {


    notifyQadParent($event) {
        this.part_number = $event.pt_part
        this.description = $event.description?.replace(/"/g, '\'') || "No Description Found.";
    }

    notifyQadParentRow($event, row) {
        row.patchValue({ part_number: $event.pt_part, description: $event?.description });
    }

    customers = []
    getAllCustomerName = async () => {
        this.customers = await this.qadService.getAllCustomerName();
    }

    constructor(
        private fb: FormBuilder,
        private partsOrderService: PartsOrderService,
        private qadService: QadService,
        private toastrService: ToastrService
    ) { }

    ngOnInit(): void {
        this.setFormEmitter.emit(this.form);
        this.getAllCustomerName();
    }

    addTag(tag: string) {
        return tag;
    }

    copy(partNumber){
        const selBox = document.createElement('textarea');
        selBox.style.position = 'fixed';
        selBox.style.left = '0';
        selBox.style.top = '0';
        selBox.style.opacity = '0';
        selBox.value = partNumber;
        document.body.appendChild(selBox);
        selBox.focus();
        selBox.select();
        document.execCommand('copy');
        document.body.removeChild(selBox);


        this.toastrService.success('Copied ' + partNumber)

    }

    notifyParent($event) {
        this.form.patchValue({ address: $event?.address?.freeformAddress || $event, casino_name: $event.poi?.name })
    }

    async addSVNumber() {
        const { value: ipAddress } = await SweetAlert.fire({
            title: "SV Number",
            input: "text",
            showCancelButton: true,
            inputPlaceholder: "Enter sv number",
            inputValue: this.form.value.so_number,
            preConfirm: () => {
                Swal.getInput().setAttribute('autocomplete', 'false')
            },
            inputValidator: (value) => {
                if (!value) {
                    return "You need to write something!";
                }
                return null;
            }
        });
        if (ipAddress) {
            try {
                let data: any = JSON.stringify(this.form.value.details);

                this.form.value.details = data;

                await this.partsOrderService.updateAndSendEmail(this.id, {
                    ...this.form.value,
                    so_number: ipAddress
                })
                this.form.patchValue({ so_number: ipAddress })
            } catch (e) {

            }
        }
    }

    @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

    @Input() submitted = false;
    @Input() id = null;
    @Input() disableAddToParts = false;

    get f() {
        return this.form.controls
    }

    part_number = null;
    qty = "";
    billable = "";
    description = "";

    onDeleteItem(value, index) {
        this.details.removeAt(index);
    }

    form = this.fb.group({
        id: null,
        oem: [null],
        casino_name: [null],
        arrival_date: [null],
        ship_via_account: [null],
        address: null,
        contact_name: "",
        contact_phone_number: "",
        contact_email: "",
        billable: [null],
        part_number: [null],
        part_qty: [null],
        instructions: [null],
        created_by: [''],
        created_date: [''],
        so_number: [''],
        tracking_number: [""],
        tracking_number_carrier: [null],
        return_tracking_number_carrier: [""],
        return_tracking_number: [null],
        serial_number: '',
        details: this.fb.array([]),
    })

    setQadPartNumber($event) {
        this.form.patchValue({ part_number: $event.pt_part })
    }

    public setValue(column, value) {
        this.form.controls[column].setValue(value, { emitEvent: false });
    }

    @Input() details: FormArray;

    get getDetails() {
        return this.form.get('details') as FormArray
    }

    @Input() addMoreItems: Function = () => {
        this.details = this.form.get('details') as FormArray;

        this.details.push(this.fb.group({
            part_number: new FormControl(this.part_number, Validators.required),
            qty: new FormControl(this.qty, Validators.required),
            billable: new FormControl(this.billable, Validators.required),
            description: new FormControl(this.description, Validators.required),
        }))

        this.part_number = null;
        this.qty = "";
        this.billable = "";
        this.description = "";
    };

}
