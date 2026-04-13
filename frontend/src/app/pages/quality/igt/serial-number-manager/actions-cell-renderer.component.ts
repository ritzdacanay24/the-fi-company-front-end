import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

export interface ActionsCellRendererParams extends ICellRendererParams {
  onEdit: (data: any) => void;
  onSoftDelete: (id: string) => void;
  onHardDelete: (id: string) => void;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="btn-group btn-group-sm" role="group" #buttonGroup>
      <button 
        class="btn btn-outline-primary" 
        title="Edit Serial Number"
        (click)="onEditClick($event)">
        <i class="mdi mdi-pencil"></i>
      </button>
      <div class="btn-group btn-group-sm dropdown" role="group">
        <button 
          class="btn btn-outline-danger dropdown-toggle dropdown-toggle-split" 
          title="Delete Options"
          type="button"
          [attr.aria-expanded]="isDropdownOpen"
          (click)="toggleDropdown($event)"
          #toggleButton>
          <i class="mdi mdi-delete"></i>
          <span class="visually-hidden">Toggle Dropdown</span>
        </button>
        <!-- Simple dropdown menu inside the button group -->
        <ul class="dropdown-menu dropdown-menu-end" [class.show]="isDropdownOpen" #dropdownMenu>
          <li><h6 class="dropdown-header">Delete Options</h6></li>
          <li>
            <button 
              class="dropdown-item" 
              type="button"
              (click)="onSoftDeleteClick($event)">
              <i class="mdi mdi-delete-sweep me-2 text-warning"></i>
              Soft Delete
              <small class="d-block text-muted">Mark as inactive</small>
            </button>
          </li>
          <li><hr class="dropdown-divider"></li>
          <li>
            <button 
              class="dropdown-item text-danger" 
              type="button"
              (click)="onHardDeleteClick($event)">
              <i class="mdi mdi-delete-forever me-2"></i>
              Permanent Delete
              <small class="d-block text-muted">⚠️ Cannot be undone!</small>
            </button>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-group {
      position: relative;
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      z-index: 9999 !important;
      min-width: 200px;
      border: 1px solid rgba(0,0,0,.15);
      border-radius: 0.375rem;
      background-color: #fff;
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
      padding: 0.5rem 0;
    }

    .dropdown-menu.show {
      display: block;
    }

    .dropdown-item {
      display: block;
      width: 100%;
      padding: 0.5rem 1rem;
      clear: both;
      font-weight: 400;
      color: #212529;
      text-align: inherit;
      text-decoration: none;
      white-space: nowrap;
      background-color: transparent;
      border: 0;
      cursor: pointer;
    }

    .dropdown-item:hover,
    .dropdown-item:focus {
      background-color: #e9ecef;
    }

    .dropdown-header {
      display: block;
      padding: 0.5rem 1rem;
      margin-bottom: 0;
      font-size: 0.875rem;
      color: #6c757d;
      white-space: nowrap;
      font-weight: 600;
    }

    .dropdown-divider {
      height: 0;
      margin: 0.5rem 0;
      overflow: hidden;
      border-top: 1px solid rgba(0,0,0,.15);
    }

    .text-danger {
      color: #dc3545 !important;
    }

    .text-warning {
      color: #ffc107 !important;
    }

    .text-muted {
      color: #6c757d !important;
      font-size: 0.75rem;
    }

    small {
      font-size: 0.75rem;
    }
  `]
})
export class ActionsCellRendererComponent implements ICellRendererAngularComp, OnInit, OnDestroy {
  @ViewChild('toggleButton', { static: false }) toggleButton!: ElementRef;
  @ViewChild('buttonGroup', { static: false }) buttonGroup!: ElementRef;
  @ViewChild('dropdownMenu', { static: false }) dropdownMenu!: ElementRef;

  public params!: ActionsCellRendererParams;
  public isDropdownOpen = false;

  private clickListener: (event: Event) => void;
  private closeOtherDropdownsListener: (event: CustomEvent) => void;

  agInit(params: ActionsCellRendererParams): void {
    this.params = params;
  }

  refresh(): boolean {
    return false;
  }

  onEditClick(event: Event): void {
    event.stopPropagation();
    this.closeDropdown();
    if (this.params.onEdit) {
      this.params.onEdit(this.params.data);
    }
  }

  onSoftDeleteClick(event: Event): void {
    event.stopPropagation();
    this.closeDropdown();
    if (this.params.onSoftDelete && this.params.data?.id) {
      this.params.onSoftDelete(this.params.data.id);
    }
  }

  onHardDeleteClick(event: Event): void {
    event.stopPropagation();
    this.closeDropdown();
    if (this.params.onHardDelete && this.params.data?.id) {
      this.params.onHardDelete(this.params.data.id);
    }
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    
    console.log('Toggle dropdown clicked, current state:', this.isDropdownOpen);
    
    this.isDropdownOpen = !this.isDropdownOpen;
    
    // Close other dropdowns when this one opens
    if (this.isDropdownOpen) {
      window.dispatchEvent(new CustomEvent('closeOtherDropdowns', { 
        detail: { exclude: this } 
      }));

      // Append dropdown to body to escape AG-Grid clipping
      setTimeout(() => {
        if (this.dropdownMenu && this.toggleButton) {
          const dropdownElement = this.dropdownMenu.nativeElement;
          const buttonRect = this.toggleButton.nativeElement.getBoundingClientRect();
          
          // Clone the dropdown and append to body
          const clonedDropdown = dropdownElement.cloneNode(true) as HTMLElement;
          clonedDropdown.style.position = 'fixed';
          clonedDropdown.style.top = (buttonRect.bottom + 2) + 'px';
          clonedDropdown.style.left = (buttonRect.right - 200) + 'px';
          clonedDropdown.style.zIndex = '9999';
          clonedDropdown.classList.add('dropdown-portal');
          
          // Add click handlers to cloned buttons
          const softDeleteBtn = clonedDropdown.querySelector('.dropdown-item:not(.text-danger)') as HTMLElement;
          const hardDeleteBtn = clonedDropdown.querySelector('.dropdown-item.text-danger') as HTMLElement;
          
          if (softDeleteBtn) {
            softDeleteBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.onSoftDeleteClick(e);
              this.cleanupPortalDropdown();
            });
          }
          
          if (hardDeleteBtn) {
            hardDeleteBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.onHardDeleteClick(e);
              this.cleanupPortalDropdown();
            });
          }
          
          document.body.appendChild(clonedDropdown);
          
          // Hide the original dropdown
          dropdownElement.style.display = 'none';
        }
      }, 0);
    } else {
      this.cleanupPortalDropdown();
    }
  }

  private cleanupPortalDropdown(): void {
    const portalDropdowns = document.querySelectorAll('.dropdown-portal');
    portalDropdowns.forEach(dropdown => dropdown.remove());
    
    // Show the original dropdown again
    if (this.dropdownMenu) {
      this.dropdownMenu.nativeElement.style.display = '';
    }
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
    this.cleanupPortalDropdown();
  }

  ngOnInit(): void {
    // Create bound event listeners
    this.closeOtherDropdownsListener = (event: CustomEvent) => {
      if (event.detail?.exclude !== this) {
        this.closeDropdown();
      }
    };

    this.clickListener = (event: Event) => {
      const target = event.target as HTMLElement;
      // Check if click is outside this specific dropdown instance and any portal dropdowns
      const isClickOnThisToggle = this.toggleButton && this.toggleButton.nativeElement.contains(target);
      const isClickOnThisDropdown = target.closest('.dropdown-menu');
      const isClickOnPortalDropdown = target.closest('.dropdown-portal');
      const isClickOnThisButtonGroup = this.buttonGroup && this.buttonGroup.nativeElement.contains(target);
      
      // Only close if clicking completely outside this component
      if (!isClickOnThisToggle && !isClickOnThisDropdown && !isClickOnPortalDropdown && !isClickOnThisButtonGroup) {
        this.closeDropdown();
      }
    };

    // Add event listeners
    window.addEventListener('closeOtherDropdowns', this.closeOtherDropdownsListener);
    document.addEventListener('click', this.clickListener);
  }

  ngOnDestroy(): void {
    // Clean up dropdown from body if still there
    this.closeDropdown();
    
    // Remove event listeners
    if (this.closeOtherDropdownsListener) {
      window.removeEventListener('closeOtherDropdowns', this.closeOtherDropdownsListener);
    }
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
    }
  }
}
