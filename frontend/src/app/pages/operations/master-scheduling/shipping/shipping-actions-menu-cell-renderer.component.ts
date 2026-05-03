import { ICellRendererComp, ICellRendererParams } from 'ag-grid-community';

interface ShippingActionsMenuParams extends ICellRendererParams {
  onViewBom?: (rowData: any) => void;
  onViewSalesOrder?: (rowData: any) => void;
  onViewShipTo?: (rowData: any) => void;
  onGeneratePlacard?: (rowData: any) => void;
  onViewNotes?: (rowData: any) => void;
  onViewRfq?: (rowData: any) => void;
  onViewLateReasonCode?: (rowData: any) => void;
  onViewPartsOrderRequest?: (rowData: any) => void;
  onViewSoJob?: (rowData: any) => void;
  onViewWorkOrderRouting?: (rowData: any) => void;
  onViewComments?: (rowData: any) => void;
  onViewPartNumber?: (rowData: any) => void;
}

export class ShippingActionsMenuCellRendererComponent implements ICellRendererComp {
  private eGui!: HTMLDivElement;
  private eButton!: HTMLButtonElement;
  private popupMenu?: HTMLDivElement;
  private isOpen = false;
  private params!: ShippingActionsMenuParams;
  private outsideClickHandler?: (event: MouseEvent) => void;
  private escapeHandler?: (event: KeyboardEvent) => void;
  private viewportHandler?: () => void;

  init(params: ShippingActionsMenuParams): void {
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
      'gap:4px',
      'transition:color 0.15s ease-in-out, border-color 0.15s ease-in-out, background-color 0.15s ease-in-out'
    ].join(';');
    this.eButton.innerHTML = '<i class="mdi mdi-chevron-down me-1" style="font-size:14px;"></i>Actions';

    this.eButton.addEventListener('click', this.onToggleMenu);
    this.eGui.appendChild(this.eButton);
  }

  refresh(params: ShippingActionsMenuParams): boolean {
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

  private buildMenuItems(container: HTMLDivElement): void {
    const rowData = this.params?.data || {};
    const hasBom = !!String(rowData.SOD_PART || '').trim();
    const hasSo = !!String(rowData.SOD_NBR || '').trim();
    const hasShipTo = !!String(rowData.SO_SHIP || '').trim();
    const hasSoLine = !!String(rowData.SOD_LINE || '').trim();
    const hasWo = !!String(rowData.WO_NBR || '').trim();
    const hasCommentsRef = !!String(rowData.sales_order_line_number || '').trim() && !!String(rowData.id || '').trim();

    container.innerHTML = '';

    container.appendChild(
      this.createMenuButton('BOM', hasBom, 'mdi mdi-file-document-outline', () => {
        if (this.params.onViewBom) this.params.onViewBom(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Sales Order', hasSo, 'mdi mdi-cart-outline', () => {
        if (this.params.onViewSalesOrder) this.params.onViewSalesOrder(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Ship To', hasShipTo, 'mdi mdi-map-marker-outline', () => {
        if (this.params.onViewShipTo) this.params.onViewShipTo(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Generate Placard', hasSo && hasSoLine && hasBom, 'mdi mdi-printer-outline', () => {
        if (this.params.onGeneratePlacard) this.params.onGeneratePlacard(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Notes', hasSo && hasSoLine, 'mdi mdi-note-outline', () => {
        if (this.params.onViewNotes) this.params.onViewNotes(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('RFQ', hasSo && hasSoLine, 'mdi mdi-file-question-outline', () => {
        if (this.params.onViewRfq) this.params.onViewRfq(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Late Reason Code', hasSo && hasSoLine, 'mdi mdi-clock-outline', () => {
        if (this.params.onViewLateReasonCode) this.params.onViewLateReasonCode(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('View Orders Request', hasSo, 'mdi mdi-package-variant', () => {
        if (this.params.onViewPartsOrderRequest) this.params.onViewPartsOrderRequest(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('SO / Job', hasWo, 'mdi mdi-briefcase-outline', () => {
        if (this.params.onViewSoJob) this.params.onViewSoJob(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('View Work Order Routing', hasBom, 'mdi mdi-vector-polyline', () => {
        if (this.params.onViewWorkOrderRouting) this.params.onViewWorkOrderRouting(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Comments', hasCommentsRef, 'mdi mdi-comment-text-outline', () => {
        if (this.params.onViewComments) this.params.onViewComments(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Part Number View', hasBom, 'mdi mdi-tag-multiple-outline', () => {
        if (this.params.onViewPartNumber) this.params.onViewPartNumber(rowData);
      })
    );
  }

  private createMenuButton(label: string, enabled: boolean, icon: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = enabled ? 'dropdown-item' : 'dropdown-item disabled';
    btn.style.cssText = [
      'padding:6px 12px',
      'border:none',
      'background:none',
      'text-align:left',
      'cursor:' + (enabled ? 'pointer' : 'not-allowed'),
      'color:' + (enabled ? '#212529' : '#a9acb0'),
      'font-size:11.5px',
      'display:flex',
      'align-items:center',
      'gap:8px',
      'white-space:nowrap',
      'transition:background-color 0.15s ease-in-out',
      'width:100%'
    ].join(';');

    const iconEl = document.createElement('i');
    iconEl.className = icon;
    iconEl.style.cssText = [
      'font-size:13px',
      'width:14px',
      'text-align:center'
    ].join(';');

    const labelEl = document.createElement('span');
    labelEl.textContent = label;

    btn.appendChild(iconEl);
    btn.appendChild(labelEl);

    if (enabled) {
      btn.addEventListener('mouseenter', () => {
        btn.style.backgroundColor = '#f8f9fa';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.backgroundColor = 'transparent';
      });
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
        this.closeMenu();
      });
    }

    return btn;
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
    popup.className = 'dropdown-menu show';
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

    // Register handlers after current click completes.
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
  };
}
