import { NgSelectComponent, NgSelectModule } from "@ng-select/ng-select";
import { Component, Input, OnInit, SimpleChanges } from "@angular/core";
import { CrashKitService } from "@app/core/api/field-service/crash-kit.service";
import { NgbDatepickerModule, NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import moment from "moment";
import { AttachmentService } from "@app/core/api/field-service/attachment.service";
import { BillingModalService } from "./billing.modal.component";

@Component({
  standalone: true,
  imports: [SharedModule, NgbDatepickerModule, NgSelectModule],
  selector: "app-billing",
  templateUrl: `./billing.component.html`,
})
export class BillingComponent implements OnInit {
  @Input() public workOrderId: string;
  @Input() public disabled: boolean = true;
  @Input() public fsId: number | string;

  closeResult = "";
  partSearch: any;

  editInfo: any = {
    id: "",
    part_number: null,
    qty: 1,
    work_order_id: null,
    price: null,
    description: "",
  };

  closeSelect(select: NgSelectComponent) {
    select.close();
  }

  search = (e) => {
    this.editInfo.part_number = e;
    this.searchPart();
  };

  detectChang = (e) => {
    this.editInfo.part_number = e.pt_part;
    this.searchPart();
  };

  ngOnChanges(changes: SimpleChanges) {
    if (changes["workOrderId"]) {
      this.workOrderId = changes["workOrderId"].currentValue;
      this.getData();
    }
  }

  constructor(
    public offcanvasService: NgbOffcanvas,
    public api: CrashKitService,
    public attachmentService: AttachmentService,
    public authenticationService: AuthenticationService,
    private billingModalService: BillingModalService
  ) {}

  ngOnInit() {}

  data: any = [];

  searchPart = async () => {
    try {
      SweetAlert.loading("Please wait while we validate this part number...");
      this.partSearch = await this.api.getByPartNumber(
        this.editInfo.part_number
      );
      if (!this.partSearch) {
        alert(
          "This part number does not exist in QAD. Please enter valid part number"
        );
        this.partSearch = "";
        SweetAlert.close(0);
      } else {
        this.editInfo.price = this.partSearch.PT_PRICE;
        this.editInfo.description = this.partSearch.FULLDESC;
        SweetAlert.close(500);
      }
    } catch (err) {
      SweetAlert.close(0);
    }
  };

  loading = false;
  async getData() {
    this.data = [];
    try {
      this.loading = true;
      this.data = await this.attachmentService.find({
        uniqueId: this.fsId,
      });
      this.loading = false;
    } catch (err) {
      this.loading = false;
    }
  }

  async create(value?) {
    if (!this.partSearch) return;
    try {
      SweetAlert.loading();
      await this.api.create(this.editInfo);
      if (!value) {
        this.offcanvasService.dismiss("Save click");
      } else {
        this.clear();
      }

      this.getData();

      SweetAlert.close(500);
    } catch (err) {
      SweetAlert.close(0);
    }
  }

  async onDelete() {
    const { value: accept } = await SweetAlert.confirm();
    if (!accept) return;

    try {
      SweetAlert.loading("Deleting..");
      await this.api.deleteById(this.editInfo.id);
      this.offcanvasService.dismiss("Save click");
      this.getData();
      SweetAlert.close(500);
    } catch (err) {
      SweetAlert.close(0);
    }
  }

  async update(value?) {
    try {
      SweetAlert.loading();
      let id = this.editInfo.id;
      delete this.editInfo.id;
      await this.api.updateById(id, this.editInfo);
      this.offcanvasService.dismiss("Save click");
      this.getData();
      SweetAlert.close(500);
    } catch (err) {
      SweetAlert.close(0);
    }
  }

  onSubmit(value = false) {
    if (this.editInfo.id) {
      this.update(value);
    } else {
      this.create(value);
    }
  }

  clear() {
    this.editInfo = {
      id: "",
      part_number: null,
      qty: null,
      work_order_id: this.workOrderId,
      price: null,
      description: "",
    };
    this.partSearch = "";
  }

  open(content, row?) {
    this.editInfo = { ...row, work_order_id: this.workOrderId };

    this.offcanvasService
      .open(content, {
        ariaLabelledBy: "offcanvas-basic-title",
        position: "end",
        panelClass: "crash-canvas-height",
        backdropClass: "backdrop-crashserial-canvas-height-canvas",
      })
      .result.then(
        (result) => {
          this.closeResult = `Closed with: ${result}`;
          this.clear();
        },
        (reason) => {
          this.clear();
        }
      );
  }

  async onChange(event) {
    let compressedFile = event.target.files[0];

    let formData = new FormData();

    formData.append("file", compressedFile, compressedFile.name);
    formData.append("fileName", compressedFile.name);

    let params = {
      field: "Field Service Billing",
      uniqueId: this.fsId,
      mainId: this.workOrderId,
      createdBy: this.authenticationService.currentUserValue.id,
      createdDate: moment().format("YYYY-MM-DD HH:mm:ss"),
    };

    Object.keys(params).map((key) => {
      formData.append(key, params[key]);
    });

    try {
      SweetAlert.loading();
      await this.attachmentService.create(formData);
      await this.getData();
      SweetAlert.close();
    } catch (err) {
      SweetAlert.close(0);
    }
  }

  view(id) {
    this.billingModalService.open(id);
  }
}
