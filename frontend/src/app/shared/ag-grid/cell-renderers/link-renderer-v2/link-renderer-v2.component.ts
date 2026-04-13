import { ICellRendererComp, ICellRendererParams } from "ag-grid-community";

export class LinkRendererV2Component implements ICellRendererComp {
  eGui!: HTMLDivElement;
  eButton: any;
  eventListener!: () => void;

  params: any;

  // Optional: Params for rendering. The same params that are passed to the cellRenderer function.
  init(params: ICellRendererParams | any) {
    this.params = params;
    if (params.isLink) {
      this.eGui = document.createElement("div");
      this.eButton = document.createElement("a");
      this.eButton.style.cssText =
        "text-decoration: underline;text-underline-offset: 2px;";

      this.eButton.className =
        "pointer link-info link-offset-1 link-underline-opacity-50 link-underline-opacity-100-hover";
      this.eButton.textContent = params.value;
      this.eButton.addEventListener("click", this.onClick);
      this.eGui.appendChild(this.eButton);
    } else {
      this.eGui = document.createElement("div");
      this.eButton = document.createElement("button");
      this.eButton.className = "btn btn-primary pt-0 pb-0 ps-3 pe-3";
      this.eButton.textContent = params.value;
      this.eButton.addEventListener("click", this.onClick);
      this.eGui.appendChild(this.eButton);
    }
  }

  // Required: Return the DOM element of the component, this is what the grid puts into the cell
  getGui() {
    return this.eGui;
  }

  // Required: Get the cell to refresh.
  refresh(params: ICellRendererParams): boolean {
    return false;
  }

  onClick = ($event: any) => {
    $event.preventDefault();
    if (this.params.onClick instanceof Function) {
      const params = {
        event: $event,
        rowData: this.params.node.data,
        index: this.params.rowIndex,
      };
      this.params.onClick(params);
    }
  };

  destroy() {
    if (this.eButton) {
      this.eButton.removeEventListener("click", this.onClick);
    }
  }
}
