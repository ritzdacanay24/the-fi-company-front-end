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
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    SoSearchComponent,
    QadWoSearchComponent,
    QadCustomerPartSearchComponent,
    QRCodeComponent,
  ],
  selector: "app-placard-form",
  templateUrl: "./placard-form.component.html",
  styles: [`
    .barcode-container, .qr-code-container {
      padding: 10px;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 4px;
    }
    
    .barcode-container svg, .qr-code-container canvas {
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
  private qrCodeLibraryLoaded = false;
  private formSubscription: any;

  // Code type toggle - default to QR code
  codeType: 'qr' | 'barcode' = 'qr';

  constructor(
    private placardService: PlacardService
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
    this.loadBarcodeLibrary();
    this.loadQRCodeLibrary();
    
    // Subscribe to form changes to regenerate codes
    this.formSubscription = this.form.valueChanges.subscribe(() => {
      setTimeout(() => this.generateCode(), 100);
    });
  }

  ngAfterViewInit(): void {
    // Generate code after view init if data is available
    setTimeout(() => this.generateCode(), 500);
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
      this.generateCode();
    };
    document.head.appendChild(script);
  }

  private loadQRCodeLibrary(): void {
    if (this.qrCodeLibraryLoaded || (window as any).QRCode) {
      this.qrCodeLibraryLoaded = true;
      console.log('QR Code library already loaded');
      return;
    }

    console.log('Loading QR Code library...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
    script.onload = () => {
      this.qrCodeLibraryLoaded = true;
      console.log('QR Code library loaded successfully');
      this.generateCode();
    };
    script.onerror = () => {
      console.error('Failed to load QR Code library');
    };
    document.head.appendChild(script);
  }

  private generateCode(): void {
    console.log('Generating code, type:', this.codeType);
    if (this.codeType === 'qr') {
      this.generateQRCode();
    } else {
      this.generateBarcode();
    }
  }

  private generateQRCode(): void {
    console.log('generateQRCode called, library loaded:', this.qrCodeLibraryLoaded, 'QRCode available:', !!(window as any).QRCode);
    
    if (!this.qrCodeLibraryLoaded || !(window as any).QRCode) {
      console.log('QR Code library not ready, skipping generation');
      return;
    }

    const soNumber = this.f.eyefi_so_number?.value;
    const lineNumber = this.f.line_number?.value;
    
    console.log('SO Number:', soNumber, 'Line Number:', lineNumber);
    
    if (!soNumber || !lineNumber) {
      console.log('Missing SO or Line number, skipping QR generation');
      return;
    }

    const qrValue = `${soNumber}-${lineNumber}`;
    const elementId = `placard-qrcode-${soNumber}-${lineNumber}`;
    
    console.log('Generating QR code with value:', qrValue, 'elementId:', elementId);
    
    setTimeout(() => {
      const element = document.getElementById(elementId);
      console.log('QR Element found:', !!element);
      
      if (element) {
        // Clear existing content
        element.innerHTML = '';
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        element.appendChild(canvas);
        
        try {
          (window as any).QRCode.toCanvas(canvas, qrValue, {
            width: 120,
            height: 120,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          }, (error: any) => {
            if (error) {
              console.error('QR Code generation failed:', error);
              // Fallback: show text if QR generation fails
              element.innerHTML = `<div class="text-center p-3 border"><small>QR Code<br>${qrValue}</small></div>`;
            } else {
              console.log('QR Code generated successfully');
            }
          });
        } catch (error) {
          console.error('QR Code generation error:', error);
          // Fallback: show text if QR generation fails
          element.innerHTML = `<div class="text-center p-3 border"><small>QR Code<br>${qrValue}</small></div>`;
        }
      }
    }, 100);
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
      
      // Generate code after form data is loaded
      setTimeout(() => this.generateCode(), 200);
    } catch (err) {
      this.form.disable();
    }
  }

  toggleCodeType(event: any): void {
    this.codeType = event.target.checked ? 'barcode' : 'qr';
    setTimeout(() => this.generateCode(), 100);
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
