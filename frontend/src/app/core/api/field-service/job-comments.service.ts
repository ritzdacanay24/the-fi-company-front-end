import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

const jobCommentsV2Url = 'apiV2/job-comments';

@Injectable({
  providedIn: 'root'
})
export class JobCommentsService extends DataService<any> {

  constructor(http: HttpClient) {
    super(jobCommentsV2Url, http);
  }

  override getAll = async (): Promise<any[]> =>
    firstValueFrom(this.http.get<any[]>(`${jobCommentsV2Url}`));

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${jobCommentsV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(
      this.http.post<{ id?: number; insertId?: number; message?: string }>(`${jobCommentsV2Url}`, params),
    );

    return {
      message: response?.message ?? 'Created',
      insertId: response?.insertId ?? response?.id,
    };
  };

  override update = async (id: string | number, params: Partial<any>): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<any>(`${jobCommentsV2Url}/${id}`, params));
    return { message: 'Updated' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<any>(`${jobCommentsV2Url}/${id}`));
    return { message: 'Deleted' };
  };

  getJobCommentsByFsId(fsId?: any) {
    return this.http.get<any>(`${jobCommentsV2Url}/getJobCommentsByFsId?fsId=${fsId}`).toPromise();
  }

}
