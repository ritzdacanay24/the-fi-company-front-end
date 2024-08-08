import { Injectable } from "@angular/core";
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from "@angular/router";

// Auth Services
import { AuthenticationService } from "../services/auth.service";
import { THE_FI_COMPANY_CURRENT_USER } from "./admin.guard";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { AccessService } from "../api/access/access.service";

@Injectable({ providedIn: "root" })
export class AccessGuard {
  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private accessService: AccessService
  ) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const currentUser = this.authenticationService.currentUserValue;
    if (currentUser) {
      console.log(route, "route");
      let accessCheck = await this.accessService.getAccess(
        currentUser.id,
        route.component.name?.toString()
      );

      if (accessCheck) return true;

      let d = await SweetAlert.fire({
        title: "Access Denied",
        text: "File Name: " + route.component.name?.toString(),
        showDenyButton: true,
        confirmButtonText: `Ok`,
        denyButtonText: `Try Again`,
      });

      if (d.isDenied) {
        this.router.navigate([state.url]);
        return false;
      }

      this.router.navigate(["/dashboard/operations/overview"]);

      return false;
    }
    // check if user data is in storage is logged in via API.
    if (localStorage.getItem(THE_FI_COMPANY_CURRENT_USER)) {
      return true;
    }
    // not logged in so redirect to login page with the return url
    this.router.navigate(["/auth/login"], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }
}
