import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'shippingMisc';

@Injectable({
    providedIn: 'root'
})
export class ShippingMiscService extends DataService<any> {

    constructor(http: HttpClient) {
        super(url, http);
    }
}
