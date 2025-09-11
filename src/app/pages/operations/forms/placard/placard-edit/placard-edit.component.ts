import { Component, Input, OnInit, AfterViewInit, OnDestroy } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { IPlacardForm } from "../placard-form/placard-form.type";
import { PlacardFormComponent } from "../placard-form/placard-form.component";
import { NAVIGATION_ROUTE } from "../placard-constant";
import { PlacardService } from "@app/core/api/operations/placard/placard.service";

@Component({
  standalone: true,
  imports: [SharedModule, PlacardFormComponent],
  selector: "app-placard-edit",
  templateUrl: "./placard-edit.component.html",
  styles: [`
    .print-barcode-container {
      padding: 10px;
      background: white;
      text-align: center;
      border: 2px solid #000;
      margin: 15px 0;
    }
    
    .print-barcode-container svg {
      display: block;
      margin: 0 auto;
      width: 300px;
      height: 80px;
    }
    
    .print-barcode-text {
      font-family: monospace;
      font-size: 16px;
      font-weight: bold;
      margin-top: 10px;
    }
    
    @media print {
      .print-barcode-container {
        background: white !important;
        border: 2px solid #000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        page-break-inside: avoid !important;
      }
      
      .print-barcode-container svg {
        width: 300px !important;
        height: 80px !important;
      }
      
      .print-barcode-text {
        color: #000 !important;
        font-size: 16px !important;
        font-weight: bold !important;
      }
    }
  `]
})
export class PlacardEditComponent implements OnInit, AfterViewInit, OnDestroy {
  private barcodeLibraryLoaded = false;
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

  title = "Edit";

  form: MyFormGroup<IPlacardForm>;

  id = null;

  isLoading = false;

  submitted = false;

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
        '.print-barcode-container { padding: 10px; background: white !important; text-align: center; border: 2px solid #000 !important; margin: 15px 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
        '.print-barcode-container svg { display: block; margin: 0 auto; width: 300px !important; height: 80px !important; }' +
        '.print-barcode-text { font-family: monospace; font-size: 16px !important; font-weight: bold !important; margin-top: 10px; color: #000 !important; }' +
        '</style>' +
        '</head><body>' + printContents + '</body></html>'
      );
      popupWin.document.close();
      
      // Wait for the barcode library to load and then regenerate barcodes in the popup
      popupWin.onload = () => {
        setTimeout(() => {
          // Only generate barcode for the first page (index 0)
          if (this.totalPrints.length > 0) {
            const row = this.totalPrints[0];
            const index = 0;
            if (row.eyefi_so_number && row.line_number) {
              const barcodeValue = `${row.eyefi_so_number}-${row.line_number}`;
              const elementId = `print-barcode-${index}`;
              try {
                if ((popupWin as any).JsBarcode) {
                  (popupWin as any).JsBarcode(`#${elementId}`, barcodeValue, {
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
}
