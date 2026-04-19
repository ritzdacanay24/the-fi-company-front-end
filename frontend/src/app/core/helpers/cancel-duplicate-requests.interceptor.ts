import { Injectable } from "@angular/core";
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from "@angular/common/http";
import { Router, NavigationStart } from "@angular/router";
import { Observable, Subject } from "rxjs";
import { takeUntil, filter } from "rxjs/operators";

/**
 * Global race-condition fix:
 * 1. On route NavigationStart — cancels ALL in-flight GET requests from the
 *    previous page so stale responses never overwrite the new page's data.
 * 2. Also cancels duplicate calls to the same URL (e.g. rapid filter changes
 *    within the same list component).
 */
@Injectable()
export class CancelDuplicateRequestsInterceptor implements HttpInterceptor {
  /** One cancel subject per in-flight GET, keyed by urlWithParams. */
  private pendingRequests = new Map<string, Subject<void>>();

  /** Fires on every NavigationStart to cancel all pending GETs. */
  private navigationCancel$ = new Subject<void>();

  constructor(router: Router) {
    router.events
      .pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => {
        // Cancel every pending GET request when the user navigates away
        this.navigationCancel$.next();
        this.pendingRequests.clear();
      });
  }

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Only cancel GET requests (safe/idempotent — never cancel mutations)
    if (request.method !== "GET") {
      return next.handle(request);
    }

    const key = request.urlWithParams;

    // Cancel any previous in-flight call to the same URL (rapid filter changes)
    if (this.pendingRequests.has(key)) {
      this.pendingRequests.get(key)!.next();
      this.pendingRequests.get(key)!.complete();
    }

    const cancel$ = new Subject<void>();
    this.pendingRequests.set(key, cancel$);

    return next.handle(request).pipe(
      takeUntil(cancel$),
      takeUntil(this.navigationCancel$),
    );
  }
}
