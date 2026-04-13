export class LateReasonCodeRendererV2Component {
  eGui!: HTMLDivElement;
  eButton: any;
  eventListener!: () => void;

  params: any;
  data: any;

  init(params: any) {
    this.params = params;

    this.eGui = document.createElement("div");

    if (this.params.data) {
      this.eGui.style.cssText = "width:auto;text-overflow: ellipsis;";
      this.eGui.className = "d-flex flex-row text-nowrap overflow-hidden";
      this.eButton = document.createElement("span");
      var li = document.createElement("span");

      li.innerHTML = this.params?.value || '';
      this.eButton.className =
        "mdi mdi-plus-box me-2 icon-md-lg text-primary pointer";

      this.eGui.prepend(li);

      this.eButton.addEventListener("click", this.onClick);
      this.eGui.prepend(this.eButton);
    }
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
