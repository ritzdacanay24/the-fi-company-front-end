import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const url = 'apiV2/shipping-checklists';

export interface ShippingChecklistTemplateQuestion {
  questionOrder: number;
  questionCode: string;
  questionText: string;
  isRequired: boolean;
}

export interface ShippingChecklistTemplate {
  id: number;
  customerCode: string;
  customerName: string;
  formTitle: string;
  formCode: string;
  logoText: string;
  logoUrl?: string | null;
  assignedVerifierUserId?: number | null;
  assignedVerifierName?: string | null;
  assignedVerifierEmail?: string | null;
  questions: ShippingChecklistTemplateQuestion[];
}

export interface ShippingChecklistTemplateUpsertPayload {
  customerName: string;
  formTitle: string;
  formCode: string;
  logoText: string;
  assignedVerifierUserId?: number | null;
  assignedVerifierName?: string | null;
  assignedVerifierEmail?: string | null;
  questions: ShippingChecklistTemplateQuestion[];
}

export interface ShippingChecklistLine {
  lineOrder: number;
  isSelected?: boolean;
  partNumber: string;
  qty: string;
  serialNumber?: string;
  serialNumbers?: string[];
  palletQty: string;
}

export interface ShippingChecklistResponse {
  questionCode: string;
  questionText: string;
  responseValue: 'yes' | 'no' | 'na' | '';
  imageUrls?: string[];
}

export interface ShippingChecklistInstancePayload {
  templateId: number;
  customerCode: string;
  customerName: string;
  formTitle: string;
  formCode?: string;
  status: 'draft' | 'submitted' | 'verified';
  formDate: string | null;
  shipVia: string;
  shippingAccount: string;
  salesOrder: string;
  packingSlip: string;
  arrivalDate: string | null;
  totalPallets: number | null;
  verifierName: string;
  verifierDate: string | null;
  secondVerifierName: string;
  secondVerifierEmail: string;
  secondVerifierDate: string | null;
  notes: string;
  createdBy: string;
  lines: ShippingChecklistLine[];
  responses: ShippingChecklistResponse[];
}

export interface ShippingChecklistCustomerSetting {
  id: number;
  customerCode: string;
  customerName: string;
  logoUrl?: string | null;
  isActive: boolean;
  mappingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingChecklistCustomerSettingUpsertPayload {
  id?: number;
  customerCode: string;
  customerName: string;
  logoUrl?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ShippingChecklistsService {
  constructor(private readonly http: HttpClient) {}

  getTemplates = async (): Promise<ShippingChecklistTemplate[]> => {
    const response = await firstValueFrom(this.http.get<ShippingChecklistTemplate[] | { templates?: ShippingChecklistTemplate[] }>(`${url}/templates`));

    if (Array.isArray(response)) {
      return response;
    }

    return Array.isArray(response?.templates) ? response.templates : [];
  };

  getInstances = async (): Promise<any[]> => {
    const response = await firstValueFrom(this.http.get<any[] | { instances?: any[] }>(`${url}/instances`));

    if (Array.isArray(response)) {
      return response;
    }

    return Array.isArray(response?.instances) ? response.instances : [];
  };

  getInstance = async (id: number): Promise<{ instance: any | null; success?: boolean; error?: string }> => {
    const response = await firstValueFrom(this.http.get<any>(`${url}/instances/${id}`));

    if (response && typeof response === 'object' && 'data' in response) {
      return {
        success: Boolean(response.success ?? true),
        error: typeof response.error === 'string' ? response.error : undefined,
        instance: response.data ?? null,
      };
    }

    if (response && typeof response === 'object' && 'instance' in response) {
      return { instance: response.instance ?? null, success: Boolean(response.success ?? true) };
    }

    return { instance: response ?? null, success: true };
  };

  createInstance = async (payload: ShippingChecklistInstancePayload): Promise<{ success: boolean; id?: number; error?: string }> => {
    const response = await firstValueFrom(this.http.post<{ success: boolean; instanceId?: number; id?: number; error?: string }>(`${url}/instances/upsert`, payload));
    return {
      success: Boolean(response?.success),
      id: response?.instanceId ?? response?.id,
      error: response?.error,
    };
  };

  updateInstance = async (
    id: number,
    payload: ShippingChecklistInstancePayload,
  ): Promise<{ success: boolean; id?: number; error?: string }> => {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; instanceId?: number; id?: number; error?: string }>(`${url}/instances/upsert`, {
        ...payload,
        id,
      }),
    );

    return {
      success: Boolean(response?.success),
      id: response?.instanceId ?? response?.id ?? id,
      error: response?.error,
    };
  };

  submitInstance = async (
    id: number,
    payload: ShippingChecklistInstancePayload,
  ): Promise<{ success: boolean; id?: number; error?: string }> => {
    const response = await firstValueFrom(
      this.http.post<{ success: boolean; instanceId?: number; id?: number; error?: string }>(`${url}/instances/upsert`, {
        ...payload,
        id,
        status: 'submitted',
      }),
    );

    return {
      success: Boolean(response?.success),
      id: response?.instanceId ?? response?.id ?? id,
      error: response?.error,
    };
  };

  deleteInstance = async (id: number): Promise<{ success: boolean; error?: string }> => {
    const response = await firstValueFrom(this.http.delete<{ success: boolean; error?: string }>(`${url}/instances/${id}`));
    return {
      success: Boolean(response?.success),
      error: response?.error,
    };
  };

  downloadInstancePdf = async (id: number): Promise<Blob> =>
    firstValueFrom(this.http.get(`${url}/instances/${id}/pdf`, { responseType: 'blob' }));

  upsertTemplate = async (
    customerCode: string,
    payload: ShippingChecklistTemplateUpsertPayload,
  ): Promise<{ success: boolean; error?: string }> =>
    firstValueFrom(this.http.post<{ success: boolean; error?: string }>(`${url}/templates/upsert`, {
      ...payload,
      customerCode: String(customerCode || '').trim().toLowerCase(),
    }));

  getCustomerSettings = async (): Promise<ShippingChecklistCustomerSetting[]> => {
    const response = await firstValueFrom(this.http.get<ShippingChecklistCustomerSetting[]>(`${url}/settings/customers`));
    return Array.isArray(response) ? response : [];
  };

  upsertCustomerSetting = async (
    payload: ShippingChecklistCustomerSettingUpsertPayload,
  ): Promise<{ success: boolean; customerId?: number; error?: string }> =>
    firstValueFrom(this.http.post<{ success: boolean; customerId?: number; error?: string }>(`${url}/settings/customers/upsert`, {
      ...payload,
      customerCode: String(payload.customerCode || '').trim().toLowerCase(),
      customerName: String(payload.customerName || '').trim(),
      logoUrl: String(payload.logoUrl || '').trim(),
    }));
}
