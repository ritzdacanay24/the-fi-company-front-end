import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';

const url = 'apiV2/graphics-bom';

@Injectable({
    providedIn: 'root'
})
export class GraphicsBomService extends DataService<any> {

    constructor(http: HttpClient) {
        super(url, http);
    }

    getList() {
        return firstValueFrom(this.http.get<any>(`${url}/getList`));
    }

    override find = async (params: any): Promise<any[]> => {
        const result = queryString(params);
        return await firstValueFrom(this.http.get<any[]>(`${url}/find${result}`));
    };

    override getAll = async (): Promise<any[]> =>
        await firstValueFrom(this.http.get<any[]>(`${url}/getAll`));

    override getById = async (id: number): Promise<any> =>
        await firstValueFrom(this.http.get<any>(`${url}/getById?id=${id}`));

    override create = async (params: any): Promise<{ message: string; insertId?: number }> => {
        const response = await firstValueFrom(this.http.post<{ insertId?: number }>(`${url}/create`, params));
        return {
            message: 'Graphics BOM created successfully',
            insertId: response?.insertId,
        };
    };

    override update = async (id: number | string, params: any): Promise<{ message: string }> => {
        await firstValueFrom(this.http.put<{ rowCount?: number }>(`${url}/updateById/${id}`, params));
        return { message: 'Graphics BOM updated successfully' };
    };

    override delete = async (id: number): Promise<{ message: string }> => {
        await firstValueFrom(this.http.delete<{ rowCount?: number }>(`${url}/deleteById/${id}`));
        return { message: 'Graphics BOM deleted successfully' };
    };

    upload(formData: any) {
        return firstValueFrom(this.http.post(`${url}/upload`, formData));
    }
}
