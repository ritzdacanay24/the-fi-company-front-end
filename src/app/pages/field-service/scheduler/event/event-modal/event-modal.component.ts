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
    let modalRef = this.modalService.open(EventModalComponent, { size: 'lg', fullscreen: false, scrollable: true, backdrop:false });
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

  title = "Event Modal";

  icon = "mdi-calendar-text";

  form: FormGroup;

  dismiss() {
    this.ngbActiveModal.dismiss()
  }

  close() {
    this.ngbActiveModal.close()
  }



  async onSubmit() {
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
      let data = await this.schedulerEventService.getById(this.id)
      this.form.patchValue(data)
    } catch (err) {

    }
  }

}
