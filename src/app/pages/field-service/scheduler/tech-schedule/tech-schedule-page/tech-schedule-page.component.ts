import { Injectable, Input } from "@angular/core";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from "@app/shared/shared.module";
import { TechScheduleComponent } from "../tech-schedule.component";
import { MbscEventcalendarOptions, MbscEventcalendarView, setOptions } from "@mobiscroll/angular";
import { RootReducerState } from "@app/store";
import { Store } from "@ngrx/store";
import moment from "moment";
import { JobSearchComponent } from "@app/shared/components/job-search/job-search.component";

@Component({
    standalone: true,
    imports: [SharedModule, TechScheduleComponent, JobSearchComponent],
    selector: 'app-tech-schedule-page',
    templateUrl: './tech-schedule-page.component.html',
    styleUrls: []
})
export class TechSchedulePageComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private store: Store<RootReducerState>,
        public activatedRoute: ActivatedRoute,
    ) {
    }

    condense = false;

    submittedTickets = false


    onSubmittedWO() {
        this.router.navigate(['/dashboard/field-service/scheduling/tech-schedule'], {
            queryParamsHandling: 'merge',
            queryParams: {
                submittedTickets: this.submittedTickets,
            }
        });
    }


    setCondensed() {
        this.condense = !this.condense

        if (this.condense) {

            this.view = {
                ...this.view,
                timeline: {
                    ...this.view.timeline,
                    eventList: false,
                    allDay: true
                }
            }
        } else {

            this.view = {
                ...this.view,
                timeline: {
                    ...this.view.timeline,
                    eventList: true,
                    allDay: true
                }
            }

        }
    }

    notifyParent($event) {
        this.id = $event?.id || null
        this.start = $event.request_date
        this.router.navigate(['/dashboard/field-service/scheduling/tech-schedule'], {
            queryParamsHandling: 'merge',
            queryParams: {
                start: this.start,
                id: this.id
            }
        });
    }

    @Input() start = moment().format('YYYY-MM-DD')

    ngStyle = { 'height': 'calc(100vh - 154px  )', 'margin': '0px' }

    onSelectedDateChange = (e) => {
        this.id = null
        this.router.navigate(['/dashboard/field-service/scheduling/tech-schedule'], {
            queryParamsHandling: 'merge',
            queryParams: {
                start: e,
                id: this.id
            }
        });
    }

    currentView = 'Weekly';

    set(name) {
        this.currentView = name
        this.router.navigate(['/dashboard/field-service/scheduling/tech-schedule'], {
            queryParamsHandling: 'merge',
            queryParams: {
                currentView: this.currentView
            }
        });

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
                        type: 'month',
                        size: 1,
                        eventList: true,
                        maxEventStack: 'all',
                        currentTimeIndicator: true,
                        allDay: true,
                        virtualScroll: false
                    },
                }
                break;
            case '3Months':
                this.view = {
                    timeline: {
                        type: 'month',
                        size: 3,
                        eventList: true,
                        maxEventStack: 'all',
                        currentTimeIndicator: true,
                        allDay: true,
                        virtualScroll: false
                    },
                }
                break;
            case 'Yearly':
                this.view = {
                    timeline: {
                        type: 'year',
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
                        type: 'month',
                        size: 2,
                        eventList: true,
                        maxEventStack: 'all',
                        currentTimeIndicator: true,
                        allDay: true,
                        virtualScroll: false
                    },
                }
        }


    }


    calendarInstance
    calenderEmitter($event) {
        this.calendarInstance = $event;
    }

    jump() {
        this.start = moment().format('YYYY-MM-DD');
        this.calendarInstance._instanceService.inst.navigate(moment().format('YYYY-MM-DD'));
    }

    view: MbscEventcalendarView = {
        timeline: {
            type: 'month',
            size: 2,
            eventList: true,
            maxEventStack: 'all',
            currentTimeIndicator: true,
            allDay: true,
            virtualScroll: false
        },
    };

    id
    previousId

    colors = [];

    ngOnInit(): void {
        this.activatedRoute.queryParams.subscribe((params: any) => {
            this.id = params['id'] || this.id;
            this.previousId = params['previousId'];
            this.start = params['start']; 
            this.currentView = params['currentView'] || this.currentView
            this.submittedTickets = params['submittedTickets'] == "true"

            if (this.currentView) {
                this.set(this.currentView)
            }
        });

    }

    dismiss() {
    }

    close() {
    }

    onSubmit() {
    }

    createEvent(type) {
    }

    myCalendarOptions: MbscEventcalendarOptions = {
        onSelectedDateChange: (e) => {
            this.router.navigate(['/dashboard/field-service/scheduling/tech-schedule'], {
                queryParamsHandling: 'merge',
                queryParams: {
                    start: moment(e.date).format('YYYY-MM-DD'),
                    previousId: null
                }
            });
        }
    }

}
