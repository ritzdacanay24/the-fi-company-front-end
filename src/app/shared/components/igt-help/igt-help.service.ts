import { Injectable } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { IgtHelpModalComponent } from './igt-help-modal.component';

@Injectable({
  providedIn: 'root'
})
export class IgtHelpService {
  
  constructor(private modalService: NgbModal) {}

  /**
   * Open help modal for serial numbers
   */
  openSerialNumbersHelp(): NgbModalRef {
    const modalRef = this.modalService.open(IgtHelpModalComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: true,
      scrollable: true,
      centered: false
    });

    modalRef.componentInstance.helpType = 'serial-numbers';
    return modalRef;
  }

  /**
   * Open help modal for IGT loader
   */
  openLoaderHelp(): NgbModalRef {
    const modalRef = this.modalService.open(IgtHelpModalComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: true,
      scrollable: true,
      centered: false
    });

    modalRef.componentInstance.helpType = 'loader';
    return modalRef;
  }

  /**
   * Open help modal with specific category and section
   */
  openHelpSection(helpType: 'serial-numbers' | 'loader', categoryId?: string, sectionId?: string): NgbModalRef {
    const modalRef = this.modalService.open(IgtHelpModalComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: true,
      scrollable: true,
      centered: false
    });

    modalRef.componentInstance.helpType = helpType;
    
    if (categoryId) {
      modalRef.componentInstance.initialCategory = categoryId;
    }
    
    if (sectionId) {
      modalRef.componentInstance.initialSection = sectionId;
    }

    return modalRef;
  }
}
