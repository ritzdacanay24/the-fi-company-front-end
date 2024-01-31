import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'graphics-bom';

@Injectable({
    providedIn: 'root'
})
export class GraphicsBomService extends DataService<any> {

    constructor(http: HttpClient) {
        super(url, http);
    }

    getList(dateFrom, dateTo) {
        return firstValueFrom(this.http.get<any>(`${url}/getList`));
    }

    upload(formData: any) {
        return firstValueFrom(this.http.post(`/Graphics/GraphicsItemMaster/upload`, formData));
    }
}
