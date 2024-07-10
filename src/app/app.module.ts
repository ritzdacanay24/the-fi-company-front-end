import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
// routing
import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';

import { LayoutsModule } from "./layouts/layouts.module";

// Auth
import { HttpClient, HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from '../environments/environment';
import { ErrorInterceptor } from './core/helpers/error.interceptor';
import { JwtInterceptor } from './core/helpers/jwt.interceptor';

// Language
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';

// Store
import { rootReducer } from './store';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { EffectsModule } from '@ngrx/effects';

import { AuthenticationEffects } from './store/Authentication/authentication.effects';
import { ApiPrefixInterceptor } from './core/helpers/api-prefix-interceptor';

import { provideEnvironmentNgxMask } from 'ngx-mask';
import { ToastrModule } from 'ngx-toastr';

import { ColorPickerModule } from 'ngx-color-picker';

import { ServiceWorkerModule } from '@angular/service-worker';
import { LightboxModule } from 'ngx-lightbox';
import { FlatpickrModule } from 'angularx-flatpickr';
import { CanDeactivateGuard } from './core/guards/CanDeactivateGuard';

import { DragulaModule } from 'ng2-dragula';

export function createTranslateLoader(http: HttpClient): any {
    return new TranslateHttpLoader(http, 'assets/i18n/', '.json');
}

@NgModule({
    declarations: [
        AppComponent
    ],
    bootstrap: [AppComponent],
    imports: [
        DragulaModule.forRoot(),
        FormsModule,
        TranslateModule.forRoot({
            defaultLanguage: 'en',
            loader: {
                provide: TranslateLoader,
                useFactory: (createTranslateLoader),
                deps: [HttpClient]
            }
        }),
        BrowserAnimationsModule,
        BrowserModule,
        AppRoutingModule,
        LayoutsModule,
        StoreModule.forRoot(rootReducer),
        StoreDevtoolsModule.instrument({
            maxAge: 25, // Retains last 25 states
            logOnly: environment.production, // Restrict extension to log-only mode
        }),
        EffectsModule.forRoot([
            AuthenticationEffects,
        ]),
        ToastrModule.forRoot({ preventDuplicates: true }),
        ColorPickerModule,
        ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: environment.production
        }),
        LightboxModule,
        FlatpickrModule.forRoot()

    ],
    providers: [
        { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ApiPrefixInterceptor, multi: true },
        CanDeactivateGuard,
        provideEnvironmentNgxMask(),
        provideHttpClient(withInterceptorsFromDi())
    ]
})
export class AppModule { }
