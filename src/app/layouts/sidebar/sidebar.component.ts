import {
  Component,
  OnInit,
  EventEmitter,
  Output,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";

import { MENU } from "./menu";
import { MenuItem } from "./menu.model";
import { environment } from "src/environments/environment";
import { FavoriteService } from "@app/core/api/favorites/favorites.service";

@Component({
  selector: "app-sidebar",
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"],
})
export class SidebarComponent implements OnInit {
  menu: any;
  toggle: any = true;
  menuItems: MenuItem[] = [];
  @ViewChild("sideMenu") sideMenu!: ElementRef;
  @Output() mobileMenuButtonClicked = new EventEmitter();
  maxFavs = 5;
  favs = [];

  version = environment.VERSION;

  searchMenu;

  recentSearches = [];
  constructor(
    private router: Router,
    public translate: TranslateService,
    private favoriteService: FavoriteService
  ) {
    translate.setDefaultLang("en");
    this.favoriteService.getData$.subscribe(() => {
      this.favs = this.favoriteService.getFavorites();
    });

    this.router.events.subscribe((event) => {
      if (document.documentElement.getAttribute("data-layout") != "twocolumn") {
        if (event instanceof NavigationEnd) {
          this.initActiveMenu();
        }
      }
    });
  }

  compare(a, b) {
    if (a.label < b.label) {
      return -1;
    }
    if (a.label > b.label) {
      return 1;
    }
    return 0;
  }

  initalLoad = false;
  ngOnInit(): void {
    // Menu Items
    this.menuItems = MENU;

    for (let i = 0; i < this.menuItems.length; i++) {
      if (this.menuItems[i].subItems) {
        this.menuItems[i].subItems.sort((a, b) => this.compare(a, b));
        for (let ii = 0; ii < this.menuItems[i].subItems.length; ii++) {
          if (this.menuItems[i].subItems[ii].subItems) {
            this.menuItems[i].subItems[ii].subItems.sort((a, b) =>
              this.compare(a, b)
            );
            for (
              let iii = 0;
              iii < this.menuItems[i].subItems[ii].subItems.length;
              iii++
            ) {
              if (this.menuItems[i].subItems[ii].subItems[iii].subItems) {
                this.menuItems[i].subItems[ii].subItems[iii].subItems.sort(
                  (a, b) => this.compare(a, b)
                );
              }
            }
          }
        }
      }
    }
  }

  /***
   * Activate droup down set
   */
  ngAfterViewInit() {
    setTimeout(() => {
      this.initActiveMenu();
    }, 0);
  }

  removeActivation(items: any) {
    items.forEach((item: any) => {
      item.classList.remove("active");
    });
  }

  toggleItem(item: any) {
    this.menuItems.forEach((menuItem: any) => {
      if (menuItem == item) {
        menuItem.isCollapsed = !menuItem.isCollapsed;
      } else {
        menuItem.isCollapsed = true;
      }
      if (menuItem.subItems) {
        menuItem.subItems.forEach((subItem: any) => {
          if (subItem == item) {
            menuItem.isCollapsed = !menuItem.isCollapsed;
            subItem.isCollapsed = !subItem.isCollapsed;
          } else {
            subItem.isCollapsed = true;
          }
          if (subItem.subItems) {
            subItem.subItems.forEach((childitem: any) => {
              if (childitem == item) {
                childitem.isCollapsed = !childitem.isCollapsed;
                subItem.isCollapsed = !subItem.isCollapsed;
                menuItem.isCollapsed = !menuItem.isCollapsed;
              } else {
                childitem.isCollapsed = true;
              }
              if (childitem.subItems) {
                childitem.subItems.forEach((childrenitem: any) => {
                  if (childrenitem == item) {
                    childrenitem.isCollapsed = false;
                    childitem.isCollapsed = false;
                    subItem.isCollapsed = false;
                    menuItem.isCollapsed = false;
                  } else {
                    childrenitem.isCollapsed = true;
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  updateActiveFavorite(event: any) {
    const ul = document.getElementById("navbar-nav1");
    if (ul) {
      const items = Array.from(ul.querySelectorAll("a.nav-link"));
      this.removeActivation(items);
    }
    this.activateParentDropdown(event.target);
    this.toggleItemFavorite();

    const ul1 = document.getElementById("navbar-nav");
    if (ul1) {
      const items = Array.from(ul1.querySelectorAll("a.nav-link"));
      this.removeActivation(items);
    }
  }

  toggleItemFavorite() {
    this.menuItems.forEach((menuItem: any) => {
      menuItem.isCollapsed = true;

      if (menuItem.subItems) {
        menuItem.subItems.forEach((subItem: any) => {
          subItem.isCollapsed = true;
          if (subItem.subItems) {
            subItem.subItems.forEach((childitem: any) => {
              childitem.isCollapsed = true;
              if (childitem.subItems) {
                childitem.subItems.forEach((childrenitem: any) => {
                  childrenitem.isCollapsed = true;
                });
              }
            });
          }
        });
      }
    });
  }

  isCollapsed = true;
  mouseHovering(e) {
    e.showStar = true;
    e.showStarColor = false;
    this.favs.forEach((menuItem: any) => {
      if (e.label == menuItem.label) {
        e.showStarColor = true;
      }
    });
  }

  saveAsFavorite(item) {
    item.showStarColor = true;
    this.favoriteService.onSave(item);
  }
  removeAsFavorite(item) {
    item.showStarColor = false;
    this.favoriteService.removeByLabel(item.label);
  }

  mouseLeft(item) {
    item.showStar = false;
    item.showStarColor = false;
  }

  // remove active items of two-column-menu
  activateParentDropdown(item: any) {
    item.classList.add("active");
    let parentCollapseDiv = item.closest(".collapse.menu-dropdown");

    if (parentCollapseDiv) {
      // to set aria expand true remaining
      parentCollapseDiv.classList.add("show");
      parentCollapseDiv.parentElement.children[0].classList.add("active");
      parentCollapseDiv.parentElement.children[0].setAttribute(
        "aria-expanded",
        "true"
      );
      if (parentCollapseDiv.parentElement.closest(".collapse.menu-dropdown")) {
        parentCollapseDiv.parentElement
          .closest(".collapse")
          .classList.add("show");
        if (
          parentCollapseDiv.parentElement.closest(".collapse")
            .previousElementSibling
        )
          parentCollapseDiv.parentElement
            .closest(".collapse")
            .previousElementSibling.classList.add("active");
        if (
          parentCollapseDiv.parentElement
            .closest(".collapse")
            .previousElementSibling.closest(".collapse")
        ) {
          parentCollapseDiv.parentElement
            .closest(".collapse")
            .previousElementSibling.closest(".collapse")
            .classList.add("show");
          parentCollapseDiv.parentElement
            .closest(".collapse")
            .previousElementSibling.closest(".collapse")
            .previousElementSibling.classList.add("active");
        }
      }

      if (!this.initalLoad)
        setTimeout(() => {
          parentCollapseDiv.parentElement.scrollIntoView({ block: "center" });
        }, 500);

      this.initalLoad = true;
      return false;
    }
    return false;
  }

  //this is the functino that selects the items in the side menu.
  updateActive(event: any) {
    if (document.documentElement.clientWidth <= 767) {
      document.body.classList.toggle("vertical-sidebar-enable");
    }

    this.isCollapsed = true;

    const ul1 = document.getElementById("navbar-nav1");
    if (ul1) {
      const items = Array.from(ul1.querySelectorAll("a.nav-link"));
      this.removeActivation(items);
    }

    const ul = document.getElementById("navbar-nav");
    if (ul) {
      const items = Array.from(ul.querySelectorAll("a.nav-link"));
      this.removeActivation(items);
    }
    this.activateParentDropdown(event.target);
  }

  initActiveMenu() {
    let pathName = window.location.pathname;
    // Check if the application is running in production
    if (environment.production) {
      // Modify pathName for production build
      pathName = pathName.replace("/velzon/angular/modern", "");
      pathName = pathName.replace("/dist/web", "");
    }

    const active = this.findMenuItem(pathName, this.menuItems);
    this.toggleItem(active);
    const ul = document.getElementById("navbar-nav");
    if (ul) {
      const items = Array.from(ul.querySelectorAll("a.nav-link"));
      let activeItems = items.filter((x: any) =>
        x.classList.contains("active")
      );
      this.removeActivation(activeItems);

      let matchingMenuItem = items.find((x: any) => {
        if (environment.production) {
          let path = x.pathname;
          path = path.replace("/velzon/angular/modern", "");
          path = path.replace("/dist/web", "");
          return path === pathName;
        } else {
          return x.pathname === pathName;
        }
      });
      if (matchingMenuItem) {
        this.activateParentDropdown(matchingMenuItem);
      }
    }
  }

  private findMenuItem(pathname: string, menuItems: any[]): any {
    for (const menuItem of menuItems) {
      if (menuItem.link && menuItem.link === pathname) {
        return menuItem;
      }

      if (menuItem.subItems) {
        const foundItem = this.findMenuItem(pathname, menuItem.subItems);
        if (foundItem) {
          return foundItem;
        }
      }
    }

    return null;
  }

  /**
   * Returns true or false if given menu item has child or not
   * @param item menuItem
   */
  hasItems(item: MenuItem) {
    return item.subItems !== undefined ? item.subItems.length > 0 : false;
  }

  /**
   * Toggle the menu bar when having mobile screen
   */
  toggleMobileMenu(event: any) {
    var sidebarsize =
      document.documentElement.getAttribute("data-sidebar-size");
    if (sidebarsize == "sm-hover-active") {
      document.documentElement.setAttribute("data-sidebar-size", "sm-hover");
    } else {
      document.documentElement.setAttribute(
        "data-sidebar-size",
        "sm-hover-active"
      );
    }
  }

  /**
   * SidebarHide modal
   * @param content modal content
   */
  SidebarHide() {
    document.body.classList.remove("vertical-sidebar-enable");
  }
}
