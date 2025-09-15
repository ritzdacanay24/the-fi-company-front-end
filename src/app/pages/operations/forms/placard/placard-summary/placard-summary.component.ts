import { Component, OnInit, Input, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { PlacardService } from '@app/core/api/operations/placard/placard.service';
import { NAVIGATION_ROUTE } from '../placard-constant';
import { QRCodeComponent } from 'angularx-qrcode';

declare var JsBarcode: any;

@Component({
  standalone: true,
  imports: [SharedModule, QRCodeComponent],
  selector: 'app-placard-summary',
  templateUrl: './placard-summary.component.html'
})
export class PlacardSummaryComponent implements OnInit, AfterViewInit {
  
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: PlacardService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) {
      this.getData();
    }
  }

  ngAfterViewInit() {
    // Initialize barcodes after view is ready
    this.setupBarcodes();
  }

  title = "Placard Summary";
  
  id: number | null = null;
  data: any = null;
  isLoading = false;
  
  // Print-related properties
  totalPrints: any[] = [];
  codeType: string = 'qr';

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
      this.setupPrintData();
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
      console.error('Error loading placard data:', err);
    }
  }

  setupPrintData() {
    if (this.data) {
      this.totalPrints = [this.data];
      setTimeout(() => this.setupBarcodes(), 100);
    }
  }

  setupBarcodes() {
    if (this.codeType === 'barcode' && typeof JsBarcode !== 'undefined') {
      this.totalPrints.forEach((row, index) => {
        const salesOrderValue = this.getSalesOrderValue(row);
        if (salesOrderValue) {
          try {
            const element = document.getElementById(`print-barcode-${index}`);
            if (element) {
              JsBarcode(element, salesOrderValue, {
                format: "CODE128",
                width: 2,
                height: 40,
                displayValue: false,
                margin: 0
              });
            }
          } catch (error) {
            console.error('Error generating barcode:', error);
          }
        }
      });
    }
  }

  getSalesOrderValue(row: any): string {
    if (row?.eyefi_so_number && row?.line_number) {
      return `${row.eyefi_so_number}-${row.line_number}`;
    }
    return '';
  }

  getStatusBadge(active: any): string {
    return active === 1 || active === '1' || active === true ? 'bg-success' : 'bg-secondary';
  }

  getStatusText(active: any): string {
    return active === 1 || active === '1' || active === true ? 'Active' : 'Inactive';
  }

  onEdit() {
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParams: { id: this.id },
      queryParamsHandling: "merge"
    });
  }

  onPrint() {
    window.print();
  }

  onDownloadAsPdf() {
    console.log('Download PDF functionality to be implemented');
  }

  onCreateCopy() {
    this.router.navigate([NAVIGATION_ROUTE.CREATE], {
      queryParams: { 
        copyFrom: this.id,
        customer_name: this.data?.customer_name,
        eyefi_part_number: this.data?.eyefi_part_number 
      },
      queryParamsHandling: "merge"
    });
  }
}