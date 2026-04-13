import { Component, Input, OnInit } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { MaterialRequestService } from "@app/core/api/operations/material-request/material-request.service";
import { MaterialRequestDetailService } from "@app/core/api/operations/material-request/material-request-detail.service";
import { NAVIGATION_ROUTE } from "../material-request-constant";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-material-request-view",
  templateUrl: "./material-request-view.component.html",
})
export class MaterialRequestViewComponent implements OnInit {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: MaterialRequestService,
    private materialRequestDetailService: MaterialRequestDetailService,
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

  title = "View Material Request";
  id = null;
  data: any;
  details: any[] = [];
  currentInfo: any;
  isLoading = false;

  @Input() goBack: Function;

  async getData() {
    try {
      this.isLoading = true;
      let data = this.currentInfo = await this.api.getById(this.id);
      this.details = await this.materialRequestDetailService.find({ mrf_id: data.id });
      
      // Store the main data for template access
      this.data = data;
      
      this.isLoading = false;
    } catch (err) {
      this.toastrService.error("Error loading material request data");
      this.isLoading = false;
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

  // Helper method to get status based on status field
  getStatus(): string {
    // Determine status based on available data
    if (this.data?.active === 0) return 'Inactive';
    if (this.data?.pickedCompletedDate) return 'Completed';
    if (this.data?.validated) return 'Validated';
    if (this.data?.queue_status === 'complete') return 'Complete';
    if (this.data?.queue_status === 'in-progress') return 'In Progress';
    return 'Pending';
  }

  // Helper method to get status badge class
  getStatusBadgeClass(): string {
    const status = this.getStatus().toLowerCase();
    switch (status) {
      case 'approved': 
      case 'completed': 
      case 'fulfilled': return 'bg-success';
      case 'pending': 
      case 'in-progress': 
      case 'processing': return 'bg-warning text-dark';
      case 'rejected': 
      case 'cancelled': return 'bg-danger';
      case 'draft': return 'bg-secondary';
      default: return 'bg-info';
    }
  }

  // Helper method to get priority badge class
  getPriorityBadgeClass(): string {
    const priority = this.data?.priority?.toLowerCase();
    switch (priority) {
      case 'high': 
      case 'urgent': return 'bg-danger';
      case 'medium': 
      case 'normal': return 'bg-warning text-dark';
      case 'low': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  // Helper method to get queue status badge class
  getQueueStatusBadgeClass(): string {
    const status = this.data?.queue_status?.toLowerCase();
    switch (status) {
      case 'complete': 
      case 'completed': return 'bg-success';
      case 'in-progress': 
      case 'processing': return 'bg-warning text-dark';
      case 'pending': return 'bg-info';
      case 'cancelled': 
      case 'failed': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  // Helper method to get time since created
  getTimeSinceCreated(): string {
    if (!this.data?.createdDate && !this.data?.created_at) return '';
    
    const createdField = this.data?.createdDate || this.data?.created_at;
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
    if (!this.data?.createdDate && !this.data?.created_at) return false;
    
    const createdField = this.data?.createdDate || this.data?.created_at;
    const now = new Date();
    const created = new Date(createdField);
    const diffInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    
    return diffInHours <= 24; // Less than 24 hours old
  }

  // Helper method to get request number display
  getRequestNumberDisplay(): string {
    const requestNumber = this.data?.id;
    if (!requestNumber) {
      return 'Not generated';
    }
    return requestNumber;
  }

  // Method to copy request number to clipboard
  async copyRequestNumber() {
    const requestNumber = this.getRequestNumberDisplay();
    if (requestNumber === 'Not generated') return;
    
    try {
      await navigator.clipboard.writeText(requestNumber);
      this.toastrService.success('Material request number copied to clipboard');
    } catch (err) {
      this.toastrService.error('Failed to copy material request number');
    }
  }

  // Method to share record details
  shareRecord() {
    const subject = `Material Request #${this.getRequestNumberDisplay()} - ${this.data?.assemblyNumber || 'Unknown'}`;
    const body = `Material Request Details:
    
Request ID: ${this.id}
Assembly Number: ${this.safeDisplay(this.data?.assemblyNumber)}
Requestor: ${this.safeDisplay(this.data?.requestor)}
Line Number: ${this.safeDisplay(this.data?.lineNumber)}
Pick List: ${this.safeDisplay(this.data?.pickList)}
Status: ${this.getStatus()}
Priority: ${this.safeDisplay(this.data?.priority)}
Due Date: ${this.data?.dueDate || 'Not set'}
Created: ${this.data?.createdDate || 'Unknown'}
    
View full details: ${window.location.href}`;
    
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto);
  }

  // Method to print record
  printRecord() {
    window.print();
  }

  // Method to calculate total value of all request line items
  getRequestTotalValue(): number {
    if (!this.details || this.details.length === 0) return 0;
    
    return this.details.reduce((total, item) => {
      const quantity = parseFloat(item?.qty || 0);
      const cost = parseFloat(item?.cost || 0);
      return total + (quantity * cost);
    }, 0);
  }

  // Method to get count of picked items
  getPickedItemsCount(): number {
    if (!this.details || this.details.length === 0) return 0;
    return this.details.filter(item => item?.qtyPicked && parseFloat(item.qtyPicked) > 0).length;
  }

  // Method to get last picked information
  getLastPickedInfo(): string | null {
    if (!this.details || this.details.length === 0) return null;
    
    const pickedItems = this.details
      .filter(item => item?.printedDate && item?.printedBy)
      .sort((a, b) => new Date(b.printedDate).getTime() - new Date(a.printedDate).getTime());
    
    if (pickedItems.length === 0) return null;
    
    const lastPicked = pickedItems[0];
    return `${lastPicked.printedBy} on ${new Date(lastPicked.printedDate).toLocaleDateString()}`;
  }

  // Method to get count of items pending validation
  getPendingValidationCount(): number {
    if (!this.details || this.details.length === 0) return 0;
    return this.details.filter(item => item?.validationStatus === 'pending').length;
  }

  // Method to get count of items with validation errors
  getValidationErrors(): number {
    if (!this.details || this.details.length === 0) return 0;
    return this.details.filter(item => item?.hasError === '1' || item?.hasError === 1).length;
  }
}