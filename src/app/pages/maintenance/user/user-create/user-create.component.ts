import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { NAVIGATION_ROUTE } from '../user-constant';
import { UserFormComponent } from '../user-form/user-form.component';
import moment from 'moment';
import { UserService } from '@app/core/api/field-service/user.service';
import { AuthenticationService } from '@app/core/services/auth.service';

@Component({
  standalone: true,
  imports: [SharedModule, UserFormComponent],
  selector: 'app-user-create',
  templateUrl: './user-create.component.html',
  styleUrls: ['./user-create.component.scss']
})
export class UserCreateComponent {
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private api: UserService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
  ) { }

  ngOnInit(): void {
  }

  title = "Create User";

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = (id?: string) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { id: id } });
  }


  get f() {
    return this.form.controls
  }

  form = this.fb.group({
    access: [1],
    active: [1],
    area: [''],
    workArea: [''],
    attempts: [0],
    createdDate: [''],
    email: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    leadInstaller: [0],
    title: ['', Validators.required],
    workPhone: [''],
    password: ['', Validators.required],
    confirmPassword: ['', Validators.required],
    passRegistrationEmail: 1,
    created_by: ''
  })


  async onSubmit() {
    this.submitted = true;

    this.form.patchValue({
      createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
      created_by: this.authenticationService.currentUserValue.id
    })

    if (this.form.invalid) return;

    if (this.form.value.confirmPassword !== this.form.value.password) {
      alert('Password does not match');
      return;
    }

    try {
      this.isLoading = true;
      let data: any = await this.api.register(this.form.value);

      if (data?.error) {
        this.toastrService.error(data?.message);
      } else {
        this.toastrService.success('Successfully Created');
        this.goBack(data.insertId);
      }

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }
}
