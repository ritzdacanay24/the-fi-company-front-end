import { Component, Input } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { AuthenticationService } from "@app/core/services/auth.service";
import { TableFilterSettingsService } from "@app/core/api/table-filter-settings/table-filter-settings.component";

@Injectable({
  providedIn: "root",
})
export class GridFiltersEditModalService {
  modalRef: any;

  constructor(public modalService: NgbModal) {}

  open(pageId) {
    this.modalRef = this.modalService.open(GridFiltersEditModalComponent, {
      size: "md",
    });
    this.modalRef.componentInstance.pageId = pageId;
    return this.modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-grid-filters-edit-modal",
  templateUrl: `./grid-filters-edit-modal.component.html`,
  styleUrls: [],
})
export class GridFiltersEditModalComponent {
  constructor(
    private tableFilterSettingsService: TableFilterSettingsService,
    private ngbActiveModal: NgbActiveModal,
    private authenticationService: AuthenticationService
  ) {}

  @Input() public pageId: string = "";

  isLoading = true;

  ngOnInit() {
    this.getData();
  }

  dismiss() {
    this.ngbActiveModal.dismiss("dismiss");
  }

  close() {
    this.ngbActiveModal.close(this.list);
  }

  name = "";
  description = "";

  list;
  async getData() {
    this.list = await this.tableFilterSettingsService.find({
      userId: this.authenticationService.currentUserValue.id,
      pageId: this.pageId,
    });
  }

  async onDelete(row, index) {
    if (!confirm("Are you sure you want to delete?")) return;
    await this.tableFilterSettingsService.delete(row.id);
    this.list.splice(index, 1);
  }

  async save(row) {
    await this.tableFilterSettingsService.saveTableSettings(row.id, row);
  }
}
