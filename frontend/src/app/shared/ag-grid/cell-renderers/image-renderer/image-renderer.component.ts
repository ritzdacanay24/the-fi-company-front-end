import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ICellRendererAngularComp } from "ag-grid-angular";

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: "app-image-renderer",
  templateUrl: "./image-renderer.component.html",
})
export class ImageRendererComponent implements ICellRendererAngularComp {
  params: any;

  isLink = false;

  image = "";

  onImgError(image) {
    image.target.parentNode.style.display = "none";
  }
  anonImg(image) {
    image.src =
      "https://instagramimages-a.akamaihd.net/profiles/anonymousUser.jpg";
  }

  private resolveImage(params: any): string {
    const signedOrResolved = String(params?.data?.Image_Url || "").trim();
    if (signedOrResolved) {
      return signedOrResolved;
    }

    const rawValue = String(params?.value || "").trim();
    if (!rawValue) {
      return "";
    }

    return `${params?.link || ""}${rawValue}`;
  }

  agInit(params): void {
    if (!params.data) return;

    this.params = params;
    this.image = this.resolveImage(params);
  }

  refresh(params?: any): boolean {
    this.params = params;
    this.image = this.resolveImage(params);
    return true;
  }

  onClick($event: any) {
    window.open($event);
  }
}
