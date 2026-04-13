import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PhotosComponent } from './photos.component';

@Injectable({
  providedIn: 'root'
})
export class PhotosService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  open(woNumber: string, partNumber: string, serialNumber: string, typeOfView) {
    this.modalRef = this.modalService.open(PhotosComponent, { size: 'lg' });
    this.modalRef.componentInstance.woNumber = woNumber;
    this.modalRef.componentInstance.partNumber = partNumber;
    this.modalRef.componentInstance.serialNumber = serialNumber;
    this.modalRef.componentInstance.typeOfView = typeOfView;
    return this.modalRef
  }

  getInstance() {
    return this.modalRef;
  }

}
