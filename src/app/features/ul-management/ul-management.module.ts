import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ULManagementRoutingModule } from './ul-management-routing.module';

// Services
import { ULLabelService } from './services/ul-label.service';

@NgModule({
  imports: [
    CommonModule,
    ULManagementRoutingModule
  ],
  providers: [
    ULLabelService
  ]
})
export class ULManagementModule { }
