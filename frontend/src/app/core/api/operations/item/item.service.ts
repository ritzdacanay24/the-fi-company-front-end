import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class ItemService {
    constructor(private http: HttpClient) { }

    getItemInfo(itemNumber: string) {
        return this.http.get<any>(`https://dashboard.eye-fi.com/server/Api/item_search/item_search?readSingle=${itemNumber}&typeOfItemSearch=assemblyNumber`).toPromise();
    }
}
