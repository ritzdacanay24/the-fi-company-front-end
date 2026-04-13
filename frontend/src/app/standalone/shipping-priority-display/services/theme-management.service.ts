import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';

export interface ThemeSettings {
  currentTheme: 'light' | 'dark' | 'dark-vibrant' | 'midnight' | 'neon' | 'bootstrap-dark';
  autoSwitchEnabled: boolean;
  switchIntervalMinutes: number;
  isManualOverride: boolean;
  zoomLevel: number;
}

export interface ThemeConfiguration {
  theme: 'light' | 'dark' | 'dark-vibrant' | 'midnight' | 'neon' | 'bootstrap-dark';
  autoSwitchEnabled: boolean;
  switchIntervalMinutes: number;
  zoomLevel: number;
  availableIntervals: { value: number; label: string }[];
  availableZoomLevels: { value: number; label: string }[];
  availableThemes: { value: string; label: string; icon: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class ThemeManagementService {
  private readonly THEME_STORAGE_KEY = 'shipping-priority-theme-settings';
  
  // Default theme settings
  private readonly defaultSettings: ThemeSettings = {
    currentTheme: 'light',
    autoSwitchEnabled: false,
    switchIntervalMinutes: 30,
    isManualOverride: false,
    zoomLevel: 100
  };

  // Available switching intervals
  public readonly availableIntervals = [
    { value: 1, label: '1 minute' },
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 240, label: '4 hours' }
  ];

  // Available themes
  public readonly availableThemes = [
    { value: 'light', label: 'Light Mode', icon: '☀️' },
    { value: 'dark', label: 'Dark Mode', icon: '🌙' },
    { value: 'dark-vibrant', label: 'Dark Vibrant', icon: '🎨' },
    { value: 'midnight', label: 'Midnight Blue', icon: '🌊' },
    { value: 'neon', label: 'Neon Dark', icon: '⚡' },
    { value: 'bootstrap-dark', label: 'Bootstrap Dark', icon: '🅱️' }
  ];

  // Available zoom levels
  public readonly availableZoomLevels = [
    { value: 75, label: '75% - Small' },
    { value: 90, label: '90% - Compact' },
    { value: 100, label: '100% - Normal' },
    { value: 110, label: '110% - Comfortable' },
    { value: 125, label: '125% - Large' },
    { value: 150, label: '150% - Extra Large' },
    { value: 175, label: '175% - Huge' },
    { value: 200, label: '200% - Maximum' }
  ];

  private _themeSettings$ = new BehaviorSubject<ThemeSettings>(this.defaultSettings);
  private _switchCountdown$ = new BehaviorSubject<string>('');
  
  public readonly themeSettings$ = this._themeSettings$.asObservable();
  public readonly switchCountdown$ = this._switchCountdown$.asObservable();

  private autoSwitchSubscription?: Subscription;
  private countdownSubscription?: Subscription;
  private nextSwitchTime?: Date;

  constructor() {
    this.loadSettingsFromStorage();
    this.initializeAutoSwitch();
  }

  /**
   * Get current theme settings
   */
  getCurrentSettings(): ThemeSettings {
    return this._themeSettings$.value;
  }

  /**
   * Get current theme configuration for UI
   */
  getThemeConfiguration(): ThemeConfiguration {
    const settings = this.getCurrentSettings();
    return {
      theme: settings.currentTheme,
      autoSwitchEnabled: settings.autoSwitchEnabled,
      switchIntervalMinutes: settings.switchIntervalMinutes,
      zoomLevel: settings.zoomLevel,
      availableIntervals: this.availableIntervals,
      availableZoomLevels: this.availableZoomLevels,
      availableThemes: this.availableThemes
    };
  }

  /**
   * Manually set theme
   */
  setTheme(theme: 'light' | 'dark' | 'dark-vibrant' | 'midnight' | 'neon' | 'bootstrap-dark', isManualOverride: boolean = true): void {
    const currentSettings = this.getCurrentSettings();
    const newSettings: ThemeSettings = {
      ...currentSettings,
      currentTheme: theme,
      isManualOverride
    };

    this.updateSettings(newSettings);
    this.applyThemeToDocument(theme);
    
    console.log(`🎨 Theme manually set to: ${theme}`);
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const currentSettings = this.getCurrentSettings();
    const newTheme = currentSettings.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme, true);
  }

  /**
   * Enable or disable auto-switching
   */
  setAutoSwitchEnabled(enabled: boolean): void {
    const currentSettings = this.getCurrentSettings();
    const newSettings: ThemeSettings = {
      ...currentSettings,
      autoSwitchEnabled: enabled,
      isManualOverride: false
    };

    this.updateSettings(newSettings);
    this.initializeAutoSwitch();
    
    console.log(`🔄 Auto-switch ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set auto-switch interval
   */
  setAutoSwitchInterval(minutes: number): void {
    const currentSettings = this.getCurrentSettings();
    const newSettings: ThemeSettings = {
      ...currentSettings,
      switchIntervalMinutes: minutes,
      isManualOverride: false
    };

    this.updateSettings(newSettings);
    this.initializeAutoSwitch();
    
    console.log(`⏱️ Auto-switch interval set to: ${minutes} minutes`);
  }

  /**
   * Set zoom level
   */
  setZoomLevel(zoomLevel: number): void {
    const currentSettings = this.getCurrentSettings();
    const newSettings: ThemeSettings = {
      ...currentSettings,
      zoomLevel
    };

    this.updateSettings(newSettings);
    this.applyZoomToDocument(zoomLevel);
    
    console.log(`🔍 Zoom level set to: ${zoomLevel}%`);
  }

  /**
   * Reset zoom to 100%
   */
  resetZoom(): void {
    this.setZoomLevel(100);
  }

  /**
   * Increase zoom by 25%
   */
  zoomIn(): void {
    const currentSettings = this.getCurrentSettings();
    const currentZoom = currentSettings.zoomLevel;
    const availableZooms = this.availableZoomLevels.map(z => z.value).sort((a, b) => a - b);
    
    // Find next higher zoom level
    const nextZoom = availableZooms.find(zoom => zoom > currentZoom) || availableZooms[availableZooms.length - 1];
    this.setZoomLevel(nextZoom);
  }

  /**
   * Decrease zoom by 25%
   */
  zoomOut(): void {
    const currentSettings = this.getCurrentSettings();
    const currentZoom = currentSettings.zoomLevel;
    const availableZooms = this.availableZoomLevels.map(z => z.value).sort((a, b) => b - a);
    
    // Find next lower zoom level
    const nextZoom = availableZooms.find(zoom => zoom < currentZoom) || availableZooms[availableZooms.length - 1];
    this.setZoomLevel(nextZoom);
  }

  /**
   * Update multiple settings at once
   */
  updateThemeSettings(settings: Partial<ThemeSettings>): void {
    const currentSettings = this.getCurrentSettings();
    const newSettings: ThemeSettings = {
      ...currentSettings,
      ...settings
    };

    this.updateSettings(newSettings);
    
    // Apply theme immediately if changed
    if (settings.currentTheme) {
      this.applyThemeToDocument(settings.currentTheme);
    }
    
    // Apply zoom immediately if changed
    if (settings.zoomLevel) {
      this.applyZoomToDocument(settings.zoomLevel);
    }
    
    // Reinitialize auto-switch if settings changed
    if (settings.autoSwitchEnabled !== undefined || settings.switchIntervalMinutes !== undefined) {
      this.initializeAutoSwitch();
    }
  }

  /**
   * Reset to default settings
   */
  resetToDefaults(): void {
    this.updateSettings(this.defaultSettings);
    this.applyThemeToDocument(this.defaultSettings.currentTheme);
    this.applyZoomToDocument(this.defaultSettings.zoomLevel);
    this.initializeAutoSwitch();
    
    console.log('🔄 Theme settings reset to defaults');
  }

  /**
   * Get time until next auto-switch
   */
  getTimeUntilNextSwitch(): string {
    if (!this.nextSwitchTime || !this.getCurrentSettings().autoSwitchEnabled) {
      return '';
    }

    const now = new Date();
    const timeDiff = this.nextSwitchTime.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return '';
    }

    const minutes = Math.floor(timeDiff / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Initialize or restart auto-switching
   */
  private initializeAutoSwitch(): void {
    // Clear existing subscriptions
    this.clearAutoSwitch();

    const settings = this.getCurrentSettings();
    
    if (!settings.autoSwitchEnabled) {
      this._switchCountdown$.next('');
      return;
    }

    const intervalMs = settings.switchIntervalMinutes * 60 * 1000;
    this.nextSwitchTime = new Date(Date.now() + intervalMs);

    // Set up auto-switch interval
    this.autoSwitchSubscription = interval(intervalMs).subscribe(() => {
      if (!settings.isManualOverride) {
        const currentTheme = this.getCurrentSettings().currentTheme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme, false);
        console.log(`🔄 Auto-switched theme to: ${newTheme} (LED burn-in prevention)`);
      }
      
      // Update next switch time
      this.nextSwitchTime = new Date(Date.now() + intervalMs);
    });

    // Set up countdown timer (updates every second)
    this.countdownSubscription = interval(1000).subscribe(() => {
      const countdown = this.getTimeUntilNextSwitch();
      this._switchCountdown$.next(countdown);
    });

    console.log(`⏱️ Auto-switch initialized: ${settings.switchIntervalMinutes} minutes`);
  }

  /**
   * Clear auto-switch subscriptions
   */
  private clearAutoSwitch(): void {
    if (this.autoSwitchSubscription) {
      this.autoSwitchSubscription.unsubscribe();
      this.autoSwitchSubscription = undefined;
    }
    
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
      this.countdownSubscription = undefined;
    }
    
    this.nextSwitchTime = undefined;
  }

  /**
   * Update settings and save to storage
   */
  private updateSettings(settings: ThemeSettings): void {
    this._themeSettings$.next(settings);
    this.saveSettingsToStorage(settings);
  }

  /**
   * Apply theme to document element
   */
  private applyThemeToDocument(theme: 'light' | 'dark' | 'dark-vibrant' | 'midnight' | 'neon' | 'bootstrap-dark'): void {
    // Apply to the entire document body for global theme coverage
    document.body.setAttribute('data-bs-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Apply to the multi-card-view container specifically
    const multiCardElements = document.querySelectorAll('.multi-card-view');
    multiCardElements.forEach(element => {
      element.setAttribute('data-theme', theme);
    });

    // Also apply to shipping priority display container
    const displayElements = document.querySelectorAll('.shipping-priority-display');
    displayElements.forEach(element => {
      element.setAttribute('data-theme', theme);
    });

    console.log(`🎨 Applied theme "${theme}" to entire page and card elements`);
  }

  /**
   * Apply zoom level to document element
   */
  private applyZoomToDocument(zoomLevel: number): void {
    const zoomFactor = zoomLevel / 100;
    
    // Apply zoom to the shipping priority display container
    const displayElements = document.querySelectorAll<HTMLElement>('.shipping-priority-display');
    displayElements.forEach(element => {
      element.style.transform = `scale(${zoomFactor})`;
      element.style.transformOrigin = 'top left';
      element.style.width = `${100 / zoomFactor}%`;
      element.style.height = `${100 / zoomFactor}%`;
      element.setAttribute('data-zoom', zoomLevel.toString());
    });

    // Apply zoom to multi-card-view containers
    const multiCardElements = document.querySelectorAll<HTMLElement>('.multi-card-view');
    multiCardElements.forEach(element => {
      element.style.fontSize = `${zoomFactor}rem`;
      element.setAttribute('data-zoom', zoomLevel.toString());
    });

    console.log(`🔍 Applied zoom "${zoomLevel}%" to display elements`);
  }

  /**
   * Load settings from localStorage
   */
  private loadSettingsFromStorage(): void {
    try {
      const savedSettings = localStorage.getItem(this.THEME_STORAGE_KEY);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        const validThemes = ['light', 'dark', 'dark-vibrant', 'midnight', 'neon', 'bootstrap-dark'];
        // Validate and merge with defaults
        const validatedSettings: ThemeSettings = {
          ...this.defaultSettings,
          ...settings,
          // Ensure valid theme value
          currentTheme: validThemes.includes(settings.currentTheme) ? settings.currentTheme : 'light'
        };
        
        this._themeSettings$.next(validatedSettings);
        this.applyThemeToDocument(validatedSettings.currentTheme);
        this.applyZoomToDocument(validatedSettings.zoomLevel);
        
        console.log('🔧 Theme settings loaded from storage:', validatedSettings);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load theme settings from storage:', error);
      this._themeSettings$.next(this.defaultSettings);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettingsToStorage(settings: ThemeSettings): void {
    try {
      localStorage.setItem(this.THEME_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('⚠️ Failed to save theme settings to storage:', error);
    }
  }

  /**
   * Clean up subscriptions on service destroy
   */
  public destroy(): void {
    this.clearAutoSwitch();
  }
}