import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { TableSettingsService } from '@app/core/api/table-settings/table-settings.service';
import { AuthenticationService } from '@app/core/services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class GridSettingsEditModalService {
    modalRef: any;

    constructor(
        public modalService: NgbModal
    ) { }

    open(pageId) {
        this.modalRef = this.modalService.open(GridSettingsEditModalComponent, { size: 'md' });
        this.modalRef.componentInstance.pageId = pageId;
        return this.modalRef
    }

}

@Component({
    standalone: true,
    imports: [SharedModule],
    selector: 'app-grid-settings-edit-modal',
    templateUrl: `./grid-settings-edit-modal.component.html`,
    styleUrls: []
})

export class GridSettingsEditModalComponent {

    constructor(
        private tableSettingsService: TableSettingsService,
        private ngbActiveModal: NgbActiveModal,
        private authenticationService: AuthenticationService
    ) { }

    @Input() public pageId: string = '';

    isLoading = true;

    ngOnInit() {
        this.getData();
    }

    dismiss() {
        this.ngbActiveModal.dismiss('dismiss');
    }

    close() {
        this.ngbActiveModal.close(this.list);
    }

    name = ""
    description = ""

    list
    async getData() {
        this.list = await this.tableSettingsService.find({
            userId: this.authenticationService.currentUserValue.id,
            pageId: this.pageId
        })
    }

    async onDelete(row, index) {
        if (!confirm('Are you sure you want to delete?')) return;
        await this.tableSettingsService.delete(row.id)
        this.list.splice(index, 1)
    }

    async save(row) {
        await this.tableSettingsService.saveTableSettings(row.id, row)
    }
}
