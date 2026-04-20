import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

const partsOrderV2Url = 'apiV2/parts-order';

@Injectable({
    providedIn: 'root'
})
export class PartsOrderService extends DataService<any> {

    constructor(http: HttpClient) {
        super(partsOrderV2Url, http);
    }

    override find = async (params: Partial<any>): Promise<any[]> => {
        const query = new URLSearchParams(params as Record<string, string>).toString();
        const url = query ? `${partsOrderV2Url}/find?${query}` : `${partsOrderV2Url}/find`;
        return firstValueFrom(this.http.get<any[]>(url));
    };

    override getAll = async (): Promise<any[]> =>
        firstValueFrom(this.http.get<any[]>(`${partsOrderV2Url}`));

    override getById = async (id: number): Promise<any> =>
        firstValueFrom(this.http.get<any>(`${partsOrderV2Url}/${id}`));

    override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> => {
        const response = await firstValueFrom(
            this.http.post<{ insertId?: number; message?: string }>(`${partsOrderV2Url}`, params)
        );

        return {
            message: response?.message ?? 'Created',
            insertId: response?.insertId,
        };
    };

    override update = async (id: string | number, params: Partial<any>): Promise<any> =>
        firstValueFrom(this.http.put<any>(`${partsOrderV2Url}/${id}`, params));

    override delete = async (id: number): Promise<any> =>
        firstValueFrom(this.http.delete<any>(`${partsOrderV2Url}/${id}`));

    updateAndSendEmail(id, params) {
        return firstValueFrom(this.http.put(`${partsOrderV2Url}/updateAndSendEmail/${id}`, params))
    }

    getBySoLineNumber(so_number) {
        return firstValueFrom(this.http.get(`${partsOrderV2Url}/getBySoLineNumber?so_number=${so_number}`))
    }

}
