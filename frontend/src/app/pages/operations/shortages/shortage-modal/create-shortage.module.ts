import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateShortageComponent } from './create-shortage.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';

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
