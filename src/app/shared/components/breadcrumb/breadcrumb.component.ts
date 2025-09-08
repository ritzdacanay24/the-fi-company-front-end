import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: string;
  active?: boolean;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li 
          *ngFor="let item of items; let last = last" 
          class="breadcrumb-item"
          [class.active]="last || item.active">
          <a *ngIf="item.link && !last && !item.active" [routerLink]="item.link">
            {{ item.label }}
          </a>
          <span *ngIf="!item.link || last || item.active">
            {{ item.label }}
          </span>
        </li>
      </ol>
    </nav>
  `
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}
