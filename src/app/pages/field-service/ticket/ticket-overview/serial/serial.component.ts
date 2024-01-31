import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { SerialService } from '@app/core/api/field-service/serial.service';
import { SharedModule } from '@app/shared/shared.module';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { NgbDatepickerModule, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';

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
    public offcanvasService: NgbOffcanvas,
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
      this.offcanvasService.dismiss('Save click');
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
      this.offcanvasService.dismiss('Save click');
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
      this.offcanvasService.dismiss('Save click');
      this.getData()
      SweetAlert.close(500)
    } catch (err) {
      SweetAlert.close(0)
    }
  }

  onSubmit() {
    if (this.editInfo.id) {
      this.update()
    } else {
      this.create()
    }
  }

  editInfo
  open(content, row?) {
    this.editInfo = { ...row, workOrderId: this.workOrderId };
    this.offcanvasService.open(content, { ariaLabelledBy: 'offcanvas-basic-title', position: 'end' }).result.then(
      (result) => {
        this.closeResult = `Closed with: ${result}`;
        this.editInfo = "";
      },
      (reason) => {
        this.editInfo = ""
      },
    );
  }
}
