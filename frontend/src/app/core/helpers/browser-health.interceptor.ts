import { Injectable } from "@angular/core";
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError, retry, tap } from "rxjs/operators";
import { BrowserHealthService } from "../services/browser-health.service";

@Injectable()
export class BrowserHealthInterceptor implements HttpInterceptor {
  constructor(private browserHealthService: BrowserHealthService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      // Report success for browser health monitoring
      tap(() => this.browserHealthService.reportSuccess()),

      // Retries disabled: fail fast on first error.
      retry({
        count: 0,
      }),

      catchError((error: HttpErrorResponse) => {
        this.browserHealthService.reportFailure();
        return throwError(() => error);
      })
    );
  }
}
