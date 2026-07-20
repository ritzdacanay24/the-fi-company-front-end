import { Injectable } from "@angular/core";
import { firstValueFrom, map } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { MindeeApiResponse, ExpenseReceiptPrediction, MindeeRequestOptions } from "../mindee/mindee-interfaces";
import { environment } from "src/environments/environment";

const tripExpenseV2Url = 'apiV2/trip-expense';

@Injectable({
  providedIn: "root",
})
export class TripExpenseService {
  private readonly productionAttachmentsBaseUrl = 'https://dashboard.eye-fi.com/attachments/fieldService';

  constructor(private http: HttpClient) {}

  /**
   * Parse expense receipt using Mindee API (new implementation)
   * @param file - The receipt image file
   * @param options - Optional Mindee API parameters
   * @returns Promise with parsed receipt data
   */
  async parseExpenseReceipt(
    file: File,
    options?: MindeeRequestOptions
  ): Promise<MindeeApiResponse<ExpenseReceiptPrediction>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('modelId', 'c3254c99-5d36-4f4d-85b5-16066a62f865');
    formData.append('apiKey', environment.mindeeApiKey || '');

    if (options) {
      if (options.raw_text === true) {
        formData.append('raw_text', 'true');
      }
      if (options.polygon === true) {
        formData.append('polygon', 'true');
      }
      if (options.rag === true) {
        formData.append('rag', 'true');
      }
      if (options.alias) {
        formData.append('alias', options.alias);
      }
    }

    return firstValueFrom(
      this.http.post<MindeeApiResponse<ExpenseReceiptPrediction>>(`${tripExpenseV2Url}/parse-receipt`, formData)
    );
  }

  /**
   * @deprecated Use parseExpenseReceipt instead
   * Legacy method for backward compatibility
   */
  predictApi = async (formData: FormData, key: string) => {
    console.warn('predictApi is deprecated. Use parseExpenseReceipt method instead.');
    
    // Extract file from FormData for new API
    const file = formData.get('document') as File;
    if (!file) {
      throw new Error('No file found in FormData');
    }

    const options: MindeeRequestOptions = {
      raw_text: formData.get('raw_text') === 'true' ? true : undefined,
      polygon: formData.get('polygon') === 'true' ? true : undefined,
      rag: formData.get('rag') === 'true' ? true : undefined,
      alias: String(formData.get('alias') || '') || undefined,
    };

    // Keep backward-compatible signature; key argument is no longer needed because
    // extraction is now routed through backend parse endpoint.
    void key;
    return this.parseExpenseReceipt(file, options);
  };

  getByWorkOrderId(workOrderId) {
    return firstValueFrom(
      this.http
        .get<any[]>(`${tripExpenseV2Url}/getByWorkOrderId?workOrderId=${workOrderId}`)
        .pipe(map((rows) => this.normalizeRows(rows)))
    );
  }

  getByFsId(fs_scheduler_id) {
    return firstValueFrom(
      this.http
        .get<any[]>(`${tripExpenseV2Url}/getByFsId?fs_scheduler_id=${fs_scheduler_id}`)
        .pipe(map((rows) => this.normalizeRows(rows)))
    );
  }

  getById(id) {
    return firstValueFrom(
      this.http
        .get<any>(`${tripExpenseV2Url}/${id}`)
        .pipe(map((row) => this.normalizeRow(row)))
    );
  }

  updateById(id, params) {
    return firstValueFrom(this.http.put(`${tripExpenseV2Url}/${id}`, params));
  }

  update(id, params) {
    return firstValueFrom(this.http.put(`${tripExpenseV2Url}/${id}`, params));
  }

  deleteById(id) {
    return firstValueFrom(this.http.delete(`${tripExpenseV2Url}/${id}`));
  }

  create(params) {
    return firstValueFrom(this.http.post(`${tripExpenseV2Url}`, params));
  }

  getPredictApi(id) {
    return Promise.resolve(environment.mindeeApiKey || null);
  }

  async copyReceiptFile(params: {
    sourceLink: string;
    sourceReceiptId: number;
    targetWorkOrderId: string;
    targetFsId: string;
  }) {
    // Not wired to apiV2 yet; keep signature and fail fast instead of silently hitting legacy endpoints.
    throw new Error('copyReceiptFile is not available in apiV2 yet.');
  }

  // Alternative method if you want to get receipts by workOrderId
  // async getByWorkOrderId(workOrderId: string) {
  //   return this.http.get(`${this.url}/by-work-order/${workOrderId}`).toPromise();
  // }

  private normalizeRows(rows: any[]): any[] {
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row) => this.normalizeRow(row));
  }

  private normalizeRow(row: any): any {
    if (!row || typeof row !== 'object') {
      return row;
    }

    const fileName = typeof row.fileName === 'string' ? row.fileName.trim() : '';
    const currentLink = typeof row.link === 'string' ? row.link.trim() : '';

    // Bucket-stored files: URL contains S3 hostname or storage_source says bucket.
    // Leave them untouched — the display layer signs them.
    if (row.storage_source === 'bucket' || currentLink.includes('.amazonaws.com') || currentLink.includes('.s3.')) {
      return row;
    }

    if (currentLink.startsWith('https://dashboard.eye-fi.com/attachments/')) {
      return row;
    }

    if (!fileName) {
      return row;
    }

    return {
      ...row,
      link: `${this.productionAttachmentsBaseUrl}/${encodeURIComponent(fileName)}`,
    };
  }
}
