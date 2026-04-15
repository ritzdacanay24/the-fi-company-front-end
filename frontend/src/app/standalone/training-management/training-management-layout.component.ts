import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
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
  selector: 'app-training-management-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './training-management-layout.component.html',
  styleUrl: './training-management-layout.component.scss',
})
export class TrainingManagementLayoutComponent {
  currentSectionLabel = 'Live Sessions';
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
      label: 'Live Sessions',
      route: 'live',
      icon: 'las la-video',
      subtitle: 'Monitor active sessions and open attendance flow quickly.',
    },
    {
      label: 'Session Setup',
      route: 'setup',
      icon: 'las la-calendar-plus',
      subtitle: 'Create or edit training sessions with schedule and roster details.',
    },
    {
      label: 'Manage Sessions',
      route: 'manage',
      icon: 'las la-tasks',
      subtitle: 'Review sessions, status, and operational actions in one list.',
    },
    {
      label: 'Templates',
      route: 'templates',
      icon: 'las la-layer-group',
      subtitle: 'Maintain reusable training templates for standardized delivery.',
    },
    {
      label: 'Reports',
      route: 'reports',
      icon: 'las la-chart-bar',
      subtitle: 'Review attendance, facilitator performance, and compliance trends.',
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
      (item) => url.includes(`/standalone/training-management/${item.route}`) || url.includes(`/training/${item.route}`),
    );
    this.currentSectionLabel = matched ? matched.label : 'Live Sessions';
  }

  get currentSection(): NavItem {
    return this.navItems.find((item) => item.label === this.currentSectionLabel) || this.navItems[0];
  }
}
