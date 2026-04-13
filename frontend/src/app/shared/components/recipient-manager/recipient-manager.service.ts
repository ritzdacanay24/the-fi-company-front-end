import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { RecipientManagerComponent } from './recipient-manager.component';

export interface RecipientManagerResult {
  name: string;
  email: string;
  department?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecipientManagerService {

  constructor(private modalService: NgbModal) { }

  open(): Promise<RecipientManagerResult[]> {
    const modalRef = this.modalService.open(RecipientManagerComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });

    return modalRef.result.then(
      (selectedRecipients: RecipientManagerResult[]) => selectedRecipients,
      () => []
    );
  }
}
