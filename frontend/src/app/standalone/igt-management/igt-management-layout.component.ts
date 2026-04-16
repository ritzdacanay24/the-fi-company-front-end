import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { StandaloneLayoutThemeService } from '@app/standalone/shared/standalone-layout-theme.service';
import { StandaloneSidenavComponent } from '@app/standalone/shared/standalone-sidenav.component';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  subtitle: string;
  dividerBefore?: boolean;
}

interface MainSectionItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-igt-management-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, StandaloneSidenavComponent],
  templateUrl: './igt-management-layout.component.html',
  styleUrl: './igt-management-layout.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class IgtManagementLayoutComponent implements OnInit {
  currentSectionLabel = 'Inventory';
  isSidebarOpen = false;

  readonly mainSections: MainSectionItem[] = [
    { label: 'Operations', route: '/operations', icon: 'las la-cogs' },
    { label: 'Quality', route: '/quality', icon: 'las la-clipboard-check' },
    { label: 'Field Service', route: '/field-service', icon: 'las la-tools' },
    { label: 'Admin', route: '/admin', icon: 'las la-user-shield' },
  ];

  readonly navItems: NavItem[] = [
    {
      label: 'Inventory',
      route: 'inventory',
      icon: 'las la-database',
      subtitle: 'Browse and manage available IGT serial numbers.',
    },
    {
      label: 'Usage Report',
      route: 'usage-report',
      icon: 'las la-chart-bar',
      subtitle: 'View all IGT serials assigned across work orders and jobs.',
    },
    {
      label: 'Upload Serials',
      route: 'upload',
      icon: 'las la-upload',
      subtitle: 'Import new IGT serial numbers via file upload.',
      dividerBefore: true,
    },
  ];

  constructor(
    private readonly router: Router,
    private readonly standaloneLayoutThemeService: StandaloneLayoutThemeService,
  ) {
    this.syncSidebarForViewport();
    this.updateSectionLabel(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navEvent = event as NavigationEnd;
        this.updateSectionLabel(navEvent.urlAfterRedirects);
        if (!this.isDesktopViewport) {
          this.isSidebarOpen = false;
        }
      });
  }

  ngOnInit(): void {
    this.standaloneLayoutThemeService.applyThemeLayoutAttributes();
  }

  get isDesktopViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth >= 992;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  isMainSectionActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  onNavClick(): void {
    if (!this.isDesktopViewport) {
      this.closeSidebar();
    }
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    this.syncSidebarForViewport();
  }

  private syncSidebarForViewport(): void {
    this.isSidebarOpen = this.isDesktopViewport;
  }

  private updateSectionLabel(url: string): void {
    const matched = this.navItems.find(
      (item) =>
        url.includes(`/igt-management/${item.route}`) ||
        url.includes(`/standalone/igt-management/${item.route}`),
    );
    this.currentSectionLabel = matched ? matched.label : 'Inventory';
  }

  get currentSection(): NavItem {
    return this.navItems.find((item) => item.label === this.currentSectionLabel) || this.navItems[0];
  }
}
