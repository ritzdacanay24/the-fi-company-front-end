import { Injectable } from "@angular/core";
import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot, MaybeAsync, GuardResult } from "@angular/router";

@Injectable()
export class Deactivate  {
  constructor(
    private permissions: Permissions
  ) {}

  canDeactivate(
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState: RouterStateSnapshot
  ): MaybeAsync<GuardResult> {
    return true
  }
}
