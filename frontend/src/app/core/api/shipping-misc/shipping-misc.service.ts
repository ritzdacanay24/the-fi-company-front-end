import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DataService } from '../DataService';

let url = 'shippingMisc';

@Injectable({
    providedIn: 'root'
})
export class ShippingMiscService extends DataService<any> {

    constructor(http: HttpClient) {
        super(url, http);
    }

    override findOne = async (params: Partial<any>): Promise<any> => {
        const so = String(params?.['so'] || '').trim();
        return await firstValueFrom(this.http.get<any>(`apiV2/shipping-misc/find-one?so=${encodeURIComponent(so)}`));
    }
}
