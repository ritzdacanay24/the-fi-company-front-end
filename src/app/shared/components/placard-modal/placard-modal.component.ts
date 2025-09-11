import { ChangeDetectorRef, Component, Input, OnInit, AfterViewInit, OnDestroy } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { PlacardFormComponent } from "@app/pages/operations/forms/placard/placard-form/placard-form.component";
import { PlacardService } from "@app/core/api/operations/placard/placard.service";
import moment from "moment";
import { TokenStorageService } from "@app/core/services/token-storage.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { ToastrService } from "ngx-toastr";

@Injectable({
  providedIn: "root",
})
export class PlacardModalService {
  constructor(public modalService: NgbModal) { }

  open(soNumber, lineNumber, partNumber) {
    let modalRef = this.modalService.open(PlacardModalComponent, {
      size: "lg",
    });
    modalRef.componentInstance.soNumber = soNumber;
    modalRef.componentInstance.lineNumber = lineNumber;
    modalRef.componentInstance.partNumber = partNumber;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, PlacardFormComponent],
  selector: "app-placard-modal",
  templateUrl: "./placard-modal.component.html",
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
export class PlacardModalComponent implements OnInit, AfterViewInit, OnDestroy {
  private barcodeLibraryLoaded = false;
  constructor(
    private ngbActiveModal: NgbActiveModal,
    private placardService: PlacardService,
    private tokenStorageService: TokenStorageService,
    private api: PlacardService,
    private toastrService: ToastrService,
    private cdr: ChangeDetectorRef
  ) { }

  @Input({ required: true }) public soNumber: string = "";
  @Input({ required: true }) public lineNumber: string = "";
  @Input({ required: true }) public partNumber: string = "";

  data: any;
  isLoading = false;

  form: any;

  id;

  ngAfterViewChecked() {
    this.cdr.detectChanges();
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

  totalPrints = []

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue(
      {
        created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
        created_by: this.userData.id,
      },
      { emitEvent: false }
    );

    this.form.valueChanges.subscribe((val) => {
      this.cdr.detectChanges();
    });

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

  submitted = false;

  userData: any;

  ngOnInit() {
    this.userData = this.tokenStorageService.getUser();
    if (this.soNumber && this.lineNumber && this.partNumber) this.getData();
    this.loadBarcodeLibrary();
  }

  dismiss() {
    this.ngbActiveModal.dismiss("dismiss");
  }

  close() {
    this.ngbActiveModal.close(this.data);
  }

  async getData() {
    try {
      this.isLoading = true;
      let data: any = await this.placardService.getPlacardBySoSearch(
        this.soNumber,
        this.partNumber,
        this.lineNumber
      );

      if (data) {
        this.form.patchValue({
          description: data.FULLDESC,
          location: data.LOCATION,
          line_number: data.SOD_LINE,
          customer_name: data.SO_CUST,
          customer_part_number: data.SOD_CUSTPART || null,
          po_number: data.SO_PO,
          eyefi_so_number: data.SOD_NBR,
          eyefi_part_number: data.SOD_PART,
          customer_co_por_so: data.SO_CUST == "BALTEC" ? "" : data.MISC,
        });

        if (data.SO_CUST == "BALTEC") {
          this.form.get("customer_co_por_so").disable();
        }

        this.form.get("customer_name").valueChanges.subscribe((val) => {
          if (val?.toLocaleUpperCase() == "BALTEC") {
            this.form.patchValue(
              { customer_co_por_so: "" },
              { emitEvent: true }
            );
            this.form.get("customer_co_por_so").disable();
          } else {
            this.form.get("customer_co_por_so").enable();
          }
        });


        this.totalPrints = []
        for (let i = 0; i < this.data.total_label_count; i++) {
          let count = i + 1;
          this.totalPrints.push({
            ...this.data,
            label_count: count
          })
        }
      }

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

    if (this.id) {
      this.update();
    } else {
      this.create();
    }
  }

  async create() {
    try {
      this.isLoading = true;
      let { insertId } = await this.api.create(this.form.value);
      this.id = insertId;
      this.onPrint();
      this.isLoading = false;
      this.toastrService.success("Successfully Created");
    } catch (err) {
      this.isLoading = false;
    }
  }

  async update() {
    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.onPrint();
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
    } catch (err) {
      this.isLoading = false;
    }
  }

  onPrint() {
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
          }, 500);
        }, 500);
      };
    }, 500);
  }
}
