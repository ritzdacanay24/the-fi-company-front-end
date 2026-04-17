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
  selector: 'app-inspection-checklist-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, StandaloneSidenavComponent],
  templateUrl: './inspection-checklist-layout.component.html',
  styleUrl: './inspection-checklist-layout.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class InspectionChecklistLayoutComponent implements OnInit {
  currentSectionLabel = 'Workflow Hub';
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
      label: 'Workflow Hub',
      route: '/inspection-checklist',
      icon: 'las la-th-large',
      subtitle: 'Entry point for inspection board, execution, and management tools.',
    },
    {
      label: 'Execution List',
      route: '/inspection-checklist/execution',
      icon: 'las la-list-ul',
      subtitle: 'List view for searching and launching active inspections.',
    },
    {
      label: 'Start Inspection',
      route: '/inspection-checklist/management',
      icon: 'las la-clipboard-list',
      subtitle: 'Select an active checklist to begin your inspection.',
    },
    {
      label: 'Template Manager',
      route: '/inspection-checklist/template-manager',
      icon: 'las la-folder-open',
      subtitle: 'Maintain, publish, and version checklist templates.',
      dividerBefore: true,
    },
    {
      label: 'Template Editor',
      route: '/inspection-checklist/template-editor',
      icon: 'las la-edit',
      subtitle: 'Build and refine checklist templates and section structures.',
    },
    {
      label: 'Audit View',
      route: '/inspection-checklist/audit',
      icon: 'las la-search',
      subtitle: 'Review checklist execution history and quality evidence.',
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
    const matched = this.navItems.find((item) => url.startsWith(item.route));
    this.currentSectionLabel = matched ? matched.label : 'Workflow Hub';
  }
}
