import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { DataService } from "../DataService";

interface PermitChecklistBootstrapResponse {
  success: boolean;
  data?: {
    tickets?: any[];
    transactions?: any[];
    customers?: any[];
    architects?: any[];
    customerBillingDefaultsByType?: Record<string, any[]>;
  };
}

const url = "apiV2/permit-checklists";

@Injectable({
  providedIn: "root",
})
export class PermitChecklistsService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  bootstrap = async (): Promise<PermitChecklistBootstrapResponse> =>
    await firstValueFrom(this.http.get<PermitChecklistBootstrapResponse>(`${url}/bootstrap`));

  upsertTicket = async (ticket: any): Promise<any> =>
    await firstValueFrom(this.http.post(`${url}/upsert-ticket`, { ticket }));

  deleteTicket = async (ticketId: string): Promise<any> =>
    await firstValueFrom(this.http.post(`${url}/delete-ticket`, { ticketId }));

  hardDeleteTicket = async (ticketId: string, currentUserId: string): Promise<any> =>
    await firstValueFrom(this.http.post(`${url}/hard-delete`, { ticketId, currentUserId }));

  syncDirectories = async (customers: any[], architects: any[]): Promise<any> =>
    await firstValueFrom(
      this.http.post(`${url}/sync-directories`, {
        customers,
        architects,
      })
    );

  syncBillingDefaults = async (customerBillingDefaultsByType: Record<string, any[]>): Promise<any> =>
    await firstValueFrom(
      this.http.post(`${url}/sync-billing-defaults`, {
        customerBillingDefaultsByType,
      })
    );

  removeAttachment = async (ticketId: string, attachmentId: string): Promise<any> =>
    await firstValueFrom(this.http.post(`${url}/remove-attachment`, { ticketId, attachmentId }));

  uploadAttachmentFile = async (ticketId: string, file: File, uploadedBy: string): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("ticketId", ticketId);
    formData.append("uploadedBy", uploadedBy);

    return await firstValueFrom(this.http.post(`${url}/upload-attachment`, formData));
  };

  syncTransactions = async (transactions: any[]): Promise<any> =>
    await firstValueFrom(this.http.post(`${url}/sync-transactions`, { transactions }));
}
