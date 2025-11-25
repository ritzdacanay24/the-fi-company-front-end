import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PhysicalInventoryDisplaySettings {
  theme: 'light' | 'dark';
  zoomLevel: number;
  refreshInterval: number;
}

export interface InventoryStats {
  totalTags: number;
  scanned: number;
  notScanned: number;
  percentComplete: number;
  lastUpdate: Date;
  // Additional detailed stats
  completedFirstCounts?: number;
  completedSecondCounts?: number;
  completedThirdCounts?: number;
  firstCountVariance?: number;
  secondCountVariance?: number;
  postedTags?: number;
  unpostedTags?: number;
  bulkTagsWithQty?: number;
  totalValue?: number;
  varianceValue?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PhysicalInventoryDisplayService {
  
  private readonly STORAGE_KEY = 'physical-inventory-display-settings';
  
  private defaultSettings: PhysicalInventoryDisplaySettings = {
    theme: 'dark',
    zoomLevel: 100,
    refreshInterval: 30000 // 30 seconds
  };

  private statsSubject = new BehaviorSubject<InventoryStats>({
    totalTags: 0,
    scanned: 0,
    notScanned: 0,
    percentComplete: 0,
    lastUpdate: new Date()
  });

  constructor() {}

  getSettings(): PhysicalInventoryDisplaySettings {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        return { ...this.defaultSettings, ...JSON.parse(stored) };
      } catch (error) {
        console.error('Error parsing stored settings:', error);
        return this.defaultSettings;
      }
    }
    return this.defaultSettings;
  }

  updateSettings(settings: Partial<PhysicalInventoryDisplaySettings>): void {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  resetSettings(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  getInventoryStats(): Observable<InventoryStats> {
    return this.statsSubject.asObservable();
  }

  updateInventoryStats(stats: InventoryStats): void {
    this.statsSubject.next(stats);
  }
}
