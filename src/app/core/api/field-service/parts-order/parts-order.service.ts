import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';

let url = 'FieldServiceMobile/parts-order';

@Injectable({
    providedIn: 'root'
})
export class PartsOrderService extends DataService<any> {

    constructor(http: HttpClient) {
        super(url, http);
    }

}
