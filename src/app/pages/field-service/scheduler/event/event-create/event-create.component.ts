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
  selector: 'app-event-create',
  templateUrl: './event-create.component.html',
  styleUrls: []
})
export class EventCreateComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private toastrService: ToastrService,
    private api: SchedulerEventService,
  ) {
  }

  ngOnInit(): void {
  }

  title = "Create"

  form: FormGroup;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = (id?: string) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { id: id } });
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) return;

    try {
      this.isLoading = true;
      let data = await this.api.create(this.form.value);
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
