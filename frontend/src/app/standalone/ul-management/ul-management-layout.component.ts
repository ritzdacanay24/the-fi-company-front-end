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
  selector: 'app-ul-management-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, StandaloneSidenavComponent],
  templateUrl: './ul-management-layout.component.html',
  styleUrl: './ul-management-layout.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class UlManagementLayoutComponent implements OnInit {
  currentSectionLabel = 'Labels Report';
  isSidebarOpen = false;

  readonly mainSections: MainSectionItem[] = [
    {
      label: 'Operations',
      route: '/operations',
      icon: 'las la-cogs',
    },
    {
      label: 'Quality',
      route: '/quality',
      icon: 'las la-clipboard-check',
    },
    {
      label: 'Field Service',
      route: '/field-service',
      icon: 'las la-tools',
    },
    {
      label: 'Admin',
      route: '/admin',
      icon: 'las la-user-shield',
    },
  ];

  readonly navItems: NavItem[] = [
    {
      label: 'Labels Report',
      route: 'labels-report',
      icon: 'las la-list-alt',
      subtitle: 'Browse UL labels with status, category, and metadata filters.',
    },
    {
      label: 'Upload Labels',
      route: 'upload',
      icon: 'las la-upload',
      subtitle: 'Add UL labels manually, by file upload, or by range generation.',
    },
    {
      label: 'Usage Report',
      route: 'usage-report',
      icon: 'las la-chart-bar',
      subtitle: 'Review UL usage trends, history, and accountability reporting.',
    },
    {
      label: 'Audit Sign-Off',
      route: 'audit-signoff',
      icon: 'las la-clipboard-check',
      subtitle: 'Run UL audit validation and capture official sign-off records.',
      dividerBefore: true,
    },
    {
      label: 'Audit History',
      route: 'audit-history',
      icon: 'las la-history',
      subtitle: 'View audit trends, records, and print/export prior sign-off reports.',
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
        url.includes(`/ul-management/${item.route}`) ||
        url.includes(`/standalone/ul-management/${item.route}`),
    );
    this.currentSectionLabel = matched ? matched.label : 'Labels Report';
  }

  get currentSection(): NavItem {
    return this.navItems.find((item) => item.label === this.currentSectionLabel) || this.navItems[0];
  }
}
