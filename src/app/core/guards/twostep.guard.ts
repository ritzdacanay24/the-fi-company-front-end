import { Injectable } from "@angular/core";
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from "@angular/router";

import { TwostepService } from "../api/twostep/twostep.service";

@Injectable({ providedIn: "root" })
export class TwostepGuard {

  constructor(private router: Router, private twostepService: TwostepService) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let passCode = route?.queryParams["passCode"];

    if (passCode) {
      let data = await this.validateCode(passCode);
      if (!data.valid) {
        // not logged in so redirect to login page with the return url
        this.router.navigate(["/auth/login"], {
          queryParams: { passCode: null },
          queryParamsHandling: "merge",
        });
        return false;
      } else {
        return true;
      }
    }

    // not logged in so redirect to login page with the return url
    this.router.navigate(["/auth/login"], {
      queryParams: { passCode: null },
      queryParamsHandling: "merge",
    });
    return false;
  }

  async validateCode(passCode) {
    return await this.twostepService.validatetwoStepCode({
      passCode: passCode,
    });
  }
}
