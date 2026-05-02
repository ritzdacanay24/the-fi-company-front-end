import { Component, Injectable, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { SerialAssignmentsService } from '@app/features/serial-assignments/services/serial-assignments.service';

@Injectable({
  providedIn: 'root',
})
export class SerialAssignmentUsageDetailsModalService {
  constructor(private readonly modalService: NgbModal) {}

  open(ulNumber: string) {
    const modalRef = this.modalService.open(SerialAssignmentUsageDetailsModalComponent, {
      centered: true,
      size: 'xl',
    });
    modalRef.componentInstance.ulNumber = ulNumber;
    return modalRef;
  }

  openByIgtSerialNumber(serialNumber: string) {
    const modalRef = this.modalService.open(SerialAssignmentUsageDetailsModalComponent, {
      centered: true,
      size: 'xl',
    });
    modalRef.componentInstance.igtSerialNumber = serialNumber;
    return modalRef;
  }
}

@Component({
  selector: 'app-serial-assignment-usage-details-modal',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './serial-assignment-usage-details-modal.component.html',
})
export class SerialAssignmentUsageDetailsModalComponent implements OnInit {
  @Input() ulNumber = '';
  @Input() igtSerialNumber = '';

  isLoadingUsageDetails = false;
  usageDetailsError = '';
  selectedUsageDetailsIdentifier = '';
  usageContextLabel = 'UL Label';
  usageDetailsRows: any[] = [];

  constructor(
    private readonly activeModal: NgbActiveModal,
    private readonly serialAssignmentsService: SerialAssignmentsService,
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.igtSerialNumber) {
      await this.loadUsageDetailsByIgtSerial(this.igtSerialNumber);
      return;
    }

    await this.loadUsageDetails(this.ulNumber);
  }

  async loadUsageDetails(ulNumber: string): Promise<void> {
    this.usageContextLabel = 'UL Label';
    this.selectedUsageDetailsIdentifier = ulNumber;
    this.usageDetailsRows = [];
    this.usageDetailsError = '';
    this.isLoadingUsageDetails = true;

    try {
      const response = await this.serialAssignmentsService.getAssignmentsByUlNumber(ulNumber);
      const rows = Array.isArray(response?.data) ? response.data : [];
      this.usageDetailsRows = rows;
      if (rows.length === 0) {
        this.usageDetailsError = 'No serial assignment usage found for this UL label.';
      }
    } catch {
      this.usageDetailsError = 'Failed to load serial assignment usage details.';
    } finally {
      this.isLoadingUsageDetails = false;
    }
  }

  async loadUsageDetailsByIgtSerial(serialNumber: string): Promise<void> {
    this.usageContextLabel = 'IGT Serial';
    this.selectedUsageDetailsIdentifier = serialNumber;
    this.usageDetailsRows = [];
    this.usageDetailsError = '';
    this.isLoadingUsageDetails = true;

    try {
      const response = await this.serialAssignmentsService.getAssignmentsByIgtSerialNumber(serialNumber);
      const rows = Array.isArray(response?.data) ? response.data : [];
      this.usageDetailsRows = rows;
      if (rows.length === 0) {
        this.usageDetailsError = 'No serial assignment usage found for this IGT serial.';
      }
    } catch {
      this.usageDetailsError = 'Failed to load serial assignment usage details.';
    } finally {
      this.isLoadingUsageDetails = false;
    }
  }

  close(): void {
    this.activeModal.close();
  }

  badgeClass(row: any): string {
    if (row.is_voided) return 'bg-secondary';
    const status = (row.status || '').toLowerCase();
    if (status === 'consumed' || status === 'used') return 'bg-success';
    return 'bg-primary';
  }

  badgeLabel(row: any): string {
    if (row.is_voided) return 'Voided';
    return row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Consumed';
  }

  formatDate(val: any): string {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  }

  assignedDate(row: any): string {
    return this.formatDate(row.consumed_at || row.used_date || row.created_at);
  }

  voidedDate(row: any): string {
    return this.formatDate(row.voided_at);
  }
}
