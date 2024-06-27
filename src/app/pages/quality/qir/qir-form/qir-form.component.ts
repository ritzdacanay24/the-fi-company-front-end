import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { JobSearchComponent } from '@app/shared/components/job-search/job-search.component';
import { QirSettingsService } from '@app/core/api/quality/qir-settings.service';
import { IQirForm } from './qir-form-type';
import { QadCustomerNameSearchComponent } from '@app/shared/components/qad-customer-name-search/qad-customer-name-search.component';
import { QadPartSearchComponent } from '@app/shared/components/qad-part-search/qad-part-search.component';
import { QadCustomerPartSearchComponent } from '@app/shared/components/qad-customer-part-search/qad-customer-part-search.component';
import { ControlsOf } from 'src/assets/js/util/_formGroup';
import { QuillModule } from 'ngx-quill';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    JobSearchComponent,
    QadCustomerNameSearchComponent,
    QadPartSearchComponent,
    QadCustomerPartSearchComponent,
    QuillModule
  ],
  selector: 'app-qir-form',
  templateUrl: './qir-form.component.html',
  styleUrls: ['./qir-form.component.scss']
})
export class QirFormComponent {

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

    this.form.get('type1').valueChanges.subscribe(
      (mode: string) => {

        if (mode?.includes('External')) {
          this.form.controls["typeSub"].setValidators([Validators.required]);
          this.form.controls["casinoName"].setValidators([Validators.required]);
        } else {
          this.form.controls["typeSub"].clearValidators();
          this.form.controls['typeSub'].setValue(null)
          this.form.controls["casinoName"].clearValidators();
          this.form.controls['casinoName'].setValue('')
        }
        this.form.get("casinoName").updateValueAndValidity();
        this.form.get("typeSub").updateValueAndValidity();
      });

    this.form.get('stakeholder').valueChanges.subscribe(
      (mode: string) => {

        if (mode?.includes('Supplier')) {
          this.form.controls["supplierName"].setValidators([Validators.required]);
        } else {
          this.form.controls["supplierName"].clearValidators();
          this.form.controls['supplierName'].setValue('');
        }
        this.form.get("supplierName").updateValueAndValidity();
      });

    this.form.get('qir').disable();

    this.getQirSettings()
  }

  public setValue(column, value) {
    this.form.controls[column].setValue(value, { emitEvent: false });
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

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

  form = new FormGroup<ControlsOf<IQirForm>>({
    createdBy: new FormControl(''),
    completedBy: new FormControl(''),
    qir: new FormControl(''),
    capaId: new FormControl(''),
    type: new FormControl(null),
    type1: new FormControl(null, [Validators.required]),
    stakeholder: new FormControl(null, [Validators.required]),
    owner: new FormControl(''),
    priority: new FormControl('Low', [Validators.required]),
    createdDate: new FormControl(null),
    active: new FormControl(1, [Validators.required]),
    status: new FormControl('Open', [Validators.required]),
    issueComment: new FormControl(null, [Validators.required]),
    issue_comment_html: new FormControl(''),
    verifiedBy: new FormControl(''),
    customerName: new FormControl(null, [Validators.required]),
    purchaseOrder: new FormControl(null),
    CustomerPartNumber: new FormControl(null),
    eyefiPartNumber: new FormControl(null),
    confirmationCode: new FormControl(''),
    firstName: new FormControl(''),
    lastName: new FormControl(''),
    source: new FormControl(''),
    failureType: new FormControl(null, [Validators.required]),
    qtyAffected: new FormControl(null),
    qtyAffected1: new FormControl(null),
    customerReportedDate: new FormControl(null, [Validators.required]),
    componentType: new FormControl(null, [Validators.required]),
    platformType: new FormControl(null, [Validators.required]),
    qaComments: new FormControl(''),
    supplierName: new FormControl(''),
    casinoName: new FormControl(''),
    typeSub: new FormControl(null),
    eyefiSerialNumber: new FormControl(''),
    fieldServiceSchedulerId: new FormControl(null),
    lotNumber: new FormControl(''),
    first_name: new FormControl('', [Validators.required]),
    last_name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required]),
    statusClosed: new FormControl(null),
    status_reason: new FormControl(null),
    location: new FormControl(null),
  })

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

  notifyParent($event) {
    this.form.patchValue({ 'fieldServiceSchedulerId': $event.id }, { emitEvent: false })
  }

  formValidator(key: any) {
    if (this.form.get(key)?.validator === null) return '';
    const validator = this.form.get(key)?.validator({} as AbstractControl);
    if (validator && validator['required']) return 'required';
    return ''
  }

  getCustomerName($event) {
    this.form.patchValue({ customerName: $event.cm_addr });
  }

  setQadPartNumber($event) {
    this.form.patchValue({ eyefiPartNumber: $event.pt_part })
  }

  getCustomerPartNumber($event) {
    this.form.patchValue({ CustomerPartNumber: $event.cp_cust_part })
  }

}
