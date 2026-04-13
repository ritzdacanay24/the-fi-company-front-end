import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'FieldServiceMobile/reports';

@Injectable({
  providedIn: 'root'
})
export class ReportService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  jobByLocation = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/jobByLocation?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getPlatformAvg = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getPlatformAvg?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getExpenseReport = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getExpenseReport?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getServiceReport = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getServiceReport?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getCustomerReport = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getCustomerReport?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getInvoiceReport = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getInvoiceReport?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getJobByUserReport = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getJobByUserReport?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getJobByUserReportChart = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getJobByUserReportChart?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getExpenseReportChart = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getExpenseReportChart?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getInvoiceByCustomerChart = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getInvoiceByCustomerChart?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getServiceReportChart = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getServiceReportChart?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getContractorVsTechReport = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getContractorVsTechReport?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getContractorVsTechReportChart = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getContractorVsTechReportChart?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getTicketEventReport = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getTicketEventReport?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getTicketEventReportChart = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getTicketEventReportChart?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

}
