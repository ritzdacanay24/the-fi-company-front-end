import { Injectable } from "@angular/core";
import { getFirebaseBackend } from "../../authUtils";
import { User } from "src/app/store/Authentication/auth.models";
import { BehaviorSubject, Observable, of, throwError } from "rxjs";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { GlobalComponent } from "../../global-component";
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

const AUTH_API = GlobalComponent.AUTH_API;

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
        AUTH_API + "auth/Login/login",
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
        AUTH_API + "auth/Login/login-card",
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
    this.currentUserSubject.next(null!);

    return of(undefined).pipe();
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
