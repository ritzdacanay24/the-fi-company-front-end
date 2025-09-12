import { Component, OnInit, EventEmitter, Output, ViewChild, ElementRef, Input, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, HostListener, signal, computed } from '@angular/core';
import { NavigationEnd, Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { MenuItem } from './menu.model';
import { environment } from '@env/environment';
import { SharedModule } from '@app/shared/shared.module';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { SimplebarAngularModule } from 'simplebar-angular';
import { ClientProfileResponseDto } from '@/domain-v3/clients/dtos/client-profile.dto';
import { FavoritesService } from '@app/shared/services/favorites.service';

@Component({
  standalone: true,
  imports: [SharedModule, TranslateModule, NgbCollapseModule, SimplebarAngularModule],
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SidebarComponent implements OnInit {

  menu: any;
  toggle: any = true;
  @ViewChild('sideMenu') sideMenu!: ElementRef;
  @ViewChild('searchInput') searchInput!: ElementRef;
  @Output() mobileMenuButtonClicked = new EventEmitter();
  @Output() favoriteToggled = new EventEmitter<MenuItem>();
  @Output() menuItemClicked = new EventEmitter<MenuItem>();

  @Input() menuItems: MenuItem[] = [];
  @Input() title!: string;
  @Input() subTitle!: string;
  @Input() client: Partial<ClientProfileResponseDto> | null = null;
  @Input() goBack!: Function;
  @Input() relativePath!: string;
  @Input() ngStyle!: any;
  @Input() showFooter = false;
  @Input() showSearch = false; // New parameter to control search visibility
  @Input() lawFirm!: any;

  // Search functionality
  searchTerm = signal('');
  
  // Flag to prevent menu activation when navigating from favorites
  private skipMenuActivation = false;
  
  // Computed filtered menu items
  filteredMenuItems = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return this.menuItems;
    }
    
    return this.filterMenuItems(this.menuItems, term);
  });
  
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public translate: TranslateService,
    public favoritesService: FavoritesService
  ) {
    translate.setDefaultLang('en');
  }

  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (document.documentElement.getAttribute('data-layout') != "twocolumn") {
        if (event instanceof NavigationEnd) {
          // Only activate menu if not skipping (i.e., not from favorites click)
          if (!this.skipMenuActivation) {
            this.initActiveMenu();
          } else {
            // Reset the flag for next navigation
            this.skipMenuActivation = false;
          }
        }
      }
    });
  }

  // Search methods
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  focusSearch(): void {
    if (this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.focus();
    }
  }

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k' && this.showSearch) {
      event.preventDefault();
      this.focusSearch();
    }
  }

  private filterMenuItems(items: MenuItem[], searchTerm: string): MenuItem[] {
    return items.map(item => {
      // Check if current item matches
      const itemMatches = this.itemMatchesSearch(item, searchTerm);
      
      // Check if any sub items match
      let filteredSubItems: MenuItem[] = [];
      if (item.subItems && item.subItems.length > 0) {
        filteredSubItems = this.filterMenuItems(item.subItems, searchTerm);
      }
      
      // Include item if it matches or has matching sub items
      if (itemMatches || filteredSubItems.length > 0) {
        return {
          ...item,
          subItems: filteredSubItems,
          isCollapsed: searchTerm ? false : item.isCollapsed // Expand items when searching
        };
      }
      
      return null;
    }).filter(Boolean) as MenuItem[];
  }

  private itemMatchesSearch(item: MenuItem, searchTerm: string): boolean {
    if (!item.label) return false;
    
    // Skip title items from search results
    if (item.isTitle) return false;
    
    return item.label.toLowerCase().includes(searchTerm);
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
        menuItem.isCollapsed = !menuItem.isCollapsed
      } else {
        menuItem.isCollapsed = true
      }
      if (menuItem.subItems) {
        menuItem.subItems.forEach((subItem: any) => {

          if (subItem == item) {
            menuItem.isCollapsed = !menuItem.isCollapsed
            subItem.isCollapsed = !subItem.isCollapsed
          } else {
            subItem.isCollapsed = true
          }
          if (subItem.subItems) {
            subItem.subItems.forEach((childitem: any) => {

              if (childitem == item) {
                childitem.isCollapsed = !childitem.isCollapsed
                subItem.isCollapsed = !subItem.isCollapsed
                menuItem.isCollapsed = !menuItem.isCollapsed
              } else {
                childitem.isCollapsed = true
              }
              if (childitem.subItems) {
                childitem.subItems.forEach((childrenitem: any) => {

                  if (childrenitem == item) {
                    childrenitem.isCollapsed = false
                    childitem.isCollapsed = false
                    subItem.isCollapsed = false
                    menuItem.isCollapsed = false
                  } else {
                    childrenitem.isCollapsed = true
                  }
                })
              }
            })
          }
        })
      }
    });

    // if (item?.subItems) {
    //   this.scrollTo(item?.subItems[item.subItems.length - 1]);
    // }

  }

  activateParentDropdown(item: any) {
    item.classList.add("active");
    let parentCollapseDiv = item.closest(".collapse.menu-dropdown");

    if (parentCollapseDiv) {
      parentCollapseDiv.parentElement.children[0].classList.add("active");
      if (parentCollapseDiv.parentElement.closest(".collapse.menu-dropdown")) {
        if (parentCollapseDiv.parentElement.closest(".collapse").previousElementSibling)
          parentCollapseDiv.parentElement.closest(".collapse").previousElementSibling.classList.add("active");
        if (parentCollapseDiv.parentElement.closest(".collapse").previousElementSibling.closest(".collapse")) {
          parentCollapseDiv.parentElement.closest(".collapse").previousElementSibling.closest(".collapse").previousElementSibling.classList.add("active");
        }
      }
      return false;
    }
    return false;
  }

  updateActive(event: any) {
    const ul = document.getElementById("navbar-nav");
    if (ul) {
      const items = Array.from(ul.querySelectorAll("a.nav-link"));
      this.removeActivation(items);
    }
    this.activateParentDropdown(event.target);
  }

  scrollTo(active: any) {
    if (active) {
      const ee: any = document.getElementById(active.link);

      if (ee) {
        setTimeout(() => {
          ee.scrollIntoViewIfNeeded({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }, 200);
      }
    }
  }

  checkIfLinkIs401() {

    let params = new URL(document.location.toString()).searchParams;
    let returnUrl = params.get("returnUrl");

    let pathName: any = returnUrl?.split("?")[0] || window.location.pathname;

    if (window.location.pathname.includes('page-401')) {
      pathName = returnUrl?.split("?")[0];
    }

    return pathName;
  }


  private findMenuItemByPath(path: string, menuItems: any[]): any {
    for (const menuItem of menuItems) {
      if (menuItem.link && this.configuLink(menuItem.link) === path) {
        return menuItem;
      }

      if (menuItem.subItems) {
        const foundItem = this.findMenuItemByPath(path, menuItem.subItems);
        if (foundItem) {
          return foundItem;
        }
      }
    }
    return null;
  }

  private findMenuItemWithActiveRoute(pathName: string, menuItems: any[]): any {
    for (const menuItem of menuItems) {
      // Check if this menu item has activeRoutes that match the current path
      if (menuItem.activeRoutes && menuItem.activeRoutes.length > 0) {
        // console.log('📋 Checking menu item:', menuItem.label, 'activeRoutes:', menuItem.activeRoutes, 'pathName:', pathName);
        
        const matchesActiveRoute = menuItem.activeRoutes.some((route: string) => {
          // console.log('🔍 Testing route:', route, 'against pathName:', pathName);
          
          // Handle wildcard patterns like 'maintenance/law-firm-entities/*'
          if (route.includes('*')) {
            const baseRoute = route.replace('/*', '').replace('*', ''); // Remove /* or * suffix
            // Apply relativePath to the base route for proper comparison
            const fullBaseRoute = this.configuLink(baseRoute);
            const matches = pathName.startsWith(fullBaseRoute);
            // console.log('🌟 Wildcard check:', route, '->', baseRoute, 'fullBaseRoute:', fullBaseRoute, 'pathName:', pathName, 'matches:', matches);
            return matches;
          }
          
          // Handle route parameters like 'comments/edit/:id'
          if (route.includes(':')) {
            const baseRoute = route.replace(/:[^/]+.*$/, '');
            const fullBaseRoute = this.configuLink(baseRoute);
            const matches = pathName.startsWith(fullBaseRoute);
            // console.log('🔗 Route param check:', route, '->', baseRoute, 'fullBaseRoute:', fullBaseRoute, 'pathName:', pathName, 'matches:', matches);
            return matches;
          }
          
          // Handle exact routes like 'comments/form'
          const fullRoute = this.configuLink(route);
          const matches = pathName.startsWith(fullRoute);
          // console.log('✅ Exact route check:', route, 'fullRoute:', fullRoute, 'pathName:', pathName, 'matches:', matches);
          return matches;
        });
        
        if (matchesActiveRoute) {
          // console.log('🎯 FOUND MATCH for menu item:', menuItem.label);
          return menuItem;
        }
      }

      // Recursively check subItems
      if (menuItem.subItems) {
        const foundItem = this.findMenuItemWithActiveRoute(pathName, menuItem.subItems);
        if (foundItem) {
          return foundItem;
        }
      }
    }
    return null;
  }

  initActiveMenu() {
    let pathName = this.checkIfLinkIs401()

    if (environment.production) {
      pathName = pathName.replace('/velzon/angular/master', '');
    }

    // console.log('🔥 SIDEBAR: initActiveMenu called with pathName:', pathName);
    // console.log('🔥 SIDEBAR: relativePath:', this.relativePath);

    // IMPORTANT: Check for activeRoutes FIRST before regular menu item matching
    const menuItemWithActiveRoute = this.findMenuItemWithActiveRoute(pathName, this.menuItems);
    if (menuItemWithActiveRoute) {
      // console.log('🎉 EARLY: Found matching activeRoute for menu item:', menuItemWithActiveRoute.label);
      // CRITICAL: Expand the menu hierarchy to show the matched item
      this.expandMenuHierarchyForItem(menuItemWithActiveRoute);
    } else {
      // console.log('❌ EARLY: No activeRoute matches found');
      
      // BACKUP: Direct check for law firm entities paths
      if (pathName.includes('/maintenance/law-firm-entities/') || pathName.includes('/law-firm-entities/')) {
        // console.log('🔧 BACKUP: Detected law firm entities path, force expanding menus');
        this.forceExpandLawFirmEntitiesMenu();
      }
    }

    // Find the active menu item (including favorites)
    const active = this.findMenuItem(pathName, this.menuItems);
    
    // If we found a favorite item, also find the corresponding regular menu item
    let regularMenuItem = null;
    if (active && active.isFavorite) {
      // Find the same item in the regular menu structure (not in favorites)
      regularMenuItem = this.findRegularMenuItem(pathName, this.menuItems);
    }
    
    // Use the regular menu item for scrolling and toggling if available, otherwise use the found item
    const itemToActivate = regularMenuItem || active;
    
    // Only scroll to and toggle if it's NOT a favorite item
    if (itemToActivate && !itemToActivate.isFavorite) {
      this.scrollTo(itemToActivate);
      this.toggleItem(itemToActivate);
    }


    const ul = document.getElementById("navbar-nav");
    if (ul) {
      const items = Array.from(ul.querySelectorAll("a.nav-link"));
      let activeItems = items.filter((x: any) => x.classList.contains("active"));
      this.removeActivation(activeItems);

      // Sort by path length descending to prioritize more specific paths
      let sortedItems = items.sort((a: any, b: any) => {
        let pathA = environment.production ? a.pathname.replace('/velzon/angular/master', '') : a.pathname;
        let pathB = environment.production ? b.pathname.replace('/velzon/angular/master', '') : b.pathname;
        return pathB.length - pathA.length;
      });

      let matchingMenuItem = sortedItems.find((x: any) => {
        let itemPath: string;
        if (environment.production) {
          itemPath = x.pathname.replace('/velzon/angular/master', '');
        } else {
          itemPath = x.pathname;
        }

        // Find the corresponding menu item to check for activeRoutes
        const menuItem = this.findMenuItemByPath(itemPath, this.menuItems);

        if (menuItem && menuItem.activeRoutes && menuItem.activeRoutes.length > 0) {
          // Check if current path matches any of the activeRoutes
          return menuItem.activeRoutes.some((route: string) => {
            // Handle wildcard patterns like 'maintenance/law-firm-entities/*'
            if (route.includes('*')) {
              const baseRoute = route.replace('/*', '').replace('*', ''); // Remove /* or * suffix
              const fullBaseRoute = this.configuLink(baseRoute);
              const matches = pathName.startsWith(fullBaseRoute);
              // console.log('🌟 Main Wildcard check:', route, '->', baseRoute, 'fullBaseRoute:', fullBaseRoute, 'pathName:', pathName, 'matches:', matches);
              return matches;
            }
            
            // Handle route parameters like 'comments/edit/:id' 
            if (route.includes(':')) {
              const baseRoute = route.replace(/:[^/]+.*$/, '');
              const fullBaseRoute = this.configuLink(baseRoute);
              const matches = pathName.startsWith(fullBaseRoute);
              // console.log('🔗 Main Route param check:', route, '->', baseRoute, 'fullBaseRoute:', fullBaseRoute, 'pathName:', pathName, 'matches:', matches);
              return matches;
            }
            
            // Handle exact routes
            const fullRoute = this.configuLink(route);
            const matches = pathName.startsWith(fullRoute);
            // console.log('✅ Main Exact route check:', route, 'fullRoute:', fullRoute, 'pathName:', pathName, 'matches:', matches);
            if (matches) {
              return true;
            }
            
            // Fallback to original logic
            const fallbackMatches = pathName === fullRoute || pathName.startsWith(fullRoute + '/');
            // console.log('🔄 Main Fallback check:', route, 'fullRoute:', fullRoute, 'pathName:', pathName, 'matches:', fallbackMatches);
            return fallbackMatches;
          });
        }

        // Check for exact match first
        if (itemPath === pathName) {
          return true;
        }

        // Handle loadChildren routes - check if current path starts with menu path
        if (pathName.startsWith(itemPath + '/')) {
          return true;
        }

        // SPECIFIC: Handle medication-limit-group routes
        if (itemPath.includes('medication-limit-group/list') && pathName.includes('medication-limit-group')) {
          // console.log('🎯 SPECIFIC: Found medication-limit-group match!', itemPath, pathName);
          return true;
        }

        // Generic handling for feature routes - check if it's a child route of a list-based feature
        if (itemPath.endsWith('/list')) {
          const baseRoute = itemPath.replace('/list', '');
          // Check if current path is a child of this feature (more than just the base + '/list')
          if (pathName.startsWith(baseRoute + '/') && pathName !== baseRoute + '/list') {
            return true;
          }
        }

        return false;
      });

      // FALLBACK: If no direct DOM match found, check ALL menu items for activeRoutes (recursive)
      if (!matchingMenuItem) {
        // console.log('🔍 No direct DOM match found, checking ALL menu items for activeRoutes...');
        
        const menuItemWithActiveRoute = this.findMenuItemWithActiveRoute(pathName, this.menuItems);
        
        if (menuItemWithActiveRoute) {
          // console.log('🎉 Found matching activeRoute for menu item:', menuItemWithActiveRoute.label);
          
          // CRITICAL: Expand the menu hierarchy to show the matched item
          this.expandMenuHierarchyForItem(menuItemWithActiveRoute);
          
          // Find the DOM element for this menu item's main link
          const menuItemPath = menuItemWithActiveRoute.link ? this.configuLink(menuItemWithActiveRoute.link) : '';
          // console.log('🔗 Looking for DOM element with path:', menuItemPath);
          
          matchingMenuItem = sortedItems.find((item: any) => {
            const elementPath = environment.production ? 
              item.pathname.replace('/velzon/angular/master', '') : 
              item.pathname;
            
            // console.log('🔍 Comparing DOM element path:', elementPath, 'with menu path:', menuItemPath);
            
            // Check for exact match first
            if (elementPath === menuItemPath) {
              return true;
            }
            
            // Handle dynamic client ID in path - check if DOM path ends with the menu link
            if (menuItemWithActiveRoute.link) {
              const menuLink = menuItemWithActiveRoute.link;
              // console.log('🔍 Checking if DOM path ends with menu link:', menuLink);
              
              // Check if the DOM element path ends with the menu item's link
              if (elementPath.endsWith('/' + menuLink)) {
                // console.log('✅ Found DOM element that ends with menu link!');
                return true;
              }
            }
            
            return false;
          });
          
          if (matchingMenuItem) {
            // console.log('✅ Found corresponding DOM element - will activate!');
          }
        }
      }

      // SPECIAL CASE: If we found a favorite item but no DOM match,
      // find the corresponding main menu item to activate
      if (!matchingMenuItem && active && active.isFavorite) {
        // console.log('🌟 Found favorite item, looking for main menu item to activate:', active.label);
        
        // Find the main menu item that corresponds to this favorite item
        const mainMenuItemPath = active.link ? this.configuLink(active.link) : '';
        // console.log('🔗 Looking for main menu DOM element with path:', mainMenuItemPath);
        
        matchingMenuItem = sortedItems.find((item: any) => {
          const elementPath = environment.production ? 
            item.pathname.replace('/velzon/angular/master', '') : 
            item.pathname;
          
          // console.log('🔍 Comparing DOM element path:', elementPath, 'with favorite path:', mainMenuItemPath);
          
          // Check for exact match first
          if (elementPath === mainMenuItemPath) {
            console.log('✅ Found exact match for favorite item!');
            return true;
          }
          
          // Handle dynamic client ID in path - check if DOM path ends with the menu link
          if (active.link) {
            console.log('🔍 Checking if DOM path ends with favorite link:', active.link);
            
            // Check if the DOM element path ends with the favorite item's link
            if (elementPath.endsWith('/' + active.link)) {
              console.log('✅ Found DOM element that ends with favorite link!');
              return true;
            }
          }
          
          return false;
        });
        
        if (matchingMenuItem) {
          console.log('✅ Found main menu item to activate for favorite!');
        }
      }

      if (matchingMenuItem) {
        this.activateParentDropdown(matchingMenuItem);
      }
    }
  }

  private expandMedicationManagementMenus(): void {
    console.log('🎯 Expanding medication management menus...');
    
    // Find and expand the nested menu structure: Data Management -> Medication Management
    this.menuItems.forEach(menuItem => {
      if (menuItem.label === 'Data Management') {
        console.log('📂 Found Data Management - expanding...');
        menuItem.isCollapsed = false;
        
        if (menuItem.subItems) {
          menuItem.subItems.forEach((subItem: any) => {
            if (subItem.label === 'Medication Management') {
              console.log('📂 Found Medication Management - expanding...');
              subItem.isCollapsed = false;
            }
          });
        }
      }
    });
  }

  /**
   * Expand menu hierarchy to show a specific menu item
   */
  private expandMenuHierarchyForItem(targetItem: any): void {
    console.log('🎯 Expanding menu hierarchy for item:', targetItem.label);
    
    // Find the path to this item in the menu structure and expand all parent menus
    const expandPath = (items: any[], target: any, path: any[] = []): boolean => {
      for (const item of items) {
        const currentPath = [...path, item];
        
        // If this is the target item, expand all items in the path
        if (item === target) {
          console.log('✅ Found target item, expanding path:', currentPath.map(i => i.label));
          currentPath.forEach(pathItem => {
            if (pathItem.hasOwnProperty('isCollapsed')) {
              console.log('📂 Expanding:', pathItem.label, 'from', pathItem.isCollapsed, 'to false');
              pathItem.isCollapsed = false;
            }
          });
          return true;
        }
        
        // If this item has subItems, search recursively
        if (item.subItems && item.subItems.length > 0) {
          if (expandPath(item.subItems, target, currentPath)) {
            return true;
          }
        }
      }
      return false;
    };
    
    const found = expandPath(this.menuItems, targetItem);
    console.log('🎯 Expansion result:', found ? 'SUCCESS' : 'FAILED');
    
    // Also manually ensure the target item and its parents are expanded
    this.forceExpandMenuHierarchy(targetItem);
  }

  /**
   * Force expand the menu hierarchy by searching by label as backup
   */
  private forceExpandMenuHierarchy(targetItem: any): void {
    console.log('🔧 Force expanding hierarchy for:', targetItem.label);
    
    // For Law Firm Entities specifically, ensure Partner Management is expanded
    if (targetItem.label === 'Law Firm Entities') {
      this.menuItems.forEach(menuItem => {
        if (menuItem.label === 'Partner Management') {
          console.log('🔧 Force expanding Partner Management');
          menuItem.isCollapsed = false;
          
          if (menuItem.subItems) {
            menuItem.subItems.forEach((subItem: any) => {
              if (subItem.label === 'Law Firm Entities') {
                console.log('🔧 Force expanding Law Firm Entities');
                subItem.isCollapsed = false;
              }
            });
          }
        }
      });
    }
  }

  /**
   * Backup method to force expand law firm entities menu
   */
  private forceExpandLawFirmEntitiesMenu(): void {
    console.log('🔧 BACKUP: Force expanding Law Firm Entities menu');
    
    this.menuItems.forEach(menuItem => {
      if (menuItem.label === 'Partner Management') {
        console.log('🔧 BACKUP: Found Partner Management - expanding');
        menuItem.isCollapsed = false;
        
        if (menuItem.subItems) {
          menuItem.subItems.forEach((subItem: any) => {
            if (subItem.label === 'Law Firm Entities') {
              console.log('🔧 BACKUP: Found Law Firm Entities - expanding');
              subItem.isCollapsed = false;
            }
          });
        }
      }
    });
  }

  configuLink(link: string) {
    return `${this.relativePath}/${link}`;
  }

  private findMenuItem(pathname: string, menuItems: any[]): any {
    for (const menuItem of menuItems) {
      let link = this.configuLink(menuItem.link);
      if (menuItem.link && link === pathname) {
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
   * Find menu item in regular menu structure (excluding favorites sections)
   */
  private findRegularMenuItem(pathname: string, menuItems: any[]): any {
    for (const menuItem of menuItems) {
      // Skip favorites sections
      if (menuItem.isFavorite) {
        continue;
      }
      
      let link = this.configuLink(menuItem.link);
      if (menuItem.link && link === pathname) {
        return menuItem;
      }

      if (menuItem.subItems) {
        const foundItem = this.findRegularMenuItem(pathname, menuItem.subItems);
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
    var sidebarsize = document.documentElement.getAttribute("data-sidebar-size");
    if (sidebarsize == 'sm-hover-active') {
      document.documentElement.setAttribute("data-sidebar-size", 'sm-hover');

    } else {
      document.documentElement.setAttribute("data-sidebar-size", 'sm-hover-active')
    }
  }

  /**
   * SidebarHide modal
   * @param content modal content
   */
  SidebarHide() {
    document.body.classList.remove('vertical-sidebar-enable');
  }

  /**
   * Toggle favorite status of a menu item
   */
  onToggleFavorite(event: Event, menuItem: MenuItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.favoriteToggled.emit(menuItem);
  }

  /**
   * Handle menu item click and emit to parent
   */
  onMenuItemClick(menuItem: MenuItem): void {
    this.menuItemClicked.emit(menuItem);
  }

  /**
   * Handle subitem click - favorites vs regular navigation
   */
  handleSubitemClick(event: Event, subitem: MenuItem): void {
    if (subitem.isFavorite) {
      // For favorites, navigate directly without activating the menu section
      this.navigateToSpecialItem(event, subitem);
    } else {
      // For regular menu items, update active state and emit click event
      this.updateActive(event);
      this.onMenuItemClick(subitem);
    }
  }

  /**
   * Navigate to favorite item with proper routing context
   */
  navigateToSpecialItem(event: Event, item: MenuItem): void {
    event.preventDefault();
    event.stopPropagation(); // Prevent any parent event handling
    
    // Set flag to skip menu activation on next navigation
    this.skipMenuActivation = true;
    
    if (item.link) {
      // Handle different types of paths
      if (item.link.startsWith('/')) {
        // Absolute path - use navigateByUrl
        this.router.navigateByUrl(item.link);
      } else {
        // Relative path - use navigate with current context
        this.router.navigate([item.link], { relativeTo: this.activatedRoute });
      }
    }
  }

  /**
   * Check if a menu item is favorited
   */
  isFavorited(menuItem: MenuItem): boolean {
    return this.favoritesService.isFavorited(menuItem);
  }

  /**
   * Check if sidebar is in small mode
   */
  isSidebarSmall(): boolean {
    const sidebarSize = document.documentElement.getAttribute("data-sidebar-size");
    return sidebarSize === 'sm' || sidebarSize === 'sm-hover' || sidebarSize === 'sm-hover-active';
  }
}
