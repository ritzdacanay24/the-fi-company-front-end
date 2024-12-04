import { ICellRendererComp, ICellRendererParams } from "ag-grid-community";

export class ImageRendererComponentV2Renderer implements ICellRendererComp {
  eGui!: HTMLSpanElement;
  params: any;

  isLink = false;

  image = "";

  // Optional: Params for rendering. The same params that are passed to the cellRenderer function.
  init(params: any) {
    this.params = params;

    this.image = params.link + "" + params.value;

    this.eGui = document.createElement("div");

    const companyLogo = document.createElement("img");

    companyLogo.src = this.image;
    companyLogo.setAttribute("class", "logo");
    companyLogo.className = "rounded img-thumbnail pointer";

    companyLogo.src = this.image;


    companyLogo.addEventListener("error", this.onerror);

    this.eGui.appendChild(companyLogo);
  }

  // Required: Return the DOM element of the component, this is what the grid puts into the cell
  getGui() {
    return this.eGui;
  }

  // Required: Get the cell to refresh.
  refresh(params: ICellRendererParams): boolean {
    return false;
  }
  onerror = (event) => {
    event.target.parentNode.style.display = "none";
  };

  onClick = ($event: any) => {
    console.log($event)
    window.open($event);
  };
}
