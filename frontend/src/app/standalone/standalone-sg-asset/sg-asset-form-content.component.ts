import { Component, Input, Output, EventEmitter } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { SgAssetFormComponent } from "@app/pages/quality/sg-asset/sg-asset-form/sg-asset-form.component";

@Component({
  standalone: true,
  imports: [CommonModule, SgAssetFormComponent],
  selector: "app-sg-asset-form-content",
  template: `
    <!-- Pure Form Component - No Styling/Cards/Alerts -->
    <app-sg-asset-form 
      (setFormEmitter)="onFormEmit($event)" 
      [submitted]="submitted">
    </app-sg-asset-form>
  `
})
export class SgAssetFormContentComponent {
  @Input() submitted = false;
  
  @Output() formEmitter = new EventEmitter<FormGroup>();

  onFormEmit(form: FormGroup): void {
    this.formEmitter.emit(form);
  }
}
