import {
  Component,
  OnInit,
  OnDestroy,
  EventEmitter,
  Output,
  ViewChild,
  ElementRef,
  HostListener,
  signal,
  computed,
  TemplateRef,
} from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { NgbModal, NgbModalRef } from "@ng-bootstrap/ng-bootstrap";
import { Subscription } from "rxjs";

import { MenuItem } from "./menu.model";
import { environment } from "src/environments/environment";
import { FavoriteService } from "@app/core/api/favorites/favorites.service";
import { PageAccessService } from "@app/core/api/page-access/page-access.service";
import { MenuService } from "@app/core/api/menu/menu.service";
import { AppSwitcherService, AppType } from "@app/services/app-switcher.service";
import { PathUtilsService } from "@app/core/services/path-utils.service";
import { FIELD_SERVICE_MENU } from "./field-service-menu-data";
import { ADMIN_MENU } from "./admin-menu-data";
import { SERIAL_MANAGEMENT_MENU } from "./serial-management-menu-data";
import { TRAINING_MENU } from "./training-menu-data";
import { INSPECTION_MENU } from "./inspection-menu-data";
import { PROJECT_MANAGER_MENU } from "./project-manager-menu-data";
import { MENU } from "./menu";
import {
  SidebarMenuBadgeCounts,
  MenuBadgeWebsocketService,
} from "@app/core/services/menu-badge-websocket.service";

@Component({
  selector: "app-sidebar",
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"],
})
export class SidebarComponent implements OnInit {
  private readonly badgeKeys = new Set<keyof SidebarMenuBadgeCounts>([
    'validationQueue',
    'pickingQueue',
    'pickAndStageOpen',
    'productionRoutingOpen',
    'finalTestQcOpen',
    'shippingScheduleDueNow',
    'vehicleExpiringSoon',
    'vehicleInspectionPendingResolutions',
    'shortagesOpen',
    'safetyIncidentOpen',
    'qualityIssuesOpen',
    'correctiveActionsOpen',
    'returnsRmaOpen',
    'permitChecklistOpen',
    'shippingRequestOpen',
    'graphicsProductionOpen',
    'fieldsServiceRequestsOpen',
    'partsOrderOpen',
    'trainingLiveSessionsOpen',
    'inspectionChecklistExecutionInProgress',
    'pmProjectsOpen',
    'pmTasksOpen',
  ]);

  private readonly badgeVariantByKey: Record<keyof SidebarMenuBadgeCounts, string> = {
    validationQueue: 'sidebar-count-badge--critical',
    pickingQueue: 'sidebar-count-badge--attention',
    pickAndStageOpen: 'sidebar-count-badge--attention',
    productionRoutingOpen: 'sidebar-count-badge--attention',
    finalTestQcOpen: 'sidebar-count-badge--attention',
    shippingScheduleDueNow: 'sidebar-count-badge--attention',
    vehicleExpiringSoon: 'sidebar-count-badge--critical',
    vehicleInspectionPendingResolutions: 'sidebar-count-badge--critical',
    shortagesOpen: 'sidebar-count-badge--critical',
    safetyIncidentOpen: 'sidebar-count-badge--critical',
    qualityIssuesOpen: 'sidebar-count-badge--critical',
    correctiveActionsOpen: 'sidebar-count-badge--critical',
    returnsRmaOpen: 'sidebar-count-badge--critical',
    permitChecklistOpen: 'sidebar-count-badge--critical',
    shippingRequestOpen: 'sidebar-count-badge--critical',
    graphicsProductionOpen: 'sidebar-count-badge--critical',
    fieldsServiceRequestsOpen: 'sidebar-count-badge--critical',
    partsOrderOpen: 'sidebar-count-badge--critical',
    trainingLiveSessionsOpen: 'sidebar-count-badge--critical',
    inspectionChecklistExecutionInProgress: 'sidebar-count-badge--critical',
    pmProjectsOpen: 'sidebar-count-badge--attention',
    pmTasksOpen: 'sidebar-count-badge--attention',
  };

  menu: any;
  toggle: any = true;
  menuItems: MenuItem[] = [];
  @ViewChild("sideMenu") sideMenu!: ElementRef;
  @ViewChild("searchInput") searchInput!: ElementRef;
  @Output() mobileMenuButtonClicked = new EventEmitter();
  maxFavs = 5;
  favs = [];
  isSidebarHoverExpanded = false;

  // User preferences with localStorage persistence
  isCollapsed: boolean = true; // Favorites section collapsed state
  sidebarPreferences = {
    favoritesExpanded: false,
    sidebarSize: 'normal', // 'normal' or 'small'
    expandAllItems: true,
    collapseOthersOnExpand: false
  };

  version = environment.VERSION;
  // Search functionality using Angular signals
  showSearch: boolean = true; // toggle visibility of the search box
  searchTerm = signal('');

  // history / recent searches (lightweight placeholder)
  recentSearches: string[] = [];
  
  // Configuration modal properties
  configModalRef: NgbModalRef | null = null;
  @ViewChild('configModalTemplate') configModalTemplate!: TemplateRef<any>;
  configMenuItems = signal([]);
  originalMenuItems: MenuItem[] = []; // Store original items
  currentMenuType: string = 'main'; // Track current menu type
  private menuBadgeSubscription?: Subscription;
  private badgeTooltipRefreshTimerId?: ReturnType<typeof setInterval>;
  private menuBadgeEmissionCount = 0;
  private badgeTooltipNowMs = Date.now();
  menuBadgeLastUpdatedAt: Date | null = null;
  menuBadgeCounts: SidebarMenuBadgeCounts = {
    validationQueue: 0,
    pickingQueue: 0,
    pickAndStageOpen: 0,
    productionRoutingOpen: 0,
    finalTestQcOpen: 0,
    shippingScheduleDueNow: 0,
    vehicleExpiringSoon: 0,
    vehicleInspectionPendingResolutions: 0,
    shortagesOpen: 0,
    safetyIncidentOpen: 0,
    qualityIssuesOpen: 0,
    correctiveActionsOpen: 0,
    returnsRmaOpen: 0,
    permitChecklistOpen: 0,
    shippingRequestOpen: 0,
    graphicsProductionOpen: 0,
    fieldsServiceRequestsOpen: 0,
    partsOrderOpen: 0,
    trainingLiveSessionsOpen: 0,
    inspectionChecklistExecutionInProgress: 0,
    pmProjectsOpen: 0,
    pmTasksOpen: 0,
  };

  get appRailItems() {
    return this.appSwitcherService.getApps();
  }

  appHasBadgeNotifications(appId: AppType): boolean {
    return this.getAppBadgeCount(appId) > 0;
  }

  get currentSectionName(): string {
    return this.appSwitcherService.getActiveApp()?.name ?? 'Operations Dashboard';
  }

  switchRailApp(appId: AppType): void {
    // Sidebar rail changes menu context only; route navigation happens when user picks a menu item.
    this.appSwitcherService.setAppContext(appId);
  }

  favoriteInitial(label: string): string {
    if (!label) {
      return "*";
    }
    return label.trim().charAt(0).toUpperCase();
  }
  
  // Computed properties for modal display
  visibleConfigItems = computed(() => 
    this.configMenuItems()
      .filter(item => item.visible)
      .sort((a, b) => a.order - b.order)
  );
  
  hiddenConfigItems = computed(() => 
    this.configMenuItems().filter(item => !item.visible)
  );
  constructor(
    private router: Router,
    private favoriteService: FavoriteService,
    public pageAccessService: PageAccessService,
    public menuService: MenuService,
    private appSwitcherService: AppSwitcherService,
    private pathUtils: PathUtilsService,
    private modalService: NgbModal,
    private menuBadgeWebsocketService: MenuBadgeWebsocketService
  ) {
    this.getMenu();
    
    this.favoriteService.getData$.subscribe(() => {
      this.favs = this.favoriteService.getFavorites();
    });

    this.router.events.subscribe((event: any) => {
      if (document.documentElement.getAttribute("data-layout") != "twocolumn") {
        if (event instanceof NavigationEnd) {
          this.checkAndShowHiddenItemForCurrentRoute(event.url);
          this.initActiveMenu();
        }
      }
    });

    // Subscribe to app changes and reload menu
    this.appSwitcherService.currentApp$.subscribe(() => {
      this.getMenu();
    });

    // Initialize user preferences from localStorage
    this.loadUserPreferences();
  }

  // User Preferences Management
  private loadUserPreferences(): void {
    try {
      const savedPreferences = localStorage.getItem('sidebar-preferences');
      if (savedPreferences) {
        this.sidebarPreferences = { ...this.sidebarPreferences, ...JSON.parse(savedPreferences) };
      }
      
      // Apply favorites expanded state
      this.isCollapsed = !this.sidebarPreferences.favoritesExpanded;
      
      // Apply sidebar size state
      this.applySidebarSize();
    } catch (error) {
      console.warn('Failed to load sidebar preferences:', error);
    }
  }

  private saveUserPreferences(): void {
    try {
      localStorage.setItem('sidebar-preferences', JSON.stringify(this.sidebarPreferences));
    } catch (error) {
      console.warn('Failed to save sidebar preferences:', error);
    }
  }

  private applySidebarSize(): void {
    const currentSize = document.documentElement.getAttribute("data-sidebar-size");
    
    if (this.sidebarPreferences.sidebarSize === 'small' && currentSize !== 'sm-hover') {
      document.documentElement.setAttribute("data-sidebar-size", "sm-hover");
    } else if (this.sidebarPreferences.sidebarSize === 'normal' && (currentSize === 'sm-hover' || currentSize === 'sm')) {
      document.documentElement.removeAttribute("data-sidebar-size");
    }
  }

  // Toggle favorites expanded/collapsed state with persistence
  toggleFavoritesExpansion(): void {
    this.sidebarPreferences.favoritesExpanded = !this.sidebarPreferences.favoritesExpanded;
    this.isCollapsed = !this.sidebarPreferences.favoritesExpanded;
    this.saveUserPreferences();
  }

  // Handle sidebar size change from dropdown
  onSidebarSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newSize = target.value as 'normal' | 'small';
    
    this.sidebarPreferences.sidebarSize = newSize;
    this.applySidebarSize();
    this.saveUserPreferences();
  }

  onExpandAllItemsChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.sidebarPreferences.expandAllItems = target.checked;
    this.applyExpandPreferenceToMenu();
    this.saveUserPreferences();
  }

  onCollapseOthersOnExpandChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.sidebarPreferences.collapseOthersOnExpand = target.checked;
    this.saveUserPreferences();
  }

  // Reset all preferences to defaults
  resetUserPreferences(): void {
    this.sidebarPreferences = {
      favoritesExpanded: false,
      sidebarSize: 'normal',
      expandAllItems: true,
      collapseOthersOnExpand: false
    };
    
    // Apply the reset preferences
    this.isCollapsed = !this.sidebarPreferences.favoritesExpanded;
    this.applySidebarSize();
    this.applyExpandPreferenceToMenu();
    this.saveUserPreferences();
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
      this.currentMenuType = 'field-service';
      this.originalMenuItems = [...FIELD_SERVICE_MENU];
      this.menuItems = [...FIELD_SERVICE_MENU];
    } else if (this.appSwitcherService.isAdminApp()) {
      this.currentMenuType = 'admin';
      this.originalMenuItems = [...ADMIN_MENU];
      this.menuItems = [...ADMIN_MENU];
    } else if (this.appSwitcherService.isSerialManagementApp()) {
      this.currentMenuType = 'serial-management';
      this.originalMenuItems = [...SERIAL_MANAGEMENT_MENU];
      this.menuItems = [...SERIAL_MANAGEMENT_MENU];
    } else if (this.appSwitcherService.isTrainingApp()) {
      this.currentMenuType = 'training';
      this.originalMenuItems = [...TRAINING_MENU];
      this.menuItems = [...TRAINING_MENU];
    } else if (this.appSwitcherService.isInspectionApp()) {
      this.currentMenuType = 'inspection';
      this.originalMenuItems = [...INSPECTION_MENU];
      this.menuItems = [...INSPECTION_MENU];
    } else if (this.appSwitcherService.isProjectManagerApp()) {
      this.currentMenuType = 'project-manager';
      this.originalMenuItems = [...PROJECT_MANAGER_MENU];
      this.menuItems = [...PROJECT_MANAGER_MENU];
    } else {
      this.currentMenuType = 'main';
      const menuData = await this.menuService.getMenu();
      this.originalMenuItems = [...menuData];
      this.menuItems = [...menuData];
    }
    
    // Apply user configuration after loading menu
    this.applyMenuConfiguration();
    this.applyExpandPreferenceToMenu();
    
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
    this.badgeTooltipRefreshTimerId = setInterval(() => {
      // Keep a stable "now" snapshot for tooltip rendering in each change detection cycle.
      this.badgeTooltipNowMs = Date.now();
    }, 1000);

    this.menuBadgeWebsocketService.init();
    this.menuBadgeSubscription = this.menuBadgeWebsocketService.counts$.subscribe((counts) => {
      this.badgeTooltipNowMs = Date.now();
      this.menuBadgeEmissionCount += 1;
      if (this.menuBadgeEmissionCount > 1) {
        this.menuBadgeLastUpdatedAt = new Date();
      }
      this.menuBadgeCounts = counts;
    });
  }

  ngOnDestroy(): void {
    if (this.menuBadgeSubscription) {
      this.menuBadgeSubscription.unsubscribe();
      this.menuBadgeSubscription = undefined;
    }

    if (this.badgeTooltipRefreshTimerId) {
      clearInterval(this.badgeTooltipRefreshTimerId);
      this.badgeTooltipRefreshTimerId = undefined;
    }
  }

  getMenuBadge(menu: MenuItem): { text: string; variant: string } | null {
    const count = this.getBadgeCount(menu);
    if (count <= 0) {
      return null;
    }

    // Parent/category badges only appear when collapsed; expanded state shows child badges only.
    if (this.hasItems(menu)) {
      if (this.shouldExpandDropdown(menu)) {
        return null;
      }

      return {
        text: this.formatBadgeCount(count),
        variant: 'sidebar-count-badge--aggregate',
      };
    }

    const variant = this.resolveLeafBadgeVariant(menu);
    if (!variant) {
      return null;
    }

    return {
      text: this.formatBadgeCount(count),
      variant,
    };
  }

  private getBadgeCount(menu: MenuItem): number {
    if (this.hasItems(menu)) {
      return menu.subItems.reduce((sum: number, child: MenuItem) => sum + this.getBadgeCount(child), 0);
    }

    const key = this.resolveLeafBadgeKey(menu);
    return key ? this.menuBadgeCounts[key] : 0;
  }

  private getAppBadgeCount(appId: AppType): number {
    return this.getMenuItemsForApp(appId).reduce((sum, menu) => sum + this.getBadgeCount(menu), 0);
  }

  private getMenuItemsForApp(appId: AppType): MenuItem[] {
    switch (appId) {
      case 'field-service':
        return FIELD_SERVICE_MENU;
      case 'admin':
        return ADMIN_MENU;
      case 'serial-management':
        return SERIAL_MANAGEMENT_MENU;
      case 'training':
        return TRAINING_MENU;
      case 'inspection':
        return INSPECTION_MENU;
      case 'project-manager':
        return PROJECT_MANAGER_MENU;
      case 'main':
      default:
        return MENU;
    }
  }

  private resolveLeafBadgeKey(menu: MenuItem): keyof SidebarMenuBadgeCounts | null {
    if (typeof menu.badgeId === 'string' && this.badgeKeys.has(menu.badgeId as keyof SidebarMenuBadgeCounts)) {
      return menu.badgeId as keyof SidebarMenuBadgeCounts;
    }

    if (typeof menu.id === 'string' && this.badgeKeys.has(menu.id as keyof SidebarMenuBadgeCounts)) {
      return menu.id as keyof SidebarMenuBadgeCounts;
    }

    return null;
  }

  private resolveLeafBadgeVariant(menu: MenuItem): string | null {
    const key = this.resolveLeafBadgeKey(menu);
    return key ? this.badgeVariantByKey[key] : null;
  }

  private formatBadgeCount(count: number): string {
    return count > 99 ? '99+' : String(count);
  }

  getBadgeTooltip(menu: MenuItem): string {
    const count = this.getBadgeCount(menu);
    const updatedText = this.menuBadgeLastUpdatedAt
      ? `${this.formatRelativeTime(this.menuBadgeLastUpdatedAt)} (${this.menuBadgeLastUpdatedAt.toLocaleString()})`
      : 'waiting for first server update';

    return `Count: ${count}\nLast update: ${updatedText}`;
  }

  private formatRelativeTime(date: Date): string {
    const elapsedMs = this.badgeTooltipNowMs - date.getTime();
    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

    if (elapsedSeconds < 10) {
      return 'just now';
    }

    if (elapsedSeconds < 60) {
      return `${elapsedSeconds}s ago`;
    }

    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    if (elapsedMinutes < 60) {
      return `${elapsedMinutes}m ago`;
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) {
      return `${elapsedHours}h ago`;
    }

    const elapsedDays = Math.floor(elapsedHours / 24);
    return `${elapsedDays}d ago`;
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
      return this.menuItems; // Normal filtered items when not searching
    }
    
    // When searching, include hidden items with special indicators
    const config = this.getMenuConfiguration();
    const searchResults = this.originalMenuItems.filter(item => {
      return this.itemOrChildrenMatch(item, term);
    }).map(item => ({
      ...item,
      isTemporarilyShown: config.hiddenItems.includes(item.id), // Mark as temporarily shown
      searchHighlight: true // Mark as search result
    }));
    
    return searchResults;
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
    // Check if current item matches (including titles)
    const currentMatches = item.label?.toLowerCase().includes(searchTerm);
    
    // For titles, only check their own label
    if (item.isTitle) {
      return currentMatches;
    }
    
    // For regular items, check if any children match
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

  shouldShowExpandedRailContent(): boolean {
    return !this.isSidebarSmall() || this.isSidebarHoverExpanded;
  }

  onSidebarMouseEnter(): void {
    if (this.isSidebarSmall()) {
      this.isSidebarHoverExpanded = true;
    }
  }

  onSidebarMouseLeave(): void {
    this.isSidebarHoverExpanded = false;
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
    if (!item) {
      return;
    }

    if (!this.sidebarPreferences.collapseOthersOnExpand) {
      item.isCollapsed = !item.isCollapsed;
      return;
    }

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

  getFavoritesBadgeTotal(): number {
    if (!this.favs?.length) return 0;
    return this.favs.reduce((sum, fav) => sum + this.getBadgeCount(fav), 0);
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
      
      // Use PathUtilsService to handle dynamic base paths
      const basePath = this.pathUtils.getBasePath();
      if (basePath && pathName.startsWith(basePath)) {
        pathName = pathName.replace(basePath, "");
      }
    }

    const active = this.findMenuItem(pathName, this.menuItems);
    if (!this.sidebarPreferences.expandAllItems) {
      this.toggleItem(active);
    }
    const ul = document.getElementById("navbar-nav");
    if (ul) {
      const items = Array.from(ul.querySelectorAll("a.nav-link"));
      let activeItems = items.filter((x: any) =>
        x.classList.contains("active")
      );
      this.removeActivation(activeItems);

      // First try to find exact path match
      let matchingMenuItem = items.find((x: any) => {
        const normalizedPath = this.normalizePath(x.pathname);
        return normalizedPath === pathName;
      });

      // If no exact match and we found an active menu item, try to find DOM element for that menu item's link
      if (!matchingMenuItem && active && active.link) {
        matchingMenuItem = items.find((x: any) => {
          const normalizedPath = this.normalizePath(x.pathname);
          return normalizedPath === active.link;
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

      // Prefer a deeper exact child match before wildcard parent matching.
      if (menuItem.subItems) {
        const foundItem = this.findMenuItem(pathname, menuItem.subItems);
        if (foundItem) {
          return foundItem;
        }
      }

      // Handle wildcard routes from activatedRoutes field like '/quality/igt/*'
      if (menuItem.activatedRoutes) {
        const routes = Array.isArray(menuItem.activatedRoutes) ? menuItem.activatedRoutes : [menuItem.activatedRoutes];
        for (const route of routes) {
          if (route.includes('*')) {
            // Remove the asterisk and any trailing slash before it
            const baseRoute = route.replace(/\/?\*+$/, '');
            
            // Check if current pathname starts with the base route
            // Also ensure we're matching complete path segments to avoid false positives
            if (pathname.startsWith(baseRoute) && 
                (pathname === baseRoute || pathname.startsWith(baseRoute + '/'))) {
              return menuItem;
            }
          }
        }
      }

      // Handle wildcard routes from link field like '/quality/igt/*'
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

      // Special handling for IGT routes - treat /quality/igt/list as parent for all IGT routes
      if (menuItem.link === "/quality/igt/list" && 
          pathname.startsWith("/quality/igt")) {
        return menuItem;
      }

      // Special handling for template-editor routes to match both /template-editor and /template-editor/:id
      if (menuItem.link === "/quality/template-editor" && 
          pathname.startsWith("/quality/template-editor")) {
        return menuItem;
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
   * Toggle between collapsed sidebar (sm-hover) and full sidebar (null)
   * Now saves the preference to localStorage
   */
  toggleMobileMenu(event: any) {
    var sidebarsize =
      document.documentElement.getAttribute("data-sidebar-size");
    if (sidebarsize == "sm-hover") {
      // If currently collapsed, expand to full menu
      document.documentElement.removeAttribute("data-sidebar-size");
      this.sidebarPreferences.sidebarSize = 'normal';
    } else {
      // If currently full or any other state, collapse to hover mode
      document.documentElement.setAttribute("data-sidebar-size", "sm-hover");
      this.sidebarPreferences.sidebarSize = 'small';
    }
    
    // Save the sidebar size preference
    this.saveUserPreferences();
  }

  // Configuration Modal Methods
  openConfigModal() {
    this.loadMenuConfiguration();
    console.log('Config Modal opened for menu type:', this.currentMenuType);
    console.log('Config Items:', this.configMenuItems());
    console.log('Visible Items:', this.visibleConfigItems());
    console.log('Hidden Items:', this.hiddenConfigItems());
    
    this.configModalRef = this.modalService.open(this.configModalTemplate, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });
  }

  closeConfigModal() {
    if (this.configModalRef) {
      this.configModalRef.close();
      this.configModalRef = null;
    }
  }

  loadMenuConfiguration() {
    const config = this.getMenuConfiguration();
    const allItems = [...this.originalMenuItems]; // Use original items instead of filtered ones
    
    // Ensure items have IDs
    allItems.forEach((item, index) => {
      if (!item.id) {
        item.id = index + 1000; // Start from 1000 to avoid conflicts
      }
    });
    
    // Create configurable items list with visibility status
    const configItems = allItems.map((item, index) => {
      const configItem = {
        ...item,
        visible: !config.hiddenItems.includes(item.id),
        order: config.order.length > 0 ? 
          (config.order.indexOf(item.id) !== -1 ? config.order.indexOf(item.id) : index) : 
          index
      };
      
      // Handle sub-items visibility
      if (item.subItems && config.hiddenSubItems) {
        configItem.subItems = item.subItems.map(subItem => ({
          ...subItem,
          isHidden: config.hiddenSubItems.includes(subItem.link)
        }));
      }
      
      return configItem;
    });

    // Sort by order
    configItems.sort((a, b) => a.order - b.order);

    // Set all items in configMenuItems
    this.configMenuItems.set(configItems);
    console.log(`[${this.currentMenuType}] Loaded config items:`, configItems);
    console.log(`[${this.currentMenuType}] Hidden items:`, configItems.filter(item => !item.visible));
  }

  toggleMenuItemVisibility(itemId: number | string) {
    console.log(`[${this.currentMenuType}] Toggling visibility for item ID:`, itemId);
    const config = this.getMenuConfiguration();
    console.log(`[${this.currentMenuType}] Current config before toggle:`, config);
    const hiddenIndex = config.hiddenItems.indexOf(itemId);
    
    if (hiddenIndex > -1) {
      // Show item
      config.hiddenItems.splice(hiddenIndex, 1);
      console.log(`[${this.currentMenuType}] Showing item, updated hidden items:`, config.hiddenItems);
    } else {
      // Hide item
      config.hiddenItems.push(itemId);
      console.log(`[${this.currentMenuType}] Hiding item, updated hidden items:`, config.hiddenItems);
    }
    
    this.saveMenuConfiguration(config);
    
    // Update the configMenuItems in place instead of reloading everything
    const currentItems = [...this.configMenuItems()];
    const itemIndex = currentItems.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
      currentItems[itemIndex] = {
        ...currentItems[itemIndex],
        visible: !config.hiddenItems.includes(itemId)
      };
      this.configMenuItems.set(currentItems);
      console.log(`[${this.currentMenuType}] Updated config items:`, currentItems);
      console.log(`[${this.currentMenuType}] Hidden items now:`, this.hiddenConfigItems());
    }
    
    this.applyMenuConfiguration();
  }

  toggleSubItemVisibility(parentId: number, subItemLink: string) {
    console.log(`[${this.currentMenuType}] Toggling sub-item visibility for parent ID: ${parentId}, sub-item link: ${subItemLink}`);
    const config = this.getMenuConfiguration();
    
    // Initialize hiddenSubItems if it doesn't exist
    if (!config.hiddenSubItems) {
      config.hiddenSubItems = [];
    }
    
    const hiddenIndex = config.hiddenSubItems.indexOf(subItemLink);
    
    if (hiddenIndex > -1) {
      // Show sub-item
      config.hiddenSubItems.splice(hiddenIndex, 1);
      console.log(`[${this.currentMenuType}] Showing sub-item, updated hidden sub-items:`, config.hiddenSubItems);
    } else {
      // Hide sub-item
      config.hiddenSubItems.push(subItemLink);
      console.log(`[${this.currentMenuType}] Hiding sub-item, updated hidden sub-items:`, config.hiddenSubItems);
    }
    
    this.saveMenuConfiguration(config);
    
    // Update the configMenuItems to reflect sub-item visibility changes
    const currentItems = [...this.configMenuItems()];
    const parentIndex = currentItems.findIndex(item => item.id === parentId);
    
    if (parentIndex !== -1 && currentItems[parentIndex].subItems) {
      const updatedSubItems = currentItems[parentIndex].subItems!.map(subItem => ({
        ...subItem,
        isHidden: config.hiddenSubItems.includes(subItem.link)
      }));
      
      currentItems[parentIndex] = {
        ...currentItems[parentIndex],
        subItems: updatedSubItems
      };
      
      this.configMenuItems.set(currentItems);
      console.log(`[${this.currentMenuType}] Updated sub-items for parent ${parentId}:`, updatedSubItems);
    }
    
    this.applyMenuConfiguration();
  }

  moveMenuItemUp(index: number) {
    const visibleItems = [...this.visibleConfigItems()];
    if (index > 0) {
      // Swap items in visible list
      [visibleItems[index], visibleItems[index - 1]] = [visibleItems[index - 1], visibleItems[index]];
      
      // Update order values in the full config items list
      const allItems = [...this.configMenuItems()];
      visibleItems.forEach((item, newIndex) => {
        const itemIndex = allItems.findIndex(configItem => configItem.id === item.id);
        if (itemIndex !== -1) {
          allItems[itemIndex].order = newIndex;
        }
      });
      
      // Update the signal
      this.configMenuItems.set(allItems);
      
      // Save the new order
      this.saveCurrentOrder();
    }
  }

  moveMenuItemDown(index: number) {
    const visibleItems = [...this.visibleConfigItems()];
    if (index < visibleItems.length - 1) {
      // Swap items in visible list
      [visibleItems[index], visibleItems[index + 1]] = [visibleItems[index + 1], visibleItems[index]];
      
      // Update order values in the full config items list
      const allItems = [...this.configMenuItems()];
      visibleItems.forEach((item, newIndex) => {
        const itemIndex = allItems.findIndex(configItem => configItem.id === item.id);
        if (itemIndex !== -1) {
          allItems[itemIndex].order = newIndex;
        }
      });
      
      // Update the signal
      this.configMenuItems.set(allItems);
      
      // Save the new order
      this.saveCurrentOrder();
    }
  }

  private saveCurrentOrder() {
    const config = this.getMenuConfiguration();
    const sortedItems = [...this.configMenuItems()].sort((a, b) => a.order - b.order);
    config.order = sortedItems.map(item => item.id);
    this.saveMenuConfiguration(config);
    this.applyMenuConfiguration();
    console.log(`[${this.currentMenuType}] Saved new order:`, config.order);
  }

  // Drag and drop handler
  onMenuItemDrop(event: CdkDragDrop<any[]>) {
    const visibleItems = [...this.visibleConfigItems()];
    
    // Reorder the visible items array
    moveItemInArray(visibleItems, event.previousIndex, event.currentIndex);
    
    // Update the order values in the full config items list
    const allItems = [...this.configMenuItems()];
    visibleItems.forEach((item, newIndex) => {
      const itemIndex = allItems.findIndex(configItem => configItem.id === item.id);
      if (itemIndex !== -1) {
        allItems[itemIndex].order = newIndex;
      }
    });

    // Update the signal
    this.configMenuItems.set(allItems);
    
    // Save the new order
    this.saveCurrentOrder();
  }

  restoreHiddenItem(itemId: number | string) {
    this.toggleMenuItemVisibility(itemId);
  }

  resetToDefault() {
    const configKey = `sidebar-menu-config-${this.currentMenuType}`;
    localStorage.removeItem(configKey);
    this.loadMenuConfiguration();
    this.applyMenuConfiguration();
  }

  // Test method to hide the first item for debugging
  testHideItem() {
    const visibleItems = this.visibleConfigItems();
    if (visibleItems.length > 0) {
      const firstItem = visibleItems[0];
      console.log('Hiding item:', firstItem);
      this.toggleMenuItemVisibility(firstItem.id);
    }
  }

  // Favorites management methods for configuration modal
  clearAllFavorites() {
    if (confirm('Are you sure you want to remove all favorites? This action cannot be undone.')) {
      this.favoriteService.clearAll();
    }
  }

  removeFavoriteByIndex(index: number) {
    this.favoriteService.removeByIndex(index);
  }

  getFavoritesList() {
    return this.favoriteService.getFavorites();
  }

  addMenuItemToFavorites(menuItem: MenuItem) {
    if (menuItem.link) {
      const favoriteItem = {
        label: menuItem.label,
        path: menuItem.link,
        icon: menuItem.icon || 'ri-star-line',
        description: menuItem.description
      };
      this.favoriteService.onSave(favoriteItem);
    }
  }

  // Check if current route matches a hidden menu item and auto-show it
  private checkAndShowHiddenItemForCurrentRoute(currentUrl: string) {
    const config = this.getMenuConfiguration();
    if (config.hiddenItems.length === 0) return;

    // Find any hidden item that matches the current route
    const hiddenItem = this.originalMenuItems.find(item => {
      if (!config.hiddenItems.includes(item.id)) return false;
      
      // Check if current URL matches this item's link or activatedRoutes
      if (item.link && this.isRouteMatch(currentUrl, item.link)) {
        return true;
      }
      
      if (item.activatedRoutes && this.isRouteMatch(currentUrl, item.activatedRoutes)) {
        return true;
      }
      
      // Check sub-items as well
      if (item.subItems) {
        return item.subItems.some(subItem => {
          if (subItem.link && this.isRouteMatch(currentUrl, subItem.link)) return true;
          if (subItem.activatedRoutes && this.isRouteMatch(currentUrl, subItem.activatedRoutes)) return true;
          return false;
        });
      }
      
      return false;
    });

    if (hiddenItem) {
      console.log(`[${this.currentMenuType}] Auto-showing hidden menu item for route:`, currentUrl, hiddenItem);
      // Auto-show the hidden item
      this.toggleMenuItemVisibility(hiddenItem.id);
      
      // Show a toast notification to inform the user
      this.showAutoShowNotification(hiddenItem);
    }
  }

  private isRouteMatch(currentUrl: string, routePattern: string | string[]): boolean {
    const patterns = Array.isArray(routePattern) ? routePattern : [routePattern];
    
    return patterns.some(pattern => {
      // Handle wildcard routes like "/operations/reports/*"
      if (pattern.includes('*')) {
        const baseRoute = pattern.replace('/*', '');
        return currentUrl.startsWith(baseRoute);
      }
      
      // Exact match
      return currentUrl === pattern || currentUrl.startsWith(pattern + '/');
    });
  }

  private showAutoShowNotification(item: any) {
    // You can implement a toast notification here
    // For now, just console log
    console.log(`Menu item "${item.label}" was automatically shown because you navigated to it.`);
    
    // You could also add a temporary highlight or badge to the menu item
    // Or show a dismissible alert in the UI
  }

  // Handle clicking on a hidden item during search
  handleHiddenItemClick(menu: any) {
    if (menu.isTemporarilyShown) {
      console.log(`[${this.currentMenuType}] Permanently showing hidden item:`, menu.label);
      // Permanently show the hidden item
      this.toggleMenuItemVisibility(menu.id);
    }
  }

  private getMenuConfiguration() {
    const configKey = `sidebar-menu-config-${this.currentMenuType}`;
    const saved = localStorage.getItem(configKey);
    return saved ? JSON.parse(saved) : { hiddenItems: [], hiddenSubItems: [], order: [] };
  }

  private saveMenuConfiguration(config: any) {
    const configKey = `sidebar-menu-config-${this.currentMenuType}`;
    localStorage.setItem(configKey, JSON.stringify(config));
  }

  private applyMenuConfiguration() {
    const config = this.getMenuConfiguration();
    const filteredItems = this.originalMenuItems.filter(item => !config.hiddenItems.includes(item.id));
    
    // Apply sub-item hiding
    const processedItems = filteredItems.map(item => {
      if (item.subItems && config.hiddenSubItems && config.hiddenSubItems.length > 0) {
        const visibleSubItems = item.subItems.filter(subItem => !config.hiddenSubItems.includes(subItem.link));
        return {
          ...item,
          subItems: visibleSubItems
        };
      }
      return item;
    });
    
    if (config.order.length > 0) {
      processedItems.sort((a, b) => {
        const aOrder = config.order.indexOf(a.id);
        const bOrder = config.order.indexOf(b.id);
        return (aOrder === -1 ? 999 : aOrder) - (bOrder === -1 ? 999 : bOrder);
      });
    }
    
    // Update the displayed menu items (this affects the actual sidebar display)
    this.menuItems = processedItems;
    this.applyExpandPreferenceToMenu();
  }

  private applyExpandPreferenceToMenu(): void {
    if (!this.menuItems || this.menuItems.length === 0) {
      return;
    }

    const shouldCollapse = !this.sidebarPreferences.expandAllItems;
    this.setCollapsedStateRecursively(this.menuItems, shouldCollapse);
  }

  private setCollapsedStateRecursively(items: MenuItem[], collapsed: boolean): void {
    items.forEach((menuItem: MenuItem) => {
      if (menuItem.subItems && menuItem.subItems.length > 0) {
        menuItem.isCollapsed = collapsed;
        this.setCollapsedStateRecursively(menuItem.subItems as MenuItem[], collapsed);
      }
    });
  }

  /**
   * SidebarHide modal
   * @param content modal content
   */
  SidebarHide() {
    document.body.classList.remove("vertical-sidebar-enable");
  }

  /**
   * Normalize path by removing base paths for comparison
   */
  private normalizePath(pathname: string): string {
    if (environment.production) {
      let path = pathname;
      // Remove common base paths
      path = path.replace("/velzon/angular/modern", "");
      
      // Use PathUtilsService to handle dynamic base paths
      const basePath = this.pathUtils.getBasePath();
      if (basePath && path.startsWith(basePath)) {
        path = path.replace(basePath, "");
      }
      
      return path;
    } else {
      return pathname;
    }
  }

  // TrackBy function for menu items to avoid NG0955 duplicate key errors
  trackMenuItem(index: number, item: MenuItem): any {
    return item.link || item.id || index;
  }
}
