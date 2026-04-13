import { Injectable, Input } from "@angular/core";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
@Injectable({
  providedIn: 'root'
})
export class EventModalService {

  constructor(
    public modalService: NgbModal
  ) { }

  open(id) {
    let modalRef = this.modalService.open(EventModalComponent, { size: 'lg', fullscreen: false, scrollable: true });
    modalRef.componentInstance.id = id;
    return modalRef;
  }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventFormComponent } from "../event-form/event-form.component";
import { FormGroup } from "@angular/forms";
import { SchedulerEventService } from "@app/core/api/field-service/scheduler-event.service";
import { SharedModule } from "@app/shared/shared.module";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";

@Component({
  standalone: true,
  imports: [SharedModule, EventFormComponent],
  selector: 'app-event-modal',
  templateUrl: './event-modal.component.html',
  styleUrls: []
})
export class EventModalComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private schedulerEventService: SchedulerEventService
  ) {
  }

  ngOnInit(): void {
    if (this.id) this.getData()
  }

  @Input() id = null

  title = "Edit Event";

  icon = "mdi-calendar-text";

  form: FormGroup;

  dismiss() {
    this.ngbActiveModal.dismiss()
  }

  close() {
    this.ngbActiveModal.close()
  }


  submitted
  async onSubmit() {

    this.submitted = true;

    if (this.id) {
      this.update()

    } else {
      this.create()
    }

  }

  async create() {
    try {
      await this.schedulerEventService.create(this.form.value)
      this.close()
    } catch (err) {

    }
  }

  async update() {
    try {

      if (this.form.invalid) {
        getFormValidationErrors()
        return
      }

      let data = this.form.value;

      if (data.techRelated == 1 && data['title'])
        data['title'] = data['title'].toString();
      if (data.techRelated == 1 && data['resource_id'])
        data['resource_id'] = data['resource_id'].toString();

      await this.schedulerEventService.update(this.id, this.form.value)
      this.close()
    } catch (err) {
    }
  }

  async onDelete() {
    try {
      await this.schedulerEventService.delete(this.id)
      this.close()
    } catch (err) {

    }
  }


  async getData() {
    try {
      let data = await this.schedulerEventService.getById(this.id);

      if (data.techRelated == 1 && data['title'])
        data['title'] = data['title'].split(',');
      if (data.techRelated == 1 && data['resource_id'])
        data['resource_id'] = data['resource_id'].toString().split(',');

      this.form.patchValue(data)
    } catch (err) {

    }
  }

}
