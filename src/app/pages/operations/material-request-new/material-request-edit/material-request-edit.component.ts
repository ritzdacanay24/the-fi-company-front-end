import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { NAVIGATION_ROUTE } from '../material-request-constant';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { AuthenticationService } from '@app/core/services/auth.service';
import { MaterialRequestFormComponent } from '../material-request-form/material-request-form.component';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';
import { MaterialRequestDetailService } from '@app/core/api/operations/material-request/material-request-detail.service';
import moment from 'moment';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

@Component({
  standalone: true,
  imports: [SharedModule, MaterialRequestFormComponent],
  selector: 'app-material-request-edit',
  templateUrl: './material-request-edit.component.html'
})
export class MaterialRequestEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: MaterialRequestService,
    private materialRequestDetailService: MaterialRequestDetailService,
    private toastrService: ToastrService,
    private fb: FormBuilder,
    private authenticationService: AuthenticationService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
      this.goBackUrl = params['goBackUrl'];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  goBackUrl
  @Input() goBack: Function = () => {
    if (this.goBackUrl) {
      this.router.navigateByUrl(this.goBackUrl);
    } else {
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
    }
  }

  data: any;

  details: FormArray;

  checkDuplicate(partNumber) {
    let items: any = this.form.get('details').value;
    let isDup = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].partNumber == partNumber) {
        isDup = true;
        break;
      }
    }
    return isDup;
  }

  enableEdit = false

  currentInfo
  async getData() {
    try {

      this.details?.clear()
      this.form?.reset()

      this.isLoading = true;
      let data = this.currentInfo = await this.api.getById(this.id);
      this.data = await this.materialRequestDetailService.find({ mrf_id: data.id });

      if (this.data) {
        this.details = this.form.get('details') as FormArray;
        for (let i = 0; i < this.data.length; i++) {
          let row = this.data[i];
          row.isDuplicate = this.checkDuplicate(row.partNumber);

          this.details.push(this.fb.group(row))
        }
      }

      this.form.patchValue({ main: data }, { emitEvent: false })

      this.form.disable()

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors()
      return;
    }

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Updated');
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

  onDeleteItem = async ($event, index) => {
    if (!$event?.id) {
      this.details.removeAt(index);
      return;
    }

    try {
      if (!confirm('Are you sure you want to delete this line item?')) return;
      this.isLoading = true;
      await this.api.deleteLineItem($event?.id);
      this.details.removeAt(index);

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }

  }

  onActiveChange = async () => {
    if (!this.form.value.main.active) {
      const { value: text } = await SweetAlert.fire({
        title: `MRF# ${this.id} Deletion`,
        input: 'textarea',
        inputPlaceholder: 'Explain why this MRF needs to be deleted.',
        showCancelButton: true,
        inputValidator: function (value) {
          return !value && 'You need to write something!'
        }
      })

      if (text) {

        this.form.patchValue({
          main: {
            deleteReason: text,
            active: 0,
            deleteReasonBy: this.authenticationService.currentUserValue.id,
            deleteReasonDate: moment().format('YYYY-MM-DD HH:mm:ss')
          }
        }, { emitEvent: false })

        try {
          this.isLoading = true;
          await this.api.update(this.id, this.form.value);
          this.isLoading = false;
          this.toastrService.success('Successfully Deleted');
          this.goBack();
        } catch (err) {
          this.isLoading = false;
        }

      } else {
        this.form.patchValue({
          main: {
            active: this.form.value.main.active = !this.form.value.main.active
          }
        }, { emitEvent: false })
      }
    }
  }
}
