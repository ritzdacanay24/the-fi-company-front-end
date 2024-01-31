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

  /**
   *
   * @param params
   * @returns
   */
  findOne = async (params: Partial<T>): Promise<T> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<T | any>(`${this.url}/findOne.php${result}`));
  }

  /**
   *
   * @param params
   * @returns
   */
  find = async (params: Partial<T>): Promise<T[]> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<T[] | any>(`${this.url}/find.php${result}`));
  }
  /**
   * Getl all
   */
  getAll = async (): Promise<T[]> => await firstValueFrom(this.http.get<T[]>(`${this.url}/getAll.php`));

  /**
   *
   * @param id
   * @returns
   */
  getById = async (id: number): Promise<T> => await firstValueFrom(this.http.get<T>(`${this.url}/getById.php?id=${id}`));

  /**
   *
   * @param params
   * @returns
   */
  create = async (params: Partial<T>): Promise<{ message: string, insertId?: number }> => await firstValueFrom(this.http.post<{ message: string, insertId?: number }>(`${this.url}/create.php`, params));

  /**
   *
   * @param id
   * @param params
   * @param options
   * @returns
   */
  update = async (id: string | number, params: Partial<T>): Promise<{ message: string }> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.put<{ message: string }>(`${this.url}/updateById.php${result}&id=${id}`, params));
  }

  /**
   *
   * @param id
   * @returns
   */
  delete = async (id: number) => await firstValueFrom(this.http.delete<{ message: string }>(`${this.url}/deleteById.php?id=${id}`));

  /**
   *
   * @param params
   * @returns
   */
  findByDateRange = async (fieldName: string, params: Partial<T>): Promise<T[]> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<T[] | any>(`${this.url}/findByDateRange${result}&fieldName=${fieldName}`));
  }

}
