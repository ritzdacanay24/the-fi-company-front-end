import { Component, Input, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { QuillModule, QuillModules } from 'ngx-quill';

import "quill-mention";

import Quill from 'quill';

import { TableBlockEmbed } from './comments.func'
import { UserService } from '@app/core/api/field-service/user.service';
import moment from 'moment';
import { Router } from '@angular/router';
import { CommentsService } from '@app/core/api/comments/comments.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { stripHtml } from 'src/assets/js/util';
import { SafeHtmlPipe } from '@app/shared/pipes/safe-html.pipe';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    QuillModule,
    SafeHtmlPipe
  ],
  selector: 'app-comments',
  templateUrl: './comments-modal.component.html',
  styleUrls: [],
})

export class CommentsModalComponent implements OnInit {

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private userService: UserService,
    private router: Router,
    private authenticationService: AuthenticationService,
    private commentsService: CommentsService,
  ) {
    this.url = window.location.href;
    Quill.register(TableBlockEmbed, true);
    this.userInfo = this.authenticationService.currentUserValue;
  }

  ngOnInit() {
    this.quillConfig = {
      toolbar: {
        container: [
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          [{ 'indent': '-1' }, { 'indent': '+1' }],
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'align': [] }], ['link', 'image', 'video']
        ],
      },
      mention: {
        minChars: 0,
        positioningStrategy: 'fixed',
        defaultMenuOrientation: 'bottom',
        allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
        mentionDenotationChars: ["@"],
        source: async (searchTerm, renderList) => {
          const matchedPeople = await suggestPeople(searchTerm, this.listUsers);
          renderList(matchedPeople);
        },
        renderItem(item) {
          return item.id;
        },
      },
    }
    this.getUsers()
    this.getData()
  }

  @Input() public orderNum: string;
  @Input() public type: any;
  @Input() public title = "Comments";
  @Input() public userId: number;
  @Input() public userName: string;

  userInfo

  url

  deleteComment(id, arrayData?) { }

  quillConfig: QuillModules = {};

  htmlText = ""

  setFocus(editor: any) {
    editor?.focus()
  }

  listUsers = []
  public getUsers = async () => {
    this.listUsers = await this.userService.find({ active: 1, access: 1 })
    for (let i = 0; i < this.listUsers.length; i++) {
      this.listUsers[i].value = this.listUsers[i].first + ' ' + this.listUsers[i].last
      this.listUsers[i].id = this.listUsers[i].email
    }
  }


  results1 = [];
  public getData = async () => {
    try {
      this.isLoading = true;
      let results = await this.commentsService.find({ orderNum: this.orderNum, type: this.type })
      this.results1 = getNestedChildren(results)
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  dismiss() {
    this.ngbActiveModal.dismiss()
  }

  close() {
    this.ngbActiveModal.close()
  }

  isLoading = false;

  async onSubmit(pid?, addCommentText?) {

    let em = extractEmails(this.htmlText);
    if (addCommentText) {
      em = extractEmails(addCommentText);
    }

    let saveParams: any = {
      insert: 1,
      locationPath: this.router.url,
      pageName: this.router.url,
      comments: pid ? addCommentText : this.htmlText,
      emailToSendFromMention: em,
      emailCallBackUrl: `${this.url}?comment=${this.orderNum}`,
      created_by_name: this.userInfo.full_name,
      createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
      comments_html: stripHtml(pid ? addCommentText : this.htmlText),
      type: this.type,
      orderNum: this.orderNum,
      userId: this.userId || this.userInfo.id,
      userName: this.userName || this.userInfo.full_name,
      pid: pid ? pid : null
    };

    try {
      this.isLoading = true;
      await this.commentsService.createComment(saveParams)
      this.ngbActiveModal.close(saveParams)
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }


  }
}

function suggestPeople(searchTerm: any, getUsers: any) {
  const allPeople = getUsers;
  return allPeople.filter(person => person?.value?.toLowerCase().includes(searchTerm?.toLowerCase()));
}

function extractEmails(text) {
  return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
}

function getNestedChildren(arr, parent?) {
  var out = []
  for (var i in arr) {
    if (arr[i].pid == parent) {
      var childs = getNestedChildren(arr, arr[i].id)

      if (childs.length) {
        arr[i].childs = childs
      }
      out.push(arr[i])
    }
  }
  return out

}
