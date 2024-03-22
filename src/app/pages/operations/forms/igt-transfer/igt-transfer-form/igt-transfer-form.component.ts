import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { AddTagFn } from '@ng-select/ng-select/lib/ng-select.component';
import { validateEmail } from 'src/assets/js/util/validateEmail';
import { NgSelectModule } from '@ng-select/ng-select';
import { IgtTransferService } from '@app/core/api/operations/igt-transfer/igt-transfer.service';
import moment from 'moment';
import { SoSearchComponent } from '@app/shared/components/so-search/so-search.component';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    SoSearchComponent
  ],
  selector: 'app-igt-transfer-form',
  templateUrl: './igt-transfer-form.component.html',
})
export class IgtTransferFormComponent {

  constructor(
    private fb: FormBuilder,
    private api: IgtTransferService,
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  @Input() disableSearch = false;

  get f() {
    return this.form.get('main')['controls']
  }

  details: FormArray;

  get getDetails() {
    return this.form.get('details') as FormArray
  }

  form = this.fb.group({
    main: this.fb.group({
      transfer_reference: new FormControl(null),
      transfer_reference_description: new FormControl(''),
      date: new FormControl(''),
      so_number: new FormControl(null),
      from_location: new FormControl(''),
      created_by: new FormControl(null),
      created_date: new FormControl(''),
      active: new FormControl(1),
      to_location: new FormControl(''),
      email_sent_datetime: new FormControl(null),
      email_sent_created_by_name: new FormControl(null),
    }),
    details: this.fb.array([]),
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

  isIGTOrder = true;
  async notifyParent($event) {
    this.isIGTOrder = true;
    this.details?.clear()
    try {
      this.form.disable()
      let data: any = await this.api.getSoLineDetails($event.sod_nbr);

      let firstInfo = data[0];

      this.form.patchValue({
        main: {
          transfer_reference: firstInfo.so_po,
          transfer_reference_description: firstInfo.so_rmks,
          date: moment().format('YYYY-MM-DD'),
          from_location: 'Z009',
          to_location: firstInfo.TO_LOC,
          so_number: $event.sod_nbr
        }
      }, { emitEvent: false })

      if (data) {
        this.isIGTOrder = false;
        this.details = this.form.get('details') as FormArray;
        for (let i = 0; i < data.length; i++) {
          this.details.push(this.fb.group({
            so_line: data[i].sod_line,
            part_number: data[i].SOD_PART,
            description: data[i].PT_DESC1 + ' ' + data[i].PT_DESC2,
            qty: data[i].sod_qty_ord,
            pallet_count: 1,
            serial_numbers: 'NA'
          }))
        }
      }


      this.form.enable()
    } catch (err) {
      this.form.disable()
    }

  }

}
