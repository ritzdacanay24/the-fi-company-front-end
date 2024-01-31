import { NgModule } from '@angular/core';
import { FieldServiceComponent } from './field-service.component';
import { FieldServiceRoutingModule } from './field-service-routing.module';
import { RecaptchaProviders } from 'src/app/shared/providers/recaptcha';

@NgModule({
  declarations: [
    FieldServiceComponent
  ],
  imports: [
    FieldServiceRoutingModule
  ],
  providers: [RecaptchaProviders]
})
export class FieldServiceModule { }
