import { Component, Input, SimpleChanges } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../material-request-constant';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MaterialRequestFormComponent } from '../material-request-form/material-request-form.component';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';
import { MaterialRequestDetailService } from '@app/core/api/operations/material-request/material-request-detail.service';
import moment from 'moment';
import { AuthenticationService } from '@app/core/services/auth.service';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';

@Component({
  standalone: true,
  imports: [SharedModule, MaterialRequestFormComponent],
  selector: 'app-material-request-validate',
  templateUrl: './material-request-validate.component.html'
})
export class MaterialRequestValidateComponent {
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
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['id'].currentValue) {
      this.id = changes['id'].currentValue;
      this.getData();
    }
  }


  title = "Validate";

  form: FormGroup;

  @Input() id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.VALIDATION], { queryParamsHandling: 'merge' });
  }

  data: any;

  details: FormArray;
  header

  async getData() {
    try {

      this.details?.clear()
      this.form?.reset()

      this.isLoading = true;
      let data: any = this.header = await this.api.getById(this.id);
      console.log(data)
      this.data = await this.materialRequestDetailService.find({ mrf_id: data.id });

      if (this.data) {
        this.details = this.form.get('details') as FormArray;
        for (let i = 0; i < this.data.length; i++) {
          let row = this.data[i];
          this.details.push(this.fb.group({
            id: new FormControl(row.id),
            partNumber: new FormControl(row.partNumber, Validators.required),
            reasonCode: new FormControl(row.reasonCode, Validators.required),
            qty: new FormControl(row.qty, Validators.required),
            trType: new FormControl(row.trType),
            ac_code: new FormControl(row.ac_code),
            notes: new FormControl(row.notes),
            availableQty: new FormControl(row.availableQty),
            description: new FormControl(row.description),
          }))

        }
      }

      this.form.patchValue({ main: data }, { emitEvent: false })

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid && this.form.value.main.active == 1) {
      return;
    }

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Updated');
      this.goBack(true);
    } catch (err) {
      this.isLoading = false;
    }
  }

  async onSubmitAndSendToPicking() {
    if (this.form.value.details?.length == 0) {
      alert('No items to be picked.')
      return;
    }

    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors()
      return;
    }

    this.form.patchValue({
      main: {
        validated: moment().format('YYYY-MM-DD HH:mm:ss')
      }
    })

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully sent to picking.');
      this.goBack(true);
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
      await this.materialRequestDetailService.delete($event?.id);
      this.details.removeAt(index);

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }

  }
}
