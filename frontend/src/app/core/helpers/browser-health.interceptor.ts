import { Injectable } from "@angular/core";
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from "@angular/common/http";
import { Observable, throwError, timer } from "rxjs";
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

      // Retry network errors (status 0) up to 2 times with exponential backoff
      retry({
        count: 2,
        delay: (error, retryCount) => {
          if (error instanceof HttpErrorResponse && error.status === 0) {
            const delayMs = Math.min(1000 * Math.pow(2, retryCount), 5000);
            return timer(delayMs);
          }
          throw error;
        },
      }),

      catchError((error: HttpErrorResponse) => {
        this.browserHealthService.reportFailure();
        return throwError(() => error);
      })
    );
  }
}
