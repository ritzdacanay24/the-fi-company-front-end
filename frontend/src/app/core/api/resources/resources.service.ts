import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';

export interface ResourceDto {
  id: number;
  category: string;
  title: string;
  description: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  icon: string;
  color: string;
  sort_order: number;
  active: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class ResourcesService {
  private readonly baseUrl = 'apiV2/resources';

  constructor(private readonly http: HttpClient) {}

  listActive(): Promise<ResourceDto[]> {
    return firstValueFrom(this.http.get<ResourceDto[]>(`${this.baseUrl}?activeOnly=1`));
  }

  create(payload: {
    category: string;
    title: string;
    description?: string;
    created_by_name?: string;
    active?: boolean;
  }, file: File): Promise<ResourceDto> {
    const formData = new FormData();
    formData.append('category', payload.category);
    formData.append('title', payload.title);
    formData.append('description', payload.description || '');
    formData.append('created_by_name', payload.created_by_name || '');
    formData.append('active', payload.active === false ? '0' : '1');
    formData.append('file', file);

    return firstValueFrom(this.http.post<ResourceDto>(this.baseUrl, formData));
  }

  update(
    id: number,
    payload: {
      category: string;
      title: string;
      description?: string;
      active: boolean;
    },
    file?: File,
  ): Promise<ResourceDto> {
    const formData = new FormData();
    formData.append('category', payload.category);
    formData.append('title', payload.title);
    formData.append('description', payload.description || '');
    formData.append('active', payload.active ? '1' : '0');

    if (file) {
      formData.append('file', file);
    }

    return firstValueFrom(this.http.put<ResourceDto>(`${this.baseUrl}/${id}`, formData));
  }

  remove(id: number): Promise<{ success: boolean }> {
    return firstValueFrom(this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`));
  }

  getSignedUrl(id: number, mode: 'inline' | 'attachment' = 'inline'): Promise<{ url: string; fileName: string }> {
    return firstValueFrom(this.http.get<{ url: string; fileName: string }>(`${this.baseUrl}/${id}/signed-url?mode=${mode}`));
  }

  downloadBlob(id: number): Promise<{ blob: Blob; fileName: string }> {
    return firstValueFrom(
      this.http.get(`${this.baseUrl}/${id}/download`, {
        responseType: 'blob',
        observe: 'response',
      }).pipe(
        map((response) => {
          const disposition = response.headers.get('content-disposition') || '';
          const match = /filename[^;=\n]*=((['"])([^'"]*)\2|([^;\n]*))/i.exec(disposition);
          const fileName = match ? decodeURIComponent(match[3] || match[4] || 'resource') : 'resource';
          return { blob: response.body as Blob, fileName };
        }),
      )
    );
  }
}
