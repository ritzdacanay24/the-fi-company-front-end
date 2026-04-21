import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'graphics';

@Injectable({
    providedIn: 'root'
})
export class GraphicsService extends DataService<any> {

    constructor(http: HttpClient) {
        super(url, http);
    }

    getGraphicsDemand = async () =>
        await firstValueFrom(this.http.get<any[]>(`apiv2/graphics-demand/report`));

    getGraphicsProduction = async () =>
        await firstValueFrom(this.http.get<any>(`apiv2/graphics-production`));

    updateGraphics(params: any) {
        const id = Number(params?.id);
        if (!id) {
            throw new Error('Graphics id is required');
        }

        const payload: any = {};

        if (params?.status !== undefined && params?.status !== null) {
            payload.status = params.status;
        }

        if (params?.qtyShipped !== undefined && params?.qtyShipped !== null) {
            payload.qtyShipped = params.qtyShipped;
        }

        if (params?.shippedOn) {
            payload.shippedOn = params.shippedOn;
        }

        if (params?.active !== undefined && params?.active !== null) {
            payload.active = params.active;
        }

        return firstValueFrom(this.http.put<any>(`apiv2/graphics-schedule/updateById?id=${id}`, payload));
    }

    getWorkOrderNumber(orderNumber: number) {
        return firstValueFrom(this.http.get<any>(`apiv2/graphics-production/work-order-search?graphicsWoNumber=${orderNumber}`));
    }

    getGraphicsList() {
        return firstValueFrom(this.http.get<any>(`apiv2/graphics-schedule`));
    }

    override getById = async (id: number): Promise<any> =>
        firstValueFrom(this.http.get<any>(`apiv2/graphics-schedule/getById?id=${id}`));

    override update = async (id: string | number, params: any): Promise<any> =>
        firstValueFrom(this.http.put<any>(`apiv2/graphics-schedule/updateById?id=${id}`, params));

    saveGraphicsDemand(params: any) {
        return firstValueFrom(this.http.post(`apiv2/graphics-demand`, params));
    }


}
