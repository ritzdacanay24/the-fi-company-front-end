import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import moment from 'moment';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NAVIGATION_ROUTE } from '../vehicle-inspection-constant';
import { VehicleInspectionService } from '@app/core/api/operations/vehicle-inspection/vehicle-inspection.service';
import { VehicleInspectionFormComponent } from '../vehicle-inspection-form/vehicle-inspection-form.component';
import { AuthenticationService } from '@app/core/services/auth.service';

@Component({
    standalone: true,
    imports: [SharedModule, VehicleInspectionFormComponent],
    selector: 'app-vehicle-inspection-edit',
    templateUrl: './vehicle-inspection-edit.component.html',
})
export class VehicleInspectionEditComponent {
    constructor(
        private router: Router,
        private api: VehicleInspectionService,
        private toastrService: ToastrService,
        private authenticationService: AuthenticationService,
        private activatedRoute: ActivatedRoute,
        private fb: FormBuilder,
    ) { }

    getFormValues() {
        return {
            truck_license_plate: ['', Validators.required],
            details: this.fb.array([]),
            comments: [''],
            date_created: [''],
            create: [1],
            created_by: ['', Validators.required],
            created_by_name: ['', Validators.required],
            files: this.fb.group({
                name: ['', Validators.required],
                file: ['', Validators.required],
                uniqueId: [null],
            })
        }
    }

    ngOnInit(): void {
        this.activatedRoute.queryParams.subscribe(params => {
            this.id = params['id'];
        });

        if (this.id) this.getData();
    }

    title = "Edit Vehicle Inspection";

    form: FormGroup;

    id = null;

    isLoading = false;

    submitted = false;

    @Input() goBack: Function = () => {
        this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
    }

    data

    viewImage(row){}

    compare(a, b) {
        if (a.name > b.name) {
            return -1;
        }
        if (a.name < b.name) {
            return 1;
        }
        return 0;
    }
    formValues

    attachments = []
    async getData() {
        try {
            this.isLoading = true;
            let data = await this.api._searchById(this.id);
            this.attachments = data?.attachments;
            this.form.patchValue({
                ...data.main,
                details: data?.details
            })
            console.log(data)

            this.formValues = {
                checklist: data?.details
            };
            this.form.disable();
        } catch (err) {
            this.isLoading = false;
        }
    }

    setFormEmitter($event) {
        this.form = $event;
    }

    details
    setDetailsFormEmitter($event) {
        this.details = $event?.checklist;
    }

    async onSubmit() {
        this.submitted = true;
        this.form.value.details = this.details;


        try {

            this.isLoading = true;
            await this.api._create(this.form.value);

            this.isLoading = false;
            this.toastrService.success('Successfully Created');

            this.router.navigate([NAVIGATION_ROUTE.EDIT]);

        } catch (err) {
            this.isLoading = false;
        }
    }

    onCancel() {
        this.goBack()
    }

}
