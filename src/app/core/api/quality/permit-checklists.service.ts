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

const url = "Quality/permit-checklists/index.php";

@Injectable({
  providedIn: "root",
})
export class PermitChecklistsService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  bootstrap = async (): Promise<PermitChecklistBootstrapResponse> =>
    await firstValueFrom(this.http.get<PermitChecklistBootstrapResponse>(`${url}?action=bootstrap`));

  upsertTicket = async (ticket: any): Promise<any> =>
    await firstValueFrom(this.http.post(`${url}?action=upsert-ticket`, { ticket }));

  deleteTicket = async (ticketId: string): Promise<any> =>
    await firstValueFrom(this.http.post(`${url}?action=delete-ticket`, { ticketId }));

  hardDeleteTicket = async (ticketId: string, currentUserId: string): Promise<any> =>
    await firstValueFrom(this.http.post(`${url}?action=hard-delete`, { ticketId, currentUserId }));

  syncDirectories = async (customers: any[], architects: any[]): Promise<any> =>
    await firstValueFrom(
      this.http.post(`${url}?action=sync-directories`, {
        customers,
        architects,
      })
    );

  syncBillingDefaults = async (customerBillingDefaultsByType: Record<string, any[]>): Promise<any> =>
    await firstValueFrom(
      this.http.post(`${url}?action=sync-billing-defaults`, {
        customerBillingDefaultsByType,
      })
    );

  syncTransactions = async (transactions: any[]): Promise<any> =>
    await firstValueFrom(this.http.post(`${url}?action=sync-transactions`, { transactions }));
}
