import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';

let url = 'rfq';

@Injectable({
    providedIn: 'root'
})
export class RfqService extends DataService<any> {

    constructor(http: HttpClient) {
        super(url, http);
    }

    getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
        await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));


    searchBySoAndSoLine(soNumber: string, lineNumber: string): Observable<any> {
        return this.http.get<any>(`/Rfq/rfq?so=${soNumber}&line=${lineNumber}`);
    }

    async sendEmail(id, params) {
        params.SendFormEmail = 1;
        return await firstValueFrom(this.http.post(`/Rfq/send_email?id=${id}`, params));
    }

}
