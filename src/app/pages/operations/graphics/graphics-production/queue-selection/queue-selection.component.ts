import { Component, Input, OnInit } from '@angular/core';
import { GraphicsService } from '@app/core/api/operations/graphics/graphics.service';
import { SharedModule } from '@app/shared/shared.module';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Injectable({
  providedIn: 'root'
})
export class QueueSelectionService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  open(data: any, queues) {
    this.modalRef = this.modalService.open(QueueSelectionComponent, { size: 'md', centered: true });
    this.modalRef.componentInstance.data = data;
    this.modalRef.componentInstance.queues = queues;
    return this.modalRef;
  }

}

export class QueueValueParams {
  queueStatus: any
  status: any
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-queue-selection',
  templateUrl: './queue-selection.component.html',
  styleUrls: ['./queue-selection.component.scss']
})
export class QueueSelectionComponent implements OnInit {

  @Input() public data: any;
  @Input() public queues: any;

  valueParams: QueueValueParams = {
    queueStatus: "",
    status: ""
  }

  constructor(
    private activeModal: NgbActiveModal,
    private api: GraphicsService
  ) {
  }

  dismiss() {
    this.activeModal.dismiss();
  }

  close() {
    this.activeModal.close(this.data);
  }

  ngOnInit(): void {
  }

  isLoading = false;

  public async onSubmit() {
    this.data.queueStatus = this.valueParams.queueStatus;
    this.data.status = this.valueParams.status;
    this.data.moveOrder = 1;

    /**
     * TODO: Save to db
     */
    try {
      this.isLoading = true;
      await this.api
        .updateGraphics(this.data)
      this.close();
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;

    }
  }

  public onChangeValue(value: any) {
    this.valueParams.queueStatus = value.name;
    this.valueParams.status = value.queueStatus;
  }

}
