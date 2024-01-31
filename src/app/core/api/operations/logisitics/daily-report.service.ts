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

}
