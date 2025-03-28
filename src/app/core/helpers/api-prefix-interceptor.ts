import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ApiPrefixInterceptor implements HttpInterceptor {

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    if (request.url.indexOf("https://api.mindee.net/v1/products/mindee/expense_receipts/v3/predict") == 0) {
      request = request.clone({
        url: request.url
        , setHeaders: {
          Authorization: `Token ${request.body.apikey}`
        }
      });

    } else if (request.url.indexOf("assets/i18n/") == 0) {
    } else if (request.url.indexOf("https://") == 0) {
      request = request.clone({ url: request.url });

    } else if (request.url.indexOf("api/") == 0) {
      request = request.clone({ url: 'https://dashboard.eye-fi.com/' + request.url });

    } else {
      request = request.clone({ url: 'https://dashboard.eye-fi.com/server/Api/' + request.url });

    }

    return next.handle(request);
  }

}