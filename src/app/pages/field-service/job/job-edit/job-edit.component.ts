import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { JobFormComponent } from '../job-form/job-form.component';
import { ActivatedRoute, Router } from '@angular/router';
import { JobService } from '@app/core/api/field-service/job.service';
import { NAVIGATION_ROUTE } from '../job-constant';
import { TeamService } from '@app/core/api/field-service/fs-team.service';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '@app/shared/shared.module';
import { getFormValidationErrors } from 'src/assets/js/util';

@Component({
  standalone: true,
  imports: [SharedModule, JobFormComponent],
  selector: 'app-job-edit',
  templateUrl: './job-edit.component.html',
  styleUrls: []
})
export class JobEditComponent implements OnInit {

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private jobService: JobService,
    private teamService: TeamService,
    private fb: FormBuilder,
    private toastrService: ToastrService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
      this.goBackUrl = params['goBackUrl'];
    });


    if (this.id) this.getData();
  }

  title = "Edit";

  isLoading = false;

  form: FormGroup;

  id = null;

  submitted: boolean = false;

  goBackUrl
  @Input() goBack: Function = () => {
    if (this.goBackUrl) {
      this.router.navigateByUrl(this.goBackUrl);
    } else {
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
    }
  }

  onSubmit = async () => {
    this.submitted = true;

    if (this.form.invalid && this.form.value.active == 1) {
      getFormValidationErrors()
      return
    };

    try {
      this.isLoading = true;
      await this.jobService.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully updated');
      this.goBack();
    } catch (err) {
      console.log(err)
      this.isLoading = false;
    }

  }

  data: any;

  teams: FormArray;

  async getData() {
    try {
      this.data = await this.jobService.getById(this.id);
      let teams = await this.teamService.find({ fs_det_id: this.id });

      if (teams) {
        this.teams = this.form.get('resource') as FormArray;
        for (let i = 0; i < teams.length; i++) {
          this.teams.push(this.fb.group(teams[i]))
        }
      }

      this.form.patchValue({
        job: this.data
      }, { emitEvent: false });

    } catch (err) {
    }
  }

  onCancel() {
    this.goBack()
  }

  async setOnRemoveTech($event) {
    this.teams.removeAt($event.index);
  }

}
