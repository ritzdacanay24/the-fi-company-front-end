import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';
import { AuthenticationService } from '@app/core/services/auth.service';

let url = 'userPermissionsConfig';

@Injectable({
    providedIn: 'root'
})
export class UserPermissionsConfigService extends DataService<any> {

    constructor(http: HttpClient,
        private authenticationService: AuthenticationService) {
        super(url, http);
    }


}
