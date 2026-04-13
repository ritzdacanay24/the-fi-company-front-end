import { NgModule } from '@angular/core';

import {
  RECAPTCHA_SETTINGS,
  RecaptchaModule,
  RecaptchaSettings,
} from 'ng-recaptcha';
//secret key = 6LcG83IoAAAAAL7nXpKxN1GY-MYTT5lEL-s_mA18
//site key = 6LcG83IoAAAAAK-LaF5fD70wPQ54pgFMVPbdgwix
const globalSettings: RecaptchaSettings = { siteKey: '6LcXE3MoAAAAAM4JAK3FMIYMWB8FCy-kmkWauiZT' };

@NgModule({
  imports: [RecaptchaModule],
  exports: [RecaptchaModule],
})
export class MyRecaptchaModule { }

export const RecaptchaProviders = [
  {
    provide: RECAPTCHA_SETTINGS,
    useValue: globalSettings,
  }
];
