import { Component, Input, OnInit, AfterViewInit, OnDestroy, ViewChild } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { IPlacardForm } from "../placard-form/placard-form.type";
import { PlacardFormComponent } from "../placard-form/placard-form.component";
import { NAVIGATION_ROUTE } from "../placard-constant";
import { PlacardService } from "@app/core/api/operations/placard/placard.service";
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  standalone: true,
  imports: [SharedModule, PlacardFormComponent, QRCodeComponent],
  selector: "app-placard-edit",
  templateUrl: "./placard-edit.component.html",
  styles: [`
    .print-barcode-container, .print-qr-container {
      padding: 8px;
      background: white;
      text-align: center;
      border: 1px solid #000;
      margin: 0;
      display: inline-block;
    }
    
    .print-barcode-container svg {
      display: block;
      margin: 0 auto;
      width: 150px;
      height: 40px;
    }
    
    .print-qr-container canvas,
    .print-qr-container svg {
      display: block;
      margin: 0 auto;
      width: 80px !important;
      height: 80px !important;
    }
    
    .print-qr-code {
      display: block !important;
      margin: 0 auto !important;
    }
    
    .print-code-text {
      font-family: monospace;
      font-size: 12px;
      font-weight: bold;
      margin-top: 6px;
    }
    
    @media print {
      .print-barcode-container, .print-qr-container {
        background: white !important;
        border: 1px solid #000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        page-break-inside: avoid !important;
        padding: 8px !important;
        margin: 0 !important;
        display: inline-block !important;
      }
      
      .print-barcode-container svg {
        width: 150px !important;
        height: 40px !important;
      }
      
      .print-qr-container canvas,
      .print-qr-container svg {
        width: 80px !important;
        height: 80px !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .print-qr-container qrcode {
        display: block !important;
      }
      
      .print-qr-container qrcode canvas,
      .print-qr-container qrcode svg {
        display: block !important;
        margin: 0 auto !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .print-qr-code {
        display: block !important;
        margin: 0 auto !important;
      }
      
      .print-qr-code canvas,
      .print-qr-code svg {
        display: block !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .print-code-text {
        color: #000 !important;
        font-size: 12px !important;
        font-weight: bold !important;
        margin-top: 6px !important;
      }
    }
  `]
})
export class PlacardEditComponent implements OnInit, AfterViewInit, OnDestroy {
  private barcodeLibraryLoaded = false;
  
  @ViewChild(PlacardFormComponent) placardFormComponent!: PlacardFormComponent;
  
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: PlacardService,
    private toastrService: ToastrService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
    this.loadBarcodeLibrary();
  }

  ngAfterViewInit(): void {
    // Generate barcodes after view init
    setTimeout(() => this.generateAllBarcodes(), 1000);
  }

  ngOnDestroy(): void {
    // Cleanup if needed
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
      this.generateAllBarcodes();
    };
    document.head.appendChild(script);
  }

  private generateAllBarcodes(): void {
    if (!this.barcodeLibraryLoaded || !(window as any).JsBarcode) {
      return;
    }

    // Only generate barcode for the first item (index 0)
    if (this.totalPrints.length > 0) {
      this.generateBarcodeForRow(this.totalPrints[0], 0);
    }
  }

  private generateBarcodeForRow(row: any, index: number): void {
    if (!row.eyefi_so_number || !row.line_number) {
      return;
    }

    const barcodeValue = `${row.eyefi_so_number}-${row.line_number}`;
    const elementId = `print-barcode-${index}`;
    
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        try {
          (window as any).JsBarcode(`#${elementId}`, barcodeValue, {
            format: "CODE128",
            width: 3,
            height: 80,
            displayValue: false,
            margin: 10,
            background: "#ffffff",
            lineColor: "#000000",
            fontSize: 0,
            textMargin: 0,
            quiet: 10
          });
        } catch (error) {
          console.error('Error generating barcode:', error);
        }
      }
    }, 100 + (index * 50)); // Stagger barcode generation
  }

  setFormEmitter($event) {
    this.form = $event;

    this.form.valueChanges.subscribe(value => {
      this.totalPrints = []
      for (let i = 0; i < this.form.value.total_label_count; i++) {
        let count = i + 1;
        this.totalPrints.push({
          ...this.form.value,
          label_count: count
        })
      }
      
      // Regenerate barcodes after form changes
      setTimeout(() => this.generateAllBarcodes(), 200);
    });
  }

  title = "View Placard";

  form: MyFormGroup<IPlacardForm>;

  id = null;

  isLoading = false;

  submitted = false;

  isFormDisabled = false; // Add property to control form disabled state

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);

      this.totalPrints = []
      for (let i = 0; i < this.data.total_label_count; i++) {
        let count = i + 1;
        this.totalPrints.push({
          ...this.data,
          label_count: count
        })
      }

      this.form.patchValue(this.data);
      
      // Disable the form in edit mode
      this.isFormDisabled = true;
      this.form.disable();
      
      this.isLoading = false;
      
      // Generate barcodes after data is loaded
      setTimeout(() => this.generateAllBarcodes(), 500);
    } catch (err) {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.form.markAsPristine()
      this.toastrService.success("Successfully Updated");
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  totalPrints = [];
  onPrint() {
    if (this.form.dirty) {
      alert('You have unsaved data. Please save before printing')
      return
    }

    setTimeout(() => {
      var printContents = document.getElementById("pickSheet").innerHTML;
      var popupWin = window.open("", "_blank", "width=1000,height=600");
      popupWin.document.open();
      var pathCss = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
      var barcodeJs = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js";
      
      popupWin.document.write(
        '<html><head>' +
        '<link type="text/css" rel="stylesheet" media="screen, print" href="' + pathCss + '" />' +
        '<script src="' + barcodeJs + '"></script>' +
        '<style>' +
        '.print-barcode-container, .print-qr-container { padding: 8px; background: white !important; text-align: center; border: 1px solid #000 !important; margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; display: inline-block !important; }' +
        '.print-barcode-container svg { display: block; margin: 0 auto; width: 150px !important; height: 40px !important; }' +
        '.print-qr-container canvas, .print-qr-container svg { display: block; margin: 0 auto; width: 80px !important; height: 80px !important; }' +
        '.print-code-text { font-family: monospace; font-size: 12px !important; font-weight: bold !important; margin-top: 6px; color: #000 !important; }' +
        '.d-flex { display: flex !important; }' +
        '.justify-content-between { justify-content: space-between !important; }' +
        '.align-items-start { align-items: flex-start !important; }' +
        '</style>' +
        '</head><body>' + printContents + '</body></html>'
      );
      popupWin.document.close();
      
      // Wait for the barcode library to load and then regenerate barcodes in the popup
      popupWin.onload = () => {
        setTimeout(() => {
          // Only generate barcode if barcode type is selected and for the first page (index 0)
          if (this.codeType === 'barcode' && this.totalPrints.length > 0) {
            const row = this.totalPrints[0];
            const index = 0;
            if (row.eyefi_so_number && row.line_number) {
              const barcodeValue = `${row.eyefi_so_number}-${row.line_number}`;
              const elementId = `print-barcode-${index}`;
              try {
                if ((popupWin as any).JsBarcode) {
                  (popupWin as any).JsBarcode(`#${elementId}`, barcodeValue, {
                    format: "CODE128",
                    width: 2,
                    height: 40,
                    displayValue: false,
                    margin: 5,
                    background: "#ffffff",
                    lineColor: "#000000",
                    fontSize: 0,
                    textMargin: 0,
                    quiet: 5
                  });
                }
              } catch (error) {
                console.error('Error generating barcode in print window:', error);
              }
            }
          }
          
          // Print after barcodes are generated
          setTimeout(() => {
            popupWin.print();
            popupWin.close();
            this.form.markAsPristine();
          }, 500);
        }, 500);
      };
    }, 500);
  }

  toggleCodeType(event: any): void {
    // This method is no longer needed - code type is handled by the form component
  }

  get codeType(): 'qr' | 'barcode' {
    return this.placardFormComponent?.codeType || 'qr';
  }

  getSalesOrderValue(row: any): string {
    return `${row?.eyefi_so_number}-${row?.line_number}`;
  }
}
