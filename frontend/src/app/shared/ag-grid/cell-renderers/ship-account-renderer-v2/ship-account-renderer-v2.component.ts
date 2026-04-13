export class ShipAccountRendererV2Component {
  eGui!: HTMLDivElement;
  eButton: any;
  eventListener!: () => void;

  miscData;
  params;
  init(params: any) {
    this.params = params;
    this.miscData = params?.data?.misc;

    this.eGui = document.createElement("div");
    this.eButton = document.createElement("span");

    if (this.miscData.lastModDate) {
      this.eButton.className =
        "mdi mdi-file-document-edit pointer icon-md-lg text-info";
    } else {
      this.eButton.className = "mdi mdi-file-document-edit pointer icon-md-lg";
    }

    this.eButton.addEventListener("click", this.onClick);
    this.eGui.appendChild(this.eButton);
  }

  getGui() {
    return this.eGui;
  }

  refresh() {
    return true;
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
}
