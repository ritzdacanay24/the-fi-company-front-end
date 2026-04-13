import { Injectable, Input } from "@angular/core";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from "@app/shared/shared.module";
import { TechScheduleComponent } from "../tech-schedule.component";
import { MbscEventcalendarOptions, MbscEventcalendarView } from "@mobiscroll/angular";

@Injectable({
    providedIn: 'root'
})
export class TechScheduleModalService {

    constructor(
        public modalService: NgbModal
    ) { }

    open(start_date) {
        let modalRef = this.modalService.open(TechScheduleModalComponent, { size: 'lg', fullscreen: true, scrollable: true });
        modalRef.componentInstance.start_date = start_date;

        return modalRef;
    }
}

@Component({
    standalone: true,
    imports: [SharedModule, TechScheduleComponent],
    selector: 'app-tech-schedule-modal',
    templateUrl: './tech-schedule-modal.component.html',
    styleUrls: []
})
export class TechScheduleModalComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private ngbActiveModal: NgbActiveModal,
    ) {



    }

    @Input() start_date = null

    ngStyle = { 'height': 'calc(100vh - 184px)', 'margin': '0px' }

    view: MbscEventcalendarView = {
        timeline: {
            type: 'week',
            size: 3,
            eventList: true,
            maxEventStack: 'all',
            currentTimeIndicator: true
        },
    };


    calendarOptions: MbscEventcalendarOptions = {
        clickToCreate: false,
    }

    colors = [];

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

    currentView = 'Weekly'

    calendarInstance
    calenderEmitter($event) {
        this.calendarInstance = $event;
    }

    set(name) {
        this.currentView = name

        this.calendarInstance._instanceService.inst.navigate(this.start_date);

        switch (name) {
            case 'Day':
                this.view = {
                    timeline: {
                        type: 'day',
                        virtualScroll: false
                    }
                }
                break;
            case 'Hourly':
                this.view = {
                    timeline: {
                        type: 'week',
                        startTime: '00:00',
                        endTime: '23:59',
                        timeCellStep: 90,
                        timeLabelStep: 90,
                        weekNumbers: false,
                        currentTimeIndicator: true,
                        virtualScroll: false
                    }
                }
                break;
            case 'Weekly':
                this.view = {
                    timeline: {
                        type: 'week',
                        startDay: 0,
                        endDay: 7,
                        eventList: true,
                        weekNumbers: false,
                        currentTimeIndicator: true,
                        virtualScroll: false
                    }
                }
                break;
            case 'Monthly':
                this.view = {
                    timeline: {
                        type: 'week',
                        size: 5,
                        eventList: true,
                        maxEventStack: 'all',
                        currentTimeIndicator: true,
                        allDay: true,
                        virtualScroll: false
                    },
                }
                break;
            default:
                this.view = {
                    timeline: {
                        type: 'week',
                        size: 5,
                        eventList: true,
                        maxEventStack: 'all',
                        currentTimeIndicator: true,
                        allDay: true,
                        virtualScroll: false
                    },
                }
        }


    }

}
