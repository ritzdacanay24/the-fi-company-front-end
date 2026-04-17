import { ChecklistTemplate } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { ICellRendererComp, ICellRendererParams } from 'ag-grid-community';

export interface TemplateManagerActionsCellParams extends ICellRendererParams<ChecklistTemplate> {
  onEdit: (template: ChecklistTemplate) => void;
}

export class TemplateManagerActionsCellRenderer implements ICellRendererComp {
  private params!: TemplateManagerActionsCellParams;
  private eGui!: HTMLDivElement;
  private ePrimaryBtn?: HTMLButtonElement;

  private onPrimaryClick = (event: MouseEvent): void => {
    event.stopPropagation();

    const template = this.params.data;
    if (!template) {
      return;
    }

    this.params.onEdit(template);
  };

  init(params: TemplateManagerActionsCellParams): void {
    this.params = params;
    this.eGui = document.createElement('div');
    this.eGui.className = 'd-flex align-items-center justify-content-center gap-1 w-100';

    this.render();
  }

  getGui(): HTMLElement {
    return this.eGui;
  }

  refresh(params: TemplateManagerActionsCellParams): boolean {
    this.params = params;
    this.render();
    return true;
  }

  destroy(): void {
    this.ePrimaryBtn?.removeEventListener('click', this.onPrimaryClick);
  }

  private render(): void {
    this.cleanupElements();
    this.eGui.innerHTML = '';

    const template = this.params.data;
    if (!template) {
      return;
    }

    this.ePrimaryBtn = document.createElement('button');
    this.ePrimaryBtn.type = 'button';
    this.ePrimaryBtn.className = 'btn btn-sm btn-primary';
    this.ePrimaryBtn.style.width = '120px';
    this.ePrimaryBtn.style.minWidth = '120px';
    this.ePrimaryBtn.textContent = 'View';
    this.ePrimaryBtn.addEventListener('click', this.onPrimaryClick);

    this.eGui.appendChild(this.ePrimaryBtn);
  }

  private cleanupElements(): void {
    this.ePrimaryBtn?.removeEventListener('click', this.onPrimaryClick);
  }

}
