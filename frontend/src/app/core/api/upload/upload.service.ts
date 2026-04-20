import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class UploadService {
    constructor(private http: HttpClient) { }

    uploadAttachmentV2(params): Observable<any> {
        return this.http.post<any>(`apiV2/attachments`, params)
    }

    upload(params): Observable<any> {
        params.upload = 1;
        return this.http.post<any>(`/Upload/index?`, params)
    }

    deleteFile(params): Observable<any> {
        params.delete = 1;
        return this.http.post<any>(`/Upload/index?`, params)
    }
}
