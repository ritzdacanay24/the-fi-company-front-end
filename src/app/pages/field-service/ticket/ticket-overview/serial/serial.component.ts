import { Component, Input, OnInit, SimpleChanges, TemplateRef } from '@angular/core';
import { SerialService } from '@app/core/api/field-service/serial.service';
import { SharedModule } from '@app/shared/shared.module';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { NgbDatepickerModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  standalone: true,
  imports: [SharedModule, NgbDatepickerModule],
  selector: 'app-serial',
  templateUrl: `./serial.component.html`,
})

export class SerialComponent implements OnInit {
  @Input() public workOrderId: string
  @Input() public disabled: boolean = true;
  closeResult = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['workOrderId']) {
      this.workOrderId = changes['workOrderId'].currentValue
      this.getData();
    }
  }

  constructor(
    private api: SerialService,
    private modalService: NgbModal,
  ) {
  }

  ngOnInit() {
  }

  data: any = [];

  loading = false
  async getData() {
    this.data = [];
    try {
      this.loading = true
      this.data = await this.api.getByWorkOrderId(this.workOrderId);
      this.loading = false;
    } catch (err) {
      this.loading = false;
    }
  }

  async create() {
    try {
      SweetAlert.loading()
      await this.api.create(this.editInfo);
      this.getData()
      SweetAlert.close(500)
    } catch (err) {
      SweetAlert.close(0)
    }

  }

  async onDelete() {
    const { value: accept } = await SweetAlert.confirm();
    if (!accept) return;

    try {
      SweetAlert.loading('Deleting..')
      await this.api.deleteById(this.editInfo.id);
      this.getData();
      SweetAlert.close(500)
    } catch (err) {
      SweetAlert.close(0)
    }

  }

  async update() {
    try {
      SweetAlert.loading()
      let id = this.editInfo.id;
      delete this.editInfo.id;
      await this.api.updateById(id, this.editInfo);
      this.getData()
      SweetAlert.close(500)
    } catch (err) {
      SweetAlert.close(0)
    }
  }

  editInfo
  open(content: TemplateRef<any>, row?: any) {
    this.editInfo = row ? { ...row } : { type: null, customerAsset: '', eyefiAsset: '' };

    this.modalService.open(content, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });
  }

  async onSubmit() {
    try {
      if (this.editInfo.id) {
        await this.api.updateById(this.editInfo.id, this.editInfo);
      } else {
        await this.api.create({
          ...this.editInfo,
          workOrderId: this.workOrderId
        });
      }
      await this.getData();
      // Modal will be closed by the button click handler
    } catch (error) {
      console.error('Error saving serial info:', error);
    }
  }
}
