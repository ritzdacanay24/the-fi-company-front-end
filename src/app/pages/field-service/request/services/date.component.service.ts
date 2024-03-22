import { first } from 'rxjs/operators';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

import { Injectable } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { MbscModule, setOptions } from '@mobiscroll/angular';
import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
import moment from 'moment';



@Injectable({
  providedIn: 'root'
})
export class DateModalService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  open(start, end) {
    this.modalRef = this.modalService.open(DateComponent, { size: 'lg' });
    this.modalRef.componentInstance.start = start;
    this.modalRef.componentInstance.end = end;
    return this.modalRef
  }

  getInstance() {
    return this.modalRef;
  }

}

@Component({
  standalone: true,
  imports: [SharedModule, MbscModule],
  selector: 'app-scheduler',
  template: `
  <div class="modal-header">
      <h5 class="modal-title" id="modal-basic-title">Event Info</h5>
    </div>

    <div class="modal-body">


            <mbsc-datepicker
            [controls]="['calendar', 'timegrid']"
            display="inline"

            [min]="min"
            [labels]="myLabels"
            [invalid]="myInvalid"
            (onPageLoading)="onPageLoading($event)">
        </mbsc-datepicker>


    </div>

    <div class="modal-footer">
      <button (click)="close()" type="button" class="btn btn-light mr-auto">Close</button>
    </div>

  `,
  styleUrls: []
})
export class DateComponent implements OnInit {
  @Input() public start: string;
  @Input() public end: string;

  min = moment();

  single: Date | undefined;
  singleLabels = [];
  singleInvalid = [];

  myLabels = [];

  myInvalid = [];

  first
  last
  async onPageLoading(event: any) {
    this.first = moment(event.firstDay).format('YYYY-MM-DD')
    this.last = moment(event.lastDay).format('YYYY-MM-DD')

    await this.getData(this.first, this.last);

  }

  async getData(f, l) {
    let ee = []
    let ff = []
    let data: any = await this.api.fsTechCalendar(f, l);

    for (let i = 0; i < data.info?.length; i++) {
      // if (data.info[i].allDay == 1) {
      //   this.myInvalid.push({
      //     start: moment(data.info[i].start).startOf('day').format('YYYY-MM-DD HH:mm'),
      //     end: moment(data.info[i].end).endOf('day').format('YYYY-MM-DD HH:mm')
      //   })
      // } else {
      //   this.myInvalid.push({
      //     start: moment(data.info[i].start).format('YYYY-MM-DD HH:mm'),
      //     end: moment(data.info[i].end).format('YYYY-MM-DD HH:mm')
      //   })
      // }
      this.myInvalid.push({
        start: moment(data.info[i].start).format('YYYY-MM-DD HH:mm'),
        end: moment(data.info[i].end).format('YYYY-MM-DD HH:mm')
      })
    }
  }



  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private api: SchedulerService,


  ) {
  }

  ngOnInit(): void {
  }


  close() {
    this.ngbActiveModal.close()
  }
  dismiss() {
    this.ngbActiveModal.dismiss()
  }


}
