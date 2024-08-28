import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { FormGroup } from "@angular/forms";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SafeHtmlPipe } from "@app/shared/pipes/safe-html.pipe";

import { QuillModule } from "ngx-quill";

import "quill-mention";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { CommentsService } from "@app/core/api/field-service/comments.service";
import moment from "moment";

@Injectable({
  providedIn: "root",
})
export class RequestChangeModalService {
  constructor(public modalService: NgbModal) {}

  open({ request_id, data, comment_id }: any) {
    let modalRef = this.modalService.open(RequestChangeModalComponent, {
      size: "lg",
    });
    modalRef.componentInstance.request_id = request_id;
    modalRef.componentInstance.data = data;
    modalRef.componentInstance.comment_id = comment_id;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, QuillModule, SafeHtmlPipe],
  selector: "app-request-change-modal",
  templateUrl: "./request-change-modal.component.html",
  styleUrls: [],
})
export class RequestChangeModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private commentsService: CommentsService
  ) {}

  comment;
  name;

  ngOnInit(): void {
    if (this.comment_id) {
      this.comment = this.data.comment;
      this.name = this.data.name;
      this.request_change_completed = this.data.request_change_completed;
    }
  }

  @Input() request_id: any;
  @Input() data: any;
  @Input() comment_id: any;

  title = "Job Modal";

  icon = "mdi-calendar-text";

  request_change_completed;

  form: FormGroup;

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  submitted = false;

  async onUpdate() {
    if(!this.request_change_completed){
        alert('Please enter completion date')
        return 
    }
    try {
      await this.commentsService.updateById(this.comment_id, {
        request_change_completed: this.request_change_completed,
      });
      this.close();
    } catch (err) {
      alert(`Something went wrong. Please contact administrator`);
      SweetAlert.close(0);
    }
  }

  async onSubmit() {
    this.submitted = true;

    try {
      await this.commentsService.createComment(
        this.data.token,
        this.data.email,
        {
          name: this.name,
          comment: this.comment,
          fs_request_id: this.request_id,
          created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
          request_change: 1,
        }
      );
    } catch (err) {
      alert(`Something went wrong. Please contact administrator`);
      SweetAlert.close(0);
    }
  }
}
