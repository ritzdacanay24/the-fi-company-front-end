import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { AuthenticationService } from '@app/core/services/auth.service';
import moment from 'moment';
import { NAVIGATION_ROUTE } from '../license-entity-constant';
import { LicenseService } from '@app/core/api/field-service/license.service';
import { UserService } from '@app/core/api/field-service/user.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { LicenseEntityFormComponent } from '../../license-entity/license-entity-form/license-entity-form.component';

//This page will represent, the license property details. I am debating if this should be using the property component, so it does not
//cause the components to duplicate. Only difference is about the compliance details, listed in the compliance information. 

@Component({
  standalone: true,
  imports: [
    SharedModule,
    LicenseEntityFormComponent,
    NgSelectModule
  ],
  selector: 'app-licensed-techs-create',
  templateUrl: './licensed-techs-create.component.html',
  styleUrls: ['./licensed-techs-create.component.scss']
})
export class LicensedTechsCreateComponent {
  constructor(
    private router: Router,
    private api: LicenseService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.getUserService()
  }


  licensed_techs
  techs = [];

  onTechSelectChange($event) {
    this.techs = $event
  }

  removeTech(i, id) {
    //remove from table
    this.techs.splice(i, 1)

    //remove from ng-select
    this.licensed_techs = this.licensed_techs.filter(s => s != id);
  }

  users$: any;
  getUserService = async () => {
    try {
      this.users$ = await this.userService.getUserWithTechRate();
    } catch (err) { }
  }

  title = "Create License";

  form: FormGroup;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = (id?: string) => {
    // this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { id: id } });
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors()
      return
    }

    try {
      this.isLoading = true;
      this.form.value.created_by = this.authenticationService.currentUserValue.id
      this.form.value.created_date = moment().format('YYYY-MM-DD HH:mm:ss');

      let d = {
        data: this.form.value,
        techs: this.licensed_techs
      }
      
      let data = await this.api.create(d);
      this.isLoading = false;
      this.toastrService.success('Successfully Created');
      this.goBack(data.insertId);
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }
}
