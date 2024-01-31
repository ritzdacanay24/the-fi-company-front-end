import { NgSelectModule } from '@ng-select/ng-select';
import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { QirService } from '@app/core/api/field-service/qir.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SharedModule } from '@app/shared/shared.module';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

let list: any = [
  {
    name: "Part shortages",
    desc: ""
  },
  {
    name: "Wrong part shipped",
    desc: ""
  },
  {
    name: "Defective part",
    desc: ""
  },
  {
    name: "Job post-poned",
    desc: ""
  },
  {
    name: "Equipment issues",
    desc: ""
  }
]

@Component({
  standalone: true,
  imports: [SharedModule, NgSelectModule],
  selector: 'app-qir',
  templateUrl: `./qir.component.html`,
})

export class QirComponent implements OnInit {
  @Input() public workOrderId: string
  @Input() public disabled: boolean = true;
  closeResult = '';

  editInfo: any = {
    id: "",
    name: null,
    description: '',
    work_order_id: null,
    created_by: null
  }

  search = (e) => {
    this.editInfo.name = e
  }

  list = list

  ngOnChanges(changes: SimpleChanges) {
    if (changes['workOrderId']) {
      this.workOrderId = changes['workOrderId'].currentValue
      this.getData();
    }
  }

  constructor(
    public offcanvasService: NgbOffcanvas,
    public api: QirService,
    public authenticationService: AuthenticationService
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

  async create(value?) {
    try {
      SweetAlert.loading()
      await this.api.create(this.editInfo);
      if (!value) {
        this.offcanvasService.dismiss('Save click');
      } else {
        this.clear()
      }

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

  async update(value?) {
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

  onSubmit(value = false) {
    if (this.editInfo.id) {
      this.update(value)
    } else {
      this.create(value)
    }
  }

  clear() {
    this.editInfo = {
      id: "",
      name: null,
      work_order_id: this.workOrderId,
      description: "",
      created_by: this.authenticationService.currentUserValue.id
    }
  }

  open(content, row?) {
    this.editInfo = { ...row, work_order_id: this.workOrderId, created_by: this.authenticationService.currentUserValue.id };

    this.offcanvasService.open(content, { ariaLabelledBy: 'offcanvas-basic-title', position: 'end', panelClass: 'crash-canvas-height', backdropClass: 'backdrop-crashserial-canvas-height-canvas' }).result.then(
      (result) => {
        this.closeResult = `Closed with: ${result}`;
        this.clear();
      },
      (reason) => {
        this.clear();
      },
    );
  }
}
