import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";

let url = "FieldServiceMobile/attachment";
const attachmentsV2Url = 'apiV2/attachments';

@Injectable({
  providedIn: "root",
})
export class AttachmentService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  getByWorkOrderId(workOrderId) {
    return firstValueFrom(
      this.http.get(`${attachmentsV2Url}/getByWorkOrderId?workOrderId=${workOrderId}`)
    );
  }

  // getById(id) {
  //   return firstValueFrom(this.http.get(`${url}/getById.php?id=${id}`));
  // }

  updateById(id, params) {
    return firstValueFrom(
      this.http.put(`${attachmentsV2Url}/updateById?id=${id}`, params)
    );
  }

  deleteById(id) {
    return firstValueFrom(this.http.delete(`${attachmentsV2Url}/deleteById?id=${id}`));
  }

  // create(params) {
  //   return firstValueFrom(this.http.post(`${url}/create.php`, params));
  // }

  override create = async (params: any): Promise<{ message: string; insertId?: number }> =>
    await firstValueFrom(
      this.http.post<{ message: string; insertId?: number }>(`${attachmentsV2Url}`, params)
    );

  getAllRelatedAttachments(id) {
    return firstValueFrom(
      this.http.get(`${attachmentsV2Url}/getAllRelatedAttachments?id=${id}`)
    );
  }
}
