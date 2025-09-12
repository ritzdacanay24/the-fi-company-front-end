import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { NAVIGATION_ROUTE } from '../material-request-constant';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
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

  title = "Edit Material Request";

  form = this.fb.group({
    main: this.fb.group({
      active: new FormControl(1),
      assemblyNumber: new FormControl("", Validators.required),
      createdBy: new FormControl(null),
      createdDate: new FormControl(null),
      deleteReason: new FormControl(""),
      deleteReasonBy: new FormControl(null),
      deleteReasonDate: new FormControl(null),
      dueDate: new FormControl(null, Validators.required),
      info: new FormControl(""),
      isCableRequest: new FormControl(""),
      lineNumber: new FormControl("", Validators.required),
      pickList: new FormControl("", Validators.required),
      pickedCompletedDate: new FormControl(null),
      priority: new FormControl("Low"),
      requestor: new FormControl("", Validators.required),
      specialInstructions: new FormControl(""),
      validated: new FormControl(null),
    }),
    details: this.fb.array([]),
  });

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

  get getDetails() {
    return this.form.get("details") as FormArray;
  }

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
    const isCurrentlyActive = this.form.get('main.active')?.value;
    
    if (isCurrentlyActive) {
      // Currently active, user wants to deactivate
      const result = await SweetAlert.fire({
        title: `Deactivate Material Request`,
        html: `
          <div class="text-start">
            <p class="mb-3">You are about to deactivate <strong>MRF# ${this.id}</strong>.</p>
            <p class="mb-3">This action will:</p>
            <ul class="text-muted mb-3">
              <li>Mark the request as inactive</li>
              <li>Prevent further processing</li>
              <li>Maintain data for audit purposes</li>
            </ul>
            <div class="mb-3">
              <label class="form-label fw-semibold">Reason for deactivation:</label>
              <select id="deleteReason" class="form-select mb-2">
                <option value="">Select a reason...</option>
                <option value="Request no longer needed">Request no longer needed</option>
                <option value="Duplicate request">Duplicate request</option>
                <option value="Parts no longer available">Parts no longer available</option>
                <option value="Budget constraints">Budget constraints</option>
                <option value="Project cancelled">Project cancelled</option>
                <option value="Incorrect information">Incorrect information</option>
                <option value="Other">Other (specify below)</option>
              </select>
              <textarea id="deleteReasonDetails" class="form-control" placeholder="Additional details (optional)" rows="3"></textarea>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Deactivate Request',
        cancelButtonText: 'Keep Active',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        width: '500px',
        preConfirm: () => {
          const reason = (document.getElementById('deleteReason') as HTMLSelectElement)?.value;
          const details = (document.getElementById('deleteReasonDetails') as HTMLTextAreaElement)?.value;
          
          if (!reason) {
            SweetAlert.fire({
              title: 'Validation Error',
              text: 'Please select a reason for deactivation',
              icon: 'error',
              confirmButtonText: 'OK'
            });
            return false;
          }
          
          let fullReason = reason;
          if (details.trim()) {
            fullReason += ': ' + details.trim();
          }
          
          return {
            reason: fullReason,
            category: reason
          };
        }
      });

      if (result.isConfirmed) {
        this.form.patchValue({
          main: {
            deleteReason: result.value.reason,
            active: 0,
            deleteReasonBy: this.authenticationService.currentUserValue.id,
            deleteReasonDate: moment().format('YYYY-MM-DD HH:mm:ss')
          }
        }, { emitEvent: false });

        try {
          this.isLoading = true;
          await this.api.update(this.id, this.form.value);
          this.isLoading = false;
          this.toastrService.success('Material request has been deactivated', 'Request Deactivated');
          // Don't navigate away - stay on the form to show the deactivated state
        } catch (err) {
          this.isLoading = false;
          this.toastrService.error('Failed to deactivate request', 'Error');
        }
      }
    } else {
      // Currently inactive, user wants to reactivate
      const result = await SweetAlert.fire({
        title: 'Reactivate Material Request',
        html: `
          <div class="text-start">
            <p class="mb-3">You are about to reactivate <strong>MRF# ${this.id}</strong>.</p>
            <p class="text-muted mb-0">This will make the request available for processing again.</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Reactivate',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
        icon: 'question'
      });

      if (result.isConfirmed) {
        this.form.patchValue({
          main: {
            active: 1,
            deleteReason: '',
            deleteReasonBy: null,
            deleteReasonDate: null
          }
        }, { emitEvent: false });

        try {
          this.isLoading = true;
          await this.api.update(this.id, this.form.value);
          this.isLoading = false;
          this.toastrService.success('Material request has been reactivated', 'Request Reactivated');
        } catch (err) {
          this.isLoading = false;
          this.toastrService.error('Failed to reactivate request', 'Error');
        }
      }
    }
  }
}
