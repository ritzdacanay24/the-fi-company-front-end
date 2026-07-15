import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable()
export class ApiPrefixInterceptor implements HttpInterceptor {

  /**
   * On iOS/iPadOS, File objects inside FormData may not be fully loaded into memory
   * when the HTTP request is fired. This causes the multipart body to be truncated,
   * producing "Multipart: Unexpected end of form" on the server (Multer/Busboy).
   *
   * Fix: For any FormData body, read every File entry into an ArrayBuffer first,
   * then rebuild FormData with fully-materialised Blobs before sending.
   * This runs for ALL upload endpoints across the entire app.
   */
  private async preloadFormDataFiles(formData: FormData): Promise<FormData> {
    const rebuilt = new FormData();
    const entries = Array.from((formData as any).entries()) as [string, any][];

    for (const [key, value] of entries) {
      if (value instanceof File) {
        try {
          const buffer = await value.arrayBuffer();
          const blob = new Blob([buffer], { type: value.type || 'application/octet-stream' });
          rebuilt.append(key, blob, value.name);
        } catch {
          // If arrayBuffer() fails fall back to original File
          rebuilt.append(key, value, value.name);
        }
      } else {
        rebuilt.append(key, value);
      }
    }

    return rebuilt;
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Pre-load all File entries for FormData bodies so iOS fully materialises
    // the file bytes before the multipart request stream is constructed.
    if (request.body instanceof FormData) {
      return from(this.preloadFormDataFiles(request.body)).pipe(
        switchMap(rebuiltFormData => {
          const patched = request.clone({ body: rebuiltFormData });
          return this.handleUrl(patched, next);
        })
      );
    }

    return this.handleUrl(request, next);
  }

  private handleUrl(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
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