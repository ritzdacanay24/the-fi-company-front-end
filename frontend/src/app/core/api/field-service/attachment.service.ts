import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpClient } from "@angular/common/http";

const attachmentsV2Url = 'apiV2/attachments';

@Injectable({
  providedIn: "root",
})
export class AttachmentService {
  constructor(private http: HttpClient) {}

  getByWorkOrderId(workOrderId) {
    return firstValueFrom(
      this.http.get(`${attachmentsV2Url}/getByWorkOrderId?workOrderId=${workOrderId}`)
    );
  }

  update(id, params) {
    return firstValueFrom(
      this.http.put(`${attachmentsV2Url}/${id}`, params)
    );
  }

  updateById(id, params) {
    return this.update(id, params);
  }

  delete(id) {
    return firstValueFrom(this.http.delete(`${attachmentsV2Url}/${id}`));
  }

  deleteById(id) {
    return this.delete(id);
  }

  create = async (params: any): Promise<{ message: string; insertId?: number }> =>
    await firstValueFrom(
      this.http.post<{ message: string; insertId?: number }>(`${attachmentsV2Url}`, params)
    );

  getAllRelatedAttachments(id) {
    return firstValueFrom(
      this.http.get(`${attachmentsV2Url}/getAllRelatedAttachments?id=${id}`)
    );
  }
}
