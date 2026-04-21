import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';

let url = 'comments';

@Injectable({
  providedIn: 'root'
})
export class CommentsService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  override find = async (params: Partial<any>): Promise<any[]> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any[]>(`apiv2/comments/find${result}`));
  }


  createComment(params) {
    return this.http.post(`apiv2/comments/create`, params).toPromise()
  }

  deleteComment(comment: any, type?: string): Observable<any> {
    return this.http.post(`apiv2/comments/delete`, comment)
  }

}
