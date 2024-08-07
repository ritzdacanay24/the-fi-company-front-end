import { Injectable } from "@angular/core";
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from "@angular/router";

// Auth Services
import { AuthenticationService } from "../services/auth.service";

export const THE_FI_COMPANY_CURRENT_USER = "THE_FI_COMPANY_CURRENT_USER";

@Injectable({ providedIn: "root" })
export class AdminGuard {
  constructor(
    private router: Router,
    private authenticationService: AuthenticationService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const currentUser = this.authenticationService.currentUserValue;
    if (currentUser) {
      if (currentUser?.isAdmin == 1 || currentUser?.employeeType != 0)
        return true;
      return false;
      // logged in so return true
    }
    // check if user data is in storage is logged in via API.
    if (localStorage.getItem(THE_FI_COMPANY_CURRENT_USER)) {
      return true;
    }

    // not logged in so redirect to login page with the return url
    this.router.navigate(["/dashboard/dashboard"], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }
}
