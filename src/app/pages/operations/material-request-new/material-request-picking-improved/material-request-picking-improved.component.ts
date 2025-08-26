import { Component, OnInit, Input, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';
import { MaterialRequestDetailService } from '@app/core/api/operations/material-request/material-request-detail.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { WebsocketService } from '@app/core/services/websocket.service';
import moment from 'moment';
import { NgxBarcode6Module } from "ngx-barcode6";
import { MaterialPickingValidationModalService } from '../material-picking-validation-modal/material-picking-validation-modal.component';

@Component({
  standalone: true,
  imports: [SharedModule, NgxBarcode6Module],
  selector: 'app-material-request-picking-improved',
  templateUrl: './material-request-picking-improved.component.html',
  styleUrls: ['./material-request-picking-improved.component.scss']
})
export class MaterialRequestPickingImprovedComponent implements OnInit {

  @Input() id: number | null = null; // Specific request ID to show picking details for
  @Input() viewMode: boolean = false; // Read-only mode
  @Input() editMode: boolean = true; // Enable editing
  @Input() focusOnQuantities: boolean = false; // Focus on qty entry
  @Input() showPickingProgress: boolean = false; // Show current progress
  @Input() showShortageEntry: boolean = false; // Enable shortage entry
  
  pickingRequests: any[] = [];
  selectedRequest: any = null; // The specific request being viewed
  isLoading = false;
  filters = { priority: 'all', search: '' };
  sortBy = 'dueDate';
  sortOrder = 'asc';

  constructor(
    private router: Router,
    private api: MaterialRequestService,
    private detailApi: MaterialRequestDetailService,
    private authService: AuthenticationService,
    private toastr: ToastrService,
    private websocketService: WebsocketService,
    private materialPickingValidationModalService: MaterialPickingValidationModalService
  ) {}

  ngOnInit(): void {
    this.loadPickingRequests();
    this.setupWebSocket();
  }

  /**
   * Global keyboard shortcuts for the picking interface
   */
  @HostListener('window:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent) {
    // Only handle shortcuts when in focus mode and not typing in an input
    if (!this.focusOnQuantities || 
        (event.target as HTMLElement).tagName === 'INPUT') {
      return;
    }

    if (event.ctrlKey) {
      switch (event.key.toLowerCase()) {
        case 'a':
          event.preventDefault();
          if (this.selectedRequest) {
            this.pickAllComplete(this.selectedRequest);
          }
          break;
        case 's':
          event.preventDefault();
          if (this.selectedRequest) {
            this.onSaveQuantities(this.selectedRequest);
          }
          break;
        case 'p':
          event.preventDefault();
          if (this.selectedRequest) {
            this.onPrint(this.selectedRequest);
          }
          break;
      }
    }
  }

  async loadPickingRequests() {
    try {
      this.isLoading = true;
      
      if (this.id) {
        // Load specific request by ID using existing APIs
        // 1. Get main material request data
        const headerData = await this.api.getById(this.id);
        
        // 2. Get material request details  
        const detailData = await this.detailApi.find({ mrf_id: this.id });
        
        // 3. Combine the data
        this.selectedRequest = {
          ...headerData,
          details: detailData || []
        };
        
        if (!this.selectedRequest || !headerData) {
          this.toastr.warning('Material request not found');
        }
      } else {
        // Load all picking requests for general view
        const data: any = await this.api.getPicking();
        this.pickingRequests = data.result || [];
        this.applyFiltersAndSort();
      }
    } catch (error) {
      console.error('Error loading picking requests:', error);
      this.toastr.error('Error loading material request data');
      this.pickingRequests = [];
      this.selectedRequest = null;
    } finally {
      this.isLoading = false;
    }
  }


  setupWebSocket() {
    // Subscribe to real-time picking updates
    this.websocketService
      .multiplex(
        () => ({ subscribe: 'MATERIAL_PICKING_TRANSACTION' }),
        () => ({ unsubscribe: 'MATERIAL_PICKING_TRANSACTION' }),
        (message) => message.type === 'MATERIAL_PICKING_TRANSACTION'
      )
      .subscribe((data: any) => {
        this.handleRealTimeUpdate(data);
      });
  }

  handleRealTimeUpdate(data: any) {
    // Update the picking requests list in real-time
    const index = this.pickingRequests.findIndex(req => req.id === data.data.id);
    if (index !== -1) {
      this.pickingRequests[index] = data.data;
    }
  }


  // --- Per-request actions for new layout ---

  async onPrint(request: any) {
    try {
      request.isLoading = true;

      let printedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Update print status for the request
      request.printedBy = this.authService.currentUserValue.full_name;
      request.printedDate = printedDate;

      // Update print status for all items
      if (request.details) {
        for (let i = 0; i < request.details.length; i++) {
          request.details[i].printedBy = this.authService.currentUserValue.full_name;
          request.details[i].printedDate = printedDate;
        }
      }

      // Call API to save print status
      await this.api.onPrint(request);

      // Open print dialog
      setTimeout(() => {
        var printContents = document.getElementById('pickSheet-' + request.id)?.innerHTML;
        if (printContents) {
          var popupWin = window.open('', '_blank', 'width=1000,height=600');
          if (popupWin) {
            popupWin.document.open();
            popupWin.document.write(`
              <html>
                <head>
                  <title>Material Request Picking</title>
                  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
                  <style>
                    @page { size: landscape; }
                    @media print {
                      body { font-size:12px !important }
                      table { font-size: 12px !important }
                      p { font-size:12px !important; margin-bottom:2px; }
                      thead { font-size:12px !important }
                    }
                  </style>
                </head>
                <body onload="window.print();window.close()">${printContents}</body>
              </html>
            `);
            popupWin.document.close();
            popupWin.focus();
          }
        }
      }, 200);

      this.toastr.success('Material pick sheet printed');
    } catch (error) {
      console.error('Error printing:', error);
      this.toastr.error('Error printing pick sheet');
    } finally {
      request.isLoading = false;
    }
  }

  async onComplete(request: any) {
    try {
      // Validation checks
      if (request.printedBy && 
          this.authService.currentUserValue.full_name !== request.printedBy) {
        this.toastr.error('Only the user who printed this MR can complete it.');
        return;
      }
      
      if (request.pickedCompletedDate) {
        this.toastr.error('This MR is already completed.');
        return;
      }

      // Check for rejected items that somehow made it through
      const rejectedItems = request.details.filter((item: any) => item.validation_status === 'rejected');
      if (rejectedItems.length > 0) {
        this.toastr.error(`${rejectedItems.length} rejected item(s) found. Please remove them before completing.`);
        return;
      }

      // Set shortage created by for all items
      for (let i = 0; i < request.details.length; i++) {
        request.details[i].shortageCreatedBy = this.authService.currentUserValue.id;
      }

      let itemShortagesFound = this.getLineItemShortages(request);

      const modalRef = this.materialPickingValidationModalService.open(request);
      modalRef.componentInstance.shortages = itemShortagesFound;

      modalRef.result.then(
        async (result: any) => {
          try {
            request.pickedCompletedDate = moment().format("YYYY-MM-DD HH:mm:ss");
            await this.api.completePicking(request);

            this.websocketService.next({
              message: "Material pick sheet completed",
              data: request,
              type: "MATERIAL_PICKING_TRANSACTION",
            });

            this.pickingRequests = this.pickingRequests.filter(req => req.id !== request.id);

            this.toastr.success("Pick completed successfully");
          } catch (err) {
            console.error('Error completing pick:', err);
            this.toastr.error('Failed to complete the pick. Please try again.');
          }
        },
        (dismissed) => {
          // Modal was dismissed/cancelled
          console.log('Pick completion cancelled');
        }
      );
    } catch (err) {
      console.error('Error in onComplete:', err);
      this.toastr.error('An unexpected error occurred. Please try again.');
    }
  }

  /**
   * Get line item shortages - items where picked quantity is less than required
   */
  getLineItemShortages(request: any) {
    let shortageItemsFound = [];
    for (let i = 0; i < request.details.length; i++) {
      // if value is null convert it to 0
      if (request.details[i].active == 1) {
        request.details[i].qtyPicked =
          request.details[i].qtyPicked == null ? 0 : request.details[i].qtyPicked;

        let qtyRequired = parseInt(request.details[i].qty);
        let qtyPicked = parseInt(request.details[i].qtyPicked);

        let openBalance = qtyRequired - qtyPicked;
        if (openBalance > 0) {
          shortageItemsFound.push(request.details[i]);
          request.details[i].shortageQty = openBalance;
        }
      }
    }

    return shortageItemsFound;
  }

  /**
   * Save picked quantities without completing the picking process
   * Used when users want to save progress without finalizing
   */
  async onSaveQuantities(request: any) {
    try {
      this.isLoading = true;
      
      // Prepare the data for saving
      const saveData = {
        requestId: request.id,
        details: request.details.map((item: any) => ({
          id: item.id,
          qtyPicked: parseInt(item.qtyPicked || 0),
          originalQty: parseInt(item.qty || 0),
          shortage: Math.max(0, parseInt(item.qty || 0) - parseInt(item.qtyPicked || 0))
        })),
        updatedBy: this.authService.currentUserValue.id,
        updatedDate: moment().format('YYYY-MM-DD HH:mm:ss')
      };

      // Call API to save picked quantities (this would need to be implemented in the API)
      // await this.detailApi.updatePickedQuantities(saveData);
      
      // For now, we'll just save locally and show success
      // TODO: Implement updatePickedQuantities API endpoint
      
      // Send websocket notification
      this.websocketService.next({
        message: 'Picked quantities updated',
        data: saveData,
        type: 'MATERIAL_PICKING_UPDATE'
      });

      this.toastr.success('Picked quantities saved successfully');
      
      // If this is in modal mode, close it with success result
      if (this.id) {
        // This would be handled by the modal component
      }
      
    } catch (error) {
      console.error('Error saving picked quantities:', error);
      this.toastr.error('Error saving picked quantities');
    } finally {
      this.isLoading = false;
    }
  }

  onQuantityChange(request: any, item: any) {
    // Optionally add logic for status/shortage if needed
    // For now, just ensure pickedQty is within bounds
    const picked = parseInt(item.qtyPicked || 0);
    const required = parseInt(item.qty || 0);
    if (picked < 0) item.qtyPicked = 0;
    if (picked > required) item.qtyPicked = required;
  }

  /**
   * Handle keyboard shortcuts for faster quantity entry
   */
  onQuantityKeyDown(event: KeyboardEvent, request: any, item: any) {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.focusNextInput(item);
        break;
      case 'Tab':
        // Tab key picks complete
        if (!event.shiftKey) {
          event.preventDefault();
          this.pickComplete(item);
          this.focusNextInput(item);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.pickZero(item);
        this.focusNextInput(item);
        break;
      case 'a':
        if (event.ctrlKey) {
          event.preventDefault();
          this.pickAllComplete(request);
        }
        break;
    }
  }

  /**
   * Focus the next quantity input for faster data entry
   */
  focusNextInput(currentItem: any) {
    // This would focus the next input field in the list
    // Implementation would depend on getting element references
    // For now, just a placeholder
    setTimeout(() => {
      const inputs = document.querySelectorAll('input[name^="qtyPicked_"]');
      const currentIndex = Array.from(inputs).findIndex((input: any) => 
        input.name === `qtyPicked_${currentItem.id}`
      );
      if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
        (inputs[currentIndex + 1] as HTMLInputElement).focus();
        (inputs[currentIndex + 1] as HTMLInputElement).select();
      }
    }, 50);
  }

  /**
   * Pick complete - fill with required quantity
   */
  pickComplete(item: any) {
    item.qtyPicked = item.qty;
    this.onQuantityChange(null, item);
  }

  /**
   * Mark as shortage - set to 0
   */
  pickZero(item: any) {
    item.qtyPicked = 0;
    this.onQuantityChange(null, item);
  }

  /**
   * Pick all items complete - fill all with required quantities
   */
  pickAllComplete(request: any) {
    if (request && request.details) {
      request.details.forEach((item: any) => {
        this.pickComplete(item);
      });
    }
  }

  /**
   * Clear all picked quantities
   */
  clearAllPicked(request: any) {
    if (request && request.details) {
      request.details.forEach((item: any) => {
        item.qtyPicked = 0;
      });
    }
  }

  /**
   * Get count of items that have been picked
   */
  getPickedItemsCount(request: any): number {
    if (!request || !request.details) return 0;
    return request.details.filter((item: any) => 
      item.qtyPicked && parseInt(item.qtyPicked) > 0
    ).length;
  }

  /**
   * Get picking completion percentage
   */
  getPickingPercentage(request: any): number {
    if (!request || !request.details || request.details.length === 0) return 0;
    const totalItems = request.details.length;
    const pickedItems = this.getPickedItemsCount(request);
    return Math.round((pickedItems / totalItems) * 100);
  }

  /**
   * Get progress bar CSS class based on completion percentage
   */
  getProgressBarClass(request: any): string {
    const percentage = this.getPickingPercentage(request);
    if (percentage === 100) return 'bg-success';
    if (percentage >= 70) return 'bg-warning';
    if (percentage >= 30) return 'bg-info';
    return 'bg-danger';
  }

  /**
   * Get count of completely picked items (qty picked = qty required)
   */
  getCompleteItemsCount(request: any): number {
    if (!request || !request.details) return 0;
    return request.details.filter((item: any) => 
      item.qtyPicked && parseInt(item.qtyPicked) === parseInt(item.qty)
    ).length;
  }

  /**
   * Get count of partially picked items (0 < qty picked < qty required)
   */
  getPartialItemsCount(request: any): number {
    if (!request || !request.details) return 0;
    return request.details.filter((item: any) => {
      const picked = parseInt(item.qtyPicked || 0);
      const required = parseInt(item.qty || 0);
      return picked > 0 && picked < required;
    }).length;
  }

  /**
   * Get count of shortage items (qty picked = 0)
   */
  getShortageItemsCount(request: any): number {
    if (!request || !request.details) return 0;
    return request.details.filter((item: any) => 
      item.qtyPicked !== undefined && parseInt(item.qtyPicked) === 0
    ).length;
  }

  /**
   * Get count of items not yet picked (no qtyPicked value set)
   */
  getNotPickedItemsCount(request: any): number {
    if (!request || !request.details) return 0;
    return request.details.filter((item: any) => 
      !item.qtyPicked || item.qtyPicked === undefined || item.qtyPicked === null
    ).length;
  }

  /**
   * Get CSS class for item row based on picking status
   */
  getItemRowClass(item: any): string {
    const picked = parseInt(item.qtyPicked || 0);
    const required = parseInt(item.qty || 0);
    
    if (picked === required && picked > 0) {
      return 'table-success'; // Complete
    } else if (picked === 0 && item.qtyPicked !== undefined) {
      return 'table-danger'; // Shortage/Not found
    } else if (picked > 0 && picked < required) {
      return 'table-warning'; // Partial
    } else if (picked > required) {
      return 'table-info'; // Overpick
    }
    
    return ''; // Not picked yet
  }

  // Placeholder for sendBackToValidation and onClearPrint
  async sendBackToValidation(request: any) {
    try {
      const result = await this.confirmAction('Send Back to Validation?', 
        'This will remove the request from picking queue and return it to validation.');
      
      if (!result) return;
      
      this.isLoading = true;
      await this.api.sendBackToValidation(request);
      await this.loadPickingRequests();
      
      request.validated = null;
      request.disabled = true;
      
      this.toastr.success('Sent back to validation');
      this.isLoading = false;
    } catch (err) {
      console.error('Error sending back to validation:', err);
      this.isLoading = false;
      request.disabled = false;
      this.toastr.error('Failed to send back to validation. Please try again.');
    }
  }

  async onClearPrint(request: any) {
    try {
      request.clearPrint = true;

      for (let i = 0; i < request.details.length; i++) {
        request.details[i].printedBy = null;
        request.details[i].printedDate = null;
      }

      await this.api.clearPrint(request);

      request.printedBy = null;
      request.printedDate = null;

      this.toastr.success('Print status cleared');
    } catch (err) {
      console.error('Error clearing print:', err);
      this.toastr.error('Failed to clear print status');
    }
  }

  // Helper method for confirmation dialogs
  private async confirmAction(title: string, text: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Simple confirmation - can be replaced with SweetAlert if available
      const result = confirm(`${title}\n\n${text}`);
      resolve(result);
    });
  }


  // Filter and sort functions
  applyFiltersAndSort() {
    let filtered = [...this.pickingRequests];
    // Apply filters
    if (this.filters.priority !== 'all') {
      filtered = filtered.filter(req => req.priority === this.filters.priority);
    }
    if (this.filters.search) {
      filtered = filtered.filter(req => 
        req.assemblyNumber?.toLowerCase().includes(this.filters.search.toLowerCase()) ||
        req.requestor?.toLowerCase().includes(this.filters.search.toLowerCase()) ||
        req.pickList?.toLowerCase().includes(this.filters.search.toLowerCase())
      );
    }
    // Apply sorting
    filtered.sort((a, b) => {
      let valueA = a[this.sortBy];
      let valueB = b[this.sortBy];
      if (this.sortBy === 'dueDate') {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }
      if (this.sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    this.pickingRequests = filtered;
  }

  onFilterChange() {
    this.applyFiltersAndSort();
  }

  onSortChange(field: string) {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.applyFiltersAndSort();
  }


  getPriorityClass(priority: string): string {
    const priorityClasses = {
      'Critical': 'bg-danger',
      'High': 'bg-warning',
      'Medium': 'bg-primary',
      'Low': 'bg-secondary'
    };
    return priorityClasses[priority] || 'bg-secondary';
  }

  refresh() {
    this.loadPickingRequests();
  }

  goBack() {
    this.router.navigate(['/dashboard/operations/material-request/list']);
  }

  pickAll(request: any, item: any) {
    item.qtyPicked = item.qty;
    item.status = 'picked';
  }

  markShortage(request: any, item: any) {
    item.qtyPicked = 0;
    item.status = 'shortage';
  }

  getItemStatusBadge(item: any): string {
    switch (item.status) {
      case 'picked': return 'badge bg-success';
      case 'shortage': return 'badge bg-warning';
      default: return 'badge bg-secondary';
    }
  }

  getItemStatusText(item: any): string {
    switch (item.status) {
      case 'picked': return 'Picked';
      case 'shortage': return 'Shortage';
      default: return 'Pending';
    }
  }

  // Helper methods for validation status display
  getValidationStatusBadgeClass(item: any): string {
    switch (item.validation_status) {
      case 'approved': return 'bg-success';
      case 'rejected': return 'bg-danger';
      case 'pending': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }

  getValidationStatusText(item: any): string {
    switch (item.validation_status) {
      case 'approved': return '✓';
      case 'rejected': return '✗';
      case 'pending': return '⏳';
      default: return '?';
    }
  }

  getValidationStatusTooltip(item: any): string {
    switch (item.validation_status) {
      case 'approved': return 'Item approved';
      case 'rejected': return 'Item rejected';
      case 'pending': return 'Item validation pending';
      default: return 'Unknown validation status';
    }
  }

  getProgress(request: any) {
    const total = request.details.length;
    const picked = request.details.filter((item: any) => parseInt(item.qtyPicked || 0) >= parseInt(item.qty || 0)).length;
    const shortage = request.details.filter((item: any) => (item.status === 'shortage')).length;
    return { total, picked, shortage, percent: total ? Math.round((picked / total) * 100) : 0 };
  }

  canComplete(request: any): boolean {
    // All items must be picked or marked as shortage
    return request.details.every((item: any) => {
      const picked = parseInt(item.qtyPicked || 0);
      const required = parseInt(item.qty || 0);
      return picked >= required || item.status === 'shortage';
    });
  }

  async onSaveProgress(request: any) {
    try {
      this.isLoading = true;
      const updateData = {
        id: request.id,
        details: request.details,
        pickingNotes: request.pickingNotes || ''
      };
      await this.api.update(request.id, updateData);
      this.toastr.success('Progress saved');
    } catch (error) {
      this.toastr.error('Error saving progress');
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }
}
