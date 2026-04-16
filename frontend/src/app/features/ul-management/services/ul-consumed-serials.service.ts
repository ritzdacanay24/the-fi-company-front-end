import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UlConsumedSerialsService {
  constructor(private readonly http: HttpClient) {}

  async getAllConsumedSerials(filters?: any): Promise<any> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach((key) => {
        const value = filters[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return await firstValueFrom(this.http.get('apiv2/ul-labels/consumed-serials', { params }));
  }
}
