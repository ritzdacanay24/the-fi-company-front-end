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

  syncTransactions = async (transactions: any[]): Promise<any> =>
    await firstValueFrom(this.http.post(`${url}/sync-transactions`, { transactions }));
}
