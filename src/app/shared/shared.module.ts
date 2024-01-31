import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbNavModule, NgbAccordionModule, NgbDropdownModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';

// Swiper Slider
import { SlickCarouselModule } from 'ngx-slick-carousel';

// Counter
import { CountUpModule } from 'ngx-countup';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { SimplebarAngularModule } from 'simplebar-angular';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { LoadingComponent } from './loading/loading.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    NgbNavModule,
    NgbAccordionModule,
    NgbDropdownModule,
    SlickCarouselModule,
    CountUpModule,
    NgbModule,
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    SimplebarAngularModule,
    NgxMaskDirective,
    LoadingComponent
  ],
  exports: [
    NgbModule,
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    SimplebarAngularModule,
    NgxMaskDirective,
    LoadingComponent
  ],
  providers: [
    provideNgxMask(),
  ],
})
export class SharedModule { }
