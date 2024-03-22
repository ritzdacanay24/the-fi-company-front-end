import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { states } from '@app/core/data/states';
import { AddressSearchComponent } from '@app/shared/components/address-search/address-search.component';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    AddressSearchComponent
  ],
  selector: 'app-property-form',
  templateUrl: './property-form.component.html',
  styleUrls: ['./property-form.component.scss']
})
export class PropertyFormComponent {

  constructor(
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {

    this.setFormEmitter.emit(this.form)
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  states = states


  @Input() submitted = false;

  get f() {
    return this.form.controls
  }

  form = this.fb.group({
    active: [1],
    address1: [null],
    address2: [''],
    city: [''],
    country: ['United States'],
    license_notes: [''],
    license_required: [''],
    out_of_town: [''],
    property: [''],
    property_phone: [''],
    state: [''],
    zip_code: [''],
    zone_code: [''],
    notes: [''],
    lat: [''],
    lon: [''],
  })

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

  notifyParent($event) {
    this.form.patchValue({
      address1: $event?.fullStreetName,
      city: $event?.address?.municipality,
      state: $event?.address?.countrySubdivisionCode || null,
      zip_code: $event?.address?.postalCode,
      property_phone: $event?.poi?.phone,
      property: $event?.poi?.name,
      lat: $event?.position?.lat,
      lon: $event?.position?.lon
    })
  }

}
