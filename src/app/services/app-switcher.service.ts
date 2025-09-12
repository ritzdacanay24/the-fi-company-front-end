import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';

export type AppType = 'main' | 'field-service';

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
    }
  ];

  constructor(private router: Router) {
    // Determine current app based on route
    this.detectCurrentApp();
  }

  private detectCurrentApp(): void {
    const currentUrl = this.router.url;
    if (currentUrl.startsWith('/field-service')) {
      this.currentAppSubject.next('field-service');
      this.updateActiveApp('field-service');
    } else {
      this.currentAppSubject.next('main');
      this.updateActiveApp('main');
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

  switchToApp(appId: AppType): void {
    const targetApp = this.apps.find(app => app.id === appId);
    if (targetApp) {
      this.currentAppSubject.next(appId);
      this.updateActiveApp(appId);
      
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

  getAppTitle(): string {
    const activeApp = this.getActiveApp();
    return activeApp ? activeApp.name : 'Dashboard';
  }

  getAppDescription(): string {
    const activeApp = this.getActiveApp();
    return activeApp ? activeApp.description : '';
  }
}
