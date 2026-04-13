import { ICellRendererComp, ICellRendererParams } from "ag-grid-community";

export class ChecboxRendererV2 implements ICellRendererComp {
  eGui!: HTMLSpanElement;
  params: any;
  eButton: any;

  // Optional: Params for rendering. The same params that are passed to the cellRenderer function.
  init(params: ICellRendererParams) {
    this.params = params;
    this.eGui = document.createElement("div");
    this.eButton = document.createElement("input");
    this.eButton.className = "form-check-input pointer mt-2";

    this.eButton.type = "checkbox";
    this.eButton.checked = params.value;
    this.eButton.addEventListener("click", this.checkedHandler);

    this.eGui.appendChild(this.eButton);
  }

  // Required: Return the DOM element of the component, this is what the grid puts into the cell
  getGui() {
    return this.eGui;
  }

  // Required: Get the cell to refresh.
  refresh(params: ICellRendererParams): boolean {
    return false;
  }

  destroy() {
    if (this.eButton) {
      this.eButton.removeEventListener("click", this.onClick);
    }
  }

  onClick = ($event: any) => {
    $event.preventDefault();
    if (this.params.onClick instanceof Function) {
      const params = {
        event: $event,
        rowData: this.params.node.data,
      };
      this.params.onClick(params);
    }
  };

  checkedHandler = (event) => {
    let checked = event.target.checked;
    let colId = this.params.column.colId;
    this.params.node.setDataValue(colId, checked);

    const params = {
      event: event,
      rowData: this.params.node.data,
    };
    this.params.onClick(params);
  };
}
