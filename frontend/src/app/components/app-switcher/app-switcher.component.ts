import { Component, OnInit } from '@angular/core';
import { AppSwitcherService, AppInfo } from '@app/services/app-switcher.service';

@Component({
  selector: 'app-switcher',
  templateUrl: './app-switcher.component.html',
  styleUrls: ['./app-switcher.component.scss']
})
export class AppSwitcherComponent implements OnInit {
  apps: AppInfo[] = [];
  currentApp: AppInfo | undefined;
  showDropdown = false;

  constructor(private appSwitcherService: AppSwitcherService) {}

  ngOnInit(): void {
    this.apps = this.appSwitcherService.getApps();
    this.currentApp = this.appSwitcherService.getActiveApp();

    // Subscribe to app changes
    this.appSwitcherService.currentApp$.subscribe(() => {
      this.currentApp = this.appSwitcherService.getActiveApp();
    });
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  switchApp(app: AppInfo): void {
    if (app.id !== this.currentApp?.id) {
      this.appSwitcherService.switchToApp(app.id);
    }
    this.showDropdown = false;
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }
}
