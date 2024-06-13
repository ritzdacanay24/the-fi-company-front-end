import { Component, OnInit } from '@angular/core';
import { NgbDropdownModule, NgbModal, NgbNavModule, NgbPaginationModule, NgbProgressbarModule, NgbTooltip, NgbTooltipModule, NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
// Drag and drop
import { DndDropEvent, DndModule } from 'ngx-drag-drop';
// Sweet Alert
import { RootReducerState } from 'src/app/store';
import { Store } from '@ngrx/store';
import { Observable, Subscription, interval } from 'rxjs';
import { CommonModule, DecimalPipe } from '@angular/common';
import { SharedModule } from '@app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlatpickrModule } from 'angularx-flatpickr';
import { CountUpModule } from 'ngx-countup';
import { SimplebarAngularModule } from 'simplebar-angular';
import { tasks } from '@app/core/data/kanban';
import { KanbanApiService } from '@app/core/api/kanban';
import { WorkOrderPickSheetModalService } from '../work-order-pick-sheet-modal/work-order-pick-sheet-modal.component';
import { KanbanQueueModalService } from './kanban-queue-modal/kanban-queue-modal.component';
import { CommentsModalService } from '@app/shared/components/comments/comments-modal.service';
import { KanbanEditModalService } from './kanban-edit-modal/kanban-edit-modal.component';
import { WebsocketService } from '@app/core/services/websocket.service';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { KanbanAddModalService } from './kanban-add-modal/kanban-add-modal.component';
import { KanbanConfigApiService } from '@app/core/api/kanban-config';
import { ActivatedRoute, Router } from '@angular/router';

import { Pipe, PipeTransform } from '@angular/core';
import { AuthenticationService } from '@app/core/services/auth.service';
import moment from 'moment';
import { WorkOrderInfoModalService } from '@app/shared/components/work-order-info-modal/work-order-info-modal.component';
import { WorkOrderRoutingByWoModalService } from '@app/shared/components/work-order-routing-by-wo-modal/work-order-routing-by-wo-modal.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { KanbanConfigEditModalService } from '../kanban-config/kanban-config-edit-modal/kanban-config-edit-modal.component';
import { ToastrService } from 'ngx-toastr';
import { KanbanTimerApiService } from '@app/core/api/kanban-timer';

@Pipe({
    standalone: true,
    name: 'filterlist'
})
export class FilterlistPipe implements PipeTransform {

    transform(value: any, args?: any): any {
        if (!args || args.indexOf('All') > -1)
            return value;
        return value?.filter(
            item => {
                return args.indexOf(item?.name?.toString()) > -1
            }
        );
    }
}

@Pipe({
    standalone: true,
    name: 'myfilter',
    pure: false
})
export class MyFilterPipe implements PipeTransform {
    transform(items: any[], filter: any): any {
        if (!items || !filter) {
            return items;
        }
        // filter items array, items which match and return true will be
        // kept, false will be filtered out
        return items.filter(item => {
            return item?.wo_nbr?.toString().indexOf(filter?.toString()) !== -1 ||
                item?.wo_mstr?.wo_rmks?.toString() == filter?.toString()
        });
    }
}

export const KANBAN = 'KANBAN';

@Component({
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NgbDropdownModule,
        NgbNavModule,
        NgbTooltipModule,
        NgbProgressbarModule,
        NgbTypeaheadModule,
        NgbPaginationModule,
        SimplebarAngularModule,
        DndModule,
        FlatpickrModule,
        CountUpModule,
        SharedModule,
        MyFilterPipe,
        NgSelectModule,
        FilterlistPipe
    ],
    selector: 'app-kanban',
    templateUrl: './kanban.component.html',
})

/**
 * Kanban Component
 */
export class KanbanComponent implements OnInit {

    tasks: any = tasks;
    // bread crumb items
    breadCrumbItems!: Array<{}>;
    submitted = false;
    unassignedTasks!: Task[];
    todoTasks!: Task[];
    inprogressTasks!: Task[];
    reviewsTasks!: Task[];
    completedTasks!: Task[];
    newTasks!: Task[];
    TaskList!: Observable<Task[]>;
    alltask?: any;
    searchTerm: any;
    showLess = false

    isShowing(data, key) {
        return data?.show_data?.indexOf(key) !== -1 || data?.show_data == ''
    }

    today = moment().format('YYYY-MM-DD');

    liveUpdateMessage = ""

    refresh() {
        window.location.reload();
    }

    async onStart(event, task) {
        if (event == 'start') {
            try {
                task.isLoading = true;
                task.wo_start_time = moment().format('YYYY-MM-DD HH:mm:ss');
                await this.kanbanTimerApiService.create({
                    kanban_id: task.kanban_ID,
                    wo_nbr: task.wo_nbr,
                    user_id: this.authenticationService.currentUserValue.id,
                    start_time: moment().format('YYYY-MM-DD HH:mm:ss')
                })
                task.isLoading = false;
                this.sendById(task);
            } catch (err) {
                task.isLoading = false;
                task.wo_start_time = null;
            }
        } else {
            try {
                task.isLoading = true;
                task.wo_end_time = moment().format('YYYY-MM-DD HH:mm:ss');
                await this.kanbanTimerApiService.create({
                    kanban_id: task.kanban_ID,
                    wo_nbr: task.wo_nbr,
                    user_id: this.authenticationService.currentUserValue.id,
                    end_time: moment().format('YYYY-MM-DD HH:mm:ss')
                })
                task.isLoading = false;
                this.sendById(task);
            } catch (err) {
                task.isLoading = false;
                task.wo_end_time = null;
            }
        }
    }

    constructor(private modalService: NgbModal,
        private store: Store<{ data: RootReducerState }>,
        private kanbanApiService: KanbanApiService,
        private workOrderPickSheetModalService: WorkOrderPickSheetModalService,
        private kanbanQueueModalService: KanbanQueueModalService,
        private commentsModalService: CommentsModalService,
        private kanbanEditModalService: KanbanEditModalService,
        private kanbanAddModalService: KanbanAddModalService,
        private websocketService: WebsocketService,
        private kanbanConfigApiService: KanbanConfigApiService,
        public activatedRoute: ActivatedRoute,
        public router: Router,
        public authenticationService: AuthenticationService,
        public workOrderInfoModalService: WorkOrderInfoModalService,
        public workOrderRoutingByWoModalService: WorkOrderRoutingByWoModalService,
        private kanbanConfigEditModalService: KanbanConfigEditModalService,
        private toastrService: ToastrService,
        private kanbanTimerApiService: KanbanTimerApiService


    ) {
        this.websocketService = websocketService;


        this.websocketService.messageSubject$
            ?.subscribe(data => {
                if (data && data.type == 'close') {
                    this.liveUpdateMessage = "This page is no longer receiving live updates. Please refresh."
                } else {
                    this.liveUpdateMessage = ""
                }
            });


        //watch for changes if this modal is open
        //changes will only occur if modal is open and if the modal equals to the same qir number
        this.websocketService.multiplex(
            () => ({ subscribe: KANBAN }),
            () => ({ unsubscribe: KANBAN }),
            (message) => message.type === KANBAN
        )
            .subscribe(data => {
                this._fetchData();
            });

        this.websocketService.multiplex(
            () => ({ subscribe: 'KANBAN_EDIT' }),
            () => ({ unsubscribe: 'KANBAN_EDIT' }),
            (message) => message.type === 'KANBAN_EDIT'
        )
            .subscribe((data: any) => {
                this.updateTransactionV1(data.data)
            });

        this.websocketService.multiplex(
            () => ({ subscribe: 'KANBAN_BY_ID' }),
            () => ({ unsubscribe: 'KANBAN_BY_ID' }),
            (message) => message.type === 'KANBAN_BY_ID'
        )
            .subscribe((data: any) => {
                this.updateTransactionV1(data.data)
                this.onRefresh(data.data)
            });



        this.websocketService.multiplex(
            () => ({ subscribe: 'KANBAN_ADD' }),
            () => ({ unsubscribe: 'KANBAN_ADD' }),
            (message) => message.type === 'KANBAN_ADD'
        )
            .subscribe((data: any) => {
                // this.toastrService.info(
                //     "New orders added to 'Ready To Pick' queue. Please refresh.", "",
                //     {
                //         disableTimeOut: true, closeButton: true, enableHtml: true, positionClass: 'toast-top-center'
                //     }
                // )

                this._fetchData();
            });


        this.getKanbanConfig()
    }

    onClickFilter(name) {
        if (name == 'Open picks') {

            for (let i = 0; i < this.data.queues.length; i++) {
                for (let ii = 0; ii < this.data.queues[i].details.length; ii++) {
                    let row = this.data.queues[i].details[ii]
                    this.data.queues[i].details[ii] = []
                    let pickingPercent = row?.pickInfo?.wod_qty_iss/row?.pickInfo?.wod_qty_req*100 

                    if(pickingPercent < 100){
                        console.log(pickingPercent)
                        this.data.queues[i].details[ii].push(row)
                    }

                }
            }
        }
    }

    updateTransactionV1(row) {

        for (let i = 0; i < this.data.queues.length; i++) {
            if (this.data.queues[i].id == row.kanban_ID) {

                for (let ii = 0; ii < this.data.queues[i]?.details?.length; ii++) {
                    if (this.data.queues[i]?.details[ii].id == row.id) {
                        this.data.queues[i].details[ii] = row;
                    }
                }
            }
        }

    }

    ngOnInit(): void {
        this.activatedRoute.queryParams.subscribe(params => {
            this.currentQueueView = params['currentQueueView']?.split(',') || null;
            this.autoRefresh = params['autoRefresh'] || this.autoRefresh;
            this.showLess = params['showLess'] == 'false' || !params['showLess'] ? false : true
        })

        /** 
        * BreadCrumb
        */
        this.breadCrumbItems = [
            { label: 'Tasks' },
            { label: 'Kanban Board', active: true }
        ];

        /**
         * Data Get Function
         */
        this._fetchData();

        //this.onAutoRefresh();
    }

    autoRefresh: boolean | string = true;
    autoRefreshTimer = 5000;
    interval

    onAutoRefresh() {
        if (this.autoRefresh) {
            this.interval = setInterval(() => {
                this._fetchData();
            }, this.autoRefreshTimer);
        } else {
            clearInterval(this.interval);
        }
    }

    ngOnDestroy() {
        if (this.subscription)
            this.subscription.unsubscribe();
        if (this.interval) {
            this.interval.unsubscribe();
            clearInterval(this.interval);
        }
    }

    isInArray(id) {
        return this.currentQueueView.indexOf(id?.toString()) !== -1
    }

    updateTransaction(row, newData) {
        for (let i = 0; i < this.data.queues.length; i++) {
            if (this.data.queues[i].id == row.kanban_ID) {

                for (let ii = 0; ii < this.data.queues[i]?.details?.length; ii++) {
                    if (this.data.queues[i]?.details[ii].id == row.id) {
                        this.data.queues[i].details[ii] = newData;
                    }
                }
            }
        }

    }

    async onRefresh(row) {
        try {
            row.isLoading = true;
            let data: any = await this.kanbanApiService.getProduction(row.wo_nbr);

            for (let i = 0; i < data.queues.length; i++) {
                if (data.queues[i].id == row.kanban_ID) {
                    for (let ii = 0; ii < data.queues[i]?.details?.length; ii++) {
                        if (data.queues[i]?.details[ii].id == row.id) {
                            this.updateTransaction(row, data.queues[i]?.details[ii])
                            break;
                        }
                    }
                }
            }
            row.isLoading = false;
        } catch (err) {
            row.isLoading = false;
        }
    }

    send() {
        this.websocketService.next({
            type: KANBAN
        });
    }

    openKanbanConfig(id) {
        if (this.authenticationService.currentUserValue.employeeType === 0) return;

        let modalRef = this.kanbanConfigEditModalService.open(id)
        modalRef.result.then((result: any) => {
            this._fetchData()
            this.send();
        }, () => { });

    }

    viewComment = (task: any, id?: string) => {
        let modalRef = this.commentsModalService.open(task.wo_nbr, 'kanban')
        modalRef.result.then((result: any) => {
            task.comment.id = true;
            this.updateTransactionV1(task)
            this.websocketService.next({
                type: 'KANBAN_EDIT',
                data: task
            });

        }, () => { });
    }

    addToKanban() {
        let modalRef = this.kanbanAddModalService.open(null)
        modalRef.result.then((result: any) => {
            this._fetchData()
            // this.send();

            this.websocketService.next({
                type: 'KANBAN_ADD'
            });

        }, () => { });

    }

    sendById(task) {
        this.websocketService.next({
            type: 'KANBAN_BY_ID',
            data: task
        });
    }

    editKanban(task) {
        let modalRef = this.kanbanEditModalService.open(task.id)
        modalRef.result.then((result: any) => {
            task = { ...task, ...result };
            this.updateTransactionV1(task)
            this.websocketService.next({
                type: 'KANBAN_EDIT',
                data: task
            });

            this.onRefresh(task)
            this.sendById(task);

        }, () => { });

    }

    openEdit = (task) => {
        let modalRef = this.kanbanEditModalService.open(task.id)
        modalRef.result.then((result: any) => {
            this._fetchData()
            this.send();
        }, () => { });
    }

    openPickSheet = (workOrder) => {
        let modalRef = this.workOrderPickSheetModalService.open(workOrder)
        modalRef.result.then((result: any) => {
            this.send();
        }, () => { });
    }

    onBeforeDrop(item) {

    };

    /**
     * on dragging task
     * @param item item dragged
     * @param list list from item dragged
     */
    async onDragged(item: any, list: any[]) {
        const index = list.indexOf(item);
        list.splice(index, 1);
    }

    getDaysLate(days) {
        var start = moment(days, "YYYY-MM-DD");
        var end = moment(this.today, "YYYY-MM-DD");

        //Difference in number of days
        let dayCount = Math.round(moment.duration(end.diff(start)).asDays());

        if (dayCount > 100) {
            return `More 100 days old`;
        } else if (dayCount == 0) {
            return ' Due Today ';
        } else {
            return dayCount > 1 ? ` ${dayCount} DAYS LATE` : ` ${dayCount} DAY LATE`;
        }

    }

    /**
     * On task drop event
     */
    async onDrop(event: DndDropEvent, filteredList?: any[], targetStatus?: string) {

        await this.kanbanApiService.update(event.data.id, {
            kanban_id: targetStatus,
            seq: event.index
        })

        if (filteredList && event.dropEffect === 'move') {
            let index = event.index;

            if (typeof index === 'undefined') {
                index = filteredList.length;
            }
            event.data.seq = index;
            event.data.kanban_ID = targetStatus
            filteredList.splice(index, 0, event.data);
        }
        this.send();
    }

    async checkIfPickComplete(wo_nbr) {
        return await this.kanbanApiService.checkIfPickComplete(wo_nbr);
    }

    currentQueueSelection
    data
    /**
    * Data Fetch
    */
    // 


    updateClock = () => {
        for (let i = 0; i < this.data.queues.length; i++) {
            for (let ii = 0; ii < this.data.queues[i].details.length; ii++) {
                let row = this.data.queues[i].details[ii]
                if (row.last_transaction_date) {
                    row.timeDiff = timeUntil(row.last_transaction_date, row.timeDiff);
                    row.timeDiffMins = timeUntil1(row.last_transaction_date, row.timeDiff);
                } else {
                    row.timeDiff = '';
                }
            }
        }
    };

    subscription: Subscription;
    isLoadingAll = false;
    dataCopy
    public async _fetchData() {

        try {
            this.isLoadingAll = true;
            this.subscription?.unsubscribe();
            this.data = await this.kanbanApiService.getProduction();
            this.dataCopy = this.data
            const source = interval(1000);
            this.subscription = source.subscribe(val => this.updateClock());
            this.isLoadingAll = false;

        } catch (err) {
            this.isLoadingAll = false;
        }

    }


    /**
    * Open modal
    * @param content modal content
    */
    openQueueSelection(tasks, header) {
        if (header?.user_roles?.indexOf(this.authenticationService.currentUserValue.full_name) === -1) {
            this.toastrService.warning("You dont have access to move orders in this queue.")
            return;
        }

        let modalRef = this.kanbanQueueModalService.open(tasks);
        modalRef.result.then((result: any) => {
            this._fetchData()
            this.send();
        }, () => {
        });

    }

    /**
    * Open modal
    * @param content modal content
    */
    openMemberModal(content: any) {
        this.submitted = false;
        this.modalService.open(content, { size: 'md', centered: true });
    }

    /**
    * Open modal
    * @param content modal content
    */
    openAddModal(content: any) {
        this.submitted = false;
        this.modalService.open(content, { size: 'lg', centered: true });
    }

    /**
    * Confirmation mail model
    */
    confirm(ev: any, task) {
        SweetAlert.fire({
            title: 'Are you sure ?',
            text: 'Are you sure you want to remove this job ?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Close',
            imageUrl: ""
        }).then(async (result) => {
            if (result.value) {
                await this.kanbanApiService.delete(task.id)
                this._fetchData()
                this.send();
            }
        });
    }

    currentQueueView: any = null
    onChangeCurrentQueueView() {
        if (this.currentQueueView == '') {
            this.currentQueueView = null
        }
        this.router.navigate([`.`], {
            relativeTo: this.activatedRoute,
            queryParamsHandling: 'merge',
            queryParams: {
                currentQueueView: this.currentQueueView?.toString()
            }
        });
    }

    clear(item) {
        for (let i = 0; i < this.currentQueueView.length; i++) {
            if (this.currentQueueView[i] == item.name) {
                this.currentQueueView.splice(i, 1)
            }
        }

    }

    onShowLess() {

        this.router.navigate([`.`], {
            relativeTo: this.activatedRoute,
            queryParamsHandling: 'merge',
            queryParams: {
                showLess: this.showLess
            }
        });
    }

    queues
    async getKanbanConfig() {
        try {
            this.queues = await this.kanbanConfigApiService.getAll()
            this.queues.push({ name: 'All' })
        } catch (err) {
        }
    }

}


export function timeUntil(s, timeToStart) {
    const now = moment();
    const expiration = moment(s);

    // get the difference between the moments
    const diff = expiration.diff(now);

    //express as a duration
    const diffDuration = moment.duration(diff);

    // display
    let days = Math.abs(diffDuration.days());
    let hours = Math.abs(diffDuration.hours());
    let mintues = Math.abs(diffDuration.minutes());
    let seconds = Math.abs(diffDuration.seconds());

    let d = '';
    if (days > 0) {
        days == 1 ? d += days + ' day ' : d += days + ' days ';
    }

    let e = '';
    if (hours > 0) {
        e += hours + ' hrs '
    }
    return d + e + mintues + '  min ' + seconds + ' sec '

}

export function timeUntil1(s, timeToStart) {
    const now = moment();
    const expiration = moment(s);

    // get the difference between the moments
    const diff = expiration.diff(now);

    //express as a duration
    const diffDuration: any = moment.duration(diff);

    // display
    let days = Math.abs(diffDuration.days());
    let hours = Math.abs(diffDuration.hours());
    let mintues = Math.abs(diffDuration.minutes());
    let seconds = Math.abs(diffDuration.seconds());

    return Math.abs((diffDuration.valueOf() / 1000) / 60)

}