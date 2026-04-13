import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { IgtHelpComponent } from './igt-help.component';
import { IgtHelpModalComponent } from './igt-help-modal.component';
import { IgtHelpService } from './igt-help.service';

@NgModule({
  declarations: [
    IgtHelpComponent,
    IgtHelpModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgbModule
  ],
  providers: [
    IgtHelpService
  ],
  exports: [
    IgtHelpComponent,
    IgtHelpModalComponent
  ]
})
export class IgtHelpModule { }
