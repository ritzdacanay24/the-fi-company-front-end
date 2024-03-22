import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { TableSettingsService } from '@app/core/api/table-settings/table-settings.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import moment from 'moment';

@Injectable({
    providedIn: 'root'
})
export class GridSettingsModalService {
    modalRef: any;

    constructor(
        public modalService: NgbModal
    ) { }

    open(grid, pageId) {
        this.modalRef = this.modalService.open(GridSettingsModalComponent, { size: 'md' });
        this.modalRef.componentInstance.data = grid;
        this.modalRef.componentInstance.pageId = pageId;
        return this.modalRef
    }

}

@Component({
    standalone: true,
    imports: [SharedModule],
    selector: 'app-grid-settings-modal',
    templateUrl: `./grid-settings-modal.component.html`,
    styleUrls: []
})

export class GridSettingsModalComponent {

    constructor(
        private tableSettingsService: TableSettingsService,
        private ngbActiveModal: NgbActiveModal,
        private authenticationService: AuthenticationService
    ) { }

    @Input() public pageId: string = '';
    @Input() public data: string = '';

    isLoading = true;

    ngOnInit() {
    }

    dismiss() {
        this.ngbActiveModal.dismiss('dismiss');
    }

    close() {
        this.ngbActiveModal.close();
    }

    name = ""
    description = ""

    async save() {

        if (!this.pageId) {
            alert('Page Id not set');
            return;
        } else if (!this.authenticationService.currentUserValue.id) {
            alert('User id not found.');
            return;
        }

        let info = {
            userId: this.authenticationService.currentUserValue.id,
            pageId: this.pageId,
            data: JSON.stringify(this.data),
            createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
            table_description: this.description || 'No Description',
            table_name: this.name || 'No Name'
        };

        let { insertId } = await this.tableSettingsService.create(info)
        this.ngbActiveModal.close({ ...info, id: insertId });
    }
}
