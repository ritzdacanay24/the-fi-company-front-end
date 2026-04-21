import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';

const url = 'apiV2/attachments';

@Injectable({
  providedIn: 'root'
})

export class AttachmentsService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  override find = async (params: any): Promise<any[]> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any[]>(`${url}/find${result}`));
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<{ rowCount: number }>(`${url}/deleteById?id=${id}`));
    return { message: 'Successfully deleted' };
  };

  getViewById = async (id: number): Promise<{ id: number; url: string; fileName?: string; storage_source?: string | null }> => {
    return await firstValueFrom(this.http.get<{ id: number; url: string; fileName?: string; storage_source?: string | null }>(`${url}/viewById/${id}`));
  };


  getAttachmentByRequestId(id: any) {
    return this.http.get(`https://dashboard.eye-fi.com/tasks/fieldService/requests/getAttachmentByRequestId.php?id=${id}`).toPromise();
  }

  getAttachments(start: string): Observable<any> {
    return this.http.get<any>(`/Attachments/index?getAttachments=${start}`);
  }

  uploadfile(file: any) {
    return this.http.post(`https://dashboard.eye-fi.com/server/Api/Upload/index.php`, file).toPromise();
  }

  //public

  uploadfilePublic(file: any) {
    return this.http.post(`https://dashboard.eye-fi.com/tasks/upload/index.php`, file).toPromise();
  }
  
  getAttachmentByQirId(id: any) {
    return this.http.get(`https://dashboard.eye-fi.com/tasks/quality/qir/getAttachmentById.php?id=${id}`).toPromise();
  }

}
