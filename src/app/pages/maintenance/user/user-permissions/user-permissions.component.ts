import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserPermissionsConfigService } from '@app/core/api/user-permissions-cofig/user-permissions-cofig.service';
import { SharedModule } from '@app/shared/shared.module';

@Component({
    standalone: true,
    imports: [SharedModule],
    selector: 'app-user-permissions',
    templateUrl: './user-permissions.component.html',
    styleUrls: []
})
export class UserPermissionsComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private fb: FormBuilder,
        private userPermissionsConfigService: UserPermissionsConfigService,
    ) {
    }

    ngOnInit(): void {
        if (this.id)
            this.getData()
    }

    title = "Maintenance"

    icon = "mdi-cogs"

    @Input() id

    submitted = false;

    get f() {
        return this.form.controls
    }

    form = this.fb.group({
        pass: ['', Validators.required],
        confirmPassword: ['', Validators.required],
    })

    onSubmit() {

    }

    isLoading = false;

    data
    async getData() {
        this.data = await this.userPermissionsConfigService.getAll()
    }


}
