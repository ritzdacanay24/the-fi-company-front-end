import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { QadCustomerPartSearchComponent } from '@app/shared/components/qad-customer-part-search/qad-customer-part-search.component';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    QadCustomerPartSearchComponent
  ],
  selector: 'app-sg-asset-form',
  templateUrl: './sg-asset-form.component.html',
  styleUrls: ['./sg-asset-form.component.scss']
})
export class SgAssetFormComponent {

  constructor(
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form)
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;


  get f() {
    return this.form.controls
  }

  form = this.fb.group({
    timeStamp: [''],
    poNumber: [''],
    property_site: [''],
    sgPartNumber: [null],
    inspectorName: [''],
    generated_SG_asset: [''],
    serialNumber: [''],
    lastUpdate: [''],
    active: [1],
    manualUpdate: [''],
    created_by: [''],
  })

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

  getCustomerPartNumber($event) {
    this.form.patchValue({ sgPartNumber: $event.cp_cust_part })
  }

}
