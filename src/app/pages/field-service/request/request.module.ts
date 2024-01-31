import { NgModule } from '@angular/core';
import { RequestComponent } from './request.component';
import { NgxMaskModule } from 'ngx-mask';
import { RecaptchaProviders } from './providers/recaptcha';
import { RequestRoutingModule } from './request-routing.module';

@NgModule({
  declarations: [],
  imports: [
    RequestRoutingModule,
    RequestComponent,
    NgxMaskModule.forRoot({ validation: true }),
  ],
  providers: [RecaptchaProviders]
})
export class RequestModule { }
