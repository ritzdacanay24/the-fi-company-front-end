import { Injectable } from "@angular/core";
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from "@angular/common/http";
import { Observable } from "rxjs";

import { AuthenticationService } from "../services/auth.service";
import { THE_FI_COMPANY_TWOSTEP_TOKEN } from "../guards/admin.guard";

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private authenticationService: AuthenticationService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // add authorization header with jwt token if available
    let currentUser = this.authenticationService.currentUser();
    let twostep = localStorage.getItem(THE_FI_COMPANY_TWOSTEP_TOKEN);

    if (currentUser && currentUser.token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${currentUser.token}`,
          AuthorizationTwoStep: `Bearer ${twostep}`,
        },
      });
    }
    return next.handle(request);
  }
}
