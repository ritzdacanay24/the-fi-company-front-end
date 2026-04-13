import { NgModule } from "@angular/core";
import { importProvidersFrom } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { BomRoutingModule } from "./bom-routing.module";

@NgModule({
  providers: [
    importProvidersFrom(
      CommonModule,
      ReactiveFormsModule,
      BomRoutingModule
    ),
  ],
})
export class BomModule {}
