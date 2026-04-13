import { Injectable } from "@angular/core";

export const THE_FI_COMPANY_RECENT_SEARCH = "THE_FI_COMPANY_RECENT_SEARCH";

@Injectable({
  providedIn: "root",
})
export class RecentSearchService {
  constructor() {}

  getRecentSearch() {
    if (localStorage.getItem(THE_FI_COMPANY_RECENT_SEARCH)) {
      let data = JSON.parse(localStorage.getItem(THE_FI_COMPANY_RECENT_SEARCH));
      data.forEach((item: any) => {
        item.showStar = false;
        item.icon = "ri-time-line";
      });
      return data;
    }

    return [];
  }

  setRecentSearch(data, item) {
    if (data.length >= 10) {
      data.splice(data.length - 1, 1);
    }

    let itemFound = data.find((x: any) => x.link == item.link);

    if (itemFound) return;

    data.unshift(item);

    localStorage.setItem(THE_FI_COMPANY_RECENT_SEARCH, JSON.stringify(data));
  }

  removeByLabel(label) {
    let faves = this.getRecentSearch();
    faves.forEach((menuItem: any, index) => {
      if (label == menuItem.label) {
        faves.splice(index, 1);
      }
    });

    this.set(faves);
  }

  set(favs) {
    localStorage.setItem(THE_FI_COMPANY_RECENT_SEARCH, JSON.stringify(favs));
  }
}
