import { Injectable } from "@angular/core";
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from "@angular/common/http";
import { Observable } from "rxjs";

/**
 * Cancellation was causing empty-completion streams which break firstValueFrom
 * with EmptyError ("no elements in sequence").
 *
 * Keep this interceptor as a pass-through until request cancellation is
 * reintroduced in a way that does not complete observables unexpectedly.
 */
@Injectable()
export class CancelDuplicateRequestsInterceptor implements HttpInterceptor {
  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request);
  }
}
