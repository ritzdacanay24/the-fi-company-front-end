import { NgModule } from "@angular/core";

import {
  RECAPTCHA_SETTINGS,
  RecaptchaModule,
  RecaptchaSettings,
} from "ng-recaptcha";
const globalSettings: RecaptchaSettings = {
  siteKey: "",
};

@NgModule({
  imports: [RecaptchaModule],
  exports: [RecaptchaModule],
})
export class MyRecaptchaModule {}

export const RecaptchaProviders = [
  {
    provide: RECAPTCHA_SETTINGS,
    useValue: globalSettings,
  },
];
