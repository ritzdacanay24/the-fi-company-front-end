import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { states } from '@app/core/data/states';
import { AddressSearchComponent } from '@app/shared/components/address-search/address-search.component';
import { UserSearchComponent } from '@app/shared/components/user-search/user-search.component';
import { SharedModule } from '@app/shared/shared.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { merge } from 'rxjs';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    AddressSearchComponent,
    UserSearchComponent,
    NgSelectModule
  ],
  selector: 'app-license-entity-form',
  templateUrl: './license-entity-form.component.html',
  styleUrls: ['./license-entity-form.component.scss']
})
export class LicenseEntityFormComponent {

  constructor(
    private fb: FormBuilder,
    private sanitizer: DomSanitizer
  ) { }

  currentUrlAddress
  ngOnInit(): void {


    merge(
      this.form.get('address1').valueChanges,
      this.form.get('state').valueChanges,
      this.form.get('city').valueChanges,
      this.form.get('zip_code').valueChanges
    )
      .subscribe(data => {
        var values = [];
        values.push(this.form.get('address1').value);
        values.push(this.form.get('state').value);
        values.push(this.form.get('city').value);
        values.push(this.form.get('zip_code').value);
        let a = values.filter(x => x).join(', ');
        this.currentUrlAddress = a
        this.getUrlView(a);
      });

    this.setFormEmitter.emit(this.form)
  }

  addTag(tag: string) {
    /* https://github.com/ng-select/ng-select/issues/809 */
    return tag;
  }

  urlView

  getUrlView(address) {
    if (!address) return null;
    return this.urlView = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?saddr=36.071997, -115.262847&daddr=${address}&t=&ie=UTF8&iwloc=&output=embed&`);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  states = states


  @Input() submitted = false;
  @Input() id = null;

  get f() {
    return this.form.controls
  }

  form = this.fb.group({
    active: [1],
    address1: [null, [Validators.required]],
    address2: [''],
    city: ['', [Validators.required]],
    country: ['United States', [Validators.required]],
    notes: [''],
    license_required: [''],
    property: [null, [Validators.required]],
    property_phone: [''],
    state: ['', [Validators.required]],
    zip_code: ['', [Validators.required]],
    license_expired_date: null,
    created_by: [null],
    created_date: [null],
    website: [null],
    documents_required: ""
  })

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0);
  }


  notifyParent($event) {
    console.log($event)
    this.form.patchValue({
      address1: $event?.fullStreetName,
      city: $event?.address?.localName,
      state: $event?.address?.countrySubdivisionCode || null,
      zip_code: $event?.address?.postalCode,
      property_phone: $event?.poi?.phone,
      property: $event?.poi?.name
    })
  }

}
