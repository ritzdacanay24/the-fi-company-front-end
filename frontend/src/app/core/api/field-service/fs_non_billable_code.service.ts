import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

const nonBillableCodeV2Url = 'apiV2/non-billable-code';

@Injectable({
  providedIn: 'root'
})
export class NonBillableCodeService extends DataService<any> {

  constructor(http: HttpClient) {
    super(nonBillableCodeV2Url, http);
  }

  getAllRequests = async (selectedViewType?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${nonBillableCodeV2Url}/getAll?selectedViewType=${selectedViewType}`));

  override getAll = async (): Promise<any[]> =>
    firstValueFrom(this.http.get<any[]>(`${nonBillableCodeV2Url}/getAll`));

}
