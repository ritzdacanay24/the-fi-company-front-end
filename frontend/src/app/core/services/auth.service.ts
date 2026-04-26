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
          const errorMessage = "Login failed"; // Customize the error message as needed
          return throwError(errorMessage);
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
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.currentUserSubject.next(null!);

    return of(undefined).pipe();
  }

  /**
   * Exchange stored refresh token for a new access token.
   * Updates localStorage with new tokens and returns the new access token.
   */
  refreshToken(): Observable<string> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
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
          localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
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
