import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AddressInfoService } from '@app/core/api/address-info/address-info.service';
import { SharedModule } from '@app/shared/shared.module';

@Injectable({
  providedIn: 'root'
})
export class AddressInfoModalService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  open(addressCode: string) {
    this.modalRef = this.modalService.open(AddressInfoModalComponent, { size: 'md', fullscreen: false, backdrop: 'static', scrollable: true, centered: true, keyboard: false });
    this.modalRef.componentInstance.addressCode = addressCode;
    this.getInstance();
  }

  getInstance() {
    return this.modalRef;
  }

}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-address-info-modal',
  templateUrl: `./address-info-modal.component.html`,
  styleUrls: []
})

export class AddressInfoModalComponent {

  constructor(
    private addressInfoService: AddressInfoService,
    private ngbActiveModal: NgbActiveModal
  ) { }

  @Input() public addressCode: string = '';

  data: any;
  isLoading = true;

  getData = () => {
    this.isLoading = true;
    this.addressInfoService.getData(this.addressCode).subscribe(
      (data: any) => {
        this.data = data;
        this.isLoading = false;
      }, error => {
        this.isLoading = false;
      })
  }
  ngOnInit() {
    this.getData();
  }

  dismiss() {
    this.ngbActiveModal.dismiss('dismiss');
  }

  close() {
    this.ngbActiveModal.close();
  }

}
