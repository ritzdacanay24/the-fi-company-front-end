import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  subtitle: string;
}

interface MainSectionItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-unique-label-generator-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './unique-label-generator-layout.component.html',
  styleUrl: './unique-label-generator-layout.component.scss',
})
export class UniqueLabelGeneratorLayoutComponent {
  currentSectionLabel = 'Create Batch';
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
      label: 'Create Batch',
      route: 'create',
      icon: 'las la-plus-circle',
      subtitle: 'Generate unique WWYYSSS labels from work orders or manual input.',
    },
    {
      label: 'Batch History',
      route: 'history',
      icon: 'las la-history',
      subtitle: 'Review batch details in a modal and reprint labels when replacements are needed.',
    },
    {
      label: 'Reports',
      route: 'reports',
      icon: 'las la-chart-bar',
      subtitle: 'Track usage, trends, and weekly sequence consumption.',
    },
    {
      label: 'Admin',
      route: 'admin',
      icon: 'las la-cog',
      subtitle: 'Manage template defaults and workflow settings.',
    },
  ];

  constructor(private readonly router: Router) {
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
    const matched = this.navItems.find((item) => url.includes(`/standalone/unique-label-generator/${item.route}`));
    this.currentSectionLabel = matched ? matched.label : 'Create Batch';
  }

  get currentSection(): NavItem {
    return this.navItems.find((item) => item.label === this.currentSectionLabel) || this.navItems[0];
  }
}
