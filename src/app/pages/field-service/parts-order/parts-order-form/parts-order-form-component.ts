import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PartsOrderService } from '@app/core/api/field-service/parts-order/parts-order.service';
import { MrbService } from '@app/core/api/quality/mrb-service';
import { AddressSearchComponent } from '@app/shared/components/address-search/address-search.component';
import { QadPartSearchComponent } from '@app/shared/components/qad-part-search/qad-part-search.component';
import { QirSearchComponent } from '@app/shared/components/qir-search/qir-search.component';
import { SharedModule } from '@app/shared/shared.module';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import Swal from 'sweetalert2';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        ReactiveFormsModule,
        QirSearchComponent,
        QadPartSearchComponent,
        AddressSearchComponent
    ],
    selector: 'app-parts-order-form',
    templateUrl: './parts-order-form-component.html'
})
export class PartsOrderFormComponent {

    constructor(
        private fb: FormBuilder,
        private partsOrderService: PartsOrderService
    ) { }

    ngOnInit(): void {
        this.setFormEmitter.emit(this.form);
    }

    notifyParent($event) {
        this.form.patchValue({ address: $event.address.freeformAddress, casino_name: $event.poi?.name })
    }

    async addSVNumber() {

        const { value: ipAddress } = await SweetAlert.fire({
            title: "SV Number",
            input: "text",
            showCancelButton: true,
            inputPlaceholder: "Enter sv number",
            inputValue: this.form.value.so_number,
            preConfirm: () => {
                console.log(Swal.getInput(), 'Swal.getInput()')
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
            await this.partsOrderService.updateAndSendEmail(this.id, {
                ...this.form.value,
                so_number: ipAddress
            })
        }
    }

    @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

    @Input() submitted = false;
    @Input() id = null;


    get f() {
        return this.form.controls
    }

    form = this.fb.group({
        oem: [null],
        casino_name: [null],
        shipping_method: [null],
        address: null,
        contact_name: "",
        contact_phone_number: "",
        billable: [null],
        part_number: [null],
        part_qty: [null],
        instructions: [null],
        created_by: [''],
        created_date: [''],
        so_number: [''],
    })

    setQadPartNumber($event) {
        this.form.patchValue({ part_number: $event.pt_part })
    }

    public setValue(column, value) {
        this.form.controls[column].setValue(value, { emitEvent: false });
    }

}