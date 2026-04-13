import { Component, Input, OnInit } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { RfqService } from "@app/core/api/rfq/rfq-service";
import { NAVIGATION_ROUTE } from "../rfq-constant";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-rfq-view",
  templateUrl: "./rfq-view.component.html",
})
export class RfqViewComponent implements OnInit {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: RfqService,
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

  title = "View RFQ";
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
      this.toastrService.error("Error loading RFQ data");
      this.isLoading = false;
    }
  }

  private processRawData(rawData: any) {
    // Parse JSON string fields
    const processedData = { ...rawData };

    // Parse vendor JSON string
    if (rawData.vendor && typeof rawData.vendor === 'string') {
      try {
        processedData.vendor = JSON.parse(rawData.vendor);
      } catch (e) {
        console.warn('Failed to parse vendor data:', e);
        processedData.vendor = null;
      }
    }

    // Parse emailToSendTo JSON string
    if (rawData.emailToSendTo && typeof rawData.emailToSendTo === 'string') {
      try {
        processedData.emailToSendTo = JSON.parse(rawData.emailToSendTo);
      } catch (e) {
        console.warn('Failed to parse emailToSendTo:', e);
        processedData.emailToSendTo = [];
      }
    }

    // Parse ccEmails JSON string
    if (rawData.ccEmails && typeof rawData.ccEmails === 'string') {
      try {
        processedData.ccEmails = JSON.parse(rawData.ccEmails);
      } catch (e) {
        console.warn('Failed to parse ccEmails:', e);
        processedData.ccEmails = [];
      }
    }

    // Parse bolFaxEmail JSON string
    if (rawData.bolFaxEmail && typeof rawData.bolFaxEmail === 'string') {
      try {
        processedData.bolFaxEmail = JSON.parse(rawData.bolFaxEmail);
      } catch (e) {
        console.warn('Failed to parse bolFaxEmail:', e);
        processedData.bolFaxEmail = [];
      }
    }

    // Parse lines JSON string
    if (rawData.lines && typeof rawData.lines === 'string') {
      try {
        processedData.lines = JSON.parse(rawData.lines);
      } catch (e) {
        console.warn('Failed to parse lines:', e);
        processedData.lines = [];
      }
    }

    // Parse palletSizeInformationSendInfo JSON string
    if (rawData.palletSizeInformationSendInfo && typeof rawData.palletSizeInformationSendInfo === 'string') {
      try {
        processedData.palletSizeInformationSendInfo = JSON.parse(rawData.palletSizeInformationSendInfo);
      } catch (e) {
        console.warn('Failed to parse palletSizeInformationSendInfo:', e);
        processedData.palletSizeInformationSendInfo = [];
      }
    }

    // Clean up "N/A" values and replace with null
    this.cleanNAValues(processedData);

    return processedData;
  }

  private cleanNAValues(data: any) {
    // List of fields that commonly have "N/A" values
    const fieldsToClean = [
      'dest_phone', 'dest_contactName', 'dest_deliveryNumber',
      'contactName', 'phone', 'address', 'city', 'state', 
      'dest_address', 'dest_city', 'dest_state'
    ];

    fieldsToClean.forEach(field => {
      if (data[field] === 'N/A' || data[field] === '' || data[field] === 'null') {
        data[field] = null;
      }
    });

    // Handle destination address concatenation
    if (data.dest_address2) {
      if (data.dest_address && data.dest_address !== 'N/A') {
        data.dest_address = `${data.dest_address}, ${data.dest_address2}`;
      } else {
        data.dest_address = data.dest_address2;
      }
    }
  }

  onEdit() {
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParams: { id: this.id },
    });
  }

  async onSendEmail() {
    if (!this.data) {
      this.toastrService.warning("Please load RFQ data first");
      return;
    }

    try {
      this.isLoading = true;
      
      // Format data for email sending (similar to edit component)
      const emailData = this.formatDataForEmail(this.data);
      
      const res: any = await this.api.sendEmail(this.id, emailData);
      
      if (res?.message) {
        this.toastrService.error("Access denied");
      } else {
        this.toastrService.success("RFQ email sent successfully");
      }
      
      this.isLoading = false;
    } catch (err) {
      this.toastrService.error("Error sending RFQ email");
      this.isLoading = false;
    }
  }

  onCancel() {
    this.router.navigate([NAVIGATION_ROUTE.LIST]);
  }

  private formatDataForEmail(data: any) {
    // Format the data similar to the edit component's onFormatDataBeforeEmail function
    return {
      SendFormEmail: 1,
      details: data,
      infoCustomerView: data.vendor,
      palletSizeInformationSendInfo: data.palletSizeInformationSendInfo || [],
      salesOrder: data.sod_nbr,
      customerSelected: data.vendor,
      emailToSendTo: Array.isArray(data.emailToSendTo) ? data.emailToSendTo.join(',') : (data.emailToSendTo || ''),
      lineInfoEachShow: data.lines || [],
    };
  }

  // Helper method to display email arrays as comma-separated strings
  formatEmailArray(emails: any): string {
    if (!emails) return '';
    if (Array.isArray(emails)) {
      return emails.join(', ');
    }
    if (typeof emails === 'string') {
      try {
        const parsed = JSON.parse(emails);
        return Array.isArray(parsed) ? parsed.join(', ') : emails;
      } catch (e) {
        return emails;
      }
    }
    return '';
  }

  // Helper method to safely display values, replacing null/undefined with fallback
  safeDisplay(value: any, fallback: string = 'Not specified'): string {
    if (value === null || value === undefined || value === '' || value === 'N/A') {
      return fallback;
    }
    return value.toString();
  }

  // Helper method for calculating line item totals
  calculateLineTotal(item: any): number {
    return (item.sod_list_pr || 0) * (item.qty || 0);
  }

  // Helper method for calculating grand total
  calculateGrandTotal(): number {
    if (!this.data?.lines) return 0;
    
    return this.data.lines
      .filter((item: any) => item.addItemsList)
      .reduce((total: number, item: any) => {
        return total + this.calculateLineTotal(item);
      }, 0);
  }
}