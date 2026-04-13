import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { AuthenticationService } from '@app/core/services/auth.service';
import { THE_FI_COMPANY_CURRENT_USER } from '@app/core/guards/admin.guard';

export interface LoginResult {
  success: boolean;
  user?: any;
  error?: string;
}

@Component({
  selector: 'app-temporary-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './temporary-login.component.html',
  styleUrls: ['./temporary-login.component.scss']
})
export class TemporaryLoginComponent implements OnInit, OnDestroy {
  @Input() formTitle: string = 'Temporary Login';
  @Input() formDescription: string = 'Enter your credentials for temporary access.';
  
  @Output() loginSuccess = new EventEmitter<any>();
  @Output() loginErrorEvent = new EventEmitter<string>();
  @Output() sessionExpired = new EventEmitter<void>();

  // Authentication state
  isAuthenticated = false;
  isLoggingIn = false;
  currentUser: any = null;
  
  // Login form
  loginMethod = 'cardNumber';
  loginError = '';
  
  private destroy$ = new Subject<void>();
  
  constructor(private authService: AuthenticationService) {}

  ngOnInit(): void {
    this.checkExistingUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkExistingUser(): void {
    // Check if user is already authenticated
    const currentUser = localStorage.getItem(THE_FI_COMPANY_CURRENT_USER);
    if (currentUser) {
      this.currentUser = JSON.parse(currentUser);
      this.isAuthenticated = true;
      this.loginSuccess.emit(this.currentUser);
    }
  }

  async authenticateUser(form: any): Promise<void> {
    if (this.isLoggingIn) return;
    
    this.isLoggingIn = true;
    this.loginError = '';

    try {
      const formData = form.value;
      
      let loginObservable;
      if (this.loginMethod === 'username') {
        const email = formData.username + '@the-fi-company.com';
        loginObservable = this.authService.login(email, formData.password);
      } else {
        loginObservable = this.authService.loginWithCardNumber(formData.cardNumber);
      }

      loginObservable.subscribe({
        next: (response: any) => {
          // Handle different response structures
          let user = null;
          let success = false;

          if (response) {
            // Check if response has standardized structure
            if (response.success && response.user) {
              user = response.user;
              success = true;
            }
            // Check if response IS the user object (direct auth service response)
            else if (response.id || response.username || response.full_name) {
              user = response;
              success = true;
            }
            // Check if response has user property directly
            else if (response.user) {
              user = response.user;
              success = true;
            }
          }

          if (success && user) {
            this.isAuthenticated = true;
            this.currentUser = user;
            
            // Store user in localStorage
            localStorage.setItem(THE_FI_COMPANY_CURRENT_USER, JSON.stringify(user));
            
            this.loginSuccess.emit(user);
            form.reset();
          } else {
            throw new Error(response?.message || 'Authentication failed - Invalid user data');
          }
        },
        error: (error: any) => {
          console.error('Login error:', error);
          const errorMessage = error?.message || 'Login failed. Please check your credentials.';
          this.loginError = errorMessage;
        },
        complete: () => {
          this.isLoggingIn = false;
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.message || 'Login failed. Please check your credentials.';
      this.loginError = errorMessage;
      this.loginErrorEvent.emit(errorMessage);
      this.isLoggingIn = false;
    }
  }

  onLoginMethodChange(): void {
    this.loginError = '';
  }

  onCardNumberEnter(event: KeyboardEvent, form: any): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.authenticateUser(form);
    }
  }

  isLoginFormValid(form: any): boolean {
    if (this.loginMethod === 'username') {
      return form.valid && form.value.username && form.value.password;
    } else {
      return form.valid && form.value.cardNumber;
    }
  }

  logout(): void {
    this.isAuthenticated = false;
    this.currentUser = null;
    localStorage.removeItem(THE_FI_COMPANY_CURRENT_USER);
  }

  getUserInitials(): string {
    if (this.currentUser?.full_name) {
      return this.currentUser.full_name.split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    } else if (this.currentUser?.username) {
      return this.currentUser.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  }
}