import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DepartmentModalComponent } from './department-modal.component';
import { Department } from '../services/department.service';

@Injectable({
  providedIn: 'root'
})
export class DepartmentModalService {
  constructor(private readonly modalService: NgbModal) {}

  open(options?: { department?: Department | null }) {
    const modalRef = this.modalService.open(DepartmentModalComponent, {
      size: 'lg',
      backdrop: 'static',
    });

    modalRef.componentInstance.currentDepartment = options?.department ?? null;
    return modalRef;
  }
}
