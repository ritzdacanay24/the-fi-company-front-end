import moment from "moment";
import { isEmpty } from "src/assets/js/util";
import tippy from "tippy.js";

tippy.setDefaultProps({ delay: 0 });
tippy.setDefaultProps({ animation: false });

export class NotesRendererV2Component {
  eGui!: HTMLDivElement;
  eButton: any;
  eventListener!: () => void;

  params: any;
  notes: any;
  iconColor = "";
  data;
  instance: any;

  init(params: any) {
    this.params = params;
    this.data = params.data;

    this.notes = params.data?.recent_notes;

    if (!isEmpty(this.notes)) {
      this.iconColor = "text-warning";

      if (moment().isSame(this.notes?.createdDate, "day")) {
        this.iconColor = "text-success";
      }

      this.instance = tippy(params.eGridCell, {
        content: `
        <div class="card shadow-lg bg-light">
        <div class="card-header d-flex align-items-center">
        <h4 class="card-title mb-0">${this.notes?.uniqueId}</h4>
        </div>
            <div class="card-body bg-light" style="overflow:hidden">
              <h6 class="mb-2">Recent note</h6>
              ${this.notes?.notes}
            </div>
            <div class="card-footer bg-light">
              <p><b>Comment date: </b> ${this.notes?.createdDate}</p>
            </div>
          </div>
        `,
        placement: "top-start",
        allowHTML: true,
        theme: "light",
        offset: [20, -3],
        trigger: "mouseenter",
      });
    }

    this.eGui = document.createElement("div");

    if (this.params.data) {
      this.eButton = document.createElement("i");
      this.eButton.className = `pointer mdi mdi-note icon-md-lg mr-2 ${this.iconColor}`;
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
