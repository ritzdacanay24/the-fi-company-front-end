import { Injectable } from "@angular/core";
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from "@angular/router";

// Auth Services
import { AuthenticationService } from "../services/auth.service";
import { THE_FI_COMPANY_CURRENT_USER } from "./admin.guard";
import { MenuService } from "../api/menu/menu.service";

@Injectable({ providedIn: "root" })
export class AccessGuard {
  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private menuService: MenuService
  ) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const currentUser = this.authenticationService.currentUserValue;
    if (currentUser) {
      //console.log('Running CanActivate')
      //return true
      console.log("🔗 Current URL:", state.url);

      let d = state.url.split("?")[0];

      //checks to see if user has access to component.
      let res = await this.menuService.checkUserPermission(currentUser.id, d);

      console.log("🔍 Menu lookup result for", d, ":", res);

      // If not found, try with /dashboard/ prefix (fallback for database migration)
      if (!res) {
        const dashboardUrl = "/dashboard" + d;
        console.log("🔄 Trying fallback URL:", dashboardUrl);
        res = await this.menuService.checkUserPermission(currentUser.id, dashboardUrl);
        console.log("🔍 Fallback lookup result for", dashboardUrl, ":", res);
      }

      if (res && res.active == 0) {
        this.router.navigate(["in-active"], {
          queryParams: {
            returnUrl: state.url,
            title: res?.label || route.routeConfig.title || d,
            menu_id: res.id,
          },
        });

        return false;
      }

      //All file need access UNLESS specified in the MENU as accessRequired = false.
      if (res && res.accessRequired == false) return true;

      //Check server if user has access to file.
      let accessCheck = res && res.page_access_id != null;

      console.log("🔗 Current URL:", accessCheck);
      if (accessCheck) return true;

      this.router.navigate(["access-denied"], {
        queryParams: {
          returnUrl: state.url,
          title: res?.label || route.routeConfig.title || d,
          menu_id: res.id,
        },
      });

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
