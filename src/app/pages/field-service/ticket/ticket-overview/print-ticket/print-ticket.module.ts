import { NgModule } from '@angular/core';
import { PrintTicketComponent } from './print-ticket.component';
import { SharedModule } from '@app/shared/shared.module';

@NgModule({
  declarations: [PrintTicketComponent],
  imports: [
    SharedModule
  ]
})
export class PrintTicketModule { }
