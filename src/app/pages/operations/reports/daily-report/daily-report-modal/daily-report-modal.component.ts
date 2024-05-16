import { Injectable, Input } from "@angular/core";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { UserSearchComponent } from "@app/shared/components/user-search/user-search.component";
import { NgxBarcode6Module } from "ngx-barcode6";
import { DragulaModule } from 'ng2-dragula';
import { AuthenticationService } from "@app/core/services/auth.service";
import { LogisiticsDailyReportService } from "@app/core/api/operations/logisitics/daily-report.service";

@Injectable({
    providedIn: 'root'
})
export class DailyReportModalService {

    constructor(
        public modalService: NgbModal
    ) { }

    open(data) {
        let modalRef = this.modalService.open(DailyReportModalComponent, { size: 'lg' });
        modalRef.componentInstance.data = data;
        return modalRef;
    }
}
@Component({
    standalone: true,
    imports: [SharedModule, NgxBarcode6Module, UserSearchComponent, DragulaModule],
    selector: 'app-daily-report-component',
    templateUrl: './daily-report-modal.component.html',
    styleUrls: ['./daily-report.modal.component.scss'],
})
export class DailyReportModalComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private ngbActiveModal: NgbActiveModal,
        private authenticationService: AuthenticationService,
        private logisiticsDailyReportService: LogisiticsDailyReportService,
    ) {
    }

    newSort = {};
    dragulaModelChange($event) {
        let newData1 = {}
        for (let i = 0; i < $event.length; i++) newData1[$event[i].id] = i;

        this.newSort = newData1;
        for (let i = 0; i < this.data.length; i++) {
            for (const [key, value] of Object.entries(this.newSort)) {
                if (key == this.data[i].id) this.data[i].seq = value;
            }
        };
    }

    async onReset() {
        await this.logisiticsDailyReportService.deleteDailyReportConfig(this.authenticationService.currentUserValue.id);
        this.close('reset')
    }


    async onSubmit() {


        let hidden_column = []
        for (let i = 0; i < this.data.length; i++) {
            if (!this.data[i].isVisible) {
                hidden_column.push(this.data[i].id)
            }
        }
        let params: any
        if (Object.keys(this.newSort).length === 0) {
            params = {
                user_id: this.authenticationService.currentUserValue.id,
                hidden_column: JSON.stringify(hidden_column)
            }
        } else {
            params = {
                user_id: this.authenticationService.currentUserValue.id,
                sort_column: JSON.stringify(this.newSort),
                hidden_column: JSON.stringify(hidden_column)
            }
        }

        try {
            await this.logisiticsDailyReportService.saveDailyReportConfig(params);
            this.close(this.data);
        } catch (err) {

        }
    }

    ngOnInit(): void {}

    @Input() data: any;

    dismiss() {
        this.ngbActiveModal.dismiss()
    }

    close(value?) {
        this.ngbActiveModal.close(value)
    }

}

