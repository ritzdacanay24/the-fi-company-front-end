import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CustomerService } from '@app/core/api/field-service/customer.service';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule
  ],
  selector: 'app-platform-form',
  templateUrl: './platform-form.component.html',
  styleUrls: ['./platform-form.component.scss']
})
export class PlatformFormComponent {

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);

    this.getCustomers()
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();


  @Input() submitted = false;

  get f() {
    return this.form.controls
  }

  form = this.fb.group({
    active: [0],
    configuration: [''],
    theme: [''],
    etc: [''],
    platform: [''],
    customer: [''],
    unit_price: [''],
    description: []
  })

  customers = [];
  async getCustomers() {
    this.customers = await this.customerService.find({ active: 1 })
  }

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

}
