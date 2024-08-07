import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { firstValueFrom } from "rxjs";

let url = "email-notification";

@Injectable({
  providedIn: "root",
})
export class EmailNotificationService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  
  getOptions = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/email-notification-options.php`));


}
