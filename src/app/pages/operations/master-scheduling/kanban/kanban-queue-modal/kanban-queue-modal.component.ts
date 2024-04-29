import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AddressInfoService } from '@app/core/api/address-info/address-info.service';
import { SharedModule } from '@app/shared/shared.module';
import { KanbanConfigApiService } from '@app/core/api/kanban-config';
import { KanbanApiService } from '@app/core/api/kanban';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

@Injectable({
  providedIn: 'root'
})
export class KanbanQueueModalService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  open(data: string) {
    this.modalRef = this.modalService.open(KanbanQueueModalComponent, { size: 'md' });
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
  staging_bay = ''

  async getKanbanConfig() {
    this.isLoading = true;
    try {
      this.queues = await this.kanbanConfigApiService.getAll()
      this.checkNextSelectQueue()
      this.isLoading = false;
    } catch (err) {
    }
  }

  getData = async () => {
    this.queues = await this.kanbanConfigApiService.getById(this.data.id)

  }

  currentSelectionRouting
  checkNextSelectQueue() {
    console.log(this.data)
    for (let i = 0; i < this.queues.length; i++) {

      
      if (this.data.kanban_ID == this.queues[i].id) {
        this.currentSelection = this.queues[i].next_queue_default;
        this.currentSelectionRouting = this.queues[i].routing
      }
      // if (this.data.kanban_ID == this.queues[i].id) {
      //   if(this.queues[i].namthis.data.wo_mstr?.wo_routing?.toLowerCase()){
      //     this.currentSelection = this.data.wo_mstr?.wo_routing?.toLowerCase()
      //     this.currentSelectionRouting = this.queues[i].routing
      //   }else{
      //   this.currentSelection = this.queues[i].next_queue_default
      //   this.currentSelectionRouting = this.queues[i].routing
      //   }
      // }
    }

  }

  ngOnInit() {
    this.currentSelection = this.data.kanban_ID;
    this.staging_bay = this.data.staging_bay;
    this.getKanbanConfig();
  }

  dismiss() {
    this.ngbActiveModal.dismiss('dismiss');
  }

  close(data?) {
    this.ngbActiveModal.close(data);
  }

  message = ""
  async onSubmit() {
    if (this.staging_bay == '' && this.currentSelection == '3') {
      this.message = "Enter staging bay";
      return;
    }

    this.isLoading = true;

    //prod line 1 and prod line 2 and proto default to QA

    try {
      SweetAlert.loading('Saving. Please wait..');
      let e: any = await this.checkIfPickComplete(this.data.wo_nbr, this.currentSelectionRouting, this.data.kanban_ID);
      if (e?.errorMessage) {
        this.message = e?.errorMessage;
        this.isLoading = false;
        SweetAlert.close();
        return;
      }

      await this.kanbanApiService.update(this.data.id, {
        staging_bay: this.staging_bay,
      })

      let d = await this.kanbanApiService.moveQueue(this.data.id, {
        kanban_ID: this.currentSelection,
        created_by: this.authenticationService.currentUserValue.id,
        wo_nbr: this.data.wo_nbr
      })
      this.isLoading = false;
      this.message = "";

      this.close(d)
      SweetAlert.close();
    } catch (err) {
      this.isLoading = false;
      this.message = "";
      SweetAlert.close();

      this.data = { ...this.data }
    }
  }

  //hardstops 
  async checkIfPickComplete(wo_nbr, route, queue) {
    return await this.kanbanApiService.checkIfPickComplete(wo_nbr, route, queue);
  }

}
