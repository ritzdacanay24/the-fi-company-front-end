import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';

interface SafetyNavItem {
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
  selector: 'app-safety-incidents-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './safety-incidents-layout.component.html',
  styleUrl: './safety-incidents-layout.component.scss',
})
export class SafetyIncidentsLayoutComponent {
  currentSectionLabel = 'Incident List';
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

  readonly navItems: SafetyNavItem[] = [
    {
      label: 'Incident List',
      route: 'list',
      icon: 'las la-list',
      subtitle: 'Review, filter, and manage all submitted safety incidents.',
    },
    {
      label: 'Report Incident',
      route: 'create',
      icon: 'las la-plus-circle',
      subtitle: 'Capture incident details, evidence, and immediate corrective actions.',
    },
    {
      label: 'Safety Dashboard',
      route: 'dashboard',
      icon: 'las la-chart-line',
      subtitle: 'Monitor incident trends, severity, and closure performance.',
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
    const matched = this.navItems.find(
      (item) =>
        url.includes(`/safety-incidents/${item.route}`) ||
        url.includes(`/operations/forms/safety-incident/${item.route}`)
    );

    this.currentSectionLabel = matched ? matched.label : 'Incident List';
  }

  get currentSection(): SafetyNavItem {
    return this.navItems.find((item) => item.label === this.currentSectionLabel) || this.navItems[0];
  }
}
