import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from './DataService';

let url = 'kanban';

@Injectable({
    providedIn: 'root'
})
export class KanbanApiService extends DataService<any> {

    constructor(http: HttpClient) {
        super(url, http);
    }

    async getProduction() {
        return await firstValueFrom(this.http.get(`${url}/production`))
    }
    async checkIfPickComplete(wo_nbr) {
        return await firstValueFrom(this.http.get(`${url}/checkIfPickComplete?wo_nbr=${wo_nbr}`))
    }

    async updateMass(wo_nbr) {
        return await firstValueFrom(this.http.get(`${url}/updateMass?wo_nbr=${wo_nbr}`))
    }
}
