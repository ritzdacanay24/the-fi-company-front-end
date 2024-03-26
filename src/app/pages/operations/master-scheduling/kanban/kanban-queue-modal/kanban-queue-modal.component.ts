import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AddressInfoService } from '@app/core/api/address-info/address-info.service';
import { SharedModule } from '@app/shared/shared.module';
import { KanbanConfigApiService } from '@app/core/api/kanban-config';
import { KanbanApiService } from '@app/core/api/kanban';
import { AuthenticationService } from '@app/core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class KanbanQueueModalService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  open(data: string) {
    this.modalRef = this.modalService.open(KanbanQueueModalComponent, { size: 'md', fullscreen: false, backdrop: 'static', scrollable: true, centered: true, keyboard: false });
    this.modalRef.componentInstance.data = data;
    return this.modalRef;
  }

}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-kanban-queue-modal',
  templateUrl: `./kanban-queue-modal.component.html`,
  styleUrls: []
})

export class KanbanQueueModalComponent {

  constructor(
    private addressInfoService: AddressInfoService,
    private ngbActiveModal: NgbActiveModal,
    private kanbanConfigApiService: KanbanConfigApiService,
    private kanbanApiService: KanbanApiService,
    private authenticationService: AuthenticationService
  ) { }

  @Input() public data: any;

  isLoading = true;
  queues
  currentSelection

  async getKanbanConfig() {
    this.isLoading = true;
    try {
      this.queues = await this.kanbanConfigApiService.getAll()
      this.isLoading = false;
    } catch (err) {
    }
  }

  getData = async () => {
    this.queues = await this.kanbanConfigApiService.getById(this.data.id)
  }


  ngOnInit() {
    console.log(this.data)
    this.currentSelection = this.data.kanban_ID;
    this.getKanbanConfig();
  }

  dismiss() {
    this.ngbActiveModal.dismiss('dismiss');
  }

  close(data?) {
    this.ngbActiveModal.close(data);
  }

  async onSubmit() {
    this.isLoading = true;

    //picking
    if (this.data.kanban_ID == 2) {
      let e: any = await this.checkIfPickComplete(this.data.wo_nbr);
      if (e?.results.total !== 0 && e?.results_wr_status != 'C' && e?.checkValidation?.enable_validation) {
        alert('Work Order is not pick complete and wr routing is not completed')
        this.isLoading = false;
        return;
      }
    }

    try {
      await this.kanbanApiService.moveQueue(this.data.id, {
        kanban_ID: this.currentSelection,
        created_by: this.authenticationService.currentUserValue.id
      })
      this.isLoading = false;

      this.close({ ...this.data, kanban_ID: this.currentSelection })
    } catch (err) {
      this.isLoading = false;

      this.data = { ...this.data }
    }
  }

  //hardstops 
  async checkIfPickComplete(wo_nbr) {
    return await this.kanbanApiService.checkIfPickComplete(wo_nbr);
  }

}
