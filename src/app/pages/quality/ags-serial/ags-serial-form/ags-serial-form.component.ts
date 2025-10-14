import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { QadCustomerPartSearchComponent } from "@app/shared/components/qad-customer-part-search/qad-customer-part-search.component";
import { QadWoSearchComponent } from "@app/shared/components/qad-wo-search/qad-wo-search.component";
import { SerialNumberModalComponent } from "@app/shared/components/serial-number-modal/serial-number-modal.component";
import { EyefiSerialSearchNgSelectComponent } from "@app/shared/eyefi-serial-search/eyefi-serial-search-ng-select.component";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    QadWoSearchComponent,
    QadCustomerPartSearchComponent,
    EyefiSerialSearchNgSelectComponent,
  ],
  selector: "app-ags-serial-form",
  templateUrl: "./ags-serial-form.component.html",
  styleUrls: ["./ags-serial-form.component.scss"],
})
export class AgsSerialFormComponent {
  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  get isFormDisabled() {
    return this.form.disabled;
  }

  form = this.fb.group({
    timeStamp: [""],
    poNumber: [null],
    property_site: [""],
    sgPartNumber: [null],
    inspectorName: [""],
    generated_SG_asset: [""],
    serialNumber: [""],
    lastUpdate: [""],
    active: [1],
    manualUpdate: [""],
    created_by: "",
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  getWorkOrderNumber($event) {
    this.form.patchValue({ poNumber: $event.wo_nbr });
  }

  getCustomerPartNumber($event) {
    this.form.patchValue({ sgPartNumber: $event.cp_cust_part });
  }

  openSerialNumberGenerator(fieldName: string = 'generated_SG_asset') {
    const modalRef = this.modalService.open(SerialNumberModalComponent, { 
      size: 'lg',
      backdrop: 'static'
    });

    // Configure the modal based on the field being generated for
    if (fieldName === 'generated_SG_asset') {
      modalRef.componentInstance.title = 'Generate AGS Serial Number';
      modalRef.componentInstance.config = {
        prefix: 'AGS',
        includeDate: true,
        includeTime: false,
        dateFormat: 'YYYYMMDD',
        includeRandomNumbers: true,
        randomNumberLength: 4,
        separator: '-'
      };
    } else if (fieldName === 'serialNumber') {
      modalRef.componentInstance.title = 'Generate Serial Number';
      modalRef.componentInstance.config = {
        prefix: 'SN',
        includeDate: true,
        includeTime: false,
        dateFormat: 'YYYYMMDD',
        includeRandomNumbers: true,
        randomNumberLength: 6,
        separator: '-'
      };
    }

    modalRef.result.then((result) => {
      if (result) {
        this.form.patchValue({ [fieldName]: result });
      }
    }).catch(() => {
      // Modal dismissed
    });
  }

  onEyeFiSerialSelected(serialData: any): void {
    if (serialData) {
      const serialNumber = serialData.serial_number || serialData;
      
      this.form.patchValue({
        serialNumber: serialNumber
      });

      // Log for debugging
      if (serialData.product_model && serialData.status) {
        console.log('✅ EyeFi Serial Selected for AGS:', serialData);
        console.log('Device Model:', serialData.product_model);
        console.log('Status:', serialData.status);
      } else {
        console.log('📝 Manual Serial Entered for AGS:', serialNumber);
        console.log('Note: Not a validated EyeFi device - manual entry accepted');
      }
    }
  }
}
