import { Inject, Injectable, Injector } from "@angular/core";
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { AuthenticationService } from "../services/auth.service";
import { ToastrService } from "ngx-toastr";
import { THE_FI_COMPANY_TWOSTEP_TOKEN } from "../guards/admin.guard";
import { Router } from "@angular/router";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private authenticationService: AuthenticationService,
    @Inject(Injector) private readonly injector: Injector,
    private router: Router
  ) {}

  private get toastService() {
    return this.injector.get(ToastrService);
  }

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error) => {
        if (error.status === 401 || error.status === 900) {
          // auto logout if 401 response returned from api

          // if (error?.error?.code == "TWOSTEP") {
          //   localStorage.removeItem(THE_FI_COMPANY_TWOSTEP_TOKEN);
          // }
          // Don't logout for Mindee API errors - they have their own authentication
          if (error.url?.includes("api.mindee.net")) {
            // Mindee API error - don't trigger app logout
            console.warn('Mindee API authentication error:', error.error);
          } else {
            // Internal API error - trigger logout
            localStorage.removeItem(THE_FI_COMPANY_TWOSTEP_TOKEN);

            this.authenticationService.logout();

            this.router.navigateByUrl("/auth/login");
          }

          //location.reload();
        }

        let errorMessage =
          typeof error?.error === "object" && error?.error !== null
            ? error?.error?.message
            : error?.statusText;

        // Check for suppress flags from our serial number component
        const suppressGlobalError = error?._suppressGlobalError || error?._handledLocally;

        // Only show toast if backend did not set showPopup === false AND we haven't suppressed it
        if (
          !suppressGlobalError &&
          (typeof error?.error !== "object" ||
          error?.error?.showPopup !== false)
        ) {
          this.toastService.error(errorMessage, error?.statusText, {
            timeOut: 100000000,
            newestOnTop: true,
          });
        }
        return throwError(error);
      })
    );
  }
}
