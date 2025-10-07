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
    // Skip JWT authentication for Mindee API calls
    if (request.url.includes('api-v2.mindee.net')) {
      return next.handle(request);
    }

    // add authorization header with jwt token if available
    let currentUser = this.authenticationService.currentUser();
    let twostep = localStorage.getItem(THE_FI_COMPANY_TWOSTEP_TOKEN);

    if (currentUser && currentUser.token) {
      if (currentUser?.enableTwostep == 1) {
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${currentUser.token}`,
            AuthorizationTwoStep: `Bearer ${twostep}`,
          },
        });
      } else {
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        });
      }
    }
    return next.handle(request);
  }
}
