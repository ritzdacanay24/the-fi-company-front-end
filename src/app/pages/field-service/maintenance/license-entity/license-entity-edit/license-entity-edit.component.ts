import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { LicenseEntityFormComponent } from '../license-entity-form/license-entity-form.component';
import { NAVIGATION_ROUTE } from '../license-entity-constant';
import { LicenseService } from '@app/core/api/field-service/license.service';
import { UserService } from '@app/core/api/field-service/user.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { LicensedTechsService } from '@app/core/api/field-service/licensed-techs.service';

@Component({
  standalone: true,
  imports: [SharedModule, LicenseEntityFormComponent, NgSelectModule],
  selector: 'app-license-entity-edit',
  templateUrl: './license-entity-edit.component.html',
  styleUrls: ['./license-entity-edit.component.scss']
})
export class LicenseEntityEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: LicenseService,
    private toastrService: ToastrService,
    private userService: UserService,
    private licensedTechsService: LicensedTechsService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    });

    if (this.id) this.getData();
  }


  licensed_techs
  techs = [];

  async onTechSelectChange($event) {
    this.techs = $event
    
    //cannot use this because it will add what is already in the table.
    for (let i = 0; i < this.techs.length; i++) {
      let { insertId } = await this.licensedTechsService.create(this.techs[i]);
      this.techs[i].id = insertId;
    }
  }

  async removeTech(i, id) {
    //remove from table
    try{
      await this.licensedTechsService.delete(id);
      this.techs.splice(i, 1)
  
      //remove from ng-select
  
      this.licensed_techs = this.licensed_techs.filter(s => s != id);
    } catch (err){
      
    }
  }

  users$: any;
  getUserService = async () => {
    try {
      this.users$ = await this.userService.getUserWithTechRate();
      // for(let i = 0; i < this.users$.length; i++)

      for (let i = 0; i < this.users$.length; i++) {
        let row = this.users$[i]
        row.fs_licensed_id = this.id;
        row.user_id = row.id;
        row.user_name = row.user;
        delete row.user
        delete row.checked
        delete row.user_rate
        delete row.title
      }

    } catch (err) { }
  }


  title = "Edit Property";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  async onBlurMethod(row) {
    await this.licensedTechsService.update(row.id, row);
  }

  data: any;

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data)
      this.getUserService();
      this.techs = await this.licensedTechsService.find({ fs_licensed_id: this.id });

      this.licensed_techs = this.techs.map(s => s.id);
    } catch (err) { }
  }

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid && this.form.value.active == 1) {
      getFormValidationErrors()
      return
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

}
