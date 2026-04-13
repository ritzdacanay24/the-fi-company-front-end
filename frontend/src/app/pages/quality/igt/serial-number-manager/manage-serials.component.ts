import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SerialNumberService } from '../services/serial-number.service';

@Component({
  standalone: true,
  selector: 'app-manage-serials',
  imports: [CommonModule],
  template: `
    <div class="card border-0">
      <div class="card-header bg-secondary-subtle p-3">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-0 fw-bold text-secondary-emphasis">
            <i class="mdi mdi-database me-2"></i>
            Serial Number Inventory
          </h6>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary btn-sm" (click)="refresh.emit()">
              <i class="mdi mdi-refresh me-1"></i>
              Refresh
            </button>
            <button class="btn btn-outline-danger btn-sm" (click)="bulkDelete.emit()" [disabled]="selectedSerials.length === 0">
              <i class="mdi mdi-delete me-1"></i>
              Delete Selected
            </button>
          </div>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" (change)="toggleSelectAll.emit($event)">
                  </div>
                </th>
                <th>Serial Number</th>
                <th>Category</th>
                <th>Status</th>
                <th>Date Added</th>
                <th>Used In Tag</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let serial of serialNumbers; trackBy: trackBySerial">
                <td>
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox"
                      [checked]="isSelected(serial.id)" (change)="toggleSelect.emit({id: serial.id, event: $event})">
                  </div>
                </td>
                <td>
                  <code class="text-primary">{{serial.serialNumber}}</code>
                </td>
                <td>
                  <span class="badge bg-secondary-subtle text-dark">{{serial.category}}</span>
                </td>
                <td>
                  <span class="badge" [ngClass]="{
                    'bg-success': serial.status === 'available',
                    'bg-warning': serial.status === 'reserved',
                    'bg-danger': serial.status === 'used'
                  }">
                    {{serial.status | titlecase}}
                  </span>
                </td>
                <td>{{serial.createdAt | date:'short'}}</td>
                <td>
                  <span *ngIf="serial.usedInTag" class="text-primary">{{serial.usedInTag}}</span>
                  <span *ngIf="!serial.usedInTag" class="text-muted">-</span>
                </td>
                <td>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" title="Edit" (click)="editSerial.emit(serial)">
                      <i class="mdi mdi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" title="Delete" (click)="deleteSerial.emit(serial.id)">
                      <i class="mdi mdi-delete"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class ManageSerialsComponent implements OnInit {
  serialNumbers: any[] = [];
  @Input() selectedSerials: string[] = [];
  @Input() isSelected!: (id: string) => boolean;
  @Input() trackBySerial!: (index: number, item: any) => string;
  @Output() refresh = new EventEmitter<void>();
  @Output() bulkDelete = new EventEmitter<void>();
  @Output() toggleSelectAll = new EventEmitter<any>();
  @Output() toggleSelect = new EventEmitter<{id: string, event: any}>();
  @Output() editSerial = new EventEmitter<any>();
  @Output() deleteSerial = new EventEmitter<string>();

  constructor(private serialNumberService: SerialNumberService) {}

  async ngOnInit() {
    await this.loadSerialNumbers();
  }

  async loadSerialNumbers() {
    try {
      this.serialNumbers = await this.serialNumberService.getAll();
    } catch {
      this.serialNumbers = [];
    }
  }
}
