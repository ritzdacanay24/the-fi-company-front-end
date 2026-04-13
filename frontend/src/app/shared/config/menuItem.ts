import {
  IMenuItemParams,
  IMenuItemComp,
  IMenuConfigParams,
} from "ag-grid-community";

export interface CustomMenuItemParams extends IMenuItemParams {
  buttonValue: string;
}

export class MenuItem implements IMenuItemComp {
  eGui!: HTMLDivElement;
  eButton!: HTMLButtonElement;
  eventListener!: () => void;

  init(params: any): void {
    // params.menuItemParams.params.node.selected = true

    this.eGui = document.createElement("div");
    this.eGui.innerHTML = `
            <span class="ag-menu-option-part ag-menu-option-icon" role="presentation"></span>
            <span class="ag-menu-option-part ag-menu-option-text">${params.name}</span>
            <span class="ag-menu-option-part ag-menu-option-shortcut"></span>
            <span class="ag-menu-option-part ag-menu-option-popup-pointer"></span>
        `;

    this.eventListener = () => {
      params.menuItemParams.params.node.setSelected(true);
      const colDef = params.api.getAllDisplayedColumns();

      params.api.copySelectedRowsToClipboard({
        columnKeys: colDef,
        includeHeaders: true,
      });
    };
    this.eGui.addEventListener("click", this.eventListener);
  }

  getGui(): HTMLElement {
    return this.eGui;
  }

  configureDefaults(): boolean | IMenuConfigParams {
    return true;
  }

  destroy(): void {
    if (this.eGui) {
      this.eGui.removeEventListener("click", this.eventListener);
    }
  }
}
