import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from './DataService';

let url = 'signatures';

@Injectable({
    providedIn: 'root'
})
export class SignaturesService extends DataService<any> {

    constructor(http: HttpClient) {
        super(url, http);
    }

}
