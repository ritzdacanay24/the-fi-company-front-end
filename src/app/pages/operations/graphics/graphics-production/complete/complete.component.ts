import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';
import { first } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { GraphicsService } from '@app/core/api/operations/graphics/graphics.service';
import { SharedModule } from '@app/shared/shared.module';

@Injectable({
  providedIn: 'root'
})
export class CompleteService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  open(data: any, queues) {
    this.modalRef = this.modalService.open(CompleteComponent, { size: 'md' });
    this.modalRef.componentInstance.data = data;
    this.modalRef.componentInstance.queues = queues;
    return this.modalRef;
  }

}


export class QueueValueParams {
  queueStatus: string
  status: string
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-complete',
  templateUrl: './complete.component.html',
  styleUrls: []
})
export class CompleteComponent implements OnInit {

  @Input() public data: any;
  @Input() public queues: any;

  qtyShipped: number;

  constructor(
    private activeModal: NgbActiveModal,
    private api: GraphicsService
  ) {
  }

  dismiss() {
    this.activeModal.dismiss('dismiss');
  }

  close() {
    this.activeModal.close(this.data);
  }

  ngOnInit(): void {
  }

  public async onSubmit() {
    if (this.qtyShipped > this.data.openQty) {
      alert('The qty entered cannot be greater than the open qty')
      return;
    }


    this.data.status = 900;
    if (this.data.openQty != this.qtyShipped) {
      this.data.status = 0;
      this.data.shipComplete = 0
    } else {
      this.data.shipComplete = 1
    }



    this.data.qtyShipped = this.qtyShipped;
    this.data.completeOrder = 1;

    this.data.shippedOn = moment().format('YYYY-MM-DD HH:mm:ss');

    /**
     * TODO: Save to db
     */
    await this.api
      .updateGraphics(this.data)
  }

}
