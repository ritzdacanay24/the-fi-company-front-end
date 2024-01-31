
import { HttpParams } from '@angular/common/http';

export function createHttpParams(params) {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(function (key) {
        httpParams = httpParams.append(key, params[key]);
    });
    return httpParams;
}
