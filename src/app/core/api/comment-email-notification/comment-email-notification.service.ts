import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'comment/email-notification';

@Injectable({
  providedIn: 'root'
})
export class CommentEmailNotificationService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }
}
