import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'Quality/overview';

@Injectable({
  providedIn: 'root'
})
export class OverviewService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getOpenRequests = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getOpenRequests`));

  getOpenJobs = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getOpenJobs`));

  getOpenTickets = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getOpenTickets`));

  getOpenInvoice = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getOpenInvoice`));

  getInvoiceSummary = async (dateFrom, dateTo) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getInvoiceSummary?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getJobSummary = async (dateFrom, dateTo) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getJobSummary?dateFrom=${dateFrom}&dateTo=${dateTo}`));



}
