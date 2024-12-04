import { isEmpty } from "src/assets/js/util";

export class IconRendererV2Component {
  eGui!: HTMLDivElement;
  eButton: any;
  eventListener!: () => void;

  params: any;
  iconName: string;
  showValue: boolean;
  value: string;
  label: any;
  classColor: string = "#000";
  data: any;

  init(params: any) {
    this.params = params;
    this.data = params.data;
    this.label = params.label;
    this.classColor = params.classColor;
    this.showValue = params.showValue;

    this.iconName = params.iconName;

    this.eGui = document.createElement("div");

    if (this.params.data) {
      this.eGui.style.cssText = "position:relative";

      this.eButton = document.createElement("span");
      this.eButton.className = `mdi ${this.iconName} pointer icon-md-lg ${this.classColor}`;
      this.eButton.addEventListener("click", this.onClick);

      
      let s = document.createElement("span");
      s.style.cssText = "position:absolute;bottom:1px;left:27px";
      s.innerHTML = this.showValue ? this.params.value : '';

      this.eButton.appendChild(s);
      
      this.eGui.appendChild(this.eButton);
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
