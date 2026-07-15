import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';
import { FeatureType } from '@app/shared/enums/feature.enum';

const url = 'apiV2/attachments';
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

  getViewById = async (
    id: number,
  ): Promise<{ id: number; url: string; fileName?: string; storage_source?: string | null }> => {
    return await firstValueFrom(
      this.http.get<{ id: number; url: string; fileName?: string; storage_source?: string | null }>(`${url}/viewById/${id}`),
    );
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

  uploadRequestAttachmentPublic(requestId: number | string, token: string, file: File) {
    const payload = new FormData();
    payload.append('file', file);

    const encodedId = encodeURIComponent(String(requestId));
    const encodedToken = encodeURIComponent(String(token || '').trim());

    return firstValueFrom(
      this.http.post(
        `${publicFieldServiceBaseUrl}/requests/${encodedId}/attachments?token=${encodedToken}`,
        payload,
      ),
    );
  }

  uploadQirAttachmentPublic(qirId: number | string, file: File) {
    const payload = new FormData();
    payload.append('file', file);

    const encodedId = encodeURIComponent(String(qirId));
    return firstValueFrom(this.http.post(`${url}/public/qir/${encodedId}/upload`, payload));
  }
  
  getAttachmentByQirId(id: any) {
    return firstValueFrom(this.http.get<any[]>(
      `${url}/find?field=${encodeURIComponent('Capa Request')}&uniqueId=${encodeURIComponent(String(id ?? ''))}`,
    ));
  }

  /**
   * Get attachments for a feature and resource ID
   * Type-safe with FeatureType enum
   * 
   * @param feature - Feature identifier (strongly typed enum)
   * @param id - Resource ID (ticket ID, order ID, etc.)
   * @returns Promise with array of attachments
   * 
   * @example
   * const attachments = await attachmentsService.getAttachmentsByFeature(
   *   FeatureType.SUPPORT_TICKETS,
   *   ticketId
   * );
   */
  getAttachmentsByFeature = async (feature: FeatureType, id: number): Promise<any[]> => {
    const encodedFeature = encodeURIComponent(String(feature));
    const getUrl = `apiV2/attachments/${encodedFeature}/${id}`;
    return firstValueFrom(this.http.get<any[]>(getUrl));
  };

  /**
   * Generic attachment upload for any feature
   * Type-safe with FeatureType enum
   * 
   * @param feature - Feature identifier (strongly typed enum) - must be a valid FeatureType
   * @param id - Resource ID (ticket ID, order ID, etc.)
   * @param formData - FormData containing the file
   * @returns Promise with attachment details
   * 
   * @example
   * const response = await attachmentsService.uploadAttachment(
   *   FeatureType.SUPPORT_TICKETS,
   *   ticketId,
   *   formData
   * );
   */
  uploadAttachment = async (feature: FeatureType, id: number, formData: FormData): Promise<any> => {
    const encodedFeature = encodeURIComponent(String(feature));
    const uploadUrl = `apiV2/attachments/${encodedFeature}/${id}/upload`;
    return firstValueFrom(this.http.post<any>(uploadUrl, formData));
  };

  /**
   * Load attachments from unified feature endpoint and optional legacy field names,
   * then normalize, dedupe, and sort for UI consumption.
   */
  getMergedAttachmentsByFeature = async (
    feature: FeatureType,
    resourceId: number | string,
    legacyFieldNames: string[] = [],
    options?: { legacyIdField?: 'uniqueId' | 'mainId' },
  ): Promise<any[]> => {
    const numericId = Number(resourceId);
    if (!Number.isFinite(numericId)) {
      return [];
    }

    const legacyIdField = options?.legacyIdField || 'uniqueId';

    const [featureRows, ...legacyResults] = await Promise.all([
      this.getAttachmentsByFeature(feature, numericId).catch(() => []),
      ...legacyFieldNames.map((field) =>
        this.find({ field, [legacyIdField]: String(resourceId) }).catch(() => []),
      ),
    ]);

    const normalizedFeatureRows = (Array.isArray(featureRows) ? featureRows : []).map((row: any) =>
      this.normalizeAttachmentRow(row),
    );

    const normalizedLegacyRows = legacyResults
      .flatMap((rows) => (Array.isArray(rows) ? rows : []))
      .map((row: any) => this.normalizeAttachmentRow(row));

    const uniqueByKey = new Map<string, any>();
    [...normalizedFeatureRows, ...normalizedLegacyRows].forEach((row: any) => {
      const key = this.getAttachmentDedupeKey(row);
      if (!uniqueByKey.has(key)) {
        uniqueByKey.set(key, row);
      }
    });

    return Array.from(uniqueByKey.values()).sort((a, b) => {
      const left = new Date(a?.created_at || a?.createdDate || 0).getTime();
      const right = new Date(b?.created_at || b?.createdDate || 0).getTime();
      return right - left;
    });
  };

  /**
   * Upload multiple files through unified feature endpoint.
   */
  uploadFilesByFeature = async (
    feature: FeatureType,
    resourceId: number | string,
    files: File[],
  ): Promise<{ uploaded: number; failed: number }> => {
    const numericId = Number(resourceId);
    if (!Number.isFinite(numericId) || !Array.isArray(files) || files.length === 0) {
      return { uploaded: 0, failed: 0 };
    }

    let uploaded = 0;
    let failed = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        await this.uploadAttachment(feature, numericId, formData);
        uploaded++;
      } catch {
        failed++;
      }
    }

    return { uploaded, failed };
  };

  private normalizeAttachmentRow(row: any): any {
    return {
      ...row,
      file_name:
        row?.file_name ||
        row?.fileName ||
        row?.name ||
        row?.filename ||
        row?.originalName ||
        row?.original_name ||
        'Attachment',
      file_url: row?.file_url || row?.link || row?.url || row?.previewUrl || row?.path || '',
    };
  }

  private getAttachmentDedupeKey(row: any): string {
    const id = Number(row?.id);
    if (Number.isFinite(id)) {
      return `id:${id}`;
    }

    const name = String(row?.file_name || '').trim();
    const url = String(row?.file_url || '').trim();
    const created = String(row?.created_at || row?.createdDate || '').trim();

    return `meta:${name}|${url}|${created}`;
  }

}
