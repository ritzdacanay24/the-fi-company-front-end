import { isEmpty } from "src/assets/js/util/util";
import tippy from "tippy.js";

export class PickSheetRendererV2Component {
  eGui!: HTMLDivElement;
  eButton: any;
  eventListener!: () => void;

  value: string;
  printDetails: any;
  iconColor: string = "";
  iconBgColor: string = "bg-light";
  icon: string = "mdi-clipboard-outline";
  params: any;
  instance: any;

  init(params: any) {
    this.params = params;

    let content = "";
    if (!isEmpty(params.data.print_details)) {
      this.printDetails = params.data.print_details;
      this.iconColor = "text-info";
      this.iconBgColor = "bg-info";
      if (this.params.data.LINESTATUS == 0) {
        this.iconColor = "text-success";
        this.iconBgColor = "bg-success";
        this.icon = "mdi-clipboard-check";
      } else if (this.params.data.LINESTATUS < 0) {
        this.iconColor = "text-danger";
        this.iconBgColor = "bg-danger";
        this.icon = "mdi-clipboard-alert";
      }

      content = `
      <div class="shadow-lg p-3">
        <div class="card">
          <div class="card-header">
            <h4 class="card-title mb-0 flex-grow-1">${this.params.value}</h4>
          </div>
          <div class="card-body" style="overflow:hidden">
            <h6 class="mb-2">Print Details</h6>
            <p><b>Assigned to:</b> ${this.printDetails?.assignedTo} </p>
            <p><b>Printed date:</b> ${this.printDetails?.printedDate} </p>
            <p><b>Comments:</b> ${this.printDetails?.comments} </p>
            ${
              this.params.data.LINESTATUS
                ? `<p><b>Qty to pick: </b> ${this.params.data.LINESTATUS}</p>`
                : "Pick Complete"
            }
            <p class="mt-2">Click on the <i class="mdi ${this.icon} ${
        this.iconColor
      } icon-mm"></i> icon to view/print pick sheet.</p>
          </div>
          <div class="card-footer">
            <p><b>Printed by: </b> ${this.printDetails?.createdByName}</p>
          </div>
        </div>
        </duv>
      `;
    } else {
      content = `
          <div class="card">
            <div class="card-header">
              <h4 class="card-title mb-0 flex-grow-1">${this.params.value}</h4>
            </div>
            <div class="card-body" style="overflow:hidden">
              <h6 class="mb-2">Print Details</h6>
              ${
                this.params.data.LINESTATUS
                  ? `<p><b>Qty to pick: </b> ${this.params.data.LINESTATUS}</p>`
                  : "Pick Complete"
              }
              <p>This is not printed yet.</p>
              <p>Click on the <i class="mdi ${
                this.icon
              } icon-mm"></i> icon to view/print pick sheet.</p>
            </div>
          </div>
        `;
    }

    this.instance = tippy(params.eGridCell, {
      theme: "tomato",
      // animateFill: false,
      arrow: false,
      content: content,
      placement: "bottom-start",
      allowHTML: true,
      offset: [20, -3],
      trigger: "mouseenter",
    });

    this.eGui = document.createElement("div");

    if (this.params.data) {
      this.eGui.className = "d-flex flex-row text-nowrap overflow-hidden";
      this.eButton = document.createElement("span");
      var li = document.createElement("span");

      li.innerHTML = this.printDetails?.printedDate ? this.printDetails.printedDate : '';
      this.eButton.className = `mdi ${this.icon} pointer icon-md-lg ${this.iconColor} me-2`;

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
    this.instance?.hide();
  }

  onClick = ($event: any) => {
    $event.preventDefault();
    this.instance?.hide();
    if (this.params.onClick instanceof Function) {
      const params = {
        event: $event,
        rowData: this.params.node.data,
      };
      this.params.onClick(params);
    }
  };
}
