import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Router } from '@angular/router';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import "quill-mention";

import moment from 'moment';
import { NotesService } from '@app/core/api/notes/notes.service';
import { AuthenticationService } from '@app/core/services/auth.service';

import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { QuillModule } from 'ngx-quill';
import { SafeHtmlPipe } from '@app/shared/pipes/safe-html.pipe';

@Injectable({
  providedIn: 'root'
})
export class NotesModalService {
  modalRef: any;

  constructor(
    public modalService: NgbModal
  ) { }

  public open(orderNum: string, misc, type: string) {
    this.modalRef = this.modalService.open(NotesModalComponent, { size: 'lg' });
    this.modalRef.componentInstance.data = { orderNum, type, misc };
    return this.modalRef;
  }

  getInstance() {
    return this.modalRef;
  }

}


@Component({
  standalone: true,
  imports: [
    QuillModule,
    SharedModule,
    SafeHtmlPipe
  ],
  selector: 'app-notes-modal',
  templateUrl: './notes-modal.component.html',
  styleUrls: []
})

export class NotesModalComponent {

  url: string;
  loadingIndicator = true;
  results = [];
  userInfo: any;
  users = [];

  htmlText = ``;
  quillConfig = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike'],
        ['code-block'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'align': [] }],
        ['link', 'image', 'video']
      ],
    }
  }

  @Input() public data: {
    orderNum: string
    type: string
    userId: number
    misc: any
  };
  @Output() passEntry: EventEmitter<any> = new EventEmitter();

  constructor(
    private api: NotesService,
    private ngbActiveModal: NgbActiveModal,
    private authenticationService: AuthenticationService
  ) {
    this.url = window.location.href;
    this.userInfo = this.authenticationService.currentUserValue;
  }

  getData = () => {
    this.loadingIndicator = true;
    this.api.getData(this.data.orderNum, this.userInfo.id).subscribe(
      (data: any) => {
        this.results = data;
        this.loadingIndicator = false;
      }, error => {
        this.loadingIndicator = false;
      })
  }

  ngOnInit() {
    this.getData();
  }

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close(data) {
    this.ngbActiveModal.close(data);
  }

  get dateTimeNow() {
    return moment().format('YYYY-MM-DD HH:mm:ss')
  }
  saveComment() {
    this.loadingIndicator = true;

    let params: any = {
      insert: 1,
      createdDate: this.dateTimeNow,
      notes: this.htmlText,
      uniqueId: this.data.orderNum,
      type: 'Sales Order',
      createdBy: this.userInfo.id
    }

    this.api.saveNotes(params).subscribe(
      (data: any) => {
        this.close(params);
        this.loadingIndicator = false;
      }, error => {
        this.loadingIndicator = false;
      })
  }

}
