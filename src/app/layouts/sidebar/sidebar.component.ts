import {
  Component,
  OnInit,
  EventEmitter,
  Output,
  ViewChild,
  ElementRef,
  HostListener,
  signal,
  computed,
} from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";

import { MenuItem } from "./menu.model";
import { environment } from "src/environments/environment";
import { FavoriteService } from "@app/core/api/favorites/favorites.service";
import { PageAccessService } from "@app/core/api/page-access/page-access.service";
import { MenuService } from "@app/core/api/menu/menu.service";
import { AppSwitcherService } from "@app/services/app-switcher.service";
import { FIELD_SERVICE_MENU } from "./field-service-menu-data";

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
  @ViewChild("searchInput") searchInput!: ElementRef;
  @Output() mobileMenuButtonClicked = new EventEmitter();
  maxFavs = 5;
  favs = [];

  version = environment.VERSION;
  // Search functionality using Angular signals
  showSearch: boolean = true; // toggle visibility of the search box
  searchTerm = signal('');

  // history / recent searches (lightweight placeholder)
  recentSearches: string[] = [];
  constructor(
    private router: Router,
    public translate: TranslateService,
    private favoriteService: FavoriteService,
    public pageAccessService: PageAccessService,
    public menuService: MenuService,
    private appSwitcherService: AppSwitcherService
  ) {
    this.getMenu();
    
    translate.setDefaultLang("en");
    this.favoriteService.getData$.subscribe(() => {
      this.favs = this.favoriteService.getFavorites();
    });

    this.router.events.subscribe((event: any) => {
      if (document.documentElement.getAttribute("data-layout") != "twocolumn") {
        if (event instanceof NavigationEnd) {
          this.initActiveMenu();
        }
      }
    });

    // Subscribe to app changes and reload menu
    this.appSwitcherService.currentApp$.subscribe(() => {
      this.getMenu();
    });
  }

  generateChild = (arr) => {
    return arr.reduce((acc, val, ind, array) => {
      const childs = [];
      array.forEach((el: any, i) => {
        if (childs.includes(el.parent_id) || el.parent_id === val.id) {
          childs.push(el);
        }
      });
      return acc.concat({ ...val, childs });
    }, []);
  };

  async getMenu() {
    // Determine which menu to load based on current app
    if (this.appSwitcherService.isFieldServiceApp()) {
      this.menuItems = FIELD_SERVICE_MENU;
    } else {
      this.menuItems = await this.menuService.getMenu();
    }
    setTimeout(() => {
      this.initActiveMenu();
    }, 0);
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
    // this.menuItems = MENU;
  }

  /**
   * Handler for the search input change event
   */
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  /**
   * Clear the current search term
   */
  clearSearch(): void {
    this.searchTerm.set('');
  }

  focusSearch(): void {
    if (this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.focus();
    }
  }

  // Simple getter method for filtered menu items - returns original objects
  filteredMenuItems(): MenuItem[] {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return this.menuItems;
    }
    
    // Just return original menuItems and let template handle visibility
    return this.menuItems;
  }

  // Method to check if menu item should be visible during search
  isMenuItemVisible(item: MenuItem): boolean {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return true; // Show all items when not searching
    }
    
    // Check if item or any of its children match - don't modify data
    return this.itemOrChildrenMatch(item, term);
  }

  private itemOrChildrenMatch(item: MenuItem, searchTerm: string): boolean {
    // Skip title items
    if (item.isTitle) return false;
    
    // Check if current item matches
    const currentMatches = item.label?.toLowerCase().includes(searchTerm);
    
    // Check if any children match
    let childrenMatch = false;
    if (item.subItems && item.subItems.length > 0) {
      childrenMatch = item.subItems.some(child => this.itemOrChildrenMatch(child, searchTerm));
    }
    
    return currentMatches || childrenMatch;
  }

  // Method to determine if a dropdown should be expanded (for template use)
  shouldExpandDropdown(item: MenuItem): boolean {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return !item.isCollapsed; // Normal behavior when not searching
    }
    
    // When searching, expand if this item has matching children
    if (item.subItems && item.subItems.length > 0) {
      return item.subItems.some(child => this.itemOrChildrenMatch(child, term));
    }
    
    return false;
  }

  // Method to check if any items are visible during search (for "no results" message)
  hasVisibleItems(): boolean {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return true;
    }
    
    return this.menuItems.some(item => this.isMenuItemVisible(item));
  }

  /**
   * Keyboard shortcut for search (Ctrl/Cmd + K)
   */
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k' && this.showSearch) {
      event.preventDefault();
      this.focusSearch();
    }
  }

  /**
   * Quick viewport check used by template to hide search when sidebar is collapsed/small
   */
  isSidebarSmall(): boolean {
    const size = document.documentElement.getAttribute("data-sidebar-size");
    return size === "sm" || size === "sm-hover";
  }

  /***
   * Activate droup down set
   */
  ngAfterViewInit() {
    // setTimeout(() => {
    //   this.initActiveMenu();
    // }, 0);
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
    if (!e) return; // Add safety check
    e.showStar = true;
    e.showStarColor = false;
    this.favs.forEach((menuItem: any) => {
      if (e.label == menuItem.label) {
        e.showStarColor = true;
      }
    });
  }

  saveAsFavorite(item) {
    if (!item) return; // Add safety check
    item.showStarColor = true;
    this.favoriteService.onSave(item);
  }
  removeAsFavorite(item) {
    if (!item) return; // Add safety check
    item.showStarColor = false;
    this.favoriteService.removeByLabel(item.label);
  }

  mouseLeft(item) {
    if (!item) return; // Add safety check
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
    let params = new URL(document.location.toString()).searchParams;
    let returnUrl = params.get("returnUrl");

    let pathName = returnUrl?.split("?")[0] || window.location.pathname;

    if (pathName == "/dashboard/access-denied") return;

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

      // First try to find exact path match
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

      // If no exact match and we found an active menu item, try to find DOM element for that menu item's link
      if (!matchingMenuItem && active && active.link) {
        matchingMenuItem = items.find((x: any) => {
          if (environment.production) {
            let path = x.pathname;
            path = path.replace("/velzon/angular/modern", "");
            path = path.replace("/dist/web", "");
            return path === active.link;
          } else {
            return x.pathname === active.link;
          }
        });
      }

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

      // Handle wildcard routes from activatedRoutes field like '/dashboard/quality/igt/*'
      if (menuItem.activatedRoutes && menuItem.activatedRoutes.includes('*')) {
        // Remove the asterisk and any trailing slash before it
        const baseRoute = menuItem.activatedRoutes.replace(/\/?\*+$/, '');
        
        // Check if current pathname starts with the base route
        // Also ensure we're matching complete path segments to avoid false positives
        if (pathname.startsWith(baseRoute) && 
            (pathname === baseRoute || pathname.startsWith(baseRoute + '/'))) {
          return menuItem;
        }
      }

      // Handle wildcard routes from link field like '/dashboard/quality/igt/*'
      if (menuItem.link && menuItem.link.includes('*')) {
        // Remove the asterisk and any trailing slash before it
        const baseRoute = menuItem.link.replace(/\/?\*+$/, '');
        
        // Check if current pathname starts with the base route
        // Also ensure we're matching complete path segments to avoid false positives
        if (pathname.startsWith(baseRoute) && 
            (pathname === baseRoute || pathname.startsWith(baseRoute + '/'))) {
          return menuItem;
        }
      }

      // Special handling for IGT routes - treat /dashboard/quality/igt/list as parent for all IGT routes
      if (menuItem.link === "/dashboard/quality/igt/list" && 
          pathname.startsWith("/dashboard/quality/igt")) {
        return menuItem;
      }

      // Special handling for template-editor routes to match both /template-editor and /template-editor/:id
      if (menuItem.link === "/dashboard/quality/template-editor" && 
          pathname.startsWith("/dashboard/quality/template-editor")) {
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
