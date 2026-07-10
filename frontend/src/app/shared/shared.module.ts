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
import { BreadcrumbComponent } from "./components/breadcrumb/breadcrumb.component";
import { InlineAttachmentDropzoneComponent } from "./components/inline-attachment-dropzone/inline-attachment-dropzone.component";
import { UploadedAttachmentsListComponent } from "./components/attachments/uploaded-attachments-list/uploaded-attachments-list.component";
import { FeatureAttachmentsPanelComponent } from "./components/attachments/feature-attachments-panel/feature-attachments-panel.component";
import { PendingAttachmentsListComponent } from "./components/attachments/pending-attachments-list/pending-attachments-list.component";
import { PublicRequestAttachmentsPanelComponent } from "./components/attachments/public-request-attachments-panel/public-request-attachments-panel.component";

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
    BreadcrumbComponent,
    InlineAttachmentDropzoneComponent,
    UploadedAttachmentsListComponent,
    FeatureAttachmentsPanelComponent,
    PendingAttachmentsListComponent,
    PublicRequestAttachmentsPanelComponent,
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
    BreadcrumbComponent,
    InlineAttachmentDropzoneComponent,
    UploadedAttachmentsListComponent,
    FeatureAttachmentsPanelComponent,
    PendingAttachmentsListComponent,
    PublicRequestAttachmentsPanelComponent,
  ],
  providers: [provideNgxMask(), provideHttpClient(withInterceptorsFromDi())],
})
export class SharedModule {}
