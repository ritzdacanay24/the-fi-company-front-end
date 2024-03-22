import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MaterialPickingValidationComponent } from './material-picking-validation.component';

@Injectable({
  providedIn: 'root'
})
export class MaterialPickingValidationService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  public open(itemShortagesFound: any) {
    this.modalRef = this.modalService.open(MaterialPickingValidationComponent, { size: 'lg' });
    this.modalRef.componentInstance.shortages = itemShortagesFound;
    return this.modalRef;
  }
  

  public getInstance() {
    return this.modalRef;
  }

}
