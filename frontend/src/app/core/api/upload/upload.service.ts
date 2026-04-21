import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class UploadService {
    constructor(private http: HttpClient) { }

    private readonly legacyUploadBaseUrl = `${environment.legacyApiBaseUrl.replace(/\/+$/, '')}/Upload/index?`;

    uploadAttachmentV2(params): Observable<any> {
        return this.http.post<any>(`apiV2/attachments`, params)
    }

    upload(params): Observable<any> {
        params.upload = 1;
        return this.http.post<any>(this.legacyUploadBaseUrl, params)
    }

    deleteFile(params): Observable<any> {
        params.delete = 1;
        return this.http.post<any>(this.legacyUploadBaseUrl, params)
    }
}
