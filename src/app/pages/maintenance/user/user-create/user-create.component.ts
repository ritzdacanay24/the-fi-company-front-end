import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../user-constant';
import { UserFormComponent } from '../user-form/user-form.component';
import { UserService } from '@app/core/api/users/users.service';
import moment from 'moment';

@Component({
  standalone: true,
  imports: [SharedModule, UserFormComponent],
  selector: 'app-user-create',
  templateUrl: './user-create.component.html',
  styleUrls: ['./user-create.component.scss']
})
export class UserCreateComponent {
  constructor(
    private router: Router,
    private api: UserService,
    private toastrService: ToastrService,
  ) { }

  ngOnInit(): void {
  }

  title = "Create User";

  form: FormGroup;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = (id?: string) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { id: id } });
  }

  async onSubmit() {
    this.submitted = true;

    this.form.patchValue({ createdDate: moment().format('YYYY-MM-DD HH:mm:ss') })

    if (this.form.invalid) return;

    try {
      this.isLoading = true;
      let data: any = await this.api.create(this.form.value);
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
