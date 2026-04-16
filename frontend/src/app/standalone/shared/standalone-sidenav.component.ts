import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface StandaloneSidenavItem {
  label: string;
  route: string;
  icon: string;
  dividerBefore?: boolean;
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

      <div class="h-100 d-flex flex-column">
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
            (click)="onNavItemClick()"
          >
            <i [class]="item.icon"></i>
            <span>{{ item.label }}</span>
          </a>
        </nav>
      </div>

      <div class="sidebar-background"></div>
    </aside>
  `,
})
export class StandaloneSidenavComponent {
  @Input({ required: true }) prefix!: string;
  @Input({ required: true }) isOpen!: boolean;
  @Input({ required: true }) brandRoute!: string;
  @Input({ required: true }) logoSm!: string;
  @Input({ required: true }) logoLg!: string;
  @Input({ required: true }) groupTitle!: string;
  @Input({ required: true }) navItems!: ReadonlyArray<StandaloneSidenavItem>;

  @Output() navItemClick = new EventEmitter<void>();

  onNavItemClick(): void {
    this.navItemClick.emit();
  }
}
