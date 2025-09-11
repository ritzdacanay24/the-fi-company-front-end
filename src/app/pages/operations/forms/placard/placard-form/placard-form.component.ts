import { Component, EventEmitter, Input, Output, AfterViewInit, OnDestroy } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from "@angular/forms";
import { states } from "@app/core/data/states";
import { SharedModule } from "@app/shared/shared.module";
import { AddTagFn } from "@ng-select/ng-select/lib/ng-select.component";
import { validateEmail } from "src/assets/js/util/validateEmail";
import { NgSelectModule } from "@ng-select/ng-select";
import { IPlacardForm } from "./placard-form.type";
import { ControlsOf } from "src/assets/js/util/_formGroup";
import { PlacardService } from "@app/core/api/operations/placard/placard.service";
import { QadCustomerPartSearchComponent } from "@app/shared/components/qad-customer-part-search/qad-customer-part-search.component";
import { QadWoSearchComponent } from "@app/shared/components/qad-wo-search/qad-wo-search.component";
import { SoSearchComponent } from "@app/shared/components/so-search/so-search.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    SoSearchComponent,
    QadWoSearchComponent,
    QadCustomerPartSearchComponent,
  ],
  selector: "app-placard-form",
  templateUrl: "./placard-form.component.html",
  styles: [`
    .barcode-container {
      padding: 10px;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 4px;
    }
    
    .barcode-container svg {
      max-width: 100%;
      height: auto;
    }
    
    .barcode-print-section {
      page-break-inside: avoid;
    }
    
    @media print {
      .barcode-container {
        border: 2px solid #000 !important;
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        padding: 15px !important;
        margin: 10px 0 !important;
      }
      
      .barcode-container svg {
        width: 250px !important;
        height: 80px !important;
        display: block !important;
        margin: 0 auto !important;
      }
      
      .barcode-print-section {
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        page-break-inside: avoid !important;
        border: 1px solid #000 !important;
        padding: 20px !important;
        margin: 15px 0 !important;
      }
      
      .barcode-print-section .text-body,
      .barcode-print-section .text-body-secondary {
        color: #000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .barcode-print-section .font-monospace {
        font-size: 14px !important;
        font-weight: bold !important;
        color: #000 !important;
      }
      
      /* Ensure icons print as text */
      .barcode-print-section .mdi::before {
        content: "📦" !important;
      }
    }
  `]
})
export class PlacardFormComponent implements AfterViewInit, OnDestroy {
  private barcodeLibraryLoaded = false;
  private formSubscription: any;

  constructor(
    private placardService: PlacardService
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
    this.loadBarcodeLibrary();
    
    // Subscribe to form changes to regenerate barcode
    this.formSubscription = this.form.valueChanges.subscribe(() => {
      setTimeout(() => this.generateBarcode(), 100);
    });
  }

  ngAfterViewInit(): void {
    // Generate barcode after view init if data is available
    setTimeout(() => this.generateBarcode(), 500);
  }

  ngOnDestroy(): void {
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
  }

  private loadBarcodeLibrary(): void {
    if (this.barcodeLibraryLoaded || (window as any).JsBarcode) {
      this.barcodeLibraryLoaded = true;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
    script.onload = () => {
      this.barcodeLibraryLoaded = true;
      this.generateBarcode();
    };
    document.head.appendChild(script);
  }

  private generateBarcode(): void {
    if (!this.barcodeLibraryLoaded || !(window as any).JsBarcode) {
      return;
    }

    const soNumber = this.f.eyefi_so_number?.value;
    const lineNumber = this.f.line_number?.value;
    
    if (!soNumber || !lineNumber) {
      return;
    }

    const barcodeValue = `${soNumber}-${lineNumber}`;
    const elementId = `placard-barcode-${soNumber}-${lineNumber}`;
    
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        try {
          (window as any).JsBarcode(`#${elementId}`, barcodeValue, {
            format: "CODE128",
            width: 3,           // Increased width for better print quality
            height: 60,         // Increased height for better scanning
            displayValue: false,
            margin: 8,          // More margin for cleaner printing
            background: "#ffffff",
            lineColor: "#000000",
            fontSize: 0,        // Disable built-in text (we have our own)
            textMargin: 0,
            quiet: 10           // Quiet zone for better scanning
          });
        } catch (error) {
          console.error('Error generating barcode:', error);
        }
      }
    }, 100);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  states = states;

  form = new FormGroup<ControlsOf<IPlacardForm>>({
    line_number: new FormControl(null),
    customer_name: new FormControl(""),
    eyefi_wo_number: new FormControl(null),
    po_number: new FormControl(""),
    eyefi_so_number: new FormControl(null),
    customer_co_por_so: new FormControl(""),
    description: new FormControl(""),
    eyefi_part_number: new FormControl(""),
    customer_part_number: new FormControl(""),
    location: new FormControl(""),
    customer_serial_tag: new FormControl(""),
    eyefi_serial_tag: new FormControl(""),
    qty: new FormControl(null),
    label_count: new FormControl(null),
    total_label_count: new FormControl(null),
    created_date: new FormControl(null),
    created_by: new FormControl(null),
    active: new FormControl(1),
    uom: new FormControl(null),
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  addTag: AddTagFn | boolean = (e) => {
    let ee = validateEmail(e);

    if (!ee) {
      alert("Not valid email.");
      return false;
    }
    return validateEmail(e) ? e : false;
  };

  formValidator(key: any) {
    if (this.form.get(key)?.validator === null) return "";
    const validator = this.form.get(key)?.validator({} as AbstractControl);
    if (validator && validator["required"]) return "required";
    return "";
  }

  async notifyParent($event) {
    try {
      this.form.disable();
      let data: any = await this.placardService.getPlacardBySoSearch(
        $event.sod_nbr,
        $event.sod_part,
        $event.sod_line
      );

      if (data)
        this.form.patchValue({
          description: data.FULLDESC,
          location: data.LOCATION,
          line_number: data.SOD_LINE,
          customer_name: data.SO_CUST,
          customer_part_number: data.SOD_CUSTPART || null,
          po_number: data.SO_PO,
          eyefi_so_number: data.SOD_NBR,
          eyefi_part_number: data.SOD_PART,
          customer_co_por_so: data.MISC,
        });

      this.form.enable();
      
      // Generate barcode after form data is loaded
      setTimeout(() => this.generateBarcode(), 200);
    } catch (err) {
      this.form.disable();
    }
  }

  getWorkOrderNumber($event) {
    this.form.patchValue({ eyefi_wo_number: $event.wo_nbr });
  }

  getCustomerPartNumber($event) {
    this.form.patchValue({ customer_part_number: $event.cp_cust_part });
  }

  serialNumber: string;
  async getSerialNumberInfo() {
    let data: any = await this.placardService.searchSerialNumber(
      this.form.value.customer_serial_tag
    );
    this.form.get("eyefi_serial_tag").setValue(data.serialNumber);
  }
}
