import { Injectable } from "@angular/core";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
@Injectable({
  providedIn: 'root'
})
export class EventMenuModalService {

  constructor(
    public modalService: NgbModal
  ) { }

  open() {
    let modalRef = this.modalService.open(EventMenuModalComponent, { size: 'md', fullscreen: false, scrollable: true });
    return modalRef;
  }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-event-menu-modal',
  templateUrl: './event-menu-modal.component.html',
  styleUrls: []
})
export class EventMenuModalComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
  ) {
  }

  ngOnInit(): void {
  }

  dismiss() {
    this.ngbActiveModal.dismiss()
  }

  close() {
    this.ngbActiveModal.close()
  }

  onSubmit() {
    this.ngbActiveModal.close()
  }

  createEvent(type) {
    this.ngbActiveModal.close(type)
  }

}
