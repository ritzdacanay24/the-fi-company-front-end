import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

const schedulerV2Url = 'apiV2/scheduler';

@Injectable({
  providedIn: 'root'
})
export class SchedulerService extends DataService<any> {

  constructor(http: HttpClient) {
    super(schedulerV2Url, http);
  }

  getConnectingJobsByTech(tech: string, dateFrom: string, dateTo: string) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/connectingJobsByTech?tech=${tech}&dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  /**events */
  getConnectingJobs(group_id: number) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/connectingJobs?group_id=${group_id}`))
  }

  getByIdRaw(fsid: number) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/${fsid}`))
  }

  getGroupJobs(group_id: number) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/groupJobs?group_id=${group_id}`))
  }

  getJobByUser(user: string) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/jobByUser?user=${user}`))
  }

  getAssignments(user: string, dateFrom: string, dateTo: string) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/assignments?user=${user}&dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  override getAll = async (): Promise<any[]> => await firstValueFrom(this.http.get<any[]>(`${schedulerV2Url}`));

  getByDateRange(dateFrom: string, dateTo: string) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/byDateRange?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  techSchedule(dateFrom: string, dateTo: string) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/techSchedule?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  getByDateRangeCalendar() {
    return firstValueFrom(this.http.get<any>(`https://dashboard.eye-fi.com/server/Api//FieldService/index?getTicketAssignmentsByTechs=1&techName=Ritz%20Dacanay&ticketStatus=Open`));
  }

  getSchedulerByDateRange(dateFrom: string, dateTo: string) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/schedulerByDateRange?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  getCalendar(dateFrom: string, dateTo: string) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/calendar?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  fsCalendar(dateFrom: string, dateTo: string) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/calendar?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  fsCalendarMap(dateFrom: string, dateTo: string) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/map?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  fsTechCalendar(dateFrom: string, dateTo: string) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/techSchedule?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  getBillinReportByDate(date: string, woNumber: string) {
    return this.http.get<any>(`${schedulerV2Url}/${woNumber}`);
  }

  searchByQadPartNumber(q: string, currentCompanySelection: string): Observable<any> {
    let apiURL = `https://dashboard.eye-fi.com/tasks/fieldService/customer_item_search.php?q=${q}&currentCompanySelection=${currentCompanySelection}`;
    return this.http.get(apiURL)
  }

  getMap(dateFrom: string, dateTo: string) {
    return firstValueFrom(this.http.get<any>(`${schedulerV2Url}/map?dateFrom=${dateFrom}&dateTo=${dateTo}`));
  }
}
