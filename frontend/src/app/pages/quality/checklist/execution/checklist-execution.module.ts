import { ChecklistExecutionComponent } from './checklist-execution.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhotosModule } from './photos/photos.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    SharedModule,
    PhotosModule,
    FormsModule,
    ReactiveFormsModule,
  ],
})
export class ChecklistExecutionModule { }
