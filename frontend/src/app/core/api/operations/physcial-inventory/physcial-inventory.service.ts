import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { DataService } from '../../DataService';
import { Observable, firstValueFrom } from 'rxjs';

let url = 'operations/physcial-inventory';
const physicalInventoryV2Url = 'apiV2/physical-inventory';
const TARGET_STORAGE_KEY = 'physical-inventory-qad-target';

export type PhysicalInventoryTarget = 'dev' | 'test' | 'prod';

@Injectable({
  providedIn: 'root'
})
export class PhyscialInventoryService extends DataService<any> {

  readonly availableTargets: PhysicalInventoryTarget[] = ['dev', 'test', 'prod'];

  constructor(http: HttpClient) {
    super(url, http);
  }

  getTarget(): PhysicalInventoryTarget {
    const saved = String(localStorage.getItem(TARGET_STORAGE_KEY) || '').trim().toLowerCase();
    if (saved === 'dev' || saved === 'test' || saved === 'prod') {
      return saved;
    }

    return 'prod';
  }

  setTarget(target: PhysicalInventoryTarget): void {
    localStorage.setItem(TARGET_STORAGE_KEY, target);
  }

  private buildTargetParams(target?: PhysicalInventoryTarget): HttpParams {
    return new HttpParams().set('target', target || this.getTarget());
  }

  getTags = async (target?: PhysicalInventoryTarget) =>
    await firstValueFrom(
      this.http.get<any[]>(`${physicalInventoryV2Url}/inventory_tags`, {
        params: this.buildTargetParams(target),
      }),
    );


  save(params, target?: PhysicalInventoryTarget): Observable<any> {
    return this.http.post(`${physicalInventoryV2Url}/save`, params, {
      params: this.buildTargetParams(target),
    });
  }

  updatePrint(params, target?: PhysicalInventoryTarget): Observable<any> {
    return this.http.post(`${physicalInventoryV2Url}/save`, params, {
      params: this.buildTargetParams(target),
    });
  }


}
