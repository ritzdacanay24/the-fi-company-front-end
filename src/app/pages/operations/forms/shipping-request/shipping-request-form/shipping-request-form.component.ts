import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { states } from '@app/core/data/states';
import { SharedModule } from '@app/shared/shared.module';
import shippingRequestFormJson from './shipping-request-form.json';
import { AddTagFn } from '@ng-select/ng-select/lib/ng-select.component';
import { validateEmail } from 'src/assets/js/util/validateEmail';
import { NgSelectModule } from '@ng-select/ng-select';
import { IShippingRequestForm } from './shipping-request-form.type';
import { ControlsOf } from 'src/assets/js/util/_formGroup';
import { AddressSearchComponent } from '@app/shared/components/address-search/address-search.component';
import { AutosizeModule } from 'ngx-autosize';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AddressSearchComponent,
    AutosizeModule
  ],
  selector: 'app-shipping-request-form',
  templateUrl: './shipping-request-form.component.html',
})
export class ShippingRequestFormComponent {

  constructor(
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);

    this.form.get('freightCharges').valueChanges.subscribe(
      (mode: string) => {

        if (mode == 'Customer Account') {
          this.form.controls["thridPartyAccountNumber"].setValidators([Validators.required]);
        } else {
          this.form.controls["thridPartyAccountNumber"].clearValidators();
          this.form.controls['thridPartyAccountNumber'].setValue('');
        }
        this.form.get("thridPartyAccountNumber").updateValueAndValidity();
      });
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();
  @Output() setTrackingEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;
  @Input() showTrackingNumberField = false;
  @Input() updateTracking: Function;

  get f() {
    return this.form.controls
  }

  states = states;
  formData = shippingRequestFormJson;

  form = new FormGroup<ControlsOf<IShippingRequestForm>>({
    requestorName: new FormControl('', [Validators.required]),
    emailAddress: new FormControl('', [Validators.required]),
    companyName: new FormControl('', [Validators.required]),
    streetAddress: new FormControl(null, [Validators.required]),
    streetAddress1: new FormControl(''),
    city: new FormControl('', [Validators.required]),
    state: new FormControl('', [Validators.required]),
    zipCode: new FormControl('', [Validators.required]),
    contactName: new FormControl('', [Validators.required]),
    phoneNumber: new FormControl('', [Validators.required]),
    freightCharges: new FormControl('', [Validators.required]),
    thridPartyAccountNumber: new FormControl(''),
    serviceTypeName: new FormControl('', [Validators.required]),
    saturdayDelivery: new FormControl('', [Validators.required]),
    cost: new FormControl(''),
    sendTrackingNumberTo: new FormControl(""),
    comments: new FormControl(''),
    createdDate: new FormControl(''),
    createdById: new FormControl(null),
    serviceType: new FormControl('', [Validators.required]),
    completedDate: new FormControl(null),
    completedBy: new FormControl(''),
    trackingNumber: new FormControl(''),
    active: new FormControl(1),
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

  addTag: AddTagFn | boolean = (e) => {
    let ee = validateEmail(e);

    if (!ee) {
      alert('Not valid email.')
      return false;
    }
    return validateEmail(e) ? e : false
  }

  formValidator(key: any) {
    if (this.form.get(key)?.validator === null) return '';
    const validator = this.form.get(key)?.validator({} as AbstractControl);
    if (validator && validator['required']) return 'required';
    return ''
  }

  notifyParent($event) {
    this.form.patchValue({
      streetAddress: $event?.fullStreetName,
      city: $event.address?.municipality,
      state: $event.address?.countrySubdivisionCode || null,
      zipCode: $event.address?.postalCode,
    })
  }

}
