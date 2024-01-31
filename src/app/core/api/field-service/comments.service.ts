import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/fieldService/comments';

@Injectable({
  providedIn: 'root'
})
export class CommentsService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getByRequestId(fs_request_id) {
    return firstValueFrom(this.http.get(`https://dashboard.eye-fi.com/tasks/fieldService/comments/getByRequestId.php?fs_request_id=${fs_request_id}`));
  }

  createComment(token, toEmail, params) {
    return firstValueFrom(this.http.post(`https://dashboard.eye-fi.com/tasks/fieldService/comments/createComment.php?token=${token}&toEmail=${toEmail}`, params));
  }


}
