import { isEmpty } from "src/assets/js/util";
import tippy from "tippy.js";

tippy.setDefaultProps({ delay: 0 });
tippy.setDefaultProps({ animation: false });

export class OwnerRendererV2Component {
  eGui!: HTMLDivElement;
  eButton: any;
  eventListener!: () => void;

  params: any;
  iconColor = "";
  data: any;
  instance: any;

  init(params: any) {
    this.params = params;
    this.data = this.params.data.misc;

    if (!isEmpty(this.data) && this.data.userName != "") {
      if (isEmpty(this.params.data.recent_owner_changes)) {
        this.iconColor = "text-info-emphasis";
      } else if (!isEmpty(this.params.data.recent_owner_changes)) {
        this.iconColor = "text-success-emphasis";
      }

      this.instance = tippy(params.eGridCell, {
        content: `
        <div class="card shadow-md" style="min-width:300px">
        <div class="card-header d-flex align-items-center"><h4 class="card-title mb-0">${this.data.so}</h4></div>
            <div class="card-body" style="overflow:hidden">
              <h6 class="mb-2">Owner Info</h6>
              Current owner is ${this.data.userName}
            </div>
          </div>
        `,
        placement: "bottom-start",
        allowHTML: true,
        theme: "light",
        offset: [20, -3],
        trigger: "mouseenter",
      });
    } else if (
      !isEmpty(this.data) &&
      !isEmpty(this.params.data.recent_owner_changes)
    ) {
      this.iconColor = "text-success-emphasis";

      this.instance = tippy(params.eGridCell, {
        content: `
        <div class="card shadow-md" style="min-width:300px">
        <div class="card-header d-flex align-items-center"><h4 class="card-title mb-0">${this.data.so}</h4></div>
            <div class="card-body" style="overflow:hidden">
              <h6 class="mb-2">Owner Info</h6>
              Owner was changed today. Click on icon to view change.
            </div>
          </div>
        `,
        placement: "bottom-start",
        allowHTML: true,
        theme: "light",
        offset: [20, -3],
        trigger: "mouseenter",
      });
    }

    this.eGui = document.createElement("div");

    if (this.params.data) {
      this.eButton = document.createElement("i");
      this.eButton.className = `mdi mdi mdi-account-switch icon-md-lg mr-2 ${this.iconColor} pointer`;
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
    this.instance?.hide();
  }

  onClick = ($event: any) => {
    $event.preventDefault();
    this.instance?.hide();
    if (this.params.onClick instanceof Function) {
      const params = {
        event: $event,
        rowData: this.params.data,
      };
      this.params.onClick(params);
    }
  };
}
