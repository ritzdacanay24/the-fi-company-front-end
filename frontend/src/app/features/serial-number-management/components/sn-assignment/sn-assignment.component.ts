import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { SerialNumberService } from '../../services/serial-number.service';
import { SerialNumber, SerialNumberAssignment } from '../../models/serial-number.model';
import { SerialAssignmentsService } from '@app/features/serial-assignments/services/serial-assignments.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  selector: 'app-sn-assignment',
  templateUrl: './sn-assignment.component.html',
  styleUrls: ['./sn-assignment.component.scss']
})
export class SnAssignmentComponent implements OnInit {
  @Output() assignmentCompleted = new EventEmitter<SerialNumberAssignment>();

  assignmentForm: FormGroup;
  searchForm: FormGroup;
  
  availableSerialNumbers: SerialNumber[] = [];
  assignments: SerialNumberAssignment[] = [];
  
  selectedSerialNumbers: SerialNumber[] = [];
  isAssigning = false;
  isSearching = false;
  lastAssignmentError: string | null = null;
  
  currentView: 'assign' | 'history' = 'assign';
  
  private refreshAssignments = new BehaviorSubject<void>(undefined);

  constructor(
    private fb: FormBuilder,
    private serialNumberService: SerialNumberService,
    private serialAssignmentsService: SerialAssignmentsService,
  ) {
    this.assignmentForm = this.fb.group({
      workOrderNumber: ['', Validators.pattern(/^[A-Z0-9-]{4,20}$/)],
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      customerPo: [''],
      assignedByName: ['', [Validators.required, Validators.minLength(2)]],
      notes: [''],
      assignedDate: [new Date().toISOString().split('T')[0], Validators.required],
      shippedDate: [''],
      trackingNumber: [''],
      // Work Order fields (if applicable)
      woNbr: [null],
      woDueDate: [''],
      woPart: [''],
      woQtyOrd: [null],
      woRouting: [''],
      woLine: [''],
      woDescription: ['']
    });

    this.searchForm = this.fb.group({
      serialNumberQuery: [''],
      productModelFilter: ['all'],
      batchNumberFilter: [''],
      limit: [50]
    });
  }

  ngOnInit() {
    this.loadAvailableSerialNumbers();
    this.loadAssignments();
    this.setupSearch();
  }

  async loadAvailableSerialNumbers() {
    this.isSearching = true;
    
    try {
      const searchParams = this.searchForm.value;
      const response = await this.serialNumberService.getAvailableSerialNumbers(searchParams.limit);
      
      // Filter for available serial numbers only
      if (response && response.success) {
        this.availableSerialNumbers = (response.data || []).filter((sn: SerialNumber) => sn.status === 'available');
      } else {
        this.availableSerialNumbers = [];
      }
    } catch (error) {
      console.error('Error loading available serial numbers:', error);
      this.availableSerialNumbers = [];
    } finally {
      this.isSearching = false;
    }
  }

  async loadAssignments() {
    try {
      const response = await this.serialAssignmentsService.getAllConsumedSerials({ include_voided: false });
      if (response && response.success) {
        this.assignments = (response.data || []).map((assignment: any) => ({
          id: assignment.id || assignment.source_id,
          serial_number_id: assignment.eyefi_serial_id || 0,
          serial_number: assignment.eyefi_serial_number,
          ul_label_id: assignment.ul_label_id,
          ul_number: assignment.ul_number,
          work_order_number: assignment.wo_number || assignment.po_number,
          customer_name: assignment.customer_name,
          customer_po: assignment.po_number,
          assigned_date: assignment.consumed_at || assignment.used_date || assignment.created_at,
          assigned_by_user: assignment.consumed_by || assignment.used_by || '',
          assigned_by_name: assignment.consumed_by || assignment.used_by || '',
          status: assignment.status,
          consumed_by: assignment.consumed_by || assignment.used_by,
          notes: assignment.notes,
          wo_nbr: assignment.wo_number,
          wo_due_date: assignment.wo_due_date,
          wo_part: assignment.wo_part || assignment.part_number,
          wo_qty_ord: assignment.wo_qty_ord,
          wo_routing: assignment.wo_routing,
          wo_line: assignment.wo_line,
          wo_description: assignment.wo_description,
        }));
      } else {
        this.assignments = [];
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      this.assignments = [];
    }
  }

  setupSearch() {
    this.searchForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.loadAvailableSerialNumbers();
    });
  }

  toggleSerialNumberSelection(serialNumber: SerialNumber) {
    const index = this.selectedSerialNumbers.findIndex(sn => sn.serial_number === serialNumber.serial_number);
    
    if (index > -1) {
      this.selectedSerialNumbers.splice(index, 1);
    } else {
      this.selectedSerialNumbers.push(serialNumber);
    }
  }

  isSelected(serialNumber: SerialNumber): boolean {
    return this.selectedSerialNumbers.some(sn => sn.serial_number === serialNumber.serial_number);
  }

  clearSelection() {
    this.selectedSerialNumbers = [];
  }

  selectAllVisible(serialNumbers: SerialNumber[]) {
    // Add all visible serial numbers that aren't already selected
    serialNumbers.forEach(sn => {
      if (!this.isSelected(sn)) {
        this.selectedSerialNumbers.push(sn);
      }
    });
  }

  async assignSerialNumbers() {
    if (this.assignmentForm.invalid || this.selectedSerialNumbers.length === 0) {
      return;
    }

    this.isAssigning = true;
    this.lastAssignmentError = null;
    const formValue = this.assignmentForm.value;

    const assignments = this.selectedSerialNumbers.map(sn => ({
      serial_number_id: sn.id || 0,
      eyefi_serial_number: sn.serial_number,
      serial_number: sn.serial_number,
      wo_number: formValue.workOrderNumber,
      work_order_number: formValue.workOrderNumber,
      customer_name: formValue.customerName,
      customer_po: formValue.customerPo,
      assigned_date: formValue.assignedDate,
      shipped_date: formValue.shippedDate,
      tracking_number: formValue.trackingNumber,
      assigned_by_user: 'current-user', // In real app, get from auth service
      assigned_by_name: formValue.assignedByName,
      notes: formValue.notes,
      wo_nbr: formValue.woNbr,
      wo_due_date: formValue.woDueDate,
      wo_part: formValue.woPart,
      wo_qty_ord: formValue.woQtyOrd,
      wo_routing: formValue.woRouting,
      wo_line: formValue.woLine,
      wo_description: formValue.woDescription,
      part_number: formValue.woPart,
      po_number: formValue.customerPo,
      cp_cust: formValue.customerName,
      cp_cust_part: null,
    }));

    try {
      await this.serialAssignmentsService.bulkCreateOther(assignments, formValue.assignedByName);
      
      this.selectedSerialNumbers = [];
      this.assignmentForm.reset({
        assignedDate: new Date().toISOString().split('T')[0]
      });
      await this.loadAvailableSerialNumbers();
      await this.loadAssignments();
      
      // Emit completion event with the first assignment as example
      this.assignmentCompleted.emit(assignments[0]);
    } catch (error) {
      console.error('Assignment error:', error);
      this.lastAssignmentError = error instanceof Error ? error.message : 'Failed to create serial assignments';
    } finally {
      this.isAssigning = false;
    }
  }

  searchWorkOrder() {
    const woNumber = this.assignmentForm.get('workOrderNumber')?.value;
    if (woNumber) {
      // In a real implementation, you would fetch work order details
      console.log('Searching work order:', woNumber);
      
      // Mock work order data
      setTimeout(() => {
        this.assignmentForm.patchValue({
          woNbr: 12345,
          woDueDate: '2024-02-15',
          woPart: 'PART-001',
          woQtyOrd: 25,
          woRouting: 'RTG-001',
          woLine: 'LINE-A',
          woDescription: 'EyeFi Pro X1 Assembly'
        });
      }, 500);
    }
  }

  viewAssignmentDetails(assignment: SerialNumberAssignment) {
    // In a real implementation, this would open a modal or navigate to details view
    console.log('View assignment details:', assignment);
  }

  updateShippingInfo(assignment: SerialNumberAssignment) {
    // In a real implementation, this would open a shipping update modal
    console.log('Update shipping info for:', assignment);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusBadgeClass(assignment: SerialNumberAssignment): string {
    if (assignment.status === 'consumed' || assignment.status === 'active') {
      return 'badge-success';
    }
    if (assignment.status === 'cancelled' || assignment.status === 'returned') {
      return 'badge-secondary';
    }
    if (assignment.shipped_date) {
      return 'badge-success';
    } else if (assignment.tracking_number) {
      return 'badge-info';
    } else {
      return 'badge-warning';
    }
  }

  getStatusText(assignment: SerialNumberAssignment): string {
    if (assignment.status === 'consumed') {
      return 'Consumed';
    }
    if (assignment.status === 'active') {
      return 'Active';
    }
    if (assignment.status === 'cancelled') {
      return 'Cancelled';
    }
    if (assignment.status === 'returned') {
      return 'Returned';
    }
    if (assignment.shipped_date) {
      return 'Shipped';
    } else if (assignment.tracking_number) {
      return 'Ready to Ship';
    } else {
      return 'Assigned';
    }
  }

  // Form validation helpers
  get workOrderError() {
    const control = this.assignmentForm.get('workOrderNumber');
    if (control?.errors && control.touched) {
      if (control.errors['pattern']) return 'Work order must be 4-20 characters (letters, numbers, hyphens)';
    }
    return null;
  }

  get customerNameError() {
    const control = this.assignmentForm.get('customerName');
    if (control?.errors && control.touched) {
      if (control.errors['required']) return 'Customer name is required';
      if (control.errors['minlength']) return 'Customer name must be at least 2 characters';
    }
    return null;
  }

  get assignedByError() {
    const control = this.assignmentForm.get('assignedByName');
    if (control?.errors && control.touched) {
      if (control.errors['required']) return 'Assigned by name is required';
      if (control.errors['minlength']) return 'Name must be at least 2 characters';
    }
    return null;
  }

  trackBySerialNumber(index: number, item: SerialNumber): string {
    return item.serial_number;
  }

  trackByAssignment(index: number, item: SerialNumberAssignment): string {
    return `${item.id || item.serial_number}-${item.assigned_date}`;
  }

  // Template helper method
  selectAllVisibleFromArray() {
    this.selectAllVisible(this.availableSerialNumbers);
  }
}