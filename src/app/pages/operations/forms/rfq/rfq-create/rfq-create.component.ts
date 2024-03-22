import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import moment from 'moment';
import { AuthenticationService } from '@app/core/services/auth.service';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { NAVIGATION_ROUTE } from '../rfq-constant';
import { RfqFormComponent } from '../rfq-form/rfq-form.component';
import { SoSearchComponent } from '@app/shared/components/so-search/so-search.component';
import { RfqService } from '@app/core/api/rfq/rfq-service';
import { first } from 'rxjs';
import { FormArray, FormBuilder, Validators } from '@angular/forms';


@Component({
  standalone: true,
  imports: [
    SharedModule,
    RfqFormComponent,
    SoSearchComponent
  ],
  selector: 'app-rfq-create',
  templateUrl: './rfq-create.component.html',
})
export class RfqCreateComponent {
  constructor(
    private router: Router,
    private api: RfqService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private rfqService: RfqService,
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
  }

  viewInfo = false;

  title = "Create RFQ";

  form: any;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue({
      created_date: moment().format('YYYY-MM-DD HH:mm:ss'),
      created_by: this.authenticationService.currentUserValue.id
    }, { emitEvent: false })

  }

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      getFormValidationErrors()
      return;
    };

    let data = this.form.value;

    for (const property in data) {
      if (Array.isArray(data[property])) {
        data[property] = JSON.stringify(data[property]);
      } else if (typeof data[property] === 'object' && data[property] !== null) {
        data[property] = JSON.stringify(data[property]);
      }
    }

    try {
      this.isLoading = true;
      let { insertId } = await this.api.create(data);

      this.isLoading = false;
      this.toastrService.success('Successfully Create');

      this.router.navigate([NAVIGATION_ROUTE.EDIT], { queryParamsHandling: 'merge', queryParams: { id: insertId } });

    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }

  lines: FormArray;

  notifyParent($event) {
    this.rfqService.searchBySoAndSoLine($event.sod_nbr, $event.sod_line).pipe(first()).subscribe(data => {

      /**
       * Patch values
       */
      this.form.patchValue(data.main);

      /** 
       * Patch line details
      */
      this.lines = this.form.get('lines') as FormArray;
      let openBalance = 0;
      for (let i = 0; i < data.otherLines.length; i++) {
        openBalance += data.otherLines[i].sod_list_pr * data.otherLines[i].qty_open;
        this.lines.push(this.fb.group({
          sod_part: [data.otherLines[i].sod_part, Validators.required],
          open_balance: [openBalance],
          sod_list_pr: [data.otherLines[i].sod_price, Validators.required],
          qty: [data.otherLines[i].qty_open, Validators.required],
          addItemsList: [data.otherLines[i].qty_open > 0 ? true : false]
        }))
      }

      /**
       * Set default subject line
       * If pu number or dest company changes, call this to update the subject line
       */
      this.setSubjectLine();

      /**
       * Calculate declared value
       */
      this.calculateValue();

    }, error => {
    });
  }


  /**
   * Calculate declared value and set form value
   */
  public calculateValue() {
    let declaredValue = 0;
    let lines = this.form.get('lines').value
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].addItemsList == true) {
        declaredValue += lines[i].sod_list_pr * lines[i].qty;
      }
    }
    this.setValue('value', declaredValue);
  };

  public setSubjectLine() {
    this.setValue('subjectLine', `PICK UP: ${this.form.value.sod_nbr || ''} ${this.form.value.dest_companyName || ''}`)
    this.setValue('puNumber', `${this.form.value.sod_nbr || ''}`)
  }

  public setValue(column, value) {
    this.form.controls[column].setValue(value, { emitEvent: false });
  }

}
