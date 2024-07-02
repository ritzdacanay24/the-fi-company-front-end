import { Component, Input, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { QuillModule, QuillModules } from 'ngx-quill';
import "quill-mention/autoregister";
import QuillBetterTable from 'quill-better-table'

import BlotFormatter from 'quill-blot-formatter';

import Quill from 'quill';

import { UserService } from '@app/core/api/field-service/user.service';
import moment from 'moment';
import { CommentsService } from '@app/core/api/comments/comments.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { stripHtml } from 'src/assets/js/util';
import { SafeHtmlPipe } from '@app/shared/pipes/safe-html.pipe';

import { Pipe, PipeTransform } from '@angular/core';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

Quill.register('modules/blotFormatter', BlotFormatter);

Quill.register({ 'modules/better-table': QuillBetterTable }, true)


@Pipe({
  standalone: true,
  name: 'dateAgo',
  pure: true
})
export class DateAgoPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    if (value) {
      const seconds = Math.floor((+new Date() - +new Date(value)) / 1000);
      if (seconds < 29) // less than 30 seconds ago will show as 'Just now'
        return 'Just now';
      const intervals: { [key: string]: number } = {
        'year': 31536000,
        'month': 2592000,
        'week': 604800,
        'day': 86400,
        'hour': 3600,
        'minute': 60,
        'second': 1
      };
      let counter;
      for (const i in intervals) {
        counter = Math.floor(seconds / intervals[i]);
        if (counter > 0)
          if (counter === 1) {
            return counter + ' ' + i + ' ago'; // singular (1 day ago)
          } else {
            return counter + ' ' + i + 's ago'; // plural (2 days ago)
          }
      }
    }
    return value;
  }

}
@Component({
  standalone: true,
  imports: [
    SharedModule,
    QuillModule,
    SafeHtmlPipe,
    DateAgoPipe
  ],
  selector: 'app-comments',
  templateUrl: './comments-modal.component.html',
  styleUrls: [],
})

export class CommentsModalComponent implements OnInit {

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private userService: UserService,
    private authenticationService: AuthenticationService,
    private commentsService: CommentsService,
  ) {
    this.url = window.location.href;

    this.userInfo = this.authenticationService.currentUserValue;
  }

  commentEmailNotification = false;

  onCommentEmailNotification() {
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
      blotFormatter: {
        // empty object for default behaviour.
      },
      'better-table': {
        operationMenu: {
          items: {
            unmergeCells: {
              text: 'Another unmerge cells name'
            },
            mergeCells: {
              text: 'Another merge cells name'
            }
          }
        },
        keyboard: {
          bindings: QuillBetterTable.keyboardBindings
        }
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

  async deleteComment(id, childRow?) {

    const { value: accept } = await SweetAlert.confirm();

    if (!accept) return;
    this.isLoading = true;

    let params = {
      deleteComment: 1,
      active: 0,
      id: id
    }
    this.commentsService.deleteComment(params).subscribe(
      (data: any) => {
        //this.commentsWsService.sendMessage(saveParams, null, 'New comment added');

        if (childRow) {
          var index1 = childRow.map(x => {
            return x.id;
          }).indexOf(id);
          childRow.splice(index1, 1);
        } else {
          var index = this.results1.map(x => {
            return x.id;
          }).indexOf(id);
          this.results1.splice(index, 1);
        }

        this.isLoading = false;
      }, error => {
        this.isLoading = false;
      });

  }

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

  sortDirection: 'Asc' | 'Desc' = 'Asc';

  sortComments(results) {

    let sortDirection;
    if (this.sortDirection == 'Desc') {
      sortDirection = 'Asc'
    } else {
      sortDirection = 'Desc'
    }

    if (sortDirection == 'Desc') {
      results = results.sort((a, b) => moment(b.createdDate, 'YYYY-MM-DD HH:mm:ss').diff(moment(a.createdDate, 'YYYY-MM-DD HH:mm:ss')))
    } else {
      results = results.sort((a, b) => moment(a.createdDate, 'YYYY-MM-DD HH:mm:ss').diff(moment(b.createdDate, 'YYYY-MM-DD HH:mm:ss')))
    }

    this.results1 = getNestedChildren(results)

    this.sortDirection = sortDirection;
  }

  results1 = [];
  public getData = async () => {
    try {
      this.isLoading = true;
      let results = await this.commentsService.find({ orderNum: this.orderNum, type: this.type, active: 1 })
      this.sortComments(results)
      //this.results1 = results
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
      locationPath: window.location.href.split('?')[0],
      pageName: location.pathname,
      comments: pid ? addCommentText : this.htmlText,
      emailToSendFromMention: em,
      emailCallBackUrl: `${window.location.href.split('?')[0]}?comment=${this.orderNum}`,
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
      this.ngbActiveModal.close({
        ...saveParams,
        bg_class_name: 'bg-success',
        color_class_name: 'text-success',
      })
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
