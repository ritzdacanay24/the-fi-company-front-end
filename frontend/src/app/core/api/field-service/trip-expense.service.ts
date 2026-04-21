import { Injectable } from "@angular/core";
import { firstValueFrom, map } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { MindeeService } from "../mindee/mindee.service";
import { MindeeApiResponse, ExpenseReceiptPrediction, MindeeRequestOptions } from "../mindee/mindee-interfaces";

let url = "FieldServiceMobile/trip-expense";
const tripExpenseV2Url = 'apiV2/trip-expense';

@Injectable({
  providedIn: "root",
})
export class TripExpenseService {
  private readonly productionAttachmentsBaseUrl = 'https://dashboard.eye-fi.com/attachments/fieldService';

  constructor(
    private http: HttpClient,
    private mindeeService: MindeeService
  ) {}

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
    return this.mindeeService.parseExpenseReceipt(file, undefined, options);
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

    // Temporarily override API key for backward compatibility
    const originalGetApiKey = (this.mindeeService as any).getApiKey;
    (this.mindeeService as any).getApiKey = () => key;

    try {
      return await this.mindeeService.parseExpenseReceipt(file);
    } finally {
      // Restore original method
      (this.mindeeService as any).getApiKey = originalGetApiKey;
    }
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
    return firstValueFrom(this.http.get(`${url}/getPredictApi.php`));
  }

  async copyReceiptFile(params: {
    sourceLink: string;
    sourceReceiptId: number;
    targetWorkOrderId: string;
    targetFsId: string;
  }) {
    // This would copy the actual file and return new file details
    return this.http.post(`${url}/copy-file`, params).toPromise();
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
