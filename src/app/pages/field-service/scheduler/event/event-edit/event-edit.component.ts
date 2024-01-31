import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { EventFormComponent } from '../event-form/event-form.component';
import { NAVIGATION_ROUTE } from '../event-constant';
import { FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { SchedulerEventService } from '@app/core/api/field-service/scheduler-event.service';

@Component({
  standalone: true,
  imports: [SharedModule, EventFormComponent],
  selector: 'app-event-edit',
  templateUrl: './event-edit.component.html',
  styleUrls: []
})
export class EventEditComponent implements OnInit {

  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    private toastrService: ToastrService,
    private api: SchedulerEventService,
  ) {
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
    });

    if (this.id) this.getData();
  }

  title = "Event"

  form: FormGroup;

  isLoading = false;

  submitted = false;

  id = null;

  @Input() goBack: Function = (id?: string) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) return;

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

  async getData() {
    try {
      let data = await this.api.getById(this.id);
      this.form.patchValue(data, { emitEvent: true });

    } catch (err) {
    }
  }

}
