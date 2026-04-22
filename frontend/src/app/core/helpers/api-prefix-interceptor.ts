import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable()
export class ApiPrefixInterceptor implements HttpInterceptor {

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const url = request.url;
    const apiV2PrefixRegex = /^\/?apiv2\//i;
    const apiV2BaseUrl = (environment.apiV2BaseUrl || '').replace(/\/+$/, '');
    // Prevent duplicate /apiV2 when base already includes that segment in production.
    const apiV2BaseHasPrefix = /\/apiv2$/i.test(apiV2BaseUrl);
    const apiV2Root = apiV2BaseUrl
      ? (apiV2BaseHasPrefix ? apiV2BaseUrl : `${apiV2BaseUrl}/apiV2`)
      : '/apiV2';

    if (url.indexOf("https://api.mindee.net/v1/products/mindee/expense_receipts/v3/predict") == 0) {
      request = request.clone({
        url
        , setHeaders: {
          Authorization: `Token ${request.body.apikey}`
        }
      });

    } else if (url.indexOf("assets/i18n/") == 0) {
    } else if (url.indexOf("https://") == 0 || url.indexOf("http://") == 0) {
      request = request.clone({ url });

    } else if (apiV2PrefixRegex.test(url)) {
      const pathWithoutPrefix = url.replace(apiV2PrefixRegex, '');
      request = request.clone({ url: `${apiV2Root}/${pathWithoutPrefix}` });

    } else if (url.indexOf("/ApiV2") == 0) {
      request = request.clone({ url: 'https://dashboard.eye-fi.com' + url });

    } else if (url.indexOf("/api/") == 0) {
      request = request.clone({ url: 'https://dashboard.eye-fi.com' + url });

    } else if (url.indexOf("api/") == 0) {
      request = request.clone({ url: 'https://dashboard.eye-fi.com/' + url });

    } else if (/^\/?server\//i.test(url)) {
      const normalizedServerPath = url.indexOf('/') === 0 ? url : `/${url}`;
      request = request.clone({ url: `https://dashboard.eye-fi.com${normalizedServerPath}` });

    } else {
      const normalizedUrl = url.indexOf('/') === 0 ? url.substring(1) : url;
      request = request.clone({ url: 'https://dashboard.eye-fi.com/server/Api/' + normalizedUrl });

    }

    return next.handle(request);
  }

}