import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ULLabel {
  id: string;
  ul_number: string;
  description: string;
  status: 'available' | 'assigned' | 'used';
  assignedTo?: string;
  dateCreated: Date;
  dateUsed?: Date;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-ul-list',
  templateUrl: './ul-list.component.html',
  styleUrls: ['./ul-list.component.scss']
})
export class ULListComponent {
  @Input() labels: ULLabel[] = [];
  @Input() filteredLabels: ULLabel[] = [];
  @Input() searchTerm = '';
  @Input() selectedStatus = 'all';

  @Output() labelAssign = new EventEmitter<ULLabel>();
  @Output() labelMarkUsed = new EventEmitter<ULLabel>();
  @Output() labelReset = new EventEmitter<ULLabel>();
  @Output() searchChanged = new EventEmitter<string>();
  @Output() statusFilterChanged = new EventEmitter<string>();
  @Output() exportRequested = new EventEmitter<void>();

  onSearch(event: any) {
    this.searchChanged.emit(event.target.value);
  }

  onStatusFilter(status: string) {
    this.statusFilterChanged.emit(status);
  }

  onAssignLabel(label: ULLabel) {
    this.labelAssign.emit(label);
  }

  onMarkUsed(label: ULLabel) {
    this.labelMarkUsed.emit(label);
  }

  onResetLabel(label: ULLabel) {
    this.labelReset.emit(label);
  }

  onExport() {
    this.exportRequested.emit();
  }
}
