import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import moment from 'moment';
import { FormGroup } from '@angular/forms';
import { NAVIGATION_ROUTE } from '../vehicle-inspection-constant';
import { VehicleInspectionService } from '@app/core/api/operations/vehicle-inspection/vehicle-inspection.service';
import { VehicleInspectionFormComponent } from '../vehicle-inspection-form/vehicle-inspection-form.component';
import { AuthenticationService } from '@app/core/services/auth.service';
import { resetVehicleInspectionFormValues } from '../vehicle-inspection-form/formData';
import { UploadService } from '@app/core/api/upload/upload.service';
import { first } from 'rxjs';
import { VehicleService } from '@app/core/api/operations/vehicle/vehicle.service';

@Component({
    standalone: true,
    imports: [SharedModule, VehicleInspectionFormComponent],
    selector: 'app-vehicle-inspection-create',
    templateUrl: './vehicle-inspection-create.component.html',
})
export class VehicleInspectionCreateComponent {
    constructor(
        private router: Router,
        private api: VehicleInspectionService,
        private toastrService: ToastrService,
        private authenticationService: AuthenticationService,
        private uploadService: UploadService,
    ) { }

    ngOnInit(): void {
        resetVehicleInspectionFormValues()
    }

    title = "Create Vehicle Inspection";

    form: FormGroup;

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
            date_created: moment().format('YYYY-MM-DD HH:mm:ss'),
            created_by: this.authenticationService.currentUserValue.full_name,
            created_by_name: this.authenticationService.currentUserValue.full_name,
        }, { emitEvent: false })
    }

    details
    setDetailsFormEmitter($event) {
        this.details = $event?.checklist;
    }

    myFiles: string[] | any = [];
    onFileChange(event: any) {
        this.myFiles = [];
        for (var i = 0; i < event.target.files.length; i++) {
            this.myFiles.push(event.target.files[i]);
        }
    }


    async onSubmit() {
        this.submitted = true;
        this.form.value.details = this.details;

        try {

            this.isLoading = true;
            let { insertId } = await this.api._create(this.form.value);

            const formData = new FormData();

            for (var i = 0; i < this.myFiles.length; i++) {
                formData.append("file", this.myFiles[i]);
                formData.append("field", 'Vehicle Inspection');
                formData.append("uniqueData", insertId);
                formData.append("folderName", 'vehicleInformation');
                this.uploadService.upload(formData).pipe(first()).subscribe(data => {
                });
            }

            this.isLoading = false;
            this.toastrService.success('Successfully Created');

            resetVehicleInspectionFormValues()

            this.router.navigate([NAVIGATION_ROUTE.LIST]);
        } catch (err) {
            this.isLoading = false;
        }
    }

    onCancel() {
        this.goBack()
    }

}
