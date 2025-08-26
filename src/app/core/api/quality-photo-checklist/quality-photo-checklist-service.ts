import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class QualityPhotoChecklistService {
    constructor(private http: HttpClient) { }

    create(params): Observable<any> {
        return this.http.post(`/QualityPhotoChecklist/save`, params);
    }

    readByPartNumber(woNumber, partNumber, serialNumber, typeOfView): Observable<any> {
        return this.http.get(`/QualityPhotoChecklist/read?woNumber=${woNumber}&partNumber=${partNumber}&serialNumber=${serialNumber}&typeOfView=${typeOfView}`);
    }
    removePhoto(params): Observable<any> {
        return this.http.post(`/QualityPhotoChecklist/removePhoto`, params);
    }
    getOpenChecklists(): Observable<any> {
        return this.http.get(`/QualityPhotoChecklist/read?getOpenChecklists`);
    }
    submit(params): Observable<any> {
        return this.http.post(`/QualityPhotoChecklist/submit`, params);
    }


}
