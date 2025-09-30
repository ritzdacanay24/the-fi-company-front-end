import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shared-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shared-header.component.html',
  styleUrls: ['./shared-header.component.scss']
})
export class SharedHeaderComponent {
  @Input() pageTitle: string = 'Public Form';
  @Input() pageDescription: string = 'Form description';
  @Input() pageIcon: string = 'mdi mdi-form-select';
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

  constructor(private router: Router) {}

  getUserImageUrl(): string {
    if (this.currentUser?.image_url) {
      return this.currentUser.image_url;
    }
    return '';
  }

  onExtendSession(): void {
    console.log('Extend session clicked');
    this.extendSession.emit();
  }

  onLogout(): void {
    console.log('Logout clicked');
    this.logout.emit();
  }

  onUserImageError(event: any): void {
    this.userImageError.emit(event);
  }

  onGoToFormsMenu(): void {
    console.log('Go to forms menu clicked');
    this.goToFormsMenu.emit();
  }

  getUserInitials(): string {
    if (this.currentUser?.full_name) {
      return this.currentUser.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    if (this.currentUser?.username) {
      return this.currentUser.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  }
}