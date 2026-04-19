import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

export interface StandaloneSidenavItem {
  label: string;
  route: string;
  icon: string;
  dividerBefore?: boolean;
}

export interface StandaloneSidenavGroup {
  title: string;
  items: StandaloneSidenavItem[];
}

@Component({
  selector: 'app-standalone-sidenav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="app-menu navbar-menu" [class.open]="isOpen" [ngClass]="prefix + '-sidebar'">
      <div class="navbar-brand-box">
        <a [routerLink]="brandRoute" class="logo logo-dark">
          <span class="logo-sm">{{ logoSm }}</span>
          <span class="logo-lg text-white">{{ logoLg }}</span>
        </a>
      </div>

      <div #scrollContainer class="standalone-sidebar-scroll h-100 d-flex flex-column">

        <!-- Multi-group mode -->
        <ng-container *ngIf="navGroups; else flatMode">
          <ng-container *ngFor="let group of navGroups">
            <div [ngClass]="prefix + '-nav-group'">
              <small [ngClass]="prefix + '-nav-group-title'">{{ group.title }}</small>
            </div>
            <nav class="nav flex-column pb-1">
              <a
                *ngFor="let item of group.items"
                class="nav-link d-flex align-items-center gap-2"
                [class.nav-divider-before]="item.dividerBefore"
                [routerLink]="item.route"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="onNavItemClick()"
              >
                <i [class]="item.icon"></i>
                <span>{{ item.label }}</span>
              </a>
            </nav>
          </ng-container>
        </ng-container>

        <!-- Flat mode (legacy) -->
        <ng-template #flatMode>
          <div [ngClass]="prefix + '-nav-group'">
            <small [ngClass]="prefix + '-nav-group-title'">{{ groupTitle }}</small>
          </div>
          <nav class="nav flex-column py-2">
            <a
              *ngFor="let item of navItems"
              class="nav-link d-flex align-items-center gap-2"
              [class.nav-divider-before]="item.dividerBefore"
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              (click)="onNavItemClick()"
            >
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          </nav>
        </ng-template>

      </div>

      <div class="standalone-sidebar-footer" *ngIf="footerLogoSrc">
        <img [src]="footerLogoSrc" [alt]="footerLogoAlt" />
      </div>

      <div class="sidebar-background"></div>
    </aside>
  `,
})
export class StandaloneSidenavComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) prefix!: string;
  @Input({ required: true }) isOpen!: boolean;
  @Input({ required: true }) brandRoute!: string;
  @Input({ required: true }) logoSm!: string;
  @Input({ required: true }) logoLg!: string;
  // Flat mode
  @Input() groupTitle?: string;
  @Input() navItems?: ReadonlyArray<StandaloneSidenavItem>;
  // Multi-group mode
  @Input() navGroups?: ReadonlyArray<StandaloneSidenavGroup>;
  @Input() footerLogoSrc = 'assets/images/the-fi.png';
  @Input() footerLogoAlt = 'EyeFi';

  @Output() navItemClick = new EventEmitter<void>();

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLElement>;
  private readonly routerEventsSub: Subscription;

  constructor(private readonly router: Router) {
    this.routerEventsSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.scrollToActiveItem();
      }
    });
  }

  ngAfterViewInit(): void {
    this.scrollToActiveItem();
  }

  ngOnDestroy(): void {
    this.routerEventsSub.unsubscribe();
  }

  private scrollToActiveItem(): void {
    setTimeout(() => {
      const container = this.scrollContainer?.nativeElement;
      if (!container) {
        return;
      }

      const activeItem = container.querySelector('.nav-link.active') as HTMLElement | null;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    });
  }

  onNavItemClick(): void {
    this.navItemClick.emit();
  }
}
