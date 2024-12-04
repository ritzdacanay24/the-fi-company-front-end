import { isEmpty } from "src/assets/js/util";

export class EditIconV2Component {
  eGui!: HTMLDivElement;
  eButton: any;
  eventListener!: () => void;

  params: any;
  iconName: string;
  value: string;
  instances: any;
  placeholder: any;
  data: any;

  init(params: any) {
    this.params = params;
    this.iconName = params.iconName;
    this.value = params.value;
    this.placeholder = params.placeholder;
    this.data = params.data;

    this.eGui = document.createElement("div");

    if (this.params.data) {
      this.eButton = document.createElement("span");
      var li = document.createElement("i");

      li.className = `me-2 text-muted ${this.iconName}`;
      this.eButton.innerHTML = this.value
        ? this.value
        : this.placeholder
        ? this.placeholder
        : "";

      this.eButton.prepend(li);

      this.eButton.addEventListener("click", this.onClick);
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
