import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@app/shared/modules';
import { CreateShortageComponent } from './create-shortage.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [CreateShortageComponent],
  imports: [
    CommonModule,
    SharedModule,
    NgbModule,
  ],
  exports: [CreateShortageComponent]
})
export class CreateShortageModule { }
