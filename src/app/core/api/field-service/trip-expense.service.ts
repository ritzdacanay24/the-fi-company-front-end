import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpClient } from "@angular/common/http";

let url = "FieldServiceMobile/trip-expense";

@Injectable({
  providedIn: "root",
})
export class TripExpenseService {
  constructor(private http: HttpClient) {}

  predictApi = async (params: any, key) => {
    params.apikey = key;
    return firstValueFrom(
      this.http.post(
        `https://api.mindee.net/v1/products/mindee/expense_receipts/v3/predict`,
        params,
        {}
      )
    );
  };

  getByWorkOrderId(workOrderId) {
    return firstValueFrom(
      this.http.get(`${url}/getByWorkOrderId.php?workOrderId=${workOrderId}`)
    );
  }

  getByFsId(fs_scheduler_id) {
    return firstValueFrom(
      this.http.get(`${url}/getByFsId.php?fs_scheduler_id=${fs_scheduler_id}`)
    );
  }
  getById(id) {
    return firstValueFrom(this.http.get(`${url}/getById.php?id=${id}`));
  }

  updateById(id, params) {
    return firstValueFrom(
      this.http.post(`${url}/updateById.php?id=${id}`, params)
    );
  }

  update(id, params) {
    return firstValueFrom(this.http.post(`${url}/update.php?id=${id}`, params));
  }

  deleteById(id) {
    return firstValueFrom(this.http.delete(`${url}/deleteById.php?id=${id}`));
  }

  create(params) {
    return firstValueFrom(this.http.post(`${url}/create.php`, params));
  }

  getPredictApi(id) {
    return firstValueFrom(this.http.get(`${url}/getPredictApi.php`));
  }
}
