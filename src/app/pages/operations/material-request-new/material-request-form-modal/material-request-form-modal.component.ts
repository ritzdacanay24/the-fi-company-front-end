import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { MaterialRequestFormComponent } from '../material-request-form/material-request-form.component';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-material-request-form-modal',
  standalone: true,
  imports: [CommonModule, MaterialRequestFormComponent],
  templateUrl: './material-request-form-modal.component.html',
  styleUrls: ['./material-request-form-modal.component.scss']
})
export class MaterialRequestFormModalComponent implements OnInit {
  @Input() id?: number;
  @Input() enableEdit: boolean = true;
  @Input() title: string = 'Material Request Form';

  submitted = false;
  modalForm: any;
  isLoading = false;

  constructor(
    public activeModal: NgbActiveModal,
    private materialRequestService: MaterialRequestService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {}

  onFormSet(form: any): void {
    this.modalForm = form;
  }

  async onSave(): Promise<void> {
    if (!this.modalForm || !this.modalForm.valid) {
      this.toastr.error('Please fill in all required fields correctly.');
      return;
    }

    if (!this.modalForm.controls['details']['controls'].length) {
      this.toastr.error('No items found in this request.');
      return;
    }

    try {
      this.submitted = true;
      this.isLoading = true;

      if (this.id) {
        // Update existing material request
        const result = await this.materialRequestService.update(this.id, this.modalForm.value);
        this.toastr.success('Material request updated successfully');
        this.activeModal.close({ action: 'updated', data: result, id: this.id });
      } else {
        // Create new material request (same as create component)
        const { insertId } = await this.materialRequestService.create(this.modalForm.value);
        this.toastr.success('Material request created successfully');
        this.activeModal.close({ action: 'created', data: { insertId }, id: insertId });
      }
    } catch (error) {
      console.error('Error saving material request:', error);
      this.toastr.error(`Failed to ${this.id ? 'update' : 'create'} material request. Please try again.`);
      this.submitted = false;
    } finally {
      this.isLoading = false;
    }
  }

  onCancel(): void {
    this.activeModal.dismiss('cancelled');
  }

  onDeleteItem = (index: number) => {
    // Handle item deletion if needed
  }
}
