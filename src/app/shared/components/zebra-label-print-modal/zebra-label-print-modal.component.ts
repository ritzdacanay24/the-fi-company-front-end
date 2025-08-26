import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { NgxBarcode6Module } from 'ngx-barcode6';
import { ZebraLabelService, ZebraLabelTemplate } from '@app/shared/services/zebra-label.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  standalone: true,
  imports: [SharedModule, NgxBarcode6Module],
  selector: 'app-zebra-label-print-modal',
  templateUrl: './zebra-label-print-modal.component.html',
  styleUrls: []
})
export class ZebraLabelPrintModalComponent {
  @Input() serialNumber: string = '';
  @Input() title: string = 'Print Zebra Label';
  @Input() partNumber: string = '';

  form: FormGroup;
  zebraTemplates: ZebraLabelTemplate[] = [];
  showBarcode: boolean = false;
  showZplPreview: boolean = false;

  constructor(
    private fb: FormBuilder,
    private ngbActiveModal: NgbActiveModal,
    private zebraLabelService: ZebraLabelService,
    private toastrService: ToastrService
  ) {
    this.zebraTemplates = this.zebraLabelService.getTemplates();
    this.initializeForm();
  }

  ngOnInit() {
    if (this.partNumber) {
      this.form.patchValue({ partNumber: this.partNumber });
    }
  }

  private initializeForm() {
    this.form = this.fb.group({
      templateId: ['serial-number-standard', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      partNumber: ['']
    });
  }

  getSelectedTemplate(): ZebraLabelTemplate | undefined {
    const templateId = this.form.get('templateId')?.value;
    return this.zebraTemplates.find(template => template.id === templateId);
  }

  getZplPreview(): string {
    const formValue = this.form.value;
    return this.zebraLabelService.previewLabel(
      formValue.templateId,
      this.serialNumber,
      {
        quantity: formValue.quantity,
        partNumber: formValue.partNumber
      }
    );
  }

  toggleBarcode() {
    this.showBarcode = !this.showBarcode;
  }

  toggleZplPreview() {
    this.showZplPreview = !this.showZplPreview;
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.toastrService.success('Copied to clipboard');
    });
  }

  downloadZpl() {
    const formValue = this.form.value;
    this.zebraLabelService.downloadZplFile(
      formValue.templateId,
      this.serialNumber,
      {
        quantity: formValue.quantity,
        partNumber: formValue.partNumber
      }
    );
  }

  printLabel() {
    if (this.form.invalid) {
      this.toastrService.warning('Please check all required fields');
      return;
    }

    const formValue = this.form.value;
    this.zebraLabelService.printLabel(
      formValue.templateId,
      this.serialNumber,
      {
        quantity: formValue.quantity,
        partNumber: formValue.partNumber
      }
    );

    // Close modal after successful print
    this.close();
  }

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }
}
