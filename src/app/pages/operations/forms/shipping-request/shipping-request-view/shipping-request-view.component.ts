import { Component, Input, OnInit } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { ShippingRequestService } from "@app/core/api/operations/shippging-request/shipping-request.service";
import { NAVIGATION_ROUTE } from "../shipping-request-constant";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-shipping-request-view",
  templateUrl: "./shipping-request-view.component.html",
})
export class ShippingRequestViewComponent implements OnInit {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: ShippingRequestService,
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

  title = "View Shipping Request";
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
      this.toastrService.error("Error loading shipping request data");
      this.isLoading = false;
    }
  }

  private processRawData(rawData: any) {
    // Process and clean the raw data
    const processedData = { ...rawData };

    // Convert trackingNumber to string if it's a number
    if (typeof processedData.trackingNumber === 'number') {
      processedData.trackingNumber = processedData.trackingNumber.toString();
    }

    // Parse sendTrackingNumberTo if it's a JSON string, otherwise convert single email to array
    if (rawData.sendTrackingNumberTo && typeof rawData.sendTrackingNumberTo === 'string') {
      try {
        // Try to parse as JSON first
        processedData.sendTrackingNumberTo = JSON.parse(rawData.sendTrackingNumberTo);
      } catch (e) {
        // If JSON parsing fails, treat as single email and convert to array
        if (rawData.sendTrackingNumberTo.includes('@')) {
          processedData.sendTrackingNumberTo = [rawData.sendTrackingNumberTo];
        } else {
          processedData.sendTrackingNumberTo = [];
        }
      }
    } else if (!processedData.sendTrackingNumberTo) {
      processedData.sendTrackingNumberTo = [];
    }

    // Clean up "N/A" values and replace with null
    this.cleanNAValues(processedData);

    return processedData;
  }

  private cleanNAValues(data: any) {
    // List of fields that commonly have "N/A" values
    const fieldsToClean = [
      'contactName', 'phoneNumber', 'streetAddress', 'streetAddress1', 
      'city', 'state', 'zipCode', 'thridPartyAccountNumber', 'trackingNumber',
      'completedBy', 'comments'
    ];

    fieldsToClean.forEach(field => {
      if (data[field] === 'N/A' || data[field] === '' || data[field] === 'null') {
        data[field] = null;
      }
    });

    // Combine street addresses
    if (data.streetAddress1 && data.streetAddress1 !== 'N/A') {
      if (data.streetAddress && data.streetAddress !== 'N/A') {
        data.streetAddress = `${data.streetAddress}, ${data.streetAddress1}`;
      } else {
        data.streetAddress = data.streetAddress1;
      }
    }
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

  // Helper method to format service type display
  getServiceTypeDisplay(): string {
    if (this.data?.serviceType && this.data?.serviceTypeName) {
      return `${this.data.serviceTypeName} (${this.data.serviceType})`;
    }
    return this.safeDisplay(this.data?.serviceTypeName || this.data?.serviceType);
  }

  // Helper method to format address display
  getFullAddress(): string {
    const parts = [
      this.data?.streetAddress,
      this.data?.city,
      this.data?.state,
      this.data?.zipCode
    ].filter(part => part && part !== 'N/A' && part !== null);

    if (parts.length === 0) {
      return 'No address specified';
    }

    // Format as: Street Address, City, State ZIP
    const street = parts[0];
    const cityStateZip = parts.slice(1).join(' ');
    
    if (cityStateZip) {
      return `${street}, ${cityStateZip}`;
    }
    return street;
  }

  // Helper method to get status based on completion
  getStatus(): string {
    if (this.data?.completedDate && this.data.completedDate !== 'N/A') {
      return 'Completed';
    }
    if (this.data?.trackingNumber && this.data.trackingNumber !== 'N/A') {
      return 'In Transit';
    }
    if (this.data?.active === false) {
      return 'Cancelled';
    }
    return 'Pending';
  }

  // Helper method to get status badge class
  getStatusBadgeClass(): string {
    const status = this.getStatus();
    switch (status) {
      case 'Completed': return 'bg-success';
      case 'In Transit': return 'bg-info';
      case 'Cancelled': return 'bg-danger';
      default: return 'bg-warning';
    }
  }

  // Helper method to get time since created
  getTimeSinceCreated(): string {
    if (!this.data?.createdDate) return '';
    const now = new Date();
    const created = new Date(this.data.createdDate);
    const diffInMs = now.getTime() - created.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInDays / 30)} month${Math.floor(diffInDays / 30) > 1 ? 's' : ''} ago`;
  }

  // Helper method to check if tracking number is valid
  isTrackingNumberValid(): boolean {
    if (!this.data?.trackingNumber) return false;
    
    const trackingNumber = this.data.trackingNumber.toString().trim();
    
    return trackingNumber && 
           trackingNumber !== 'N/A' && 
           trackingNumber !== 'Not specified' &&
           trackingNumber !== '' &&
           trackingNumber !== '0' &&
           trackingNumber.length > 3;
  }

  // Helper method to get tracking URL (basic implementation)
  getTrackingUrl(): string | null {
    if (!this.isTrackingNumberValid()) return null;
    
    const trackingNumber = this.data.trackingNumber;
    // FedEx tracking pattern (example)
    if (/^\d{12}$|^\d{15}$/.test(trackingNumber)) {
      return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`;
    }
    // UPS tracking pattern (example)
    if (/^1Z[0-9A-Z]{16}$/.test(trackingNumber)) {
      return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    }
    // Generic tracking (fallback)
    return `https://www.google.com/search?q=track+package+${trackingNumber}`;
  }

  // Helper method to format cost with proper currency
  getFormattedCost(): string {
    if (!this.data?.cost) return 'Not specified';
    
    const cost = parseFloat(this.data.cost);
    if (isNaN(cost)) return 'Not specified';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cost);
  }

  // Helper method to get priority level
  getPriorityLevel(): string {
    if (this.data?.saturdayDelivery === 'Yes') return 'High Priority';
    if (this.data?.serviceType?.toLowerCase().includes('overnight') || 
        this.data?.serviceType?.toLowerCase().includes('express')) return 'Express';
    return 'Standard';
  }

  // Helper method to get priority badge class
  getPriorityBadgeClass(): string {
    const priority = this.getPriorityLevel();
    switch (priority) {
      case 'High Priority': return 'bg-danger';
      case 'Express': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }

  // Helper method to check if request is urgent
  isUrgent(): boolean {
    const now = new Date();
    const created = new Date(this.data?.createdDate);
    const diffInDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    
    return diffInDays > 3 && this.getStatus() === 'Pending';
  }

  // Helper method to validate email format
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Method to copy tracking number to clipboard
  async copyTrackingNumber() {
    if (!this.isTrackingNumberValid()) return;
    
    try {
      await navigator.clipboard.writeText(this.data.trackingNumber);
      this.toastrService.success('Tracking number copied to clipboard');
    } catch (err) {
      this.toastrService.error('Failed to copy tracking number');
    }
  }

  // Method to share request details
  shareRequest() {
    const subject = `Shipping Request #${this.id} - ${this.data?.companyName || 'Unknown Company'}`;
    const body = `Shipping Request Details:
    
Request ID: ${this.id}
Company: ${this.data?.companyName || 'N/A'}
Contact: ${this.data?.contactName || 'N/A'}
Status: ${this.getStatus()}
${this.isTrackingNumberValid() ? `Tracking: ${this.data.trackingNumber}` : ''}
    
View full details: ${window.location.href}`;
    
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto);
  }

  // Method to print request
  printRequest() {
    window.print();
  }
}