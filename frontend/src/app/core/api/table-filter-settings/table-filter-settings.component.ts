import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';
import { AuthenticationService } from '@app/core/services/auth.service';

let url = 'tableFilterSettings';

@Injectable({
  providedIn: 'root'
})
export class TableFilterSettingsService extends DataService<any> {

  constructor(http: HttpClient, private authenticationService: AuthenticationService) {
    super(url, http);
  }

  async saveTableSettings(id, params) {
    return await firstValueFrom(this.http.put(`${url}/updateById?id=${id}`, params))
  }

  /**
   *
   * @param params
   * @returns
   */
  getTableByUserId = async (params): Promise<any> => {
    const result = queryString(params);
    let data = await firstValueFrom(this.http.get<any[] | any>(`${url}/find.php${result}&userId=${this.authenticationService.currentUserValue.id}`));

    var currentView: any = data.filter((pilot) => pilot.table_default === 1)
    
    return {
      currentView: currentView?.length ? { ...currentView[0], data: JSON.parse(currentView[0].data) } : false,
      data
    }
  }

}
