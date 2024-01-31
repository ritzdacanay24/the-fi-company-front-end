import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/scheduler';

@Injectable({
  providedIn: 'root'
})
export class SchedulerService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getConnectingJobsByTech(tech, dateFrom, dateTo) {
    return firstValueFrom(this.http.get(`${url}/getConnectingJobsByTech.php?tech=${tech}&dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  /**events */
  getConnectingJobs(group_id) {
    return firstValueFrom(this.http.get(`${url}/getConnectingJobs.php?group_id=${group_id}`))
  }

  getByIdRaw(fsid) {
    return firstValueFrom(this.http.get(`${url}/getByIdRaw.php?id=${fsid}`))
  }

  getGroupJobs(group_id) {
    return firstValueFrom(this.http.get(`${url}/getGroupJobs.php?group_id=${group_id}`))
  }

  getJobByUser(user) {
    return firstValueFrom(this.http.get(`${url}/getJobByUser.php?user=${user}`))
  }

  getAssignments(user, dateFrom, dateTo) {
    return firstValueFrom(this.http.get(`${url}/assignments.php?user=${user}&dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  override getAll = async (): Promise<any[]> => await firstValueFrom(this.http.get<any[]>(`${url}/getAll.php`));

  getByDateRange(dateFrom, dateTo) {
    return firstValueFrom(this.http.get(`${url}/getByDateRange.php?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  techSchedule(dateFrom, dateTo) {
    return firstValueFrom(this.http.get(`${url}/techSchedule.php?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  customer_part_search
  getByDateRangeCalendar() {
    return firstValueFrom(this.http.get<any>(`https://dashboard.eye-fi.com/server/Api//FieldService/index?getTicketAssignmentsByTechs=1&techName=Ritz%20Dacanay&ticketStatus=Open`));
  }

  getSchedulerByDateRange(dateFrom, dateTo) {
    return firstValueFrom(this.http.get(`${url}/getSchedulerByDateRange.php?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  getCalendar(dateFrom, dateTo) {
    return firstValueFrom(this.http.get(`${url}/getCalendar.php?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  //
  fsCalendar(dateFrom, dateTo) {
    return firstValueFrom(this.http.get(`${url}/fsCalendar.php?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }
  fsTechCalendar(dateFrom, dateTo) {
    return firstValueFrom(this.http.get(`${url}/fsTechCalendar.php?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }


  getBillinReportByDate(date: string, woNumber: string) {
    return this.http.get<any>(`${url}/getBillingByFsId?date=&fsId=${woNumber}`);
  }

  searchByQadPartNumber(q: string, currentCompanySelection): Observable<any> {
    let apiURL = `https://dashboard.eye-fi.com/tasks/fieldService/customer_item_search.php?q=${q}&currentCompanySelection=${currentCompanySelection}`;
    return this.http.get(apiURL)
  }
}
