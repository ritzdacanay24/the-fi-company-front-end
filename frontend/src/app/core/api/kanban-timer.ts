import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from './DataService';

let url = 'kanban-timer';

@Injectable({
    providedIn: 'root'
})
export class KanbanTimerApiService extends DataService<any> {

    constructor(http: HttpClient) {
        super(url, http);
    }
}
