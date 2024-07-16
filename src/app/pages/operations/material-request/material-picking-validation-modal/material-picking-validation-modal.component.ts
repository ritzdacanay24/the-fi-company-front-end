import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";

import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";

@Injectable({
  providedIn: "root",
})
export class MaterialPickingValidationModalService {
  modalRef: any;

  constructor(public modalService: NgbModal) {}

  public open(itemShortagesFound: any) {
    this.modalRef = this.modalService.open(
      MaterialPickingValidationModalComponent,
      { size: "lg" }
    );
    this.modalRef.componentInstance.shortages = itemShortagesFound;
    return this.modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-material-picking-validation-modal",
  templateUrl: "./material-picking-validation-modal.component.html",
})
export class MaterialPickingValidationModalComponent implements OnInit {
  @Input() public shortages: any;
  @Output() proceed: EventEmitter<any> = new EventEmitter();

  constructor(public activeModal: NgbActiveModal) {}

  onSubmit() {
    this.activeModal.close();
  }

  ngOnInit(): void {}
}
