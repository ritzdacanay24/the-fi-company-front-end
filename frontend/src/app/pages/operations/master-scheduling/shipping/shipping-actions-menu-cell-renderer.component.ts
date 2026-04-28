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
    this.eButton.className = 'btn btn-outline-secondary btn-xs d-flex align-items-center';
    this.eButton.style.cssText = [
      'height:24px',
      'min-width:86px',
      'padding:0 8px',
      'font-size:11px',
      'line-height:1',
      'border-radius:4px'
    ].join(';');
    this.eButton.innerHTML = '<i class="mdi mdi-dots-horizontal me-1"></i>Actions';

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
      this.createMenuButton('BOM', hasBom, () => {
        if (this.params.onViewBom) this.params.onViewBom(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Sales Order', hasSo, () => {
        if (this.params.onViewSalesOrder) this.params.onViewSalesOrder(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Ship To', hasShipTo, () => {
        if (this.params.onViewShipTo) this.params.onViewShipTo(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Generate Placard', hasSo && hasSoLine && hasBom, () => {
        if (this.params.onGeneratePlacard) this.params.onGeneratePlacard(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Notes', hasSo && hasSoLine, () => {
        if (this.params.onViewNotes) this.params.onViewNotes(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('RFQ', hasSo && hasSoLine, () => {
        if (this.params.onViewRfq) this.params.onViewRfq(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Late Reason Code', hasSo && hasSoLine, () => {
        if (this.params.onViewLateReasonCode) this.params.onViewLateReasonCode(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('View Orders Request', hasSo, () => {
        if (this.params.onViewPartsOrderRequest) this.params.onViewPartsOrderRequest(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('SO / Job', hasWo, () => {
        if (this.params.onViewSoJob) this.params.onViewSoJob(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('View Work Order Routing', hasBom, () => {
        if (this.params.onViewWorkOrderRouting) this.params.onViewWorkOrderRouting(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Comments', hasCommentsRef, () => {
        if (this.params.onViewComments) this.params.onViewComments(rowData);
      })
    );

    container.appendChild(
      this.createMenuButton('Part Number View', hasBom, () => {
        if (this.params.onViewPartNumber) this.params.onViewPartNumber(rowData);
      })
    );
  }

  private createMenuButton(label: string, enabled: boolean, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm w-100 text-start';
    btn.style.cssText = [
      'font-size:11px',
      'line-height:1.2',
      'padding:6px 8px',
      'border-radius:3px'
    ].join(';');
    btn.textContent = label;
    btn.disabled = !enabled;

    if (enabled) {
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
    popup.className = 'bg-body border rounded shadow-sm';
    popup.style.cssText = [
      'position:fixed',
      `top:${Math.min(window.innerHeight - 120, rect.bottom + 4)}px`,
      `left:${Math.max(8, rect.right - 160)}px`,
      'min-width:160px',
      'z-index:3000',
      'padding:4px'
    ].join(';');

    this.buildMenuItems(popup);
    document.body.appendChild(popup);

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
