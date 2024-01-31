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
        await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/Graphics/index?getGraphicProductionOrders=1`));

    updateGraphics(params: any) {
        return firstValueFrom(this.http.post(`/Graphics/index`, params));
    }

    getWorkOrderNumber(orderNumber: number) {
        return firstValueFrom(this.http.get<any>(`/Graphics/GraphicsWorkOrderSearch/index?graphicsWoNumber=${orderNumber}`));
    }

    getGraphicsList(dateFrom, dateTo) {
        return firstValueFrom(this.http.get<any>(`Graphics/GraphicsSearch/graphics_search?ReadAll&dateFrom=${dateFrom}&dateTo=${dateTo}`));
    }

}
