import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = '';

let GOOGLE_SEARCH_API = 'KrCCpKUkIeNDTqz4XfAj5MI56UsdZ9NM';

@Injectable({
    providedIn: 'root'
})
export class AddressSearch extends DataService<any> {

    constructor(http: HttpClient) {
        super(url, http);
    }

    searchAddress(q): Observable<any> {
        return this.http.get<any>(`https://dashboard.eye-fi.com/api/addressSearch/addressSearch.php?q=${q}`);
    }

}
