import { Component } from "@angular/core";
import { isEmpty } from "src/assets/js/util";
import { ICellRendererAngularComp } from "ag-grid-angular";
import tippy from "tippy.js";
import { SharedModule } from "@app/shared/shared.module";

tippy.setDefaultProps({ delay: 0 });
tippy.setDefaultProps({ animation: false });

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-comments-renderer",
  templateUrl: "./comments-renderer.component.html",
})
export class CommentsRendererComponent implements ICellRendererAngularComp {
  params: any;
  recent_comments: any;
  icon: string = "mdi-comment-outline";
  icon_color: string = "";
  atRisk: boolean;
  data: any;

  agInit(params): void {
    this.params = params;
    this.data = params.data;
    if (!params.data) return;

    this.recent_comments = params.data.recent_comments;

    this.atRisk = ["at risk"].includes(
      this.params.data.misc?.userName?.toString()?.toLowerCase()
    );

    if (!isEmpty(this.recent_comments) && this.recent_comments) {
      this.icon =
        this.recent_comments?.color_class_name == "text-info" ||
        this.recent_comments?.color_class_name == "text-success"
          ? "mdi-comment-text"
          : this.icon;
      this.icon_color =
        this.recent_comments?.color_class_name == "text-info"
          ? "text-info-emphasis"
          : this.recent_comments?.color_class_name == "text-success"
          ? "text-success-emphasis"
          : null;
      if (this.atRisk) {
        this.icon = "mdi mdi-comment-alert";
        this.icon_color = "text-danger-emphasis";
        this.recent_comments.bg_class_name = "bg-danger";
      }
      tippy(params.eGridCell, {
        // animateFill:false,
        arrow: false,
        content: `
          <div class="card shadow-lg">
            <div class="card-header d-flex align-items-center">
              <h4 class="card-title mb-0">${
                this.params.value?.title || "Recent Comment"
              }</h4>
              ${
                this.params.value?.description
                  ? `<span class="ms-3 text-end">${this.params.value?.description}</span>`
                  : ""
              }
            </div>
            <div class="card-body" style="overflow:hidden;">
             <div style="text-overflow: ellipsis;white-space: normal;
             -webkit-box-orient: vertical;
              display: -webkit-box;
              -webkit-line-clamp: 4;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: normal;"  
              class="blockquote p-0 ps-2 mb-0">
                <p>${this.recent_comments?.comments}</p>
                </div>
            </div>
            <div class="card-footer">
              <p><b>Comment date: </b> ${this.recent_comments?.createdDate}</p>
              <p><b>Created by: </b> ${
                this.recent_comments?.created_by_name
              }</p>
              <p class="text-secondary">Click on the <i class="mdi ${
                this.icon
              } icon-ml ${this.icon_color}"></i> icon to add a comment.</p>
            </div>
          </div>
        `,
        placement: "bottom-start",
        allowHTML: true,
        theme: "light",
        offset: [20, -3],
        trigger: "mouseenter",
      });
    } else {
      tippy(params.eGridCell, {
        // animateFill:false,
        arrow: false,
        content: `
          <div class="card shadow-lg">
            <div class="card-header d-flex align-items-center">
              <h4 class="card-title mb-0">${
                this.params.value?.title || "No comments found"
              }</h4>
              ${
                this.params.value?.description
                  ? `<span class="ms-3 text-end">${this.params.value?.description}</span>`
                  : ""
              }
            </div>
            <div class="card-body" style="overflow:hidden">
              <p>No comments found.</p>
              <p class="text-secondary">Click on the <i class="mdi ${
                this.icon
              } icon-ml"></i> icon to add a comment.</p>
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
  }

  refresh(params?: any): boolean {
    this.params = params.data;

    return true;
  }

  onClick($event: any) {
    $event.preventDefault();
    if (this.params.onClick instanceof Function) {
      const params = {
        event: $event,
        rowData: this.params.data,
      };
      this.params.onClick(params);
    }
  }
}
