import { Component, Input, OnInit } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { DragDropModule } from "@angular/cdk/drag-drop";

import { QuillModule, QuillModules } from "ngx-quill";
import "quill-mention";
import BlotFormatter from "quill-blot-formatter";

import Quill from "quill";

import { UserService } from "@app/core/api/field-service/user.service";
import moment from "moment";
import { CommentsService } from "@app/core/api/comments/comments.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { stripHtml } from "src/assets/js/util";
import { SafeHtmlPipe } from "@app/shared/pipes/safe-html.pipe";

import { Pipe, PipeTransform } from "@angular/core";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";

// Quill modules are now registered globally in app.module.ts
import { AngularDraggableModule } from 'angular2-draggable';

import { ResizableModule, ResizeEvent } from 'angular-resizable-element';

@Pipe({
  standalone: true,
  name: "dateAgo",
  pure: true,
})
export class DateAgoPipe implements PipeTransform {
  transform(value: any, args?: any): any {
    if (value) {
      const seconds = Math.floor((+new Date() - +new Date(value)) / 1000);
      if (seconds < 29)
        // less than 30 seconds ago will show as 'Just now'
        return "Just now";
      const intervals: { [key: string]: number } = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1,
      };
      let counter;
      for (const i in intervals) {
        counter = Math.floor(seconds / intervals[i]);
        if (counter > 0)
          if (counter === 1) {
            return counter + " " + i + " ago"; // singular (1 day ago)
          } else {
            return counter + " " + i + "s ago"; // plural (2 days ago)
          }
      }
    }
    return value;
  }
}
@Component({
  standalone: true,
  imports: [SharedModule, QuillModule, SafeHtmlPipe, DateAgoPipe, DragDropModule, AngularDraggableModule, ResizableModule],
  selector: "app-comments",
  templateUrl: "./comments-modal.component.html",
  styles: [
    `
      .rectangle {
        position: relative;
        top: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 300px;
        height: 150px;
        background-color: #fd4140;
        border: solid 1px #121621;
        color: #121621;
        margin: auto;
      }

      mwlResizable {
        box-sizing: border-box; // required for the enableGhostResize option to work
      }

      .resize-handle-top,
      .resize-handle-bottom {
        position: absolute;
        height: 5px;
        cursor: row-resize;
        width: 100%;
      }

      .resize-handle-top {
        top: 0;
      }

      .resize-handle-bottom {
        bottom: 0;
      }

      .resize-handle-left,
      .resize-handle-right {
        position: absolute;
        height: 100%;
        cursor: col-resize;
        width: 5px;
      }

      .resize-handle-left {
        left: 0;
      }

      .resize-handle-right {
        right: 0;
      }
    `,
  ],
})
export class CommentsModalComponent implements OnInit {

  onResizeEnd(event: ResizeEvent): void {
  }

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private userService: UserService,
    private authenticationService: AuthenticationService,
    private commentsService: CommentsService
  ) {
    this.url = window.location.href;

    this.userInfo = this.authenticationService.currentUserValue;
  }
  elements: any
  elements1: any
  elements2: any
  minimize() {
    const element: any = this.elements = document.getElementsByClassName('modal-content');
    const element1: any = this.elements1 = document.getElementsByClassName('backgroundTransparent d-block');

    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }

    // Store original styles
    for (let i = 0; i < this.elements.length; i++) {
      this.elements[i].setAttribute("data-original-style", this.elements[i].style.cssText);
    }

    for (let i = 0; i < this.elements1.length; i++) {
      this.elements1[i].setAttribute("data-original-style", this.elements1[i].style.cssText);
    }



    let test = element[0]
    test.style.width = "100px";
    test.style.height = "49px";
    test.style.bottom = "6px";
    test.style.right = "7px";
    test.style.position = "fixed";

  }


  // Revert to original styles
  revertStyles() {
    for (let i = 0; i < this.elements.length; i++) {
      this.elements[i].style.cssText = this.elements[i].getAttribute("data-original-style");
    }
    for (let i = 0; i < this.elements1.length; i++) {
      this.elements1[i].style.cssText = this.elements1[i].getAttribute("data-original-style");
    }

    const backdrop = document.querySelector('.backgroundTransparent ');
    if (backdrop) {
      backdrop[0].addClass('. modal-backdrop ');
    }
  }

  commentEmailNotification = false;

  onCommentEmailNotification() { }

  ngOnInit() {
    // Build quill config with conditional better-table module
    const baseConfig: any = {
      toolbar: {
        container: [
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ indent: "-1" }, { indent: "+1" }],
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          ["link", "image", "video"],
          // Basic table support without better-table module
          [{ table: "TD" }],
        ],
      },
      blotFormatter: {
        // empty object for default behaviour.
      },
      mention: {
        minChars: 0,
        positioningStrategy: "fixed",
        defaultMenuOrientation: "bottom",
        allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
        mentionDenotationChars: ["@"],
        source: async (searchTerm, renderList) => {
          const matchedPeople = await suggestPeople(searchTerm, this.listUsers);
          renderList(matchedPeople);
        },
        renderLoading: () => {
          return "Loading...";
        },
        renderItem(item) {
          const memberName = document.createElement("span");
          memberName.textContent = item.id;
          let img = document.createElement("img");
          img.src = item.image || "assets/images/default-user.png";
          img.style.width = "30px";
          img.style.height = "30px";
          img.style.borderRadius = "50px";
          img.style.marginRight = "10px";
          memberName.prepend(img);
          return memberName;

          return `
          <div class="row flex flex-nowrap" style="border:none;margin-left:5px;">
		        <div class="col-xs-6">
			        <img src="${item.image}" style="height: 40px; margin-left: -15px; border-radius:50px" />
            </div>
            <div class="col-xs-6">
              <p style="margin-top: 3px;margin-left: 8px;">${item.value}</p>
              <p style="margin-left: 8px;font-size:10px;padding:0px;">${item.id}</p>
            </div>
          </div>
                    `;
        },
      },
    };

    // Better-table module removed due to compatibility issues
    // Basic table functionality is still available through Quill's default table support

    this.quillConfig = baseConfig;
    this.getUsers();
    this.getData();
  }

  @Input() public orderNum: string;
  @Input() public type: any;
  @Input() public title = "Comments";
  @Input() public userId: number;
  @Input() public userName: string;

  userInfo;

  url;

  async deleteComment(id, childRow?) {
    const { value: accept } = await SweetAlert.confirm();

    if (!accept) return;
    this.isLoading = true;

    let params = {
      deleteComment: 1,
      active: 0,
      id: id,
    };
    this.commentsService.deleteComment(params).subscribe(
      (data: any) => {
        //this.commentsWsService.sendMessage(saveParams, null, 'New comment added');

        if (childRow) {
          var index1 = childRow
            .map((x) => {
              return x.id;
            })
            .indexOf(id);
          childRow.splice(index1, 1);
        } else {
          var index = this.results1
            .map((x) => {
              return x.id;
            })
            .indexOf(id);
          this.results1.splice(index, 1);
        }

        this.isLoading = false;
      },
      (error) => {
        this.isLoading = false;
      }
    );
  }

  quillConfig: QuillModules = {};

  htmlText = "";

  setFocus(editor: any) {
    editor?.focus();
  }

  listUsers = [];
  public getUsers = async () => {
    this.listUsers = await this.userService.find({
      active: 1,
      access: 1,
      openPosition: 0,
      orgChartPlaceHolder: 0,
    });
    for (let i = 0; i < this.listUsers.length; i++) {
      this.listUsers[i].value =
        this.listUsers[i].first + " " + this.listUsers[i].last;
      this.listUsers[i].id = this.listUsers[i].email;
    }
  };

  sortDirection: "Asc" | "Desc" = "Asc";

  sortComments(results) {
    let sortDirection;
    if (this.sortDirection == "Desc") {
      sortDirection = "Asc";
    } else {
      sortDirection = "Desc";
    }

    if (sortDirection == "Desc") {
      results = results.sort((a, b) =>
        moment(b.createdDate, "YYYY-MM-DD HH:mm:ss").diff(
          moment(a.createdDate, "YYYY-MM-DD HH:mm:ss")
        )
      );
    } else {
      results = results.sort((a, b) =>
        moment(a.createdDate, "YYYY-MM-DD HH:mm:ss").diff(
          moment(b.createdDate, "YYYY-MM-DD HH:mm:ss")
        )
      );
    }

    this.results1 = getNestedChildren(results);

    this.sortDirection = sortDirection;
  }

  results1 = [];
  public getData = async () => {
    try {
      this.isLoading = true;
      let results = await this.commentsService.find({
        orderNum: this.orderNum,
        type: this.type,
        active: 1,
      });
      this.sortComments(results);
      //this.results1 = results
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  };

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  isLoading = false;

  async onSubmit(pid?, addCommentText?) {
    let em = extractEmails(this.htmlText);
    if (addCommentText) {
      em = extractEmails(addCommentText);
    }

    let saveParams: any = {
      insert: 1,
      locationPath: window.location.href.split("?")[0],
      pageName: location.pathname,
      comments: pid ? addCommentText : this.htmlText,
      emailToSendFromMention: em,
      emailCallBackUrl: `${window.location.href.split("?")[0]}?comment=${this.orderNum
        }`,
      created_by_name: this.userInfo.full_name,
      createdDate: moment().format("YYYY-MM-DD HH:mm:ss"),
      comments_html: stripHtml(pid ? addCommentText : this.htmlText),
      type: this.type,
      orderNum: this.orderNum,
      userId: this.userId || this.userInfo.id,
      userName: this.userName || this.userInfo.full_name,
      pid: pid ? pid : null,
    };

    try {
      this.isLoading = true;
      await this.commentsService.createComment(saveParams);
      this.ngbActiveModal.close({
        ...saveParams,
        bg_class_name: "bg-success",
        color_class_name: "text-success",
      });
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }
}

function suggestPeople(searchTerm: any, getUsers: any) {
  const allPeople = getUsers;
  return allPeople.filter((person) =>
    person?.value?.toLowerCase().includes(searchTerm?.toLowerCase())
  );
}

function extractEmails(text) {
  return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
}

function getNestedChildren(arr, parent?) {
  var out = [];
  for (var i in arr) {
    if (arr[i].pid == parent) {
      var childs = getNestedChildren(arr, arr[i].id);

      if (childs.length) {
        arr[i].childs = childs;
      }
      out.push(arr[i]);
    }
  }
  return out;
}
