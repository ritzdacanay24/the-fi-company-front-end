import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

const url = 'FieldServiceMobile/reports';
const reportsV2Url = 'apiV2/reports';

@Injectable({
  providedIn: 'root'
})
export class ReportService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  jobByLocation = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/jobByLocation?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getPlatformAvg = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getPlatformAvg?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getExpenseReport = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getExpenseReport?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getServiceReport = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getServiceReport?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getCustomerReport = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getCustomerReport?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getInvoiceReport = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getInvoiceReport?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getJobByUserReport = async (dateFrom?: string, dateTo?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getJobByUserReport?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getJobByUserReportChart = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getJobByUserReportChart?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getExpenseReportChart = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getExpenseReportChart?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getInvoiceByCustomerChart = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getInvoiceByCustomerChart?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getServiceReportChart = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getServiceReportChart?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getContractorVsTechReport = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getContractorVsTechReport?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getContractorVsTechReportChart = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getContractorVsTechReportChart?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getTicketEventReport = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getTicketEventReport?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

  getTicketEventReportChart = async (dateFrom?: string, dateTo?: string, typeOfView = 'Monthly') =>
    await firstValueFrom(this.http.get<any[]>(`${reportsV2Url}/getTicketEventReportChart?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`));

}
