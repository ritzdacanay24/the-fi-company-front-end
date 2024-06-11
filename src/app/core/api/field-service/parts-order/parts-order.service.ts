import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'FieldServiceMobile/parts-order';

@Injectable({
    providedIn: 'root'
})
export class PartsOrderService extends DataService<any> {

    constructor(http: HttpClient) {
        super(url, http);
    }

    updateAndSendEmail(id, params) {
        return firstValueFrom(this.http.put(`${url}/updateAndSendEmail.php?id=${id}`, params))
    }

    getSvListReport() {
        return firstValueFrom(this.http.get(`${url}/getSvListReport.php`))
    }

}
