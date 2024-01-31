
import { Component } from '@angular/core';
import { isEmpty } from 'src/assets/js/util';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import tippy from 'tippy.js';

@Component({
  selector: 'app-comments-renderer',
  templateUrl: './comments-renderer.component.html'
})

export class CommentsRendererComponent implements ICellRendererAngularComp {

  params: any;
  recent_comments: any;
  icon: string = 'mdi-comment-outline';
  icon_color: string = '';
  atRisk: boolean;

  agInit(params): void {
    this.params = params;
    if (!params.data) return;

    this.recent_comments = params.data.recent_comments;

    this.atRisk = ['at risk'].includes(this.params.data.misc?.userName?.toLowerCase());

    if (!isEmpty(this.recent_comments) && this.recent_comments) {
      this.icon = this.recent_comments?.color_class_name == 'text-info' || this.recent_comments?.color_class_name == 'text-success' ? 'mdi-comment-text' : this.icon;
      this.icon_color = this.recent_comments?.color_class_name == 'text-info' ? 'text-info' : this.recent_comments?.color_class_name == 'text-success' ? 'text-success' : null;
      if (this.atRisk) {
        this.icon = "mdi mdi-comment-alert";
        this.icon_color = "text-danger";
        this.recent_comments.bg_class_name = "bg-danger";
      }
      tippy(params.eGridCell, {
        // animateFill:false,
        arrow:false,
        content: `
          <div class="card shadow-lg">
          <div class="card-header d-flex align-items-center">
          <h4 class="card-title mb-0">${this.params.value?.title}</h4>
              ${this.params.value?.description ? `<p>${this.params.value?.description}</p>` : ''}
            </div>
            
            <div class="card-body" style="overflow:hidden">
              <h6 class="mb-2">Recent comment</h6>
              ${this.recent_comments?.comments}

            </div>
            <div class="card-footer">
            <p><b>Comment date: </b> ${this.recent_comments?.createdDate}</p>
            <p><b>Created by: </b> ${this.recent_comments?.created_by_name}</p>
            <p class="text-secondary">Click on the <i class="mdi ${this.icon} icon-ml ${this.icon_color}"></i> icon to add a comment.</p>
            </div>
          </div>
        `,
        placement: 'bottom-start',
        allowHTML: true,
        theme: 'light',
        offset: [20, -3],
        trigger: 'mouseenter'
      })
    } else {
      tippy(params.eGridCell, {
        // animateFill:false,
        arrow:false,
        content: `
          <div class="card shadow-lg">
          <div class="card-header d-flex align-items-center">
          <h4 class="card-title mb-0">${this.params.value?.title}</h4>
              ${this.params.value?.description ? `<p>${this.params.value?.description}</p>` : ''}
            </div>
            <div class="card-body" style="overflow:hidden">
              <h6 class="mb-2">Recent comment</h6>
              <p>No comments found.</p>
              <p class="text-secondary">Click on the <i class="mdi ${this.icon} icon-ml"></i> icon to add a comment.</p>
            </div>
          </div>
        `,
        placement: 'bottom-start',
        allowHTML: true,
        theme: 'light',
        offset: [20, -3],
        trigger: 'mouseenter'
      })
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
        rowData: this.params.data
      }
      this.params.onClick(params);
    }
  }
}