import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../material-request-constant';
import moment from 'moment';
import { AuthenticationService } from '@app/core/services/auth.service';
import { MaterialRequestFormComponent } from '../material-request-form/material-request-form.component';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';

@Component({
  standalone: true,
  imports: [SharedModule, MaterialRequestFormComponent],
  selector: 'app-material-request-create',
  templateUrl: './material-request-create.component.html',
})
export class MaterialRequestCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: MaterialRequestService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
  }

  title = "Create Material Request";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() showItemCreat

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue({
      main: {
        createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
        dueDate: moment().format('YYYY-MM-DD'),
        createdBy: this.authenticationService.currentUserValue.id,
        requestor: this.authenticationService.currentUserValue.full_name,
      }
    }, { emitEvent: false })

    this.addMoreItems()
  }

  disableValidation = true


  resetTags() {
    let arr = this.form.get('details') as FormArray;
    while (0 !== arr.length) {
      arr.removeAt(0);
    }
  }

  value

  async onSubmit() {
    this.submitted = true;


    if (this.form.invalid) {
      getFormValidationErrors()
      return;
    };

    if (!this.form.controls['details']['controls'].length) {
      alert('No items found in this request. ')
      return
    }

    try {
      this.isLoading = true;
      let { insertId } = await this.api.create(this.form.value);

      this.isLoading = false;
      this.toastrService.success('Successfully Created');

      this.form.reset({
        main: {
          createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
          createdBy: this.authenticationService.currentUserValue.id,
          requestor: this.authenticationService.currentUserValue.full_name,
          active: 1,
          priority: 'Low'
        }
      });
      this.resetTags()
      this.value = ""
      this.submitted = false;

    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

  details: FormArray;

  addMoreItems = () => {
    this.details = this.form.get('details') as FormArray;
  }

  onDeleteItem = async ($event, index) => {
    this.details.removeAt(index);
  }

}
