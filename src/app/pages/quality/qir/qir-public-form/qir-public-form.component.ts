import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { JobSearchComponent } from '@app/shared/components/job-search/job-search.component';
import { QirSettingsService } from '@app/core/api/quality/qir-settings.service';
import { ControlsOf } from 'src/assets/js/util/_formGroup';
import { IQirForm } from '../qir-form/qir-form-type';
import { AddressSearchComponent } from '@app/shared/components/address-search/address-search.component';
import { QuillModule } from 'ngx-quill';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    JobSearchComponent,
    AddressSearchComponent,
    QuillModule
  ],
  selector: 'app-qir-public-form',
  templateUrl: './qir-public-form.component.html',
  styleUrls: ['./qir-public-form.component.scss']
})
export class QirPublicFormComponent {

  constructor(
    private fb: FormBuilder,
    private qirSettingsService: QirSettingsService,
  ) {
  }

  quillConfig = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'color': [] }, { 'background': [] }],
      ],
    },
  }

  ngOnInit(): void {

    this.setFormEmitter.emit(this.form);
    this.getQirSettings()
  }

  public setValue(column, value) {
    this.form.controls[column].setValue(value, { emitEvent: false });
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;
  @Input() enablePriority = true;
  @Input() enableStatus = true;
  @Input() enableEyefiSerialNumber = true;
  @Input() enableLotNumber = true;

  get f() {
    return this.form.controls
  }

  async getQirSettings() {
    let formSettings: any = await this.qirSettingsService.getFormSettings({ active: 1 })

    let ObjMap = {};

    formSettings.forEach(element => {
      var makeKey = element.category;
      if (!ObjMap[makeKey]) {
        ObjMap[makeKey] = [];
      }
      ObjMap[makeKey].push(element);
    });
    this.formData = ObjMap;
  }

  formData: any

  form = new FormGroup<ControlsOf<Partial<IQirForm>>>({
    createdBy: new FormControl(''),
    completedBy: new FormControl(''),
    qir: new FormControl(''),
    capaId: new FormControl(''),
    type: new FormControl(null),
    type1: new FormControl('External - Exisiting in Field', [Validators.required]),
    stakeholder: new FormControl(null),
    owner: new FormControl(''),
    priority: new FormControl('High', [Validators.required]),
    createdDate: new FormControl(null),
    active: new FormControl(1, [Validators.required]),
    status: new FormControl('Open', [Validators.required]),
    issueComment: new FormControl(null, [Validators.required]),
    issue_comment_html: new FormControl(''),
    verifiedBy: new FormControl(''),
    customerName: new FormControl(null, [Validators.required]),
    purchaseOrder: new FormControl(null, [Validators.required]),
    CustomerPartNumber: new FormControl('', [Validators.required]),
    customerSerialNumber: new FormControl('', [Validators.required]),
    eyefiPartNumber: new FormControl(null, [Validators.required]),
    confirmationCode: new FormControl(''),
    firstName: new FormControl(''),
    lastName: new FormControl(''),
    source: new FormControl(''),
    failureType: new FormControl(null, [Validators.required]),
    qtyAffected: new FormControl(null, [Validators.required]),
    qtyAffected1: new FormControl(null),
    customerReportedDate: new FormControl(null, [Validators.required]),
    componentType: new FormControl(null),
    platformType: new FormControl(null),
    qaComments: new FormControl(''),
    supplierName: new FormControl(''),
    casinoName: new FormControl('', [Validators.required]),
    typeSub: new FormControl('External Customer Reported'),
    eyefiSerialNumber: new FormControl(''),
    fieldServiceSchedulerId: new FormControl(null),
    lotNumber: new FormControl(''),
    first_name: new FormControl('', [Validators.required]),
    last_name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required]),
    location: new FormControl(null, [Validators.required]),
  })

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

  notifyParent($event) {
    console.log($event)
    this.form.patchValue({ location: $event.address.freeformAddress, casinoName: $event.poi?.name })
  }

  formValidator(key: any) {
    if (this.form.get(key)?.validator === null) return '';
    const validator = this.form.get(key)?.validator({} as AbstractControl);
    if (validator && validator['required']) return 'required';
    return ''
  }


}
