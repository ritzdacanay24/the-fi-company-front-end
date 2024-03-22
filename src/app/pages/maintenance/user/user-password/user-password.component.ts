import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '@app/core/api/field-service/user.service';
import { SharedModule } from '@app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';

@Component({
    standalone: true,
    imports: [SharedModule],
    selector: 'app-user-password',
    templateUrl: './user-password.component.html',
    styleUrls: []
})
export class UserPasswordComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private fb: FormBuilder,
        private userService: UserService,
        private toastrService: ToastrService,
    ) {
    }

    ngOnInit(): void {

        if (this.id) this.getData()
    }

    title = "Update Password"

    icon = "mdi-cogs"

    @Input() id

    submitted = false;

    get f() {
        return this.form.controls
    }

    async getData() {
        let data = await this.userService.getById(this.id);
        this.form.patchValue({ email: data.email })
    }

    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required],
        confirmPassword: ['', Validators.required],
        reset: [1]
    })

    onSubmit() {
        this.submitted = true;

        if (this.form.invalid) return;

        if (this.form.value.confirmPassword !== this.form.value.password) {
            alert('Password does not match');
            return;
        }

        this.userService.resetPassword(this.form.value);

        this.form.reset(this.form.getRawValue());
        this.toastrService.success('Password successfully updated');
    }

    isLoading = false;


}
