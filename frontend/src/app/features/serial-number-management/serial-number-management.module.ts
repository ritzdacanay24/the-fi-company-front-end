import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SerialNumberManagementRoutingModule } from './serial-number-management-routing.module';

// Services
import { SerialNumberService } from './services/serial-number.service';

@NgModule({
  imports: [
    CommonModule,
    SerialNumberManagementRoutingModule
  ],
  providers: [
    SerialNumberService
  ]
})
export class SerialNumberManagementModule { }