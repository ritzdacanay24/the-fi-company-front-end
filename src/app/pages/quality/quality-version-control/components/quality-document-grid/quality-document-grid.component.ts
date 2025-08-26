import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { 
  ColDef, 
  GridApi, 
  GridReadyEvent, 
  SelectionChangedEvent,
  RowClickedEvent
} from 'ag-grid-community';
import { QualityDocument } from '@app/core/api/quality-version-control/quality-version-control.service';

@Component({
  selector: 'app-quality-document-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular],
  templateUrl: './quality-document-grid.component.html',
  styleUrls: ['./quality-document-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QualityDocumentGridComponent implements OnInit {
  @Input() documents: QualityDocument[] = [];
  @Input() loading = false;
  @Input() selectedDocument: QualityDocument | null = null;
  
  @Output() documentSelected = new EventEmitter<QualityDocument>();
  @Output() documentAction = new EventEmitter<{action: string, document: QualityDocument}>();
  @Output() quickFilterChanged = new EventEmitter<string>();

  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;
  
  private gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 100
  };
  rowSelection: 'single' | 'multiple' = 'single';
  pagination = true;
  paginationPageSize = 25;
  paginationPageSizeSelector = [10, 25, 50, 100];

  // Document type mapping for display
  private documentTypes = [
    { 
      value: 'FRM', 
      label: 'Form', 
      description: 'Quality forms and checklists (e.g., photo checklists, inspection forms)',
      contentType: 'Interactive forms with fields, checkboxes, photo requirements',
      versionControlled: true,
      exampleContent: 'Dynamic form schema stored in template_data with configurable fields, validation rules, and photo requirements'
    },
    { 
      value: 'SOP', 
      label: 'Standard Operating Procedure', 
      description: 'Step-by-step procedures and work instructions',
      contentType: 'Text documents, PDFs, procedural guidelines',
      versionControlled: true,
      exampleContent: 'Structured documents with sections, steps, attachments, and approval workflows'
    },
    { 
      value: 'CHK', 
      label: 'Checklist', 
      description: 'Quality checklists and inspection templates',
      contentType: 'Structured checklists with validation rules and photo requirements',
      versionControlled: true,
      exampleContent: 'Configurable checklist items with validation rules, photo requirements, and completion tracking'
    },
    { 
      value: 'INS', 
      label: 'Instruction', 
      description: 'Work instructions and operational guidelines',
      contentType: 'Instructional documents, diagrams, reference materials',
      versionControlled: true,
      exampleContent: 'Formatted instructions with embedded media, step sequences, and reference materials'
    },
    { 
      value: 'QCP', 
      label: 'Quality Control Plan', 
      description: 'Quality control procedures and testing protocols',
      contentType: 'Testing procedures, quality metrics, acceptance criteria',
      versionControlled: true,
      exampleContent: 'Test procedures with parameters, acceptance criteria, measurement protocols, and reporting templates'
    },
    { 
      value: 'WI', 
      label: 'Work Instruction', 
      description: 'Detailed work instructions with visual aids',
      contentType: 'Step-by-step instructions, photos, videos, diagrams',
      versionControlled: true,
      exampleContent: 'Interactive instructions with multimedia content, safety warnings, and completion validation'
    },
    {
      value: 'QIR',
      label: 'Quality Incident Report Form',
      description: 'Dynamic incident reporting forms with configurable fields',
      contentType: 'Form schema with field definitions, validation rules, and workflow configuration',
      versionControlled: true,
      exampleContent: 'Form schema defining field types, validation rules, conditional logic, and approval workflows',
      migrationNeeded: true // Flag to indicate this needs migration from hardcoded form
    }
  ];

  ngOnInit(): void {
    this.setupGridColumns();
  }

  private setupGridColumns(): void {
    this.columnDefs = [
      {
        field: 'document_number',
        headerName: 'Document Number',
        width: 180,
        pinned: 'left',
        cellRenderer: (params: any) => {
          const versionString = this.formatVersionString(params.data.document_number, params.data.current_revision);
          return `<strong>${versionString}</strong>`;
        }
      },
      {
        field: 'title',
        headerName: 'Title',
        width: 300,
        cellRenderer: (params: any) => {
          return `<div class="text-truncate" title="${params.value}">${params.value}</div>`;
        }
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        cellRenderer: (params: any) => {
          const badgeClass = this.getStatusBadgeClass(params.value);
          return `<span class="badge ${badgeClass}">${params.value?.replace('_', ' ') || 'Unknown'}</span>`;
        }
      },
      {
        field: 'department',
        headerName: 'Department',
        width: 130
      },
      {
        field: 'prefix',
        headerName: 'Type',
        width: 100,
        valueGetter: (params: any) => this.getDocumentTypeFromPrefix(params.data.prefix),
        cellRenderer: (params: any) => {
          const type = this.getDocumentTypeFromPrefix(params.data.prefix);
          const typeInfo = this.documentTypes.find(dt => dt.value === type);
          return `<span class="badge bg-info" title="${typeInfo?.description || type}">${type}</span>`;
        }
      },
      {
        field: 'current_revision',
        headerName: 'Rev',
        width: 80,
        cellRenderer: (params: any) => `<span class="badge bg-secondary">Rev ${params.value}</span>`
      },
      {
        field: 'created_at',
        headerName: 'Created',
        width: 130,
        valueFormatter: (params: any) => new Date(params.value).toLocaleDateString()
      },
      {
        field: 'updated_at',
        headerName: 'Updated',
        width: 130,
        valueFormatter: (params: any) => new Date(params.value).toLocaleDateString()
      },
      {
        headerName: 'Actions',
        width: 150,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const doc = params.data;
          return `
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-primary btn-sm" 
                      data-action="view" 
                      title="View document details and revisions">
                <i class="mdi mdi-eye"></i>
              </button>
              <button class="btn btn-outline-secondary btn-sm" 
                      data-action="revisions" 
                      title="View revision history (${doc.current_revision || 0} revisions)">
                <i class="mdi mdi-history"></i>
              </button>
              <button class="btn btn-outline-success btn-sm" 
                      data-action="export" 
                      title="Export document as PDF">
                <i class="mdi mdi-download"></i>
              </button>
            </div>
          `;
        },
        cellClass: 'ag-cell-actions'
      }
    ];
  }

  // AG-Grid Event Handlers
  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
    this.updateGridData();
  }

  onRowClicked(event: RowClickedEvent): void {
    // Handle action button clicks
    const target = event.event?.target as HTMLElement;
    if (target?.tagName === 'BUTTON' || target?.tagName === 'I') {
      const button = target.tagName === 'I' ? target.parentElement : target;
      const action = button?.getAttribute('data-action');
      
      if (action && event.data) {
        this.documentAction.emit({ action, document: event.data });
      }
      return;
    }
    
    // Regular row selection
    this.onSelectDocument(event.data);
  }

  onSelectionChanged(event: SelectionChangedEvent): void {
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length > 0) {
      this.documentSelected.emit(selectedRows[0]);
    }
  }

  onSelectDocument(document: QualityDocument): void {
    this.documentSelected.emit(document);
  }

  // Quick filter for AG-Grid global search
  onQuickFilterChanged(event: any): void {
    const filterText = event.target.value;
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', filterText);
    }
    this.quickFilterChanged.emit(filterText);
  }

  // Clear all filters
  clearFilters(): void {
    if (this.gridApi) {
      this.gridApi.setFilterModel(null);
      this.gridApi.setGridOption('quickFilterText', '');
    }
    
    // Clear the quick search input field
    const quickSearchInput = document.querySelector('input[placeholder="Quick search in grid..."]') as HTMLInputElement;
    if (quickSearchInput) {
      quickSearchInput.value = '';
    }
  }

  private updateGridData(): void {
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.documents);
      this.gridApi.sizeColumnsToFit();
    }
  }

  // Track by function for performance
  trackByDocumentId(index: number, doc: QualityDocument): any {
    return doc.id;
  }

  // Helper methods
  private getDocumentTypeFromPrefix(prefix: string): string {
    if (!prefix) return 'DOC';
    return prefix.split('-').pop() || 'DOC';
  }

  private getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'draft': 'bg-secondary',
      'pending_approval': 'bg-warning',
      'approved': 'bg-success',
      'superseded': 'bg-info',
      'obsolete': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
  }

  private formatVersionString(documentNumber: string, revisionNumber: number): string {
    return `${documentNumber}, rev${revisionNumber}`;
  }
}
