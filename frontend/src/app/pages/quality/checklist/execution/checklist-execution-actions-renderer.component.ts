import { ICellRendererComp, ICellRendererParams } from 'ag-grid-community';
import { ChecklistInstance } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';

export interface ChecklistExecutionActionsCellParams extends ICellRendererParams<ChecklistInstance> {
  canUndoSubmitted: (instance: ChecklistInstance) => boolean;
  canDelete: (instance: ChecklistInstance) => boolean;
  onEdit: (instance: ChecklistInstance) => void;
  onViewFinalPdf: (instanceId: number) => void;
  onUndoSubmitted: (instance: ChecklistInstance) => void;
  onTransferOwnership: (instanceId: number) => void;
  onArchive: (instanceId: number) => void;
  onDelete: (instanceId: number) => void;
}

export class ChecklistExecutionActionsRendererComponent implements ICellRendererComp {
  private eGui!: HTMLDivElement;
  private eButton!: HTMLButtonElement;
  private popupMenu?: HTMLDivElement;
  private isOpen = false;
  private params!: ChecklistExecutionActionsCellParams;
  private outsideClickHandler?: (event: MouseEvent) => void;
  private escapeHandler?: (event: KeyboardEvent) => void;
  private viewportHandler?: () => void;

  init(params: ChecklistExecutionActionsCellParams): void {
    this.params = params;

    this.eGui = document.createElement('div');
    this.eGui.style.cssText = [
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'position:relative',
      'width:100%',
      'height:100%'
    ].join(';');

    this.eButton = document.createElement('button');
    this.eButton.type = 'button';
    this.eButton.className = 'btn btn-sm btn-outline-secondary d-flex align-items-center';
    this.eButton.style.cssText = [
      'height:28px',
      'padding:3px 8px',
      'font-size:12px',
      'line-height:1',
      'border-radius:4px',
      'gap:4px'
    ].join(';');
    this.eButton.innerHTML = '<i class="mdi mdi-chevron-down me-1" style="font-size:14px;"></i>Actions';
    this.eButton.addEventListener('click', this.onToggleMenu);

    this.eGui.appendChild(this.eButton);
  }

  refresh(params: ChecklistExecutionActionsCellParams): boolean {
    this.params = params;
    this.closeMenu();
    return true;
  }

  getGui(): HTMLElement {
    return this.eGui;
  }

  destroy(): void {
    if (this.eButton) {
      this.eButton.removeEventListener('click', this.onToggleMenu);
    }
    this.closeMenu();
  }

  private get instance(): ChecklistInstance | null {
    return this.params?.data || null;
  }

  private get instanceId(): number {
    return Number(this.instance?.id || 0);
  }

  private get canViewFinalPdf(): boolean {
    return String(this.instance?.status || '').trim().toLowerCase() === 'submitted';
  }

  private get canUndoSubmit(): boolean {
    return !!this.instance && !!this.params?.canUndoSubmitted?.(this.instance);
  }

  private get canDelete(): boolean {
    return !!this.instance && !!this.params?.canDelete?.(this.instance);
  }

  private buildMenuItems(container: HTMLDivElement): void {
    container.innerHTML = '';

    if (this.canViewFinalPdf) {
      container.appendChild(this.createMenuButton('View Final PDF', 'mdi mdi-file-pdf-box', 'text-primary', () => {
        if (this.instanceId > 0) {
          this.params.onViewFinalPdf(this.instanceId);
        }
      }));
    }

    if (this.canUndoSubmit && this.instance) {
      container.appendChild(this.createMenuButton('Undo Submit', 'mdi mdi-undo', 'text-warning', () => {
        this.params.onUndoSubmitted(this.instance!);
      }));
    }

    if (this.instance) {
      container.appendChild(this.createMenuButton('Edit', 'mdi mdi-pencil-outline', 'text-primary', () => {
        this.params.onEdit(this.instance!);
      }));
    }

    container.appendChild(this.createMenuButton('Archive', 'mdi mdi-archive-outline', 'text-warning', () => {
      if (this.instanceId > 0) {
        this.params.onArchive(this.instanceId);
      }
    }));

    container.appendChild(this.createMenuButton('Transfer Ownership', 'mdi mdi-account-switch', 'text-primary', () => {
      if (this.instanceId > 0) {
        this.params.onTransferOwnership(this.instanceId);
      }
    }));

    if (this.canDelete) {
      container.appendChild(this.createMenuButton('Delete', 'mdi mdi-trash-can-outline', 'text-danger', () => {
        if (this.instanceId > 0) {
          this.params.onDelete(this.instanceId);
        }
      }));
    }
  }

  private createMenuButton(label: string, icon: string, textClass: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `dropdown-item d-flex align-items-center gap-2 ${textClass}`;
    button.style.cssText = [
      'padding:6px 12px',
      'font-size:12px',
      'background:none',
      'border:none',
      'width:100%',
      'text-align:left'
    ].join(';');
    button.innerHTML = `<i class="${icon}"></i><span>${label}</span>`;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
      this.closeMenu();
    });
    return button;
  }

  private onToggleMenu = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();

    if (this.isOpen) {
      this.closeMenu();
      return;
    }

    this.openBodyPopup();
  };

  private openBodyPopup(): void {
    this.closeMenu();

    const rect = this.eButton.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'dropdown-menu show shadow-sm';
    popup.style.cssText = [
      'position:fixed',
      'min-width:190px',
      'max-height:calc(100vh - 16px)',
      'overflow-y:auto',
      'z-index:3000',
      'display:block',
      'margin:0',
      'padding:0.25rem 0',
      'background-color:#fff',
      'border:1px solid rgba(0,0,0,0.15)',
      'border-radius:0.25rem',
      'box-shadow:0 0.5rem 1rem rgba(0,0,0,0.15)',
      'top:0',
      'left:0',
      'visibility:hidden'
    ].join(';');

    this.buildMenuItems(popup);
    document.body.appendChild(popup);

    const viewportPadding = 8;
    const popupHeight = popup.offsetHeight || 0;
    const popupWidth = popup.offsetWidth || 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUp = spaceBelow < popupHeight && spaceAbove > spaceBelow;

    const top = shouldOpenUp
      ? Math.max(viewportPadding, rect.top - popupHeight - 2)
      : Math.min(window.innerHeight - popupHeight - viewportPadding, rect.bottom + 2);

    const left = Math.min(
      Math.max(viewportPadding, rect.right - popupWidth),
      window.innerWidth - popupWidth - viewportPadding,
    );

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
    popup.style.visibility = 'visible';

    this.popupMenu = popup;
    this.isOpen = true;

    this.outsideClickHandler = (mouseEvent: MouseEvent) => {
      const targetNode = mouseEvent.target as Node;
      const clickedButton = this.eButton.contains(targetNode);
      const clickedPopup = !!this.popupMenu && this.popupMenu.contains(targetNode);
      if (!clickedButton && !clickedPopup) {
        this.closeMenu();
      }
    };

    this.escapeHandler = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        this.closeMenu();
      }
    };

    this.viewportHandler = () => {
      this.closeMenu();
    };

    setTimeout(() => {
      if (!this.isOpen) {
        return;
      }
      document.addEventListener('click', this.outsideClickHandler!, true);
      document.addEventListener('keydown', this.escapeHandler!, true);
      window.addEventListener('scroll', this.viewportHandler!, true);
      window.addEventListener('resize', this.viewportHandler!, true);
    }, 0);
  }

  private closeMenu(): void {
    if (this.popupMenu && this.popupMenu.parentElement) {
      this.popupMenu.parentElement.removeChild(this.popupMenu);
    }

    this.popupMenu = undefined;
    this.isOpen = false;

    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler, true);
      this.outsideClickHandler = undefined;
    }

    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler, true);
      this.escapeHandler = undefined;
    }

    if (this.viewportHandler) {
      window.removeEventListener('scroll', this.viewportHandler, true);
      window.removeEventListener('resize', this.viewportHandler, true);
      this.viewportHandler = undefined;
    }
  }
}