import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ThemeManagementService, ThemeSettings } from '../../services/theme-management.service';
import { Subscription } from 'rxjs';

export interface RefreshInterval {
  value: number;
  label: string;
}

export interface DisplaySettings {
  displayMode: 'single' | 'top3' | 'top6' | 'grid';
  refreshInterval: number;
  cardLayout: 'traditional' | 'production' | 'salesorder' | 'compact' | 'detailed' | 'minimal' | 'dashboard';
  showComingUpNext: boolean;
  autoScrollEnabled: boolean;
  scrollSpeed: number;
  showRefreshOverlay: boolean;
  // Theme settings
  currentTheme: 'light' | 'dark' | 'dark-vibrant' | 'midnight' | 'neon' | 'bootstrap-dark';
  autoSwitchEnabled: boolean;
  switchIntervalMinutes: number;
  zoomLevel: number;
}

export interface CardLayout {
  value: 'traditional' | 'production' | 'salesorder' | 'compact' | 'detailed' | 'minimal' | 'dashboard';
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-priority-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModule],
  templateUrl: './priority-settings.component.html',
  styleUrls: ['./priority-settings.component.scss']
})
export class PrioritySettingsComponent implements OnInit, OnDestroy {
  @Input() displayMode: 'single' | 'top3' | 'top6' | 'grid' = 'single';
  @Input() refreshInterval: number = 300000; // 5 minutes
  @Input() refreshCountdown: string = '';
  @Input() cardLayout: 'traditional' | 'production' | 'salesorder' | 'compact' | 'detailed' | 'minimal' | 'dashboard' = 'traditional';
  @Input() isVisible: boolean = false;
  @Input() showComingUpNext: boolean = true;
  @Input() autoScrollEnabled: boolean = true;
  @Input() scrollSpeed: number = 30;
  @Input() showRefreshOverlay: boolean = false;

  // Theme-related properties
  currentTheme: 'light' | 'dark' | 'dark-vibrant' | 'midnight' | 'neon' | 'bootstrap-dark' = 'light';
  autoSwitchEnabled: boolean = false;
  switchIntervalMinutes: number = 30;
  switchCountdown: string = '';
  zoomLevel: number = 100;
  
  availableThemes = [
    { value: 'light' as const, label: 'Light Mode', icon: '☀️' },
    { value: 'dark' as const, label: 'Dark Mode', icon: '🌙' },
    { value: 'dark-vibrant' as const, label: 'Dark Vibrant', icon: '🎨' },
    { value: 'midnight' as const, label: 'Midnight Blue', icon: '🌊' },
    { value: 'neon' as const, label: 'Neon Dark', icon: '⚡' },
    { value: 'bootstrap-dark' as const, label: 'Bootstrap Dark', icon: '🅱️' }
  ];
  
  private themeSubscription?: Subscription;
  private countdownSubscription?: Subscription;

  @Output() displayModeChange = new EventEmitter<'single' | 'top3' | 'top6' | 'grid'>();
  @Output() refreshIntervalChange = new EventEmitter<number>();
  @Output() cardLayoutChange = new EventEmitter<'traditional' | 'production' | 'salesorder' | 'compact' | 'detailed' | 'minimal' | 'dashboard'>();
  @Output() refreshRequested = new EventEmitter<void>();
  @Output() settingsApplied = new EventEmitter<DisplaySettings>();
  @Output() closed = new EventEmitter<void>();
  @Output() comingUpNextSettingsChange = new EventEmitter<{showComingUpNext: boolean, autoScrollEnabled: boolean, scrollSpeed: number}>();
  @Output() themeChanged = new EventEmitter<'light' | 'dark' | 'dark-vibrant' | 'midnight' | 'neon' | 'bootstrap-dark'>();
  @Output() themeSettingsChanged = new EventEmitter<ThemeSettings>();

  private offcanvasRef: any;

  availableRefreshIntervals: RefreshInterval[] = [
    { value: 0, label: 'Manual Only' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
    { value: 120000, label: '2 minutes' },
    { value: 300000, label: '5 minutes' },
    { value: 600000, label: '10 minutes' },
    { value: 1800000, label: '30 minutes' }
  ];

  displayModes = [
    { 
      value: 'single', 
      label: 'Single View', 
      icon: 'mdi-view-agenda', 
      description: 'Focus on one priority with sidebar queue' 
    },
    { 
      value: 'top3', 
      label: 'Top 3', 
      icon: 'mdi-view-column', 
      description: 'Show top 3 priorities in cards' 
    },
    { 
      value: 'top6', 
      label: 'Top 6', 
      icon: 'mdi-view-grid', 
      description: 'Show top 6 priorities in compact layout' 
    },
    { 
      value: 'grid', 
      label: 'Grid View', 
      icon: 'mdi-view-module', 
      description: 'Dense grid layout for maximum visibility' 
    }
  ];

  cardLayouts: CardLayout[] = [
    {
      value: 'traditional',
      label: 'Traditional',
      icon: 'mdi-card-text',
      description: 'Original layout - order number, part, customer, ship date'
    },
    {
      value: 'production',
      label: 'Production Card',
      icon: 'mdi-card-account-details',
      description: 'Production focused - part number, quantity box, orders count, customer'
    },
    {
      value: 'salesorder',
      label: 'Part Number',
      icon: 'mdi-format-text',
      description: 'Part number focused - large part number, description, orders list, qty summary'
    },
    {
      value: 'compact',
      label: 'Compact',
      icon: 'mdi-card-outline',
      description: 'Essential info only - part number, quantity, status'
    },
    {
      value: 'detailed',
      label: 'Detailed',
      icon: 'mdi-card-text-outline',
      description: 'Full information - includes customer, orders, descriptions'
    },
    {
      value: 'minimal',
      label: 'Minimal',
      icon: 'mdi-minus-box-outline',
      description: 'Ultra-compact - part number and quantity only'
    },
    {
      value: 'dashboard',
      label: 'Dashboard',
      icon: 'mdi-view-dashboard-outline',
      description: 'Metric-focused - KPIs, charts, and key indicators'
    }
  ];

  constructor(private themeService: ThemeManagementService) {}

  ngOnInit(): void {
    this.loadSettingsFromStorage();
    this.initializeThemeSubscriptions();
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }

  onDisplayModeChange(mode: string): void {
    const validMode = mode as 'single' | 'top3' | 'top6' | 'grid';
    this.displayMode = validMode;
    this.displayModeChange.emit(validMode);
    this.saveSettingsToStorage();
  }

  onRefreshIntervalChange(interval: number): void {
    this.refreshInterval = interval;
    this.refreshIntervalChange.emit(interval);
    this.saveSettingsToStorage();
  }

  onCardLayoutChange(layout: 'traditional' | 'production' | 'salesorder' | 'compact' | 'detailed' | 'minimal' | 'dashboard'): void {
    this.cardLayout = layout;
    this.cardLayoutChange.emit(layout);
    this.saveSettingsToStorage();
  }

  onShowRefreshOverlayChange(event: any): void {
    this.showRefreshOverlay = event.target.checked;
    this.saveSettingsToStorage();
    // Emit change to parent component
    this.settingsApplied.emit({
      displayMode: this.displayMode,
      refreshInterval: this.refreshInterval,
      cardLayout: this.cardLayout,
      showComingUpNext: this.showComingUpNext,
      autoScrollEnabled: this.autoScrollEnabled,
      scrollSpeed: this.scrollSpeed,
      showRefreshOverlay: this.showRefreshOverlay,
      currentTheme: this.currentTheme,
      autoSwitchEnabled: this.autoSwitchEnabled,
      switchIntervalMinutes: this.switchIntervalMinutes,
      zoomLevel: this.zoomLevel
    });
  }

  getDisplayModeName(): string {
    const mode = this.displayModes.find(m => m.value === this.displayMode);
    return mode ? mode.label : 'Unknown';
  }

  getCurrentRefreshIntervalText(): string {
    const interval = this.availableRefreshIntervals.find(i => i.value === this.refreshInterval);
    return interval ? interval.label : 'Custom';
  }

  getCardLayoutName(): string {
    const layout = this.cardLayouts.find(l => l.value === this.cardLayout);
    return layout ? layout.label : 'Unknown';
  }

  onRefreshData(): void {
    this.refreshRequested.emit();
  }

  onComingUpNextSettingChange(): void {
    this.comingUpNextSettingsChange.emit({
      showComingUpNext: this.showComingUpNext,
      autoScrollEnabled: this.autoScrollEnabled,
      scrollSpeed: this.scrollSpeed
    });
    this.saveSettingsToStorage();
  }

  onApplyAndRefresh(): void {
    const settings: DisplaySettings = {
      displayMode: this.displayMode,
      refreshInterval: this.refreshInterval,
      cardLayout: this.cardLayout,
      showComingUpNext: this.showComingUpNext,
      autoScrollEnabled: this.autoScrollEnabled,
      scrollSpeed: this.scrollSpeed,
      showRefreshOverlay: this.showRefreshOverlay,
      currentTheme: this.currentTheme,
      autoSwitchEnabled: this.autoSwitchEnabled,
      switchIntervalMinutes: this.switchIntervalMinutes,
      zoomLevel: this.zoomLevel
    };
    this.settingsApplied.emit(settings);
    this.onRefreshData();
  }

  onClose(): void {
    this.closed.emit();
  }

  // Theme Management Methods
  onThemeToggle(): void {
    this.themeService.toggleTheme();
  }

  onManualThemeChange(theme: 'light' | 'dark' | 'dark-vibrant' | 'midnight' | 'neon' | 'bootstrap-dark'): void {
    this.currentTheme = theme;
    this.themeService.setTheme(theme, true);
    this.themeChanged.emit(theme);
    this.saveSettingsToStorage();
  }

  onAutoSwitchToggle(): void {
    // Don't toggle the value here since ngModel already handles it
    // Just update the service with the current value
    this.themeService.setAutoSwitchEnabled(this.autoSwitchEnabled);
    this.saveSettingsToStorage();
  }

  onSwitchIntervalChange(minutes: number): void {
    this.switchIntervalMinutes = minutes;
    this.themeService.setAutoSwitchInterval(minutes);
    this.saveSettingsToStorage();
  }

  getThemeIntervalOptions() {
    return this.themeService.availableIntervals;
  }

  getCurrentThemeLabel(): string {
    const theme = this.availableThemes.find(t => t.value === this.currentTheme);
    return theme ? theme.label : 'Unknown Theme';
  }

  getAvailableThemes() {
    return this.availableThemes;
  }

  getSwitchIntervalLabel(): string {
    const interval = this.themeService.availableIntervals.find(i => i.value === this.switchIntervalMinutes);
    return interval ? interval.label : 'Custom';
  }

  resetThemeSettings(): void {
    this.themeService.resetToDefaults();
  }

  // Zoom Control Methods
  onZoomChange(zoomLevel: number): void {
    this.zoomLevel = zoomLevel;
    this.themeService.setZoomLevel(zoomLevel);
    this.saveSettingsToStorage();
  }

  onZoomIn(): void {
    this.themeService.zoomIn();
  }

  onZoomOut(): void {
    this.themeService.zoomOut();
  }

  onResetZoom(): void {
    this.themeService.resetZoom();
  }

  getZoomLevelOptions() {
    return this.themeService.availableZoomLevels;
  }

  getCurrentZoomLabel(): string {
    const zoom = this.themeService.availableZoomLevels.find(z => z.value === this.zoomLevel);
    return zoom ? zoom.label : `${this.zoomLevel}%`;
  }

  private loadSettingsFromStorage(): void {
    try {
      const saved = localStorage.getItem('priority-display-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.displayMode) {
          this.displayMode = settings.displayMode;
        }
        if (settings.refreshInterval !== undefined) {
          this.refreshInterval = settings.refreshInterval;
        }
        if (settings.cardLayout) {
          this.cardLayout = settings.cardLayout;
        }
        if (settings.showComingUpNext !== undefined) {
          this.showComingUpNext = settings.showComingUpNext;
        }
        if (settings.autoScrollEnabled !== undefined) {
          this.autoScrollEnabled = settings.autoScrollEnabled;
        }
        if (settings.scrollSpeed !== undefined) {
          this.scrollSpeed = settings.scrollSpeed;
        }
        if (settings.showRefreshOverlay !== undefined) {
          this.showRefreshOverlay = settings.showRefreshOverlay;
        }
        // Load theme settings
        if (settings.currentTheme) {
          this.currentTheme = settings.currentTheme;
        }
        if (settings.autoSwitchEnabled !== undefined) {
          this.autoSwitchEnabled = settings.autoSwitchEnabled;
        }
        if (settings.switchIntervalMinutes !== undefined) {
          this.switchIntervalMinutes = settings.switchIntervalMinutes;
        }
        if (settings.zoomLevel !== undefined) {
          this.zoomLevel = settings.zoomLevel;
        }
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
  }

  private saveSettingsToStorage(): void {
    try {
      const settings = {
        displayMode: this.displayMode,
        refreshInterval: this.refreshInterval,
        cardLayout: this.cardLayout,
        showComingUpNext: this.showComingUpNext,
        autoScrollEnabled: this.autoScrollEnabled,
        scrollSpeed: this.scrollSpeed,
        showRefreshOverlay: this.showRefreshOverlay,
        currentTheme: this.currentTheme,
        autoSwitchEnabled: this.autoSwitchEnabled,
        switchIntervalMinutes: this.switchIntervalMinutes,
        zoomLevel: this.zoomLevel,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('priority-display-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  }

  private initializeThemeSubscriptions(): void {
    // Subscribe to theme settings changes
    this.themeSubscription = this.themeService.themeSettings$.subscribe(settings => {
      this.currentTheme = settings.currentTheme;
      this.autoSwitchEnabled = settings.autoSwitchEnabled;
      this.switchIntervalMinutes = settings.switchIntervalMinutes;
      this.zoomLevel = settings.zoomLevel;
    });

    // Subscribe to countdown updates
    this.countdownSubscription = this.themeService.switchCountdown$.subscribe(countdown => {
      this.switchCountdown = countdown;
    });
  }
}