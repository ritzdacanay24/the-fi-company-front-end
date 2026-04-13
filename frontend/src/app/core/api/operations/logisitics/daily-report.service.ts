import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

let url = 'operations/logistics';

@Injectable({
    providedIn: 'root'
})
export class LogisiticsDailyReportService {

    constructor(private http: HttpClient) { }

    getDailyReport = async () =>
        await firstValueFrom(this.http.get<any[]>(`${url}/daily-report`));


    async getDailyReportConfig(userId) {
        return await firstValueFrom(this.http.get<any[]>(`${url}/daily-report-config?user_id=${userId}`));
    }

    async saveDailyReportConfig(params) {
        return await firstValueFrom(this.http.post<any[]>(`${url}/daily-report-config-save`, params));
    }

    async deleteDailyReportConfig(user_id) {
        return await firstValueFrom(this.http.delete<any[]>(`${url}/daily-report-config-delete?user_id=${user_id}`));
    }

    



}
