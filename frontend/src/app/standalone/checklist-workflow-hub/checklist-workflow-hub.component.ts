import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-checklist-workflow-hub',
  imports: [CommonModule, RouterModule],
  templateUrl: './checklist-workflow-hub.component.html',
  styleUrls: ['./checklist-workflow-hub.component.scss']
})
export class ChecklistWorkflowHubComponent {
  readonly sections = [
    {
      title: 'Execution List',
      description: 'Table-style list view for search, filters, and inspection selection.',
      link: '/inspection-checklist/execution',
      icon: 'mdi-format-list-bulleted',
      button: 'Open List',
      tone: 'secondary'
    },
    {
      title: 'Start Inspection',
      description: 'Select an active checklist to begin your inspection.',
      link: '/inspection-checklist/management',
      icon: 'mdi-clipboard-edit-outline',
      button: 'Start Inspection',
      tone: 'success'
    },
    {
      title: 'Template Manager',
      description: 'Maintain published templates and start revisions for controlled updates.',
      link: '/inspection-checklist/template-manager',
      icon: 'mdi-file-tree-outline',
      button: 'Open Templates',
      tone: 'info'
    },
    {
      title: 'Template Editor',
      description: 'Create or edit checklist templates directly in standalone mode.',
      link: '/inspection-checklist/template-editor',
      icon: 'mdi-file-document-edit-outline',
      button: 'Open Editor',
      tone: 'warning'
    },
    {
      title: 'Audit View',
      description: 'Review checklist audit trail and quality evidence history.',
      link: '/inspection-checklist/audit',
      icon: 'mdi-clipboard-search-outline',
      button: 'Open Audit',
      tone: 'dark'
    }
  ];
}
