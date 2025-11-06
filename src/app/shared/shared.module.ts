import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  NgbNavModule,
  NgbAccordionModule,
  NgbDropdownModule,
  NgbModule,
} from "@ng-bootstrap/ng-bootstrap";

// Counter
import { CountUpModule } from "ngx-countup";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";
import { RouterModule } from "@angular/router";
import { SimplebarAngularModule } from "simplebar-angular";
import { NgxMaskDirective, provideNgxMask } from "ngx-mask";
import { LoadingComponent } from "./loading/loading.component";
import { IgtHelpModule } from "./components/igt-help/igt-help.module";

// AG Grid
import { AgGridModule } from "ag-grid-angular";

@NgModule({
  declarations: [],
  exports: [
    NgbModule,
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    // HttpClientModule,
    RouterModule,
    SimplebarAngularModule,
    NgxMaskDirective,
    LoadingComponent,
    IgtHelpModule,
    AgGridModule,
  ],
  imports: [
    CommonModule,
    NgbNavModule,
    NgbAccordionModule,
    NgbDropdownModule,
    CountUpModule,
    NgbModule,
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    SimplebarAngularModule,
    NgxMaskDirective,
    LoadingComponent,
    IgtHelpModule,
    AgGridModule,
  ],
  providers: [provideNgxMask(), provideHttpClient(withInterceptorsFromDi())],
})
export class SharedModule {}
