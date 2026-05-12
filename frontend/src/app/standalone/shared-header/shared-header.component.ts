import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthenticationService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-shared-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shared-header.component.html',
  styleUrls: ['./shared-header.component.scss']
})
export class SharedHeaderComponent implements OnInit {
  @Input() pageTitle: string = 'Public Form';
  @Input() pageDescription: string = 'Form description';
  @Input() pageIcon: string = 'mdi mdi-form-select';
  @Input() transparent: boolean = false;
  @Input() isAuthenticated: boolean = false;
  @Input() currentUser: any = null;
  @Input() hasValidUserImage: boolean = false;
  @Input() sessionTimeRemaining: string = '';
  @Input() inactivityTimeRemaining: string = '';
  @Input() breadcrumbUrl: string = '/public-forms';

  @Output() extendSession = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() userImageError = new EventEmitter<any>();
  @Output() goToFormsMenu = new EventEmitter<void>();

  private sessionUser: any = null;

  constructor(
    private router: Router,
    private authService: AuthenticationService,
  ) {}

  ngOnInit(): void {
    this.loadSessionUser();
  }

  get resolvedUser(): any {
    return this.currentUser || this.sessionUser;
  }

  get resolvedIsAuthenticated(): boolean {
    return this.isAuthenticated || !!this.resolvedUser;
  }

  get resolvedHasValidUserImage(): boolean {
    if (this.hasValidUserImage) {
      return true;
    }

    const user = this.resolvedUser;
    return Boolean(user?.image_url || user?.image || user?.avatar);
  }

  get isLoginRoute(): boolean {
    const currentPath = (this.router.url || '').split('?')[0];
    return currentPath.startsWith('/auth/login');
  }

  get isMenuRoute(): boolean {
    const currentPath = (this.router.url || '').split('?')[0];
    return currentPath.startsWith('/menu');
  }

  private loadSessionUser(): void {
    try {
      const raw = localStorage.getItem('THE_FI_COMPANY_CURRENT_USER');
      if (!raw) {
        return;
      }
      this.sessionUser = JSON.parse(raw);
    } catch {
      this.sessionUser = null;
    }
  }

  getUserImageUrl(): string {
    // Support multiple possible image fields depending on which component provided the user
    const user = this.resolvedUser;
    const img = user?.image_url || user?.image || user?.avatar;
    if (!img) return '';

    // If it's already an absolute url, return as-is. Otherwise prefix with dashboard domain if available.
    if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
      return img;
    }

    // Fallback: try to prefix with the known dashboard host
    return `https://dashboard.eye-fi.com${img}`;
  }

  onExtendSession(): void {
    console.log('Extend session clicked');
    this.extendSession.emit();
  }

  onLogout(): void {
    console.log('Logout clicked');
    this.logout.emit();

    // Fallback: if no parent listener is attached, perform local logout directly.
    if (!this.logout.observed) {
      this.authService.logout().subscribe();
      localStorage.removeItem('temp_session_start');
      localStorage.removeItem('temp_last_activity');
      this.router.navigate(['/auth/login']);
    }
  }

  onUserImageError(event: any): void {
    this.userImageError.emit(event);
  }

  onGoToFormsMenu(): void {
    console.log('Go to forms menu clicked');
    this.goToFormsMenu.emit();
  }

  onLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  onMenu(): void {
    this.router.navigate(['/menu']);
  }

  getUserInitials(): string {
    const user = this.resolvedUser;

    if (user?.full_name) {
      return user.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  }
}