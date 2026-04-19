import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export type AppType = 'main' | 'field-service' | 'admin' | 'serial-management';

export interface AppInfo {
  id: AppType;
  name: string;
  description: string;
  icon: string;
  baseRoute: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AppSwitcherService {
  private currentAppSubject = new BehaviorSubject<AppType>('main');
  public currentApp$ = this.currentAppSubject.asObservable();

  private apps: AppInfo[] = [
    {
      id: 'main',
      name: 'Operations Dashboard',
      description: 'Main business operations, quality, inventory, and admin functions',
      icon: 'las la-tachometer-alt',
      baseRoute: '/operations',
      isActive: true
    },
    {
      id: 'field-service',
      name: 'Field Service',
      description: 'Field technician tools, job management, and mobile-optimized workflows',
      icon: 'las la-tools',
      baseRoute: '/field-service',
      isActive: false
    },
    {
      id: 'admin',
      name: 'Administration',
      description: 'System administration, user management, and configuration settings',
      icon: 'las la-user-shield',
      baseRoute: '/admin',
      isActive: false
    },
    {
      id: 'serial-management',
      name: 'Serial Management',
      description: 'Serial inventory, usage tracking, and assignment management',
      icon: 'las la-barcode',
      baseRoute: '/serial-management',
      isActive: false
    }
  ];

  constructor(private router: Router) {
    // Determine current app based on route on init
    this.detectCurrentApp();
    // Re-detect on every navigation so sidebar context switches automatically
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: NavigationEnd) => {
      this.detectCurrentAppFromUrl(e.urlAfterRedirects || e.url);
    });
  }

  private detectCurrentApp(): void {
    this.detectCurrentAppFromUrl(this.router.url);
  }

  private detectCurrentAppFromUrl(url: string): void {
    let next: AppType;
    if (url.startsWith('/field-service')) {
      next = 'field-service';
    } else if (url.startsWith('/admin') || url.startsWith('/maintenance')) {
      next = 'admin';
    } else if (url.startsWith('/serial-management') || url.startsWith('/serial-assignments')) {
      next = 'serial-management';
    } else {
      next = 'main';
    }
    if (this.currentAppSubject.value !== next) {
      this.currentAppSubject.next(next);
      this.updateActiveApp(next);
    }
  }

  private updateActiveApp(activeId: AppType): void {
    this.apps.forEach(app => {
      app.isActive = app.id === activeId;
    });
  }

  getCurrentApp(): AppType {
    return this.currentAppSubject.value;
  }

  getApps(): AppInfo[] {
    return [...this.apps];
  }

  getActiveApp(): AppInfo | undefined {
    return this.apps.find(app => app.isActive);
  }

  setAppContext(appId: AppType): void {
    const targetApp = this.apps.find(app => app.id === appId);
    if (!targetApp) {
      return;
    }
    if (this.currentAppSubject.value !== appId) {
      this.currentAppSubject.next(appId);
      this.updateActiveApp(appId);
    }
  }

  switchToApp(appId: AppType): void {
    const targetApp = this.apps.find(app => app.id === appId);
    if (targetApp) {
      this.setAppContext(appId);
      
      // Navigate to the base route of the target app
      this.router.navigate([targetApp.baseRoute]);
    }
  }

  isMainApp(): boolean {
    return this.getCurrentApp() === 'main';
  }

  isFieldServiceApp(): boolean {
    return this.getCurrentApp() === 'field-service';
  }

  isAdminApp(): boolean {
    return this.getCurrentApp() === 'admin';
  }

  isSerialManagementApp(): boolean {
    return this.getCurrentApp() === 'serial-management';
  }

  getAppTitle(): string {
    const activeApp = this.getActiveApp();
    return activeApp ? activeApp.name : 'Dashboard';
  }

  getAppDescription(): string {
    const activeApp = this.getActiveApp();
    return activeApp ? activeApp.description : '';
  }
}
