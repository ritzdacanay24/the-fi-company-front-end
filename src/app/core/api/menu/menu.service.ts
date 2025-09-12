import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { firstValueFrom } from "rxjs";
// Fallback static menu (used when backend is unreachable or for local dev)
import { MENU } from "../../../layouts/sidebar/menu";

let url = "menu";

@Injectable({
  providedIn: "root",
})
export class MenuService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  checkUserPermission = async (user_id, link) =>
    await firstValueFrom(
      this.http.get<any>(
        `${url}/checkUserPermission?user_id=${user_id}&link=${link}`
      )
    );

  menuAndByUserId = async (id) => {
    let data = await firstValueFrom(
      this.http.get<any>(`${url}/menuAndByUserId?id=${id}`)
    );
    return formatData(data);
  };

  getAllMenu = async () => {
    let data = await firstValueFrom(this.http.get<any>(`${url}/getAll`));
    return formatData(data);
  };

  getMenu = async (groupData = true) => {
  // Use the local static `MENU` instead of calling the backend.
  // This keeps the app working offline/local-only and follows the MenuItem interface.
  return MENU as any;
  };
}

function formatData(data) {
  function addChild(obj) {
    obj.isCollapsed = obj.isCollapsed == 1;
    obj.accessRequired = obj.accessRequired == 1;
    obj.isTitle = obj.isTitle == 1;
    obj.badge = obj.badge ? JSON.parse(obj.badge) : null;
    // get childs and further retrieve its childs with map recursively
    let subItems = data.filter((a) => a.parent_id == obj.id).map(addChild);

    // if childs are found then add childs in object
    if (subItems.length > 0) {
      return { ...obj, subItems };
    }

    // if no child found then return object only
    return { ...obj };
  }

  return data.filter((a) => a.parent_id == 0).map(addChild);
}
