import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class ItemService {
    constructor(private http: HttpClient) { }

    getItemInfo(itemNumber: string) {
        return this.http
            .get<any>(`apiV2/item-search/read-single?readSingle=${encodeURIComponent(itemNumber)}&typeOfItemSearch=assemblyNumber`)
            .toPromise();
    }
}
