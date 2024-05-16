import { Component, Input } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import moment from 'moment';
import { FormGroup } from '@angular/forms';
import { NAVIGATION_ROUTE } from '../forklift-inspection-constant';
import { ForkliftInspectionService } from '@app/core/api/operations/forklift-inspection/forklift-inspection.service';
import { ForkliftInspectionFormComponent } from '../forklift-inspection-form/forklift-inspection-form.component';
import { AuthenticationService } from '@app/core/services/auth.service';
import { resetVehicleInspectionFormValues } from '../forklift-inspection-form/formData';
import { UploadService } from '@app/core/api/upload/upload.service';
import { first } from 'rxjs';

@Component({
    standalone: true,
    imports: [SharedModule, ForkliftInspectionFormComponent],
    selector: 'app-forklift-inspection-create',
    templateUrl: './forklift-inspection-create.component.html',
})
export class ForkliftInspectionCreateComponent {
    constructor(
        private router: Router,
        private api: ForkliftInspectionService,
        private toastrService: ToastrService,
        private authenticationService: AuthenticationService,
        private uploadService: UploadService,
    ) { }

    ngOnInit(): void {
    }

    title = "Create Forklift Inspection";

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
            created_by: this.authenticationService.currentUserValue.id,
            created_by_name: this.authenticationService.currentUserValue.full_name,
        }, { emitEvent: false })
    }

    details
    setDetailsFormEmitter($event) {
        $event?.checklist.sort();
        this.details = $event?.checklist;
    }

    myFiles: string[] | any = [];
    onFileChange(event: any) {
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
                    console.log(data, 'uploaded attachments')
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
