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
        await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/Graphics/graphicsDemand?getGraphicsDemandReport=1`));

    getGraphicsProduction = async () =>
        await firstValueFrom(this.http.get<any>(`apiv2/graphics-production`));

    updateGraphics(params: any) {
        return firstValueFrom(this.http.post(`/Graphics/index`, params));
    }

    getWorkOrderNumber(orderNumber: number) {
        return firstValueFrom(this.http.get<any>(`/Graphics/GraphicsWorkOrderSearch/index?graphicsWoNumber=${orderNumber}`));
    }

    getGraphicsList() {
        return firstValueFrom(this.http.get<any>(`apiv2/graphics-schedule`));
    }

    override getById = async (id: number): Promise<any> =>
        firstValueFrom(this.http.get<any>(`apiv2/graphics-schedule/getById?id=${id}`));

    override update = async (id: string | number, params: any): Promise<any> =>
        firstValueFrom(this.http.put<any>(`apiv2/graphics-schedule/updateById?id=${id}`, params));

    saveGraphicsDemand(params: any) {
        return firstValueFrom(this.http.post(`/Graphics/graphicsDemand`, params));
    }


}
