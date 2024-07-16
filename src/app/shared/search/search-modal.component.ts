import { Component, Input } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { TableSettingsService } from "@app/core/api/table-settings/table-settings.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { MENU } from "@app/layouts/sidebar/menu";
import { MenuItem } from "@app/layouts/sidebar/menu.model";
import { Router } from "@angular/router";

import { Pipe, PipeTransform } from "@angular/core";
import { FavoriteService } from "@app/core/api/favorites/favorites.service";
import {
  RecentSearchService,
  THE_FI_COMPANY_RECENT_SEARCH,
} from "../services/recent-search.service";

@Pipe({
  standalone: true,
  name: "filterPeople",
})
export class FilterPeoplePipe implements PipeTransform {
  constructor() {}

  transform(value: any, query: string, field: string): any {
    return query
      ? value?.reduce((prev, next) => {
          if (
            next[field]
              ?.toLocaleLowerCase()
              .includes(query?.toLocaleLowerCase()) ||
            next["description"]
              ?.toLocaleLowerCase()
              .includes(query?.toLocaleLowerCase()) ||
            next["label"]
              ?.toLocaleLowerCase()
              .includes(query?.toLocaleLowerCase())
          ) {
            prev.push(next);
          }
          return prev;
        }, [])
      : value;
  }
}

@Injectable({
  providedIn: "root",
})
export class SearchModalService {
  modalRef: any;

  constructor(public modalService: NgbModal) {}

  open() {
    if (!this.modalService.hasOpenModals()) {
      return this.modalService.open(SearchModalComponent, {
        size: "lg",
        keyboard: true,
        backdrop: true,
      });
    }
    return null;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, FilterPeoplePipe],
  selector: "app-search-modal",
  templateUrl: `./search-modal.component.html`,
  styleUrls: [],
})
export class SearchModalComponent {
  menuItems: any;
  query = "";
  favs;
  arrowkeyLocation = 0;

  keyDown(event) {
    switch (event.keyCode) {
      case 38: // this is the ascii of arrow up
        if (this.arrowkeyLocation <= 0) {
        } else {
          this.arrowkeyLocation--;
        }
        break;
      case 40: // this is the ascii of arrow down
        let e = this.recentSearches.length + this.favs.length - 1;
        if (e <= this.arrowkeyLocation && !this.query) break;
        this.arrowkeyLocation++;
        break;
    }

    let el: any = document.getElementById("test_" + this.arrowkeyLocation);

    el?.scrollIntoViewIfNeeded(false);
  }

  recentSearches = [];
  searches = [];

  removeFavoite(item, ii, i) {
    this.favoriteService.removeByLabel(item?.label);
    this.searches[ii].lines.splice(i, 1);
  }

  removeRecentSearch(item, ii, i) {
    this.recentSearchService.removeByLabel(item?.label);
    this.searches[ii].lines.splice(i, 1);
  }

  addFavorite(item, ii, i) {
    this.favoriteService.create(item);
    this.searches[1].lines.push(item);
    this.searches[0].lines.splice(i, 1);

    this.recentSearchService.removeByLabel(item.label);
  }

  constructor(
    private tableSettingsService: TableSettingsService,
    private ngbActiveModal: NgbActiveModal,
    private authenticationService: AuthenticationService,
    private router: Router,
    private favoriteService: FavoriteService,
    private recentSearchService: RecentSearchService
  ) {
    this.menuItems = MENU;

    this.recentSearches = this.recentSearchService.getRecentSearch();

    this.favoriteService.getData$.subscribe(() => {
      this.favs = this.favoriteService.getFavorites();
    });

    this.searches.push({ name: "Recent Searches", lines: this.recentSearches });

    this.searches.push({ name: "Favorites", lines: this.favs });

    let i = 0;
    this.searches.forEach((menuItem: any) => {
      menuItem.lines.forEach((item: any) => (item.index = i++));
    });

    const result: any = [];

    this.menuItems.forEach((menuItem: any) => {
      if (menuItem.link) {
        result.push(menuItem);
      }

      if (menuItem.subItems) {
        menuItem.subItems.forEach((subItem: any) => {
          if (subItem.link) {
            result.push(subItem);
          }
          if (subItem.subItems) {
            subItem.subItems.forEach((childitem: any) => {
              if (childitem.link) {
                result.push(childitem);
              }
              if (childitem.subItems) {
                childitem.subItems.forEach((childrenitem: any) => {
                  if (childrenitem.link) {
                    result.push(childrenitem);
                  }
                });
              }
            });
          }
        });
      }
    });

    this.menuItems = result;
  }

  result;

  @Input() public pageId: string = "";

  isLoading = true;

  ngOnInit() {
    this.getData();
  }

  dismiss() {
    this.ngbActiveModal.dismiss("dismiss");
  }

  close() {
    this.ngbActiveModal.close(this.list);
  }

  test() {
    let el: any = document.querySelectorAll("#testd_" + this.arrowkeyLocation);

    let path = el.item(0).innerHTML;

    this.router.navigate([path]);
    this.ngbActiveModal.dismiss("dismiss");

    let item = this.menuItems.find((x: any) => x.link == path);

    this.setRecentSearch(item);

    this.recentSearches = this.recentSearchService.getRecentSearch();
  }

  setRecentSearch(item) {
    if (this.recentSearches.length >= 10) {
      this.recentSearches.splice(this.recentSearches.length - 1, 1);
    }

    let itemFound = this.recentSearches.find((x: any) => x.link == item.link);
    let itemFavFound = this.favs.find((x: any) => x.link == item.link);

    if (itemFound || itemFavFound) return;

    this.recentSearches.unshift(item);

    localStorage.setItem(
      THE_FI_COMPANY_RECENT_SEARCH,
      JSON.stringify(this.recentSearches)
    );
  }

  go(item) {
    this.router.navigate([item.link]);
    this.ngbActiveModal.dismiss("dismiss");

    this.setRecentSearch(item);
  }

  name = "";
  description = "";

  list;
  async getData() {
    this.list = await this.tableSettingsService.find({
      userId: this.authenticationService.currentUserValue.id,
      pageId: this.pageId,
    });
  }

  async onDelete(row, index) {
    if (!confirm("Are you sure you want to delete?")) return;
    await this.tableSettingsService.delete(row.id);
    this.list.splice(index, 1);
  }

  async save(row) {
    await this.tableSettingsService.saveTableSettings(row.id, row);
  }

  /**
   * Returns true or false if given menu item has child or not
   * @param item menuItem
   */
  hasItems(item: MenuItem) {
    return item.subItems !== undefined ? item.subItems.length > 0 : false;
  }

  toggleItem(item) {}
  updateActive(event) {}
}
