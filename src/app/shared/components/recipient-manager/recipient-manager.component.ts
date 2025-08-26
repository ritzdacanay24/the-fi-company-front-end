import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';

interface Recipient {
  id: string;
  name: string;
  email: string;
  department?: string;
  notes?: string;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-recipient-manager',
  template: `
    <div class="modal-header">
      <h4 class="modal-title" id="modal-title">
        <i class="mdi mdi-email-multiple me-2"></i>
        Manage Email Recipients
      </h4>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>

    <div class="modal-body">
      <!-- Add New Recipient Form -->
      <div class="card mb-4">
        <div class="card-header bg-primary text-white">
          <h6 class="mb-0">
            <i class="mdi mdi-plus me-2"></i>
            {{editingRecipient ? 'Edit Recipient' : 'Add New Recipient'}}
          </h6>
        </div>
        <div class="card-body">
          <form [formGroup]="recipientForm" (ngSubmit)="onSubmitRecipient()">
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label required">Full Name</label>
                <input type="text" class="form-control" formControlName="name" 
                       placeholder="Enter full name">
                <div class="invalid-feedback" *ngIf="recipientForm.get('name')?.invalid && recipientForm.get('name')?.touched">
                  Name is required
                </div>
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label required">Email Address</label>
                <input type="email" class="form-control" formControlName="email" 
                       placeholder="Enter email address">
                <div class="invalid-feedback" *ngIf="recipientForm.get('email')?.invalid && recipientForm.get('email')?.touched">
                  Valid email is required
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">Department</label>
                <input type="text" class="form-control" formControlName="department" 
                       placeholder="Enter department (optional)">
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">Notes</label>
                <input type="text" class="form-control" formControlName="notes" 
                       placeholder="Add notes (optional)">
              </div>
            </div>
            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-outline-secondary" 
                      (click)="resetForm()" *ngIf="editingRecipient">
                Cancel Edit
              </button>
              <button type="submit" class="btn btn-primary" 
                      [disabled]="recipientForm.invalid">
                <i class="mdi mdi-check me-1"></i>
                {{editingRecipient ? 'Update' : 'Add'}} Recipient
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Search and Filter -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="row">
            <div class="col-md-8">
              <div class="input-group">
                <span class="input-group-text">
                  <i class="mdi mdi-magnify"></i>
                </span>
                <input type="text" class="form-control" placeholder="Search recipients..." 
                       [(ngModel)]="searchTerm" (input)="filterRecipients()">
              </div>
            </div>
            <div class="col-md-4">
              <select class="form-select" [(ngModel)]="sortBy" (change)="sortRecipients()">
                <option value="name">Sort by Name</option>
                <option value="email">Sort by Email</option>
                <option value="lastUsed">Sort by Last Used</option>
                <option value="useCount">Sort by Use Count</option>
                <option value="createdAt">Sort by Date Added</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Recipients List -->
      <div class="card">
        <div class="card-header bg-light">
          <div class="d-flex justify-content-between align-items-center">
            <h6 class="mb-0">
              <i class="mdi mdi-account-multiple me-2"></i>
              Saved Recipients ({{filteredRecipients.length}})
            </h6>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" (click)="selectAll()">
                <i class="mdi mdi-select-all me-1"></i>Select All
              </button>
              <button class="btn btn-outline-danger" (click)="deleteSelected()" 
                      [disabled]="selectedRecipients.length === 0">
                <i class="mdi mdi-delete me-1"></i>Delete Selected
              </button>
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th width="40">
                    <input type="checkbox" class="form-check-input" 
                           [checked]="isAllSelected()" 
                           (change)="toggleSelectAll()">
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Used</th>
                  <th>Last Used</th>
                  <th width="120">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let recipient of filteredRecipients; trackBy: trackByRecipient">
                  <td>
                    <input type="checkbox" class="form-check-input" 
                           [checked]="isSelected(recipient.id)" 
                           (change)="toggleSelect(recipient.id)">
                  </td>
                  <td>
                    <div class="fw-medium">{{recipient.name}}</div>
                    <small class="text-muted" *ngIf="recipient.notes">{{recipient.notes}}</small>
                  </td>
                  <td>
                    <a [href]="'mailto:' + recipient.email" class="text-decoration-none">
                      {{recipient.email}}
                    </a>
                  </td>
                  <td>
                    <span class="badge bg-secondary" *ngIf="recipient.department">
                      {{recipient.department}}
                    </span>
                  </td>
                  <td>
                    <span class="badge bg-info">{{recipient.useCount}}</span>
                  </td>
                  <td>
                    <small class="text-muted">
                      {{recipient.lastUsed ? (recipient.lastUsed | date:'short') : 'Never'}}
                    </small>
                  </td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" 
                              (click)="editRecipient(recipient)" 
                              title="Edit">
                        <i class="mdi mdi-pencil"></i>
                      </button>
                      <button class="btn btn-outline-success" 
                              (click)="addToForm(recipient)" 
                              title="Add to Form">
                        <i class="mdi mdi-plus"></i>
                      </button>
                      <button class="btn btn-outline-danger" 
                              (click)="deleteRecipient(recipient.id)" 
                              title="Delete">
                        <i class="mdi mdi-delete"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredRecipients.length === 0">
                  <td colspan="7" class="text-center py-4">
                    <div class="text-muted">
                      <i class="mdi mdi-email-off display-6 d-block mb-2"></i>
                      {{recipients.length === 0 ? 'No recipients saved yet' : 'No recipients match your search'}}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Import/Export Options -->
      <div class="card mt-4">
        <div class="card-header bg-secondary text-white">
          <h6 class="mb-0">
            <i class="mdi mdi-import me-2"></i>
            Import/Export Recipients
          </h6>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <label class="form-label">Import from CSV</label>
              <input type="file" class="form-control" accept=".csv" 
                     (change)="onFileImport($event)" #fileInput>
              <small class="text-muted">
                CSV format: Name, Email, Department, Notes
              </small>
            </div>
            <div class="col-md-6 d-flex align-items-end">
              <button class="btn btn-outline-primary me-2" (click)="exportToCSV()">
                <i class="mdi mdi-download me-1"></i>Export to CSV
              </button>
              <button class="btn btn-outline-warning" (click)="clearAllData()" 
                      [disabled]="recipients.length === 0">
                <i class="mdi mdi-delete-sweep me-1"></i>Clear All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <div class="d-flex justify-content-between w-100">
        <div class="text-muted">
          <small>
            <i class="mdi mdi-information me-1"></i>
            Data is stored locally in your browser
          </small>
        </div>
        <div>
          <button type="button" class="btn btn-secondary" (click)="activeModal.dismiss()">
            Close
          </button>
          <button type="button" class="btn btn-primary ms-2" 
                  (click)="saveAndClose()" 
                  [disabled]="selectedRecipients.length === 0">
            <i class="mdi mdi-check me-1"></i>
            Add Selected ({{selectedRecipients.length}})
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .table-responsive {
      max-height: 400px;
      overflow-y: auto;
    }
    
    .modal-dialog {
      max-width: 1000px;
    }
    
    .btn-group-sm .btn {
      padding: 0.25rem 0.5rem;
    }
  `]
})
export class RecipientManagerComponent implements OnInit {
  recipientForm: FormGroup;
  recipients: Recipient[] = [];
  filteredRecipients: Recipient[] = [];
  selectedRecipients: string[] = [];
  editingRecipient: Recipient | null = null;
  searchTerm = '';
  sortBy = 'name';

  private readonly STORAGE_KEY = 'eyefi_recipients';

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder
  ) {
    this.recipientForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      department: [''],
      notes: ['']
    });
  }

  ngOnInit() {
    this.loadRecipients();
    this.filterRecipients();
  }

  loadRecipients() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.recipients = JSON.parse(stored).map(r => ({
          ...r,
          createdAt: new Date(r.createdAt),
          lastUsed: r.lastUsed ? new Date(r.lastUsed) : undefined
        }));
      }
    } catch (error) {
      console.error('Error loading recipients:', error);
      this.recipients = [];
    }
  }

  saveRecipients() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.recipients));
    } catch (error) {
      console.error('Error saving recipients:', error);
    }
  }

  onSubmitRecipient() {
    if (this.recipientForm.valid) {
      const formValue = this.recipientForm.value;
      
      if (this.editingRecipient) {
        // Update existing recipient
        const index = this.recipients.findIndex(r => r.id === this.editingRecipient!.id);
        if (index !== -1) {
          this.recipients[index] = {
            ...this.recipients[index],
            ...formValue
          };
        }
      } else {
        // Add new recipient
        const newRecipient: Recipient = {
          id: this.generateId(),
          ...formValue,
          createdAt: new Date(),
          useCount: 0
        };
        this.recipients.push(newRecipient);
      }
      
      this.saveRecipients();
      this.filterRecipients();
      this.resetForm();
    }
  }

  editRecipient(recipient: Recipient) {
    this.editingRecipient = recipient;
    this.recipientForm.patchValue({
      name: recipient.name,
      email: recipient.email,
      department: recipient.department || '',
      notes: recipient.notes || ''
    });
  }

  deleteRecipient(id: string) {
    if (confirm('Are you sure you want to delete this recipient?')) {
      this.recipients = this.recipients.filter(r => r.id !== id);
      this.selectedRecipients = this.selectedRecipients.filter(sid => sid !== id);
      this.saveRecipients();
      this.filterRecipients();
    }
  }

  deleteSelected() {
    if (this.selectedRecipients.length > 0 && 
        confirm(`Delete ${this.selectedRecipients.length} selected recipients?`)) {
      this.recipients = this.recipients.filter(r => !this.selectedRecipients.includes(r.id));
      this.selectedRecipients = [];
      this.saveRecipients();
      this.filterRecipients();
    }
  }

  resetForm() {
    this.recipientForm.reset();
    this.editingRecipient = null;
  }

  filterRecipients() {
    let filtered = [...this.recipients];
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        (r.department && r.department.toLowerCase().includes(term)) ||
        (r.notes && r.notes.toLowerCase().includes(term))
      );
    }
    
    this.filteredRecipients = filtered;
    this.sortRecipients();
  }

  sortRecipients() {
    this.filteredRecipients.sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'email':
          return a.email.localeCompare(b.email);
        case 'lastUsed':
          const aDate = a.lastUsed || new Date(0);
          const bDate = b.lastUsed || new Date(0);
          return bDate.getTime() - aDate.getTime();
        case 'useCount':
          return b.useCount - a.useCount;
        case 'createdAt':
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return 0;
      }
    });
  }

  toggleSelect(id: string) {
    const index = this.selectedRecipients.indexOf(id);
    if (index > -1) {
      this.selectedRecipients.splice(index, 1);
    } else {
      this.selectedRecipients.push(id);
    }
  }

  isSelected(id: string): boolean {
    return this.selectedRecipients.includes(id);
  }

  selectAll() {
    this.selectedRecipients = [...this.filteredRecipients.map(r => r.id)];
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectedRecipients = [];
    } else {
      this.selectAll();
    }
  }

  isAllSelected(): boolean {
    return this.filteredRecipients.length > 0 && 
           this.selectedRecipients.length === this.filteredRecipients.length;
  }

  addToForm(recipient: Recipient) {
    // Update use count and last used
    recipient.useCount++;
    recipient.lastUsed = new Date();
    this.saveRecipients();
    
    // Add to selection if not already selected
    if (!this.isSelected(recipient.id)) {
      this.selectedRecipients.push(recipient.id);
    }
  }

  trackByRecipient(index: number, recipient: Recipient): string {
    return recipient.id;
  }

  saveAndClose() {
    const selectedData = this.recipients.filter(r => 
      this.selectedRecipients.includes(r.id)
    );
    this.activeModal.close(selectedData);
  }

  exportToCSV() {
    const csvContent = [
      'Name,Email,Department,Notes,Created,Last Used,Use Count',
      ...this.recipients.map(r => 
        `"${r.name}","${r.email}","${r.department || ''}","${r.notes || ''}","${r.createdAt.toLocaleDateString()}","${r.lastUsed?.toLocaleDateString() || ''}","${r.useCount}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recipients_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  onFileImport(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          this.parseCSV(csv);
        } catch (error) {
          alert('Error reading file. Please check the format.');
        }
      };
      reader.readAsText(file);
    }
  }

  parseCSV(csv: string) {
    const lines = csv.split('\n');
    const importedCount = { added: 0, updated: 0 };
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const [name, email, department, notes] = line.split(',').map(field => 
          field.replace(/^"/, '').replace(/"$/, '').trim()
        );
        
        if (name && email) {
          const existingIndex = this.recipients.findIndex(r => 
            r.email.toLowerCase() === email.toLowerCase()
          );
          
          if (existingIndex > -1) {
            // Update existing
            this.recipients[existingIndex] = {
              ...this.recipients[existingIndex],
              name,
              department: department || undefined,
              notes: notes || undefined
            };
            importedCount.updated++;
          } else {
            // Add new
            const newRecipient: Recipient = {
              id: this.generateId(),
              name,
              email,
              department: department || undefined,
              notes: notes || undefined,
              createdAt: new Date(),
              useCount: 0
            };
            this.recipients.push(newRecipient);
            importedCount.added++;
          }
        }
      }
    }
    
    this.saveRecipients();
    this.filterRecipients();
    alert(`Import complete! Added: ${importedCount.added}, Updated: ${importedCount.updated}`);
  }

  clearAllData() {
    if (confirm('This will delete all saved recipients. Are you sure?')) {
      this.recipients = [];
      this.filteredRecipients = [];
      this.selectedRecipients = [];
      this.saveRecipients();
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
