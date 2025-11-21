import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, HostListener, TemplateRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { Subscription, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { SlickCarouselModule } from 'ngx-slick-carousel';

// Services
import { PriorityDisplayService, PriorityDisplayData } from './services/priority-display.service';
import { DisplayUtilsService } from './services/display-utils.service';
import { ThemeManagementService, ThemeSettings } from './services/theme-management.service';

// Components
import { SinglePriorityViewComponent } from './components/single-priority-view/single-priority-view.component';
import { MultiCardViewComponent } from './components/multi-card-view/multi-card-view.component';
import { PrioritySettingsComponent } from './components/priority-settings/priority-settings.component';

@Component({
  selector: 'app-standalone-shipping-priority-display',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SlickCarouselModule,
    SinglePriorityViewComponent,
    MultiCardViewComponent,
    PrioritySettingsComponent
  ],
  templateUrl: './shipping-priority-display.component.html',
  styleUrls: ['./shipping-priority-display.component.scss']
})
export class StandaloneShippingPriorityDisplayComponent implements OnInit, AfterViewInit, OnDestroy {
  
  // Reactive data stream
  displayData$ = this.priorityDisplayService.displayData$;
  
  // Current time display
  currentTime: string = '';
  
  // Refresh countdown
  nextRefreshTime: Date | null = null;
  refreshCountdown: string = '';
  
  // Display mode options
  displayMode: 'single' | 'top3' | 'top6' | 'grid' = 'top6';
  
  // Card layout options
  cardLayout: 'traditional' | 'production' | 'salesorder' | 'compact' | 'detailed' | 'minimal' | 'dashboard' = 'salesorder';
  
  // Coming Up Next configuration
  showComingUpNext: boolean = true;
  autoScrollEnabled: boolean = true;
  scrollSpeed: number = 30; // seconds for one complete scroll cycle
  
  // Priority type toggle
  priorityType: 'shipping' | 'kanban' = 'shipping'; // Default to shipping
  
  // Combined view setting
  showCombinedView: boolean = false;
  
  // Slick Carousel configuration - optimized for smooth auto-scrolling
  slickConfig = {
    "slidesToShow": 7,
    "slidesToScroll": 1,
    "autoplay": true,
    "autoplaySpeed": 1500,
    "infinite": true,
    "arrows": false,
    "dots": false,
    "pauseOnHover": false,
    "pauseOnFocus": false,
    "speed": 600,
    "centerMode": false,
    "variableWidth": false,
    "cssEase": "linear",
    "waitForAnimate": false,
    "responsive": [
      {
        "breakpoint": 1200,
        "settings": {
          "slidesToShow": 5,
          "slidesToScroll": 1,
          "autoplay": true,
          "infinite": true,
          "arrows": false,
          "autoplaySpeed": 1500
        }
      },
      {
        "breakpoint": 768,
        "settings": {
          "slidesToShow": 3,
          "slidesToScroll": 1,
          "autoplay": true,
          "infinite": true,
          "arrows": false,
          "autoplaySpeed": 1500
        }
      },
      {
        "breakpoint": 480,
        "settings": {
          "slidesToShow": 2,
          "slidesToScroll": 1,
          "autoplay": true,
          "infinite": true,
          "arrows": false,
          "autoplaySpeed": 1500
        }
      }
    ]
  };
  
  // Refresh overlay setting
  showRefreshOverlay: boolean = false;
  
  // Theme management
  currentTheme: 'light' | 'dark' | 'dark-vibrant' | 'midnight' | 'neon' | 'bootstrap-dark' = 'bootstrap-dark';
  autoSwitchEnabled: boolean = false;
  switchIntervalMinutes: number = 30;
  switchCountdown: string = '';
  zoomLevel: number = 100;
  
  // Available themes
  availableThemes = [
    { value: 'light', label: 'Light Mode', icon: '☀️' },
    { value: 'dark', label: 'Dark Mode', icon: '🌙' },
    { value: 'dark-vibrant', label: 'Dark Vibrant', icon: '🎨' },
    { value: 'midnight', label: 'Midnight Blue', icon: '🌊' },
    { value: 'neon', label: 'Neon Dark', icon: '⚡' },
    { value: 'bootstrap-dark', label: 'Bootstrap Dark', icon: '🅱️' }
  ];
  
  // Offcanvas template reference
  @ViewChild('settingsOffcanvas', { static: true }) settingsOffcanvas!: TemplateRef<any>;
  
  // Slick carousel reference
  @ViewChild('slickModal', { static: false}) slickModal: any;
  
  // Settings state
  settingsOpen = false;
  
  // Subscriptions management
  private destroy$ = new Subject<void>();
  private timeSubscription?: Subscription;
  private refreshSubscription?: Subscription;
  private themeSubscription?: Subscription;
  
  // Auto-refresh configuration
  refreshInterval: number = 300000; // Default 5 minutes
  availableRefreshIntervals = [
    { value: 10000, label: '10 seconds' },
    { value: 20000, label: '20 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
    { value: 120000, label: '2 minutes' },
    { value: 300000, label: '5 minutes' },
    { value: 600000, label: '10 minutes' },
    { value: 0, label: 'Manual only' }
  ];

  // Settings storage key
  private readonly SETTINGS_STORAGE_KEY = 'shipping-priority-display-settings';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public priorityDisplayService: PriorityDisplayService,
    private displayUtils: DisplayUtilsService,
    private cdr: ChangeDetectorRef,
    private offcanvasService: NgbOffcanvas,
    private themeService: ThemeManagementService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Shipping Priority Display component initialized');
    console.log('🔗 Current URL:', window.location.href);
    console.log('🔗 Current query params:', this.route.snapshot.queryParams);
    this.initializeComponent();
  }

  ngAfterViewInit(): void {
    // Update initial carousel config based on settings
    this.updateSlickConfig();
    
    // Start carousel after view init with longer delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeCarousel();
    }, 2000);
  }

  /**
   * Initialize and start carousel
   */
  private initializeCarousel(): void {
    if (this.autoScrollEnabled && this.slickModal) {
      try {
        console.log('🎠 Initializing carousel...');
        
        // Force re-initialize the carousel
        this.slickModal.unslick();
        
        setTimeout(() => {
          this.slickModal.initSlick();
          this.startCarousel();
        }, 500);
      } catch (error) {
        console.log('🎠 Error initializing carousel, trying direct start:', error);
        this.startCarousel();
      }
    }
  }

  /**
   * Start or restart carousel
   */
  private startCarousel(): void {
    if (this.slickModal && this.autoScrollEnabled) {
      try {
        console.log('🎠 Starting carousel autoplay...');
        
        // Force autoplay
        this.slickModal.slickPlay();
        
        // Double-check autoplay is working
        setTimeout(() => {
          if (this.slickModal) {
            this.slickModal.slickPlay();
            console.log('🎠 Carousel autoplay confirmed');
          }
        }, 1000);
        
        console.log('🎠 Carousel started successfully');
      } catch (error) {
        console.log('🎠 Error starting carousel:', error);
      }
    } else {
      console.log('🎠 Carousel not enabled or not initialized');
    }
  }

  ngOnDestroy(): void {
    console.log('🧹 Cleaning up Shipping Priority Display component');
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up subscriptions
    this.timeSubscription?.unsubscribe();
    this.refreshSubscription?.unsubscribe();
    this.themeSubscription?.unsubscribe();
    
    // Clean up theme service
    this.themeService.destroy();
    
    // Remove CSS class from body
    document.body.classList.remove('shipping-priority-display');
  }

  /**
   * Initialize the component
   */
  private initializeComponent(): void {
    // Set document title
    document.title = 'Shipping Priority Display | The Fi Company';
    
    // Add CSS class to body for full-screen styling
    document.body.classList.add('shipping-priority-display');
    
    // Load settings from localStorage
    this.loadSettingsFromStorage();
    
    // Setup query parameter subscription for reactive updates (keep for backward compatibility)
    this.setupQueryParamSubscription();
    
    // Setup theme subscriptions
    this.setupThemeSubscriptions();
    
    // Setup time display
    this.setupTimeDisplay();
    
    // Setup auto-refresh
    this.setupAutoRefresh();
    
    // Load initial data
    this.loadInitialData();
  }

  /**
   * Setup reactive subscription to query parameters
   */
  private setupQueryParamSubscription(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const viewParam = params['view'] as 'single' | 'top3' | 'top6' | 'grid';
        const refreshParam = params['refresh'];
        console.log('🔗 Query params changed:', params);
        
        // Handle display mode
        if (viewParam && ['single', 'top3', 'top6', 'grid'].includes(viewParam)) {
          this.displayMode = viewParam;
          console.log(`🔗 Display mode set from URL: ${this.displayMode}`);
        } else {
          this.displayMode = 'top3'; // default
          console.log('🔗 No valid view parameter, using default: top3');
        }
        
        // Handle refresh interval
        if (refreshParam) {
          const refreshValue = parseInt(refreshParam);
          if (!isNaN(refreshValue) && refreshValue >= 0) {
            this.refreshInterval = refreshValue;
            console.log(`🔗 Refresh interval set from URL: ${this.refreshInterval/1000}s`);
            // Restart auto-refresh with new interval
            this.startAutoRefresh();
          }
        }
        
        // Update the service with the current mode
        this.priorityDisplayService.updateDisplayMode(this.displayMode);
      });
  }

  /**
   * Setup time display that updates every second
   */
  private setupTimeDisplay(): void {
    this.timeSubscription = timer(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = this.displayUtils.formatCurrentTime();
        this.updateRefreshCountdown();
      });
  }

  /**
   * Update refresh countdown display
   */
  private updateRefreshCountdown(): void {
    if (this.nextRefreshTime && this.refreshInterval > 0) {
      const now = new Date();
      const timeLeft = this.nextRefreshTime.getTime() - now.getTime();
      
      if (timeLeft > 0) {
        const seconds = Math.ceil(timeLeft / 1000);
        this.refreshCountdown = `${seconds}s`;
      } else {
        this.refreshCountdown = 'Now';
      }
    } else {
      this.refreshCountdown = '';
    }
  }

  /**
   * Setup auto-refresh functionality
   */
  private setupAutoRefresh(): void {
    this.startAutoRefresh();
  }

  /**
   * Start auto-refresh with current interval
   */
  private startAutoRefresh(): void {
    // Clear existing subscription
    this.refreshSubscription?.unsubscribe();
    this.nextRefreshTime = null;
    this.refreshCountdown = '';
    
    // Only setup auto-refresh if interval is not 0 (manual only)
    if (this.refreshInterval > 0) {
      // Set next refresh time
      this.nextRefreshTime = new Date(Date.now() + this.refreshInterval);
      
      this.refreshSubscription = timer(this.refreshInterval, this.refreshInterval)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          console.log(`🔄 Auto-refreshing priority data every ${this.refreshInterval/1000} seconds...`);
          console.log('🔄 Current display mode during auto-refresh:', this.displayMode);
          console.log('🔄 Show refresh overlay setting:', this.showRefreshOverlay);
          
          // Update next refresh time
          this.nextRefreshTime = new Date(Date.now() + this.refreshInterval);
          
          // Ensure display mode is preserved during auto-refresh
          this.priorityDisplayService.updateDisplayMode(this.displayMode);
          
          // Load data based on combined view setting
          if (this.showCombinedView) {
            this.priorityDisplayService.loadCombinedPriorityData(this.showRefreshOverlay);
          } else {
            this.priorityDisplayService.loadPriorityData(this.showRefreshOverlay);
          }
        });
      console.log(`✅ Auto-refresh started with ${this.refreshInterval/1000}s interval`);
    } else {
      console.log('🔄 Auto-refresh disabled - manual refresh only');
    }
  }

  /**
   * Change refresh interval and restart auto-refresh
   */
  onRefreshIntervalChange(newInterval: number): void {
    console.log(`🔄 Changing refresh interval from ${this.refreshInterval/1000}s to ${newInterval/1000}s`);
    this.refreshInterval = newInterval;
    this.startAutoRefresh();
    
    // Save settings to localStorage
    this.saveSettingsToStorage();
    
    // Update URL with refresh interval (for backward compatibility)
    this.updateUrlWithRefreshInterval();
    
    // Manual refresh when changing interval to show immediate effect
    if (newInterval > 0) {
      this.refreshData();
    }
  }

  /**
   * Update URL with current refresh interval
   */
  private updateUrlWithRefreshInterval(): void {
    try {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { 
          view: this.displayMode,
          refresh: this.refreshInterval 
        },
        queryParamsHandling: 'merge'
      });
      console.log(`🔗 URL updated with refresh=${this.refreshInterval}`);
    } catch (error) {
      console.warn('⚠️ Failed to update URL with refresh interval:', error);
    }
  }

  /**
   * Load initial data
   */
  private async loadInitialData(): Promise<void> {
    try {
      console.log('🚀 Loading initial priority data...');
      console.log('🚀 Initial display mode from URL:', this.displayMode);
      console.log('🚀 Initial priority type:', this.priorityType);
      console.log('🚀 Combined view enabled:', this.showCombinedView);
      
      // Set display mode BEFORE loading data
      this.priorityDisplayService.updateDisplayMode(this.displayMode);
      
      // Set combined view mode BEFORE loading data
      if (this.showCombinedView) {
        await this.priorityDisplayService.loadCombinedPriorityData(true);
      } else {
        await this.priorityDisplayService.updatePriorityType(this.priorityType);
      }
      
      console.log('✅ Initial data load completed');
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
    }
  }

  /**
   * Manual refresh triggered by user
   */
  async refreshData(): Promise<void> {
    console.log('🔄 Manual refresh triggered');
    console.log('🔄 Current display mode during manual refresh:', this.displayMode);
    console.log('🔄 Combined view enabled:', this.showCombinedView);
    
    // Ensure display mode is preserved during manual refresh
    this.priorityDisplayService.updateDisplayMode(this.displayMode);
    
    // Load data based on combined view setting
    if (this.showCombinedView) {
      await this.priorityDisplayService.loadCombinedPriorityData(true);
    } else {
      await this.priorityDisplayService.loadPriorityData(true);
    }
  }

  /**
   * Toggle between different display modes
   */
  toggleDisplayMode(): void {
    const oldMode = this.displayMode;
    
    // Cycle through all display modes
    switch (this.displayMode) {
      case 'single':
        this.displayMode = 'top3';
        break;
      case 'top3':
        this.displayMode = 'top6';
        break;
      case 'top6':
        this.displayMode = 'grid';
        break;
      case 'grid':
        this.displayMode = 'single';
        break;
      default:
        this.displayMode = 'single';
    }
    
    console.log(`🔄 Display mode changed from ${oldMode} to: ${this.displayMode}`);
    
    // Save settings to localStorage
    this.saveSettingsToStorage();
    
    // Update URL with query parameter (for backward compatibility)
    this.updateUrlWithDisplayMode();
    
    // Update the service
    this.priorityDisplayService.updateDisplayMode(this.displayMode);
  }

  /**
   * Update URL with current display mode as query parameter
   */
  private updateUrlWithDisplayMode(): void {
    try {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { 
          view: this.displayMode,
          refresh: this.refreshInterval 
        },
        queryParamsHandling: 'merge'
      });
      console.log(`🔗 URL updated with view=${this.displayMode} and refresh=${this.refreshInterval}`);
    } catch (error) {
      console.warn('⚠️ Failed to update URL with display mode:', error);
    }
  }

  /**
   * Restore display mode from URL query parameters
   */
  private restoreDisplayMode(): void {
    try {
      const viewParam = this.route.snapshot.queryParams['view'] as 'single' | 'top3' | 'top6' | 'grid';
      if (viewParam && (viewParam === 'single' || viewParam === 'top3')) {
        this.displayMode = viewParam;
        console.log(`� Display mode restored from URL: ${this.displayMode}`);
      } else {
        this.displayMode = 'single'; // default
        console.log('� No view parameter found in URL, using default: single');
      }
    } catch (error) {
      console.warn('⚠️ Failed to restore display mode from URL:', error);
      this.displayMode = 'single'; // fallback to default
    }
  }

  /**
   * Keyboard shortcut handler (Space bar to toggle display mode)
   */
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.code === 'Space' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      this.toggleDisplayMode();
    }
  }

  /**
   * Toggle between shipping and kanban priorities
   */
  async togglePriorityType(newType?: 'kanban' | 'shipping'): Promise<void> {
    this.priorityType = newType ?? (this.priorityType === 'shipping' ? 'kanban' : 'shipping');
    console.log(`🔄 Priority type toggled to: ${this.priorityType}`);
    
    // Save settings
    this.saveSettingsToStorage();
    
    // Update service and reload data - only if not in combined view mode
    if (!this.showCombinedView) {
      await this.priorityDisplayService.updatePriorityType(this.priorityType);
    }
  }

  /**
   * Toggle combined view mode
   */
  async toggleCombinedView(enabled: boolean): Promise<void> {
    this.showCombinedView = enabled;
    console.log(`🔄 Combined view ${enabled ? 'enabled' : 'disabled'}`);
    
    // Save settings
    this.saveSettingsToStorage();
    
    // Reload data based on combined view setting
    if (enabled) {
      await this.priorityDisplayService.loadCombinedPriorityData(true);
    } else {
      await this.priorityDisplayService.updatePriorityType(this.priorityType);
    }
  }

  /**
   * Get display name for current priority type
   */
  getPriorityTypeDisplayName(): string {
    return this.priorityType === 'kanban' ? 'Kanban Priorities' : 'Shipping Priorities';
  }

  /**
   * Navigate back to main application
   */
  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  // Utility methods delegated to DisplayUtilsService
  formatDate = (date: string | null): string => this.displayUtils.formatDate(date);
  formatTime = (date: string | null): string => this.displayUtils.formatTime(date);
  getStatusBadgeClass = (status: string): string => this.displayUtils.getStatusBadgeClass(status);
  getPriorityBadgeClass = (priority: number): string => this.displayUtils.getPriorityBadgeClass(priority);
  getPriorityRankText = (index: number): string => this.displayUtils.getPriorityRankText(index);
  getPriorityRankClass = (index: number): string => this.displayUtils.getPriorityRankClass(index);
  formatQuantity = (qty: number | string): string => this.displayUtils.formatQuantity(qty);

  // Essential utility methods for processing
  truncateText = (text: string | null | undefined, maxLength: number = 50): string => {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  getWorkOrderDisplay = (order: any): string => {
    if (order.WO_NBR) {
      return `WO# ${order.WO_NBR}`;
    }
    if (order.misc?.tj_po_number) {
      return order.misc.tj_po_number;
    }
    return 'N/A';
  };

  getPartDescription = (order: any): string => {
    // Priority order: FULLDESC > PT_DESC1 > PT_DESC2
    if (order.FULLDESC && order.FULLDESC.trim()) {
      return order.FULLDESC.trim();
    }
    if (order.PT_DESC1 && order.PT_DESC1.trim()) {
      return order.PT_DESC1.trim();
    }
    if (order.PT_DESC2 && order.PT_DESC2.trim()) {
      return order.PT_DESC2.trim();
    }
    return 'No description available';
  };

  getUniqueCustomers = (item: any): string[] => {
    const customerSet = new Set<string>();
    
    item.orders.forEach((order: any) => {
      const customer = order.SO_CUST || order['COMPANY'] || order.CUSTNAME;
      if (customer && customer !== 'N/A' && customer.trim()) {
        customerSet.add(customer.trim());
      }
    });
    
    return Array.from(customerSet);
  };

  getRecentComment = (order: any): string => {
    if (order.recent_comments?.comments_html) {
      // Strip HTML tags for display
      return order.recent_comments.comments_html.replace(/<[^>]*>/g, '');
    }
    if (order.recent_comments?.comments) {
      return order.recent_comments.comments.replace(/<[^>]*>/g, '');
    }
    return '';
  };

  // Check if the order has missing shipping data
  hasMissingData = (order: any): boolean => {
    return order.SOD_PART === 'MISSING_DATA' || 
           order.STATUS === 'Data Not Found' ||
           order.SO_CUST === 'MISSING_DATA' ||
           order.CUSTNAME === 'MISSING_DATA';
  };

  // Get display value with fallback for missing data
  getDisplayValue = (value: any, fallback: string = 'N/A', missingText: string = 'Data Missing'): string => {
    if (value === 'MISSING_DATA') return missingText;
    if (!value) return fallback;
    return value.toString();
  };

  /**
   * Check if any orders in the group are completed
   */
  hasCompletedOrders = (orders: any[]): boolean => {
    return orders.some(order => order.misc?.['userName'] === 'Shipping');
  };

  /**
   * Check if any orders in the group are hot orders
   */
  hasHotOrders = (orders: any[]): boolean => {
    return orders.some(order => order.misc?.hot_order);
  };

  /**
   * Check if any orders in the group have low inventory
   */
  hasLowInventoryOrders = (orders: any[]): boolean => {
    return orders.some(order => order.LD_QTY_OH && order.LD_QTY_OH < (order.QTYOPEN || 0));
  };

  /**
   * Get display mode name for UI
   */
  getDisplayModeName(): string {
    switch (this.displayMode) {
      case 'single': return 'Single View';
      case 'top3': return 'Top 3';
      case 'top6': return 'Top 6';
      case 'grid': return 'Grid View';
      default: return 'Single View';
    }
  }

  /**
   * Get next display mode name for toggle button
   */
  getNextDisplayModeName(): string {
    switch (this.displayMode) {
      case 'single': return 'Top 3';
      case 'top3': return 'Top 6';
      case 'top6': return 'Grid View';
      case 'grid': return 'Single View';
      default: return 'Top 3';
    }
  }

  /**
   * Get current refresh interval display text
   */
  getCurrentRefreshIntervalText(): string {
    if (this.refreshInterval === 0) {
      return 'Manual Only';
    }
    const seconds = this.refreshInterval / 1000;
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = seconds / 60;
      return `${minutes}m`;
    }
  }

  /**
   * Handle mouse enter on dropdown item
   */
  onMouseEnterDropdownItem(event: any, intervalValue: number): void {
    const target = event.target as HTMLElement;
    if (this.refreshInterval !== intervalValue) {
      target.style.backgroundColor = '#495057';
    }
  }

  /**
   * Open settings offcanvas
   */
  openSettings(): void {
    this.settingsOpen = true;
    this.offcanvasService.open(this.settingsOffcanvas, {
      position: 'end',
      backdrop: true,
      keyboard: true,
      scroll: false
    });
  }

  /**
   * Load settings from localStorage
   */
  private loadSettingsFromStorage(): void {
    try {
      const savedSettings = localStorage.getItem(this.SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Load display mode (only if valid, otherwise keep component default)
        if (settings.displayMode && ['single', 'top3', 'top6', 'grid'].includes(settings.displayMode)) {
          this.displayMode = settings.displayMode;
        }
        // If no saved displayMode, component default (top6) will be used
        
        // Load refresh interval
        if (settings.refreshInterval !== undefined && settings.refreshInterval >= 0) {
          this.refreshInterval = settings.refreshInterval;
        }
        
        // Load card layout (only if valid, otherwise keep component default)
        if (settings.cardLayout && ['traditional', 'production', 'salesorder', 'compact', 'detailed', 'minimal', 'dashboard'].includes(settings.cardLayout)) {
          this.cardLayout = settings.cardLayout;
        }
        // If no saved cardLayout, component default (salesorder) will be used
        
        // Load coming up next settings
        if (settings.showComingUpNext !== undefined) {
          this.showComingUpNext = settings.showComingUpNext;
        }
        if (settings.autoScrollEnabled !== undefined) {
          this.autoScrollEnabled = settings.autoScrollEnabled;
        }
        if (settings.scrollSpeed !== undefined && settings.scrollSpeed > 0) {
          this.scrollSpeed = settings.scrollSpeed;
        }
        
        // Load refresh overlay setting
        if (settings.showRefreshOverlay !== undefined) {
          this.showRefreshOverlay = settings.showRefreshOverlay;
        }
        
        // Load priority type setting (only if valid, otherwise keep component default)
        if (settings.priorityType && ['shipping', 'kanban'].includes(settings.priorityType)) {
          this.priorityType = settings.priorityType;
        }
        // If no saved priorityType, component default (shipping) will be used
        
        // Load combined view setting
        if (settings.showCombinedView !== undefined) {
          this.showCombinedView = settings.showCombinedView;
        }
        
        console.log('✅ Settings loaded from localStorage:', settings);
        console.log('📊 Final applied settings - displayMode:', this.displayMode, 'cardLayout:', this.cardLayout, 'priorityType:', this.priorityType, 'showCombinedView:', this.showCombinedView);
      } else {
        console.log('📊 No saved settings found, using component defaults - displayMode:', this.displayMode, 'cardLayout:', this.cardLayout, 'priorityType:', this.priorityType, 'showCombinedView:', this.showCombinedView);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load settings from localStorage:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  saveSettingsToStorage(): void {
    try {
      const settings = {
        displayMode: this.displayMode,
        refreshInterval: this.refreshInterval,
        cardLayout: this.cardLayout,
        showComingUpNext: this.showComingUpNext,
        autoScrollEnabled: this.autoScrollEnabled,
        scrollSpeed: this.scrollSpeed,
        showRefreshOverlay: this.showRefreshOverlay,
        priorityType: this.priorityType,
        showCombinedView: this.showCombinedView,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(this.SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      console.log('✅ Settings saved to localStorage:', settings);
    } catch (error) {
      console.warn('⚠️ Failed to save settings to localStorage:', error);
    }
  }

  /**
   * Change display mode from settings panel
   */
  changeDisplayMode(mode: string): void {
    if (['single', 'top3', 'top6', 'grid'].includes(mode)) {
      this.displayMode = mode as 'single' | 'top3' | 'top6' | 'grid';
      this.priorityDisplayService.updateDisplayMode(this.displayMode);
      this.saveSettingsToStorage();
    }
  }

  /**
   * Handle display mode change from settings component
   */
  onDisplayModeChange(mode: 'single' | 'top3' | 'top6' | 'grid'): void {
    this.displayMode = mode;
    this.priorityDisplayService.updateDisplayMode(this.displayMode);
    this.saveSettingsToStorage();
    this.updateUrlWithDisplayMode();
  }

  /**
   * Handle card layout change from settings component
   */
  onCardLayoutChange(layout: 'traditional' | 'production' | 'salesorder' | 'compact' | 'detailed' | 'minimal' | 'dashboard'): void {
    this.cardLayout = layout;
    this.saveSettingsToStorage();
  }

  /**
   * Handle coming up next settings change from settings component
   */
  onComingUpNextSettingsChange(settings: {showComingUpNext: boolean, autoScrollEnabled: boolean, scrollSpeed: number}): void {
    this.showComingUpNext = settings.showComingUpNext;
    this.autoScrollEnabled = settings.autoScrollEnabled;
    this.scrollSpeed = settings.scrollSpeed;
    
    // Update the slick config object directly
    this.updateSlickConfig();
    
    // Control carousel based on settings
    setTimeout(() => {
      if (this.autoScrollEnabled && this.slickModal) {
        console.log('🎠 Restarting carousel with new settings...');
        try {
          // Force restart
          this.slickModal.unslick();
          setTimeout(() => {
            this.slickModal.initSlick();
            this.slickModal.slickPlay();
            console.log('🎠 Carousel restarted successfully');
          }, 500);
        } catch (error) {
          console.log('🎠 Error restarting carousel:', error);
          this.startCarousel();
        }
      } else if (this.slickModal) {
        try {
          this.slickModal.slickPause();
          console.log('🎠 Carousel paused');
        } catch (error) {
          console.log('🎠 Error pausing carousel:', error);
        }
      }
    }, 500);
    
    this.saveSettingsToStorage();
  }

  /**
   * Update slick configuration
   */
  private updateSlickConfig(): void {
    // Update configuration object
    this.slickConfig = {
      ...this.slickConfig,
      "autoplay": this.autoScrollEnabled,
      "autoplaySpeed": Math.max(2000, (this.scrollSpeed || 30) * 100)
    };
    
    console.log('🎠 Updated slick config:', this.slickConfig);
    
    // Trigger change detection
    this.cdr.detectChanges();
  }

  /**
   * Handle slide change events
   */
  onSlideChange(event: any): void {
    console.log('🎠 Slide changed:', event);
  }

  /**
   * Handle carousel initialization
   */
  onCarouselInit(event: any): void {
    console.log('🎠 ========================================');
    console.log('🎠 Carousel initialized!');
    console.log('🎠 Event:', event);
    console.log('🎠 Slick modal:', this.slickModal);
    console.log('🎠 Auto scroll enabled:', this.autoScrollEnabled);
    console.log('🎠 Config:', this.slickConfig);
    
    // Check data availability and show what's being displayed
    this.priorityDisplayService.displayData$.subscribe(displayData => {
      console.log('🎠 Total NEXT items:', displayData.nextGroupedItems.length);
      console.log('🎠 NEXT items data:');
      displayData.nextGroupedItems.forEach((item, index) => {
        console.log(`  [${index}] Part: ${item.partNumber}, Orders: ${item.orders.length}, Priority: ${item.priority}`);
      });
      
      if (displayData.nextGroupedItems.length <= 1) {
        console.warn('🎠 ⚠️ Not enough items for carousel! Need at least 2 items, got:', displayData.nextGroupedItems.length);
      }
    }).unsubscribe();
    
    // Force start autoplay after a short delay
    setTimeout(() => {
      if (this.slickModal && this.autoScrollEnabled) {
        console.log('🎠 Forcing autoplay start...');
        try {
          this.slickModal.slickPlay();
          console.log('🎠 ✅ Autoplay started successfully');
        } catch (error) {
          console.error('🎠 ❌ Error starting autoplay:', error);
        }
      }
    }, 500);
  }

  /**
   * Handle settings applied from settings component
   */
  onSettingsApplied(settings: { displayMode: 'single' | 'top3' | 'top6' | 'grid'; refreshInterval: number; cardLayout: 'traditional' | 'production' | 'salesorder' | 'compact' | 'detailed' | 'minimal' | 'dashboard'; showComingUpNext: boolean; autoScrollEnabled: boolean; scrollSpeed: number; showRefreshOverlay: boolean; showCombinedView: boolean }): void {
    this.displayMode = settings.displayMode;
    this.refreshInterval = settings.refreshInterval;
    this.cardLayout = settings.cardLayout;
    this.showComingUpNext = settings.showComingUpNext;
    this.autoScrollEnabled = settings.autoScrollEnabled;
    this.scrollSpeed = settings.scrollSpeed;
    this.showRefreshOverlay = settings.showRefreshOverlay;
    this.showCombinedView = settings.showCombinedView;
    this.priorityDisplayService.updateDisplayMode(this.displayMode);
    this.startAutoRefresh();
    this.saveSettingsToStorage();
    this.updateUrlWithDisplayMode();
  }

  /**
   * Handle settings component closed
   */
  onSettingsClosed(): void {
    this.settingsOpen = false;
  }

  /**
   * Get adaptive font size class based on part number length
   */
  getPartNumberFontClass(partNumber: string): string {
    if (!partNumber) return 'fs-4';
    
    const length = partNumber.length;
    if (length <= 10) return 'fs-2'; // Large font for short part numbers
    if (length <= 15) return 'fs-3'; // Medium font
    if (length <= 20) return 'fs-4'; // Smaller font
    return 'fs-5'; // Smallest font for very long part numbers
  }

  /**
   * Get responsive column class based on display mode
   */
  getCardColumnClass(): string {
    switch (this.displayMode) {
      case 'top3': return 'col-lg-4 col-md-6'; // 3 cards per row on large screens
      case 'top6': return 'col-lg-4 col-md-6'; // 3 cards per row, showing 6 total (2 rows)
      case 'grid': return 'col-lg-3 col-md-4 col-sm-6'; // 4 cards per row on large screens, more dense
      default: return 'col-lg-4 col-md-6';
    }
  }

  /**
   * Get customer logo URL based on customer name
   */
  getCustomerLogo(customerName: string): string | null {
    if (!customerName) return null;
    
    const customer = customerName.toLowerCase().trim();
    
    if (customer.includes('amegam')) {
      return 'https://assets.talentronic.com/brands/employers/logos/000/279/189/logo.png?1582145902';
    } else if (customer.includes('ati') || customer.includes('aristocrat')) {
      return 'https://www.indiangaming.com/wp-content/uploads/2021/03/Aristocrat_Logo2-1024x323.jpg';
    } else if (customer.includes('baltec')) {
      return 'https://c.smartrecruiters.com/sr-careersite-image-prod/55920a6fe4b06ce952a5c887/060d5037-4f70-4dd7-9c31-d700f6c5b468?r=s3';
    } else if (customer.includes('incred') || customer.includes('incredible')) {
      return 'assets/images/companies/incred-logo.svg';
    } else if (customer.includes('igt') || customer.includes('intgam') || customer.includes('international game technology')) {
      return 'assets/images/companies/igt-logo.svg';
    }
    
    return null;
  }

  /**
   * Get primary customer name from grouped item
   */
  getPrimaryCustomer(item: any): string {
    if (!item || !item.orders || item.orders.length === 0) {
      return '';
    }
    
    // Get the first order's company name
    const firstOrder = item.orders[0];
    return firstOrder?.['COMPANY'] || firstOrder?.['SO_CUST'] || firstOrder?.['CUSTNAME'] || '';
  }

  /**
   * Setup theme subscriptions
   */
  private setupThemeSubscriptions(): void {
    // Subscribe to theme settings changes
    this.themeSubscription = this.themeService.themeSettings$.subscribe(settings => {
      this.currentTheme = settings.currentTheme;
      this.autoSwitchEnabled = settings.autoSwitchEnabled;
      this.switchIntervalMinutes = settings.switchIntervalMinutes;
      this.zoomLevel = settings.zoomLevel;
    });

    // Subscribe to countdown updates
    this.themeService.switchCountdown$.subscribe(countdown => {
      this.switchCountdown = countdown;
    });

    // Initialize theme based on current settings
    const currentSettings = this.themeService.getCurrentSettings();
    this.currentTheme = currentSettings.currentTheme;
    this.autoSwitchEnabled = currentSettings.autoSwitchEnabled;
    this.switchIntervalMinutes = currentSettings.switchIntervalMinutes;
    this.zoomLevel = currentSettings.zoomLevel;
  }

  /**
   * Get the sequential queue position for a "Coming Up Next" item
   * This shows the correct position in the overall production flow with continuous rolling sequence
   */
  getQueuePosition(globalIndex: number, nextGroupedItemsLength: number): number {
    // Calculate how many items are currently displayed based on display mode
    let currentlyDisplayedCount = 0;
    
    switch (this.displayMode) {
      case 'single':
        currentlyDisplayedCount = 1;
        break;
      case 'top3':
        currentlyDisplayedCount = 3;
        break;
      case 'top6':
        currentlyDisplayedCount = 6;
        break;
      case 'grid':
        currentlyDisplayedCount = 12; // Grid shows up to 12
        break;
      default:
        currentlyDisplayedCount = 1;
        break;
    }
    
    // For infinite scroll: create a continuous rolling sequence
    // The globalIndex spans across all 3 repetitions (0 to nextGroupedItemsLength * 3 - 1)
    const actualIndex = globalIndex % nextGroupedItemsLength;
    const repetitionNumber = Math.floor(globalIndex / nextGroupedItemsLength);
    
    // Create a rolling sequence that continues beyond the original queue length
    const basePosition = currentlyDisplayedCount + actualIndex + 1;
    const rollingPosition = basePosition + (repetitionNumber * nextGroupedItemsLength);
    
    return rollingPosition;
  }
}
