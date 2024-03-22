import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { TicketEventFormComponent } from '../ticket-event-form/ticket-event-form.component';
import { NAVIGATION_ROUTE } from '../ticket-event-constant';
import { TicketEventService } from '@app/core/api/field-service/ticket-event.service';

@Component({
  standalone: true,
  imports: [SharedModule, TicketEventFormComponent],
  selector: 'app-ticket-event-create',
  templateUrl: './ticket-event-create.component.html',
  styleUrls: []
})
export class TicketEventCreateComponent {
  constructor(
    private router: Router,
    private api: TicketEventService,
    private toastrService: ToastrService,
  ) { }

  ngOnInit(): void {
  }

  title = "Create Job Status";

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
