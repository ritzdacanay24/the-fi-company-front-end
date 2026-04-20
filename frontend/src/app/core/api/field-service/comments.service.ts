import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/fieldService/comments';
const commentsV2Url = 'apiV2/request-comments';

@Injectable({
  providedIn: 'root'
})
export class CommentsService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getByRequestId(fs_request_id) {
    return firstValueFrom(this.http.get(`${commentsV2Url}?fsRequestId=${fs_request_id}`));
  }

  createComment(token, toEmail, params) {
    return firstValueFrom(this.http.post(`${commentsV2Url}?token=${token}&toEmail=${toEmail}`, params));
  }

  updateById(id, params) {
    return firstValueFrom(this.http.put(`${commentsV2Url}/${id}`, params));
  }


}
