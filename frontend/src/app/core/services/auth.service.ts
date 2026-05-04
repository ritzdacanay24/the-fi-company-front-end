import { Injectable } from "@angular/core";
import { getFirebaseBackend } from "../../authUtils";
import { User } from "src/app/store/Authentication/auth.models";
import { BehaviorSubject, Observable, of, throwError } from "rxjs";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Store } from "@ngrx/store";
import { catchError, map } from "rxjs/operators";
import {
  RegisterSuccess,
  loginFailure,
  loginSuccess,
  logout,
  logoutSuccess,
} from "src/app/store/Authentication/authentication.actions";
import { TokenStorageService } from "./token-storage.service";
import { THE_FI_COMPANY_CURRENT_USER } from "../guards/admin.guard";

const AUTH_API = "apiV2/";
const REFRESH_TOKEN_KEY = 'refresh_token';
const LOCAL_STORAGE_CLEANUP_KEYS = [
  'eyefi_request_drafts_v1',
  'eyefi_request_active_draft_v1',
  'eyefi_recent_contacts',
  'materialRequestDraft',
  'universalSearchRecent',
  'THE_FI_COMPANY_RECENT_SEARCH',
] as const;

const httpOptions = {
  headers: new HttpHeaders({ "Content-Type": "application/json" }),
};

@Injectable({ providedIn: "root" })

/**
 * Auth-service Component
 */
export class AuthenticationService {
  user!: User;
  private currentUserSubject: BehaviorSubject<User>;

  constructor(
    private http: HttpClient,
    private store: Store,
    private tokenStorageService: TokenStorageService
  ) {
    let e = localStorage.getItem(THE_FI_COMPANY_CURRENT_USER);
    this.currentUserSubject = new BehaviorSubject<User>(
      JSON.parse(e == "undefined" ? null : e)
    );
    // this.currentUser = this.currentUserSubject.asObservable();
  }
  /**
   * Performs the register
   * @param email email
   * @param password password
   */
  register(email: string, first_name: string, password: string) {
    // return getFirebaseBackend()!.registerUser(email, password).then((response: any) => {
    //     const user = response;
    //     return user;
    // });

    // Register Api
    return this.http
      .post(
        AUTH_API + "signup",
        {
          email,
          first_name,
          password,
        },
        httpOptions
      )
      .pipe(
        map((response: any) => {
          const user = response;
          return user;
        }),
        catchError((error: any) => {
          const errorMessage = "Login failed"; // Customize the error message as needed
          this.store.dispatch(loginFailure({ error: errorMessage }));
          return throwError(errorMessage);
        })
      );
  }

  /**
   * Performs the auth
   * @param email email of user
   * @param password password of user
   */
  login(email: string, password: string) {
    // return getFirebaseBackend()!.loginUser(email, password).then((response: any) => {
    //     const user = response;
    //     return user;
    // });

    return this.http
      .post(
        AUTH_API + "auth/login",
        {
          email,
          password,
        },
        httpOptions
      )
      .pipe(
        map((response: any) => {
          const user = response;
          return user;
        }),
        catchError((error: any) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Login with card number
   * @param cardNumber employee card number
   */
  loginWithCardNumber(cardNumber: string) {
    return this.http
      .post(
        AUTH_API + "auth/login/card",
        {
          card_number: cardNumber
        },
        httpOptions
      )
      .pipe(
        map((response: any) => {
          const user = response;
          return user;
        }),
        catchError((error: any) => {
          const errorMessage = "Card number login failed"; 
          return throwError(errorMessage);
        })
      );
  }

  /**
   * Returns the current user
   */
  public currentUser(): any {
    return this.tokenStorageService.getUser();
  }

  /**
   * Returns the current user
   */
  get currentUserValue(): any {
    return this.tokenStorageService.getUser();
  }

  /**
   * Logout the user
   */
  logout() {
    this.store.dispatch(logout());
    // logout the user
    // return getFirebaseBackend()!.logout();
    localStorage.removeItem(THE_FI_COMPANY_CURRENT_USER);
    localStorage.removeItem("token");
    this.clearRefreshToken();
    this.currentUserSubject.next(null!);

    return of(undefined).pipe();
  }

  /**
   * Exchange stored refresh token for a new access token.
   * Updates localStorage with new tokens and returns the new access token.
   */
  refreshToken(): Observable<string> {
    const refreshToken = this.getStoredRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token stored'));
    }
    return this.http
      .post<{ access_token: string; refresh_token: string }>(
        AUTH_API + 'auth/refresh',
        { refresh_token: refreshToken },
        httpOptions,
      )
      .pipe(
        map((response) => {
          localStorage.setItem('token', response.access_token);
          this.storeRefreshToken(response.refresh_token);
          // Update the token stored in the current user object so the interceptor picks it up
          const storedUser = localStorage.getItem(THE_FI_COMPANY_CURRENT_USER);
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              user.token = response.access_token;
              localStorage.setItem(THE_FI_COMPANY_CURRENT_USER, JSON.stringify(user));
            } catch {
              // ignore parse errors
            }
          }
          return response.access_token;
        }),
      );
  }

  storeRefreshToken(token?: string | null): void {
    const value = String(token || '').trim();
    if (!value) {
      this.clearRefreshToken();
      return;
    }

    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, value);
      return;
    } catch (error) {
      if (!this.isQuotaExceededError(error)) {
        throw error;
      }
    }

    try {
      this.releaseLocalStorageSpace();
      localStorage.setItem(REFRESH_TOKEN_KEY, value);
    } catch {
      throw new Error('Unable to store refresh token in localStorage (quota exceeded).');
    }
  }

  private getStoredRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private clearRefreshToken(): void {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  private isQuotaExceededError(error: unknown): boolean {
    return error instanceof DOMException && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }

  private releaseLocalStorageSpace(): void {
    for (const key of LOCAL_STORAGE_CLEANUP_KEYS) {
      localStorage.removeItem(key);
    }

    const checklistKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) {
        continue;
      }

      if (/^checklist_\d+_completion$/i.test(key)) {
        checklistKeysToRemove.push(key);
      }
    }

    for (const key of checklistKeysToRemove) {
      localStorage.removeItem(key);
    }
  }

  /**
   * Reset password
   * @param email email
   */
  resetPassword(email: string) {
    return getFirebaseBackend()!
      .forgetPassword(email)
      .then((response: any) => {
        const message = response.data;
        return message;
      });
  }
}
