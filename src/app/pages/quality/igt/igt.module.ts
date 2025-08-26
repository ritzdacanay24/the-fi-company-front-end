import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "../../../shared/shared.module";

import { IgtRoutingModule } from "./igt-routing.module";
import { IgtSerialUsageReportComponent } from "./igt-serial-usage-report/igt-serial-usage-report.component";

// Help Module
import { IgtHelpModule } from "../../../shared/components/igt-help/igt-help.module";

@NgModule({
  declarations: [
    IgtSerialUsageReportComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    SharedModule,
    IgtHelpModule,
    IgtRoutingModule
  ]
})
export class IgtModule {}
