import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';

const url = 'apiV2/attachments';
const publicFieldServiceAttachmentsUrl = 'apiV2/public/field-service/attachments';
const publicFieldServiceBaseUrl = 'apiV2/public/field-service';

@Injectable({
  providedIn: 'root'
})

export class AttachmentsService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  override find = async (params: any): Promise<any[]> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any[]>(`${url}/find${result}`));
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<{ rowCount: number }>(`${url}/${id}`));
    return { message: 'Successfully deleted' };
  };

  getViewById = async (id: number): Promise<{ id: number; url: string; fileName?: string; storage_source?: string | null }> => {
    return await firstValueFrom(this.http.get<{ id: number; url: string; fileName?: string; storage_source?: string | null }>(`${url}/viewById/${id}`));
  };


  getAttachmentByRequestId(id: any, token?: string | null) {
    const requestId = encodeURIComponent(String(id ?? ''));
    const normalizedToken = String(token ?? '').trim();

    if (normalizedToken) {
      return firstValueFrom(
        this.http.get<any[]>(
          `${publicFieldServiceBaseUrl}/requests/${requestId}/attachments?token=${encodeURIComponent(normalizedToken)}`,
        ),
      ).then((response: any) => {
        if (Array.isArray(response)) {
          return response;
        }

        return Array.isArray(response?.attachments) ? response.attachments : [];
      });
    }

    return firstValueFrom(this.http.get<any[]>(
      `${url}/find?field=${encodeURIComponent('Field Service Request')}&uniqueId=${requestId}`,
    ));
  }

  getAttachments(start: string): Observable<any> {
    return this.http.get<any>(`/Attachments/index?getAttachments=${start}`);
  }

  private normalizeV2Payload(file: any): FormData {
    if (!(file instanceof FormData)) {
      return file as FormData;
    }

    const hasSubFolder = !!file.get('subFolder');
    if (!hasSubFolder) {
      const folderName = file.get('folderName');
      if (typeof folderName === 'string' && folderName.trim()) {
        file.append('subFolder', folderName.trim());
      }
    }

    return file;
  }

  uploadfile(file: any) {
    const payload = this.normalizeV2Payload(file);
    return firstValueFrom(this.http.post(`${url}`, payload));
  }

  //public

  uploadfilePublic(file: any) {
    const payload = this.normalizeV2Payload(file);
    return firstValueFrom(this.http.post(`${publicFieldServiceAttachmentsUrl}`, payload));
  }
  
  getAttachmentByQirId(id: any) {
    return firstValueFrom(this.http.get<any[]>(
      `${url}/find?field=${encodeURIComponent('Capa Request')}&uniqueId=${encodeURIComponent(String(id ?? ''))}`,
    ));
  }

}
