import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'Attachments';

@Injectable({
  providedIn: 'root'
})

export class AttachmentsService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }


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

}
