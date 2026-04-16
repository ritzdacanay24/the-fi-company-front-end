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
  selector: 'app-project-manager-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './project-manager-layout.component.html',
  styleUrl: './project-manager-layout.component.scss',
})
export class ProjectManagerLayoutComponent {
  currentSectionLabel = 'Dashboard';
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
      label: 'Dashboard',
      route: 'dashboard',
      icon: 'las la-chart-line',
      subtitle: 'Portfolio health and gate progress overview.',
    },
    {
      label: 'New Project',
      route: 'new-project',
      icon: 'las la-plus-circle',
      subtitle: 'Create and manage project intake forms.',
    },
    {
      label: 'Tasks',
      route: 'tasks',
      icon: 'las la-tasks',
      subtitle: 'Track gate tasks, ownership, and execution status.',
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
    const matched = this.navItems.find((item) =>
      url.includes(`/project-manager/${item.route}`) ||
      url.includes(`/operations/project-manager/${item.route}`),
    );
    this.currentSectionLabel = matched ? matched.label : 'Dashboard';
  }

  get currentSection(): NavItem {
    return this.navItems.find((item) => item.label === this.currentSectionLabel) || this.navItems[0];
  }
}
