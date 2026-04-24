import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';


@Injectable()
export class DataService<T> {
  /**
  * @param url  URL string passed from service class that extends
  * DataService.ts
  * @param http HTTPClient service instance that enables making HTTP
  * calls
  */
  constructor(
    @Inject('url') private url: string,
    public http: HttpClient
  ) { }

  private get baseUrl(): string {
    return String(this.url || '').replace(/\/+$/, '');
  }

  private get isApiV2(): boolean {
    return /^apiV2\//i.test(this.baseUrl);
  }

  /**
   *
   * @param params
   * @returns
   */
  findOne = async (params: Partial<T>): Promise<T> => {
    const result = queryString(params);
    if (this.isApiV2) {
      const rows = await firstValueFrom(this.http.get<T[] | any>(`${this.baseUrl}/find${result}`));
      return (rows?.[0] ?? null) as T;
    }

    return await firstValueFrom(this.http.get<T | any>(`${this.baseUrl}/findOne${result}`));
  }

  /**
   *
   * @param params
   * @returns
   */
  find = async (params: Partial<T>): Promise<T[]> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<T[] | any>(`${this.baseUrl}/find${result}`));
  }
  /**
   * Getl all
   */
  getAll = async (): Promise<T[]> => {
    if (this.isApiV2) {
      return await firstValueFrom(this.http.get<T[]>(`${this.baseUrl}`));
    }

    return await firstValueFrom(this.http.get<T[]>(`${this.baseUrl}/getAll`));
  };

  /**
   *
   * @param id
   * @returns
   */
  getById = async (id: number): Promise<T> => {
    if (this.isApiV2) {
      return await firstValueFrom(this.http.get<T>(`${this.baseUrl}/${id}`));
    }

    return await firstValueFrom(this.http.get<T>(`${this.baseUrl}/getById?id=${id}`));
  };

  /**
   *
   * @param params
   * @returns
   */
  create = async (params: Partial<T>): Promise<{ message: string, insertId?: number }> => {
    if (this.isApiV2) {
      return await firstValueFrom(this.http.post<{ message: string, insertId?: number }>(`${this.baseUrl}`, params));
    }

    return await firstValueFrom(this.http.post<{ message: string, insertId?: number }>(`${this.baseUrl}/create`, params));
  };

  /**
   *
   * @param id
   * @param params
   * @param options
   * @returns
   */
  update = async (id: string | number, params: Partial<T>): Promise<{ message: string }> => {
    if (this.isApiV2) {
      return await firstValueFrom(this.http.put<{ message: string }>(`${this.baseUrl}/${id}`, params));
    }

    return await firstValueFrom(this.http.put<{ message: string }>(`${this.baseUrl}/updateById?id=${id}`, params));
  };

  /**
   *
   * @param id
   * @returns
   */
  delete = async (id: number) => {
    if (this.isApiV2) {
      return await firstValueFrom(this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`));
    }

    return await firstValueFrom(this.http.delete<{ message: string }>(`${this.baseUrl}/deleteById?id=${id}`));
  };

  /**
   *
   * @param params
   * @returns
   */
  findByDateRange = async (fieldName: string, params: Partial<T>): Promise<T[]> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<T[] | any>(`${this.baseUrl}/findByDateRange${result}&fieldName=${fieldName}`));
  }

}
