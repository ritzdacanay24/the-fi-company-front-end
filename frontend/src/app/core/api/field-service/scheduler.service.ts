import { Injectable } from '@angular/core';
import { Observable, firstValueFrom, map } from 'rxjs';
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

  override findOne = async (params: Partial<any>): Promise<any> => {
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );

    if (!Object.keys(cleanParams).length) {
      return null;
    }

    const query = new URLSearchParams(cleanParams as Record<string, string>).toString();
    const data = await firstValueFrom(this.http.get<any[]>(`${schedulerV2Url}/find?${query}`));
    return data?.[0] ?? null;
  };

  override getById = async (id: string | number): Promise<any> => {
    const normalized = Number(id);
    if (!Number.isFinite(normalized)) {
      return null;
    }

    return firstValueFrom(this.http.get<any>(`${schedulerV2Url}/${normalized}`));
  };

  getByDateRange(dateFrom: string, dateTo: string) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/byDateRange?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  techSchedule(dateFrom: string, dateTo: string) {
    return firstValueFrom(this.http.get(`${schedulerV2Url}/techSchedule?dateFrom=${dateFrom}&dateTo=${dateTo}`))
  }

  getByDateRangeCalendar() {
    const today = new Date().toISOString().slice(0, 10);
    return firstValueFrom(this.http.get<any>(`${schedulerV2Url}/techSchedule?dateFrom=${today}&dateTo=${today}`));
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
    const safeQuery = encodeURIComponent(String(q || '').trim());
    const safeCompany = String(currentCompanySelection || '').trim();

    return this.http.get<any[]>(`apiV2/qad/searchCustomerPartNumber?text=${safeQuery}`).pipe(
      // Preserve response shape expected by existing ng-select templates.
      map((rows) => (rows || [])
        .filter((row) => !safeCompany || String(row?.cp_cust || row?.CP_CUST || '').trim() === safeCompany)
        .map((row) => {
          const description = String(row?.description || row?.DESCRIPTION || '');
          const [ptDesc1 = '', ...rest] = description.split('-');
          const ptDesc2 = rest.join('-').trim();

          return {
            ...row,
            pt_desc1: row?.pt_desc1 ?? row?.PT_DESC1 ?? ptDesc1.trim(),
            pt_desc2: row?.pt_desc2 ?? row?.PT_DESC2 ?? ptDesc2,
          };
        })),
    );
  }

  getMap(dateFrom: string, dateTo: string) {
    return firstValueFrom(this.http.get<any>(`${schedulerV2Url}/map?dateFrom=${dateFrom}&dateTo=${dateTo}`));
  }
}
