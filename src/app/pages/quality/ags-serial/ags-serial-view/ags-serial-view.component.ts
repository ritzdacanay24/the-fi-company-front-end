import { Component, Input, OnInit } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { AgsSerialService } from "@app/core/api/quality/ags-serial.service";
import { NAVIGATION_ROUTE } from "../ags-serial-constant";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-ags-serial-view",
  templateUrl: "./ags-serial-view.component.html",
})
export class AgsSerialViewComponent implements OnInit {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: AgsSerialService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) {
      this.getData();
    }
  }

  title = "View AGS Serial";
  id = null;
  data: any;
  isLoading = false;

  @Input() goBack: Function;

  async getData() {
    try {
      this.isLoading = true;
      const rawData = await this.api.getById(this.id);
      this.data = this.processRawData(rawData);
      this.isLoading = false;
    } catch (err) {
      this.toastrService.error("Error loading AGS serial data");
      this.isLoading = false;
    }
  }

  private processRawData(rawData: any) {
    // Process and clean the raw data
    const processedData = { ...rawData };

    // Clean up "N/A" values and replace with null
    this.cleanNAValues(processedData);

    return processedData;
  }

  private cleanNAValues(data: any) {
    // List of fields that commonly have "N/A" values
    const fieldsToClean = [
      'serialNumber', 'generated_SG_asset', 'sgPartNumber', 'poNumber',
      'inspector_name', 'property_site', 'created_by', 'updated_by'
    ];

    fieldsToClean.forEach(field => {
      if (data[field] === 'N/A' || data[field] === '' || data[field] === 'null') {
        data[field] = null;
      }
    });
  }

  onEdit() {
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParams: { id: this.id },
    });
  }

  onCancel() {
    this.router.navigate([NAVIGATION_ROUTE.LIST]);
  }

  // Helper method to safely display values, replacing null/undefined with fallback
  safeDisplay(value: any, fallback: string = 'Not specified'): string {
    if (value === null || value === undefined || value === '' || value === 'N/A') {
      return fallback;
    }
    return value.toString();
  }

  // Helper method to format boolean values
  formatBoolean(value: any): string {
    if (value === true || value === 1 || value === '1' || value === 'Yes') {
      return 'Yes';
    } else if (value === false || value === 0 || value === '0' || value === 'No') {
      return 'No';
    }
    return 'Not specified';
  }

  // Helper method to get status based on active flag
  getStatus(): string {
    if (this.data?.active === true || this.data?.active === 1) {
      return 'Active';
    } else if (this.data?.active === false || this.data?.active === 0) {
      return 'Inactive';
    }
    return 'Unknown';
  }

  // Helper method to get status badge class
  getStatusBadgeClass(): string {
    const status = this.getStatus();
    switch (status) {
      case 'Active': return 'bg-success';
      case 'Inactive': return 'bg-secondary';
      default: return 'bg-warning';
    }
  }

  // Helper method to get time since created
  getTimeSinceCreated(): string {
    if (!this.data?.created_at && !this.data?.createdAt) return '';
    
    const createdField = this.data?.created_at || this.data?.createdAt;
    const now = new Date();
    const created = new Date(createdField);
    const diffInMs = now.getTime() - created.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInDays / 30)} month${Math.floor(diffInDays / 30) > 1 ? 's' : ''} ago`;
  }

  // Helper method to check if record is newly created
  isNewRecord(): boolean {
    if (!this.data?.created_at && !this.data?.createdAt) return false;
    
    const createdField = this.data?.created_at || this.data?.createdAt;
    const now = new Date();
    const created = new Date(createdField);
    const diffInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    
    return diffInHours <= 24; // Less than 24 hours old
  }

  // Helper method to get AGS serial display with validation
  getAgsSerialDisplay(): string {
    const agsSerial = this.data?.generated_SG_asset;
    if (!agsSerial || agsSerial === 'N/A') {
      return 'Not generated';
    }
    return agsSerial;
  }

  // Helper method to check if AGS serial is auto-generated
  isAgsSerialGenerated(): boolean {
    const agsSerial = this.data?.generated_SG_asset;
    return agsSerial && agsSerial !== 'N/A' && agsSerial.length > 0;
  }

  // Method to copy AGS serial to clipboard
  async copyAgsSerial() {
    if (!this.isAgsSerialGenerated()) return;
    
    try {
      await navigator.clipboard.writeText(this.data.generated_SG_asset);
      this.toastrService.success('AGS serial number copied to clipboard');
    } catch (err) {
      this.toastrService.error('Failed to copy AGS serial number');
    }
  }

  // Method to share record details
  shareRecord() {
    const subject = `AGS Serial Record #${this.id} - ${this.data?.generated_SG_asset || 'Unknown'}`;
    const body = `AGS Serial Record Details:
    
Record ID: ${this.id}
AGS Serial: ${this.getAgsSerialDisplay()}
Serial Number: ${this.safeDisplay(this.data?.serialNumber)}
Part Number: ${this.safeDisplay(this.data?.sgPartNumber)}
Work Order: ${this.safeDisplay(this.data?.poNumber)}
Status: ${this.getStatus()}
    
View full details: ${window.location.href}`;
    
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto);
  }

  // Method to print record
  printRecord() {
    window.print();
  }
}