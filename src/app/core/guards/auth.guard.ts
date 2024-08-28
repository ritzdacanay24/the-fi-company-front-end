import { Injectable } from "@angular/core";
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from "@angular/router";

// Auth Services
import { AuthenticationService } from "../services/auth.service";
import { THE_FI_COMPANY_CURRENT_USER } from "./admin.guard";

@Injectable({ providedIn: "root" })
export class AuthGuard {
  constructor(
    private router: Router,
    private authenticationService: AuthenticationService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const currentUser = this.authenticationService.currentUserValue;

    if (currentUser) {
      // logged in so return true
      return true;
    }
    // check if user data is in storage is logged in via API.
    if (localStorage.getItem(THE_FI_COMPANY_CURRENT_USER)) {
      return true;
    }

    this.authenticationService.logout();

    // not logged in so redirect to login page with the return url
    this.router.navigate(["/auth/login"], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }
}
