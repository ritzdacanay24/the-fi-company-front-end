import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { DomSanitizer } from "@angular/platform-browser";
import { AddressSearch } from "@app/core/api/address-search/address-search.service";
import { UserService } from "@app/core/api/field-service/user.service";
import { states } from "@app/core/data/states";
import { AddressSearchComponent } from "@app/shared/components/address-search/address-search.component";
import { LicenseEntitySearchComponent } from "@app/shared/components/license-entity-search/license-entity-search.component";
import { UserSearchComponent } from "@app/shared/components/user-search/user-search.component";
import { SharedModule } from "@app/shared/shared.module";
import { NgSelectModule } from "@ng-select/ng-select";
import { merge } from "rxjs";
import { NearbySearchModalService } from "../nearby-search/nearby-search-modal.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    AddressSearchComponent,
    UserSearchComponent,
    NgSelectModule,
    LicenseEntitySearchComponent,
  ],
  selector: "app-property-form",
  templateUrl: "./property-form.component.html",
  styleUrls: ["./property-form.component.scss"],
})
export class PropertyFormComponent {
  constructor(
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private userService: UserService,
    private nearbySearchModalService: NearbySearchModalService
  ) {}

  async openNearbySearch(category) {
    const modalRef = this.nearbySearchModalService.open({
      category: category,
      lat: this.form.value.lat,
      lon: this.form.value.lon,
    });

    modalRef.result.then(
      async (result: any) => {
      },
      () => {}
    );
  }

  currentUrlAddress;
  ngOnInit(): void {
    merge(
      this.form.get("address1").valueChanges,
      this.form.get("address2").valueChanges,
      this.form.get("state").valueChanges,
      this.form.get("city").valueChanges,
      this.form.get("zip_code").valueChanges
    ).subscribe((data) => {
      var values = [];
      values.push(this.form.get("address1").value);
      values.push(this.form.get("address2").value);
      values.push(this.form.get("state").value);
      values.push(this.form.get("city").value);
      values.push(this.form.get("zip_code").value);
      let a = values.filter((x) => x).join(", ");
      this.currentUrlAddress = a;
      this.getUrlView(a);
    });

    this.setFormEmitter.emit(this.form);
    this.getUserService();
  }

  addTag(tag: string) {
    /* https://github.com/ng-select/ng-select/issues/809 */
    return tag;
  }

  urlView;

  getUrlView(address) {
    if (!address) return null;
    return (this.urlView = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps?saddr=36.071997, -115.262847&daddr=${address}&t=&ie=UTF8&iwloc=&output=embed&`
    ));
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  states = states;

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  form = this.fb.group({
    active: [1],
    address1: [null, [Validators.required]],
    address2: [""],
    city: ["", [Validators.required]],
    country: ["United States", [Validators.required]],
    license_notes: [""],
    license_required: [""],
    out_of_town: [""],
    property: [null, [Validators.required]],
    property_phone: [""],
    state: ["", [Validators.required]],
    zip_code: ["", [Validators.required]],
    zone_code: [""],
    notes: [""],
    lat: ["", [Validators.required]],
    lon: ["", [Validators.required]],
    license_expired_date: null,
    licensed_techs: [null],
    created_by: [null],
    created_date: [null],
    fs_licensed_id: [null],
    equipment_drop_off_location:"",

    compliance_name: "",
    compliance_address1: [null],
    compliance_address2: [null],
    compliance_city: [null],
    compliance_state: [null],
    compliance_zip_code: [null],
    compliance_website: [null],
    compliance_phone_numbers: [null],
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  notifyParent($event) {
    this.form.patchValue({
      address1: $event?.fullStreetName,
      city: $event?.address?.localName,
      state: $event?.address?.countrySubdivisionCode || null,
      zip_code: $event?.address?.postalCode,
      property_phone: $event?.poi?.phone,
      property: $event?.poi?.name,
      lat: $event?.position?.lat,
      lon: $event?.position?.lon,
    });
  }

  onTechSelectChange($event) {
    let resource_ids = [];
    for (let i = 0; i < $event.length; i++) {
      resource_ids.push($event[i].id);
    }

    this.form.patchValue({
      licensed_techs: resource_ids,
    });
  }

  users$: any;
  getUserService = async () => {
    try {
      this.users$ = await this.userService.getUserWithTechRate();
    } catch (err) {}
  };
}
