import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/job-comments';

@Injectable({
  providedIn: 'root'
})
export class JobCommentsService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }


  getJobCommentsByFsId(fsId?: any) {
    return this.http.get<any>(`${url}/getJobCommentsByFsId?fsId=${fsId}`).toPromise();
  }

}
