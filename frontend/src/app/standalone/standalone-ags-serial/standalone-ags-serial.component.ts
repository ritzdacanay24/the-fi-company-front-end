import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import moment from "moment";
import { AgsSerialFormComponent } from "@app/pages/quality/ags-serial/ags-serial-form/ags-serial-form.component";
import { AgsSerialService } from "@app/core/api/quality/ags-serial.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { SharedModule } from "@app/shared/shared.module";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { PublicFormWrapperComponent } from "../public-form-wrapper/public-form-wrapper.component";
import { ZebraLabelPrintModalService } from '@app/shared/components/zebra-label-print-modal/zebra-label-print-modal.service';

@Component({
  standalone: true,
  imports: [SharedModule, AgsSerialFormComponent, PublicFormWrapperComponent],
  selector: "app-standalone-ags-serial",
  templateUrl: "./standalone-ags-serial.component.html",
  styleUrls: ["./standalone-ags-serial.component.scss"],
})
export class StandaloneAgsSerialComponent implements OnInit {
  // Input to determine if this form is embedded in another component (like workflow)
  @Input() isEmbedded = false;
  
  // Output to emit form data to parent component (for embedded mode)
  @Output() formSubmit = new EventEmitter<any>();

  constructor(
    private router: Router,
    private api: AgsSerialService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private zebraLabelPrintModalService: ZebraLabelPrintModalService
  ) {}

  ngOnInit(): void {
    // Component initialization
    this.loadWorkflowData();
    
    // If embedded, auto-authenticate using current stored user
    if (this.isEmbedded) {
      this.autoAuthenticateWhenEmbedded();
    }
  }

  form: FormGroup;
  isLoading = false;
  submitted = false;
  isAuthenticated = false;
  currentUser: any = null;
  showSuccessMessage = false;
  createdAssetData: any = null;
  
  // Workflow data from eyefi-serial-workflow
  pendingWorkflowData: any = null;

  private autoAuthenticateWhenEmbedded(): void {
    // Get current user from auth service
    const currentUser = this.authenticationService.currentUserValue;
    if (currentUser) {
      console.log('Auto-authenticating embedded AGS form with current user:', currentUser);
      this.onAuthenticationComplete({ user: currentUser });
    }
  }

  private loadWorkflowData(): void {
    const workflowDataStr = sessionStorage.getItem('eyefiWorkflowData');
    if (workflowDataStr) {
      try {
        const workflowData = JSON.parse(workflowDataStr);
        console.log('Loading workflow data:', workflowData);
        
        // Store for later use when form is ready
        this.pendingWorkflowData = workflowData;
        
        // Clear from session storage
        sessionStorage.removeItem('eyefiWorkflowData');
        
        this.toastrService.info(`Pre-filling form with Serial: ${workflowData.serialNumber}`, 'Workflow Data Loaded');
      } catch (error) {
        console.error('Error parsing workflow data:', error);
      }
    }
  }

  onAuthenticationComplete(event: any): void {
    console.log('Authentication complete:', event);
    this.isAuthenticated = true;
    this.currentUser = event?.user || this.authenticationService.currentUserValue;
    
    // Initialize form with current user data after authentication
    setTimeout(() => {
      if (this.form) {
        this.form.patchValue(
          {
            inspectorName: this.currentUser?.full_name,
            timeStamp: moment().format("YYYY-MM-DD HH:mm:ss"),
            created_by: this.currentUser?.id,
            lastUpdate: moment().format("YYYY-MM-DD HH:mm:ss"),
          },
          { emitEvent: false }
        );
      }
    }, 100);
  }

  onUserLoggedOut(): void {
    console.log('User logged out');
    this.isAuthenticated = false;
    this.currentUser = null;
    this.showSuccessMessage = false;
    this.resetForm();
  }

  setFormEmitter($event) {
    this.form = $event;
    if (this.isAuthenticated && this.currentUser) {
      this.form.patchValue(
        {
          inspectorName: this.currentUser.full_name,
          timeStamp: moment().format("YYYY-MM-DD HH:mm:ss"),
          created_by: this.currentUser.id,
          lastUpdate: moment().format("YYYY-MM-DD HH:mm:ss"),
        },
        { emitEvent: false }
      );
      
      // Apply workflow data if available
      if (this.pendingWorkflowData) {
        this.applyWorkflowDataToForm();
      }
    }
  }

  private applyWorkflowDataToForm(): void {
    if (!this.form || !this.pendingWorkflowData) {
      return;
    }

    console.log('Applying workflow data to form:', this.pendingWorkflowData);

    // Pre-fill the EyeFi serial number field (in AGS, it's called 'serialNumber')
    if (this.pendingWorkflowData.serialNumber) {
      this.form.patchValue({
        serialNumber: this.pendingWorkflowData.serialNumber
      }, { emitEvent: false });
      
      console.log('Pre-filled EyeFi Serial Number:', this.pendingWorkflowData.serialNumber);
    }

    // Store additional workflow data for reference
    if (this.pendingWorkflowData.ulNumber) {
      console.log('UL Number from workflow:', this.pendingWorkflowData.ulNumber);
    }

    if (this.pendingWorkflowData.customer) {
      console.log('Customer from workflow:', this.pendingWorkflowData.customer);
    }

    // Clear pending data after applying
    this.pendingWorkflowData = null;
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      this.toastrService.warning("Please fill in all required fields");
      // Mark all fields as touched to show validation errors
      Object.keys(this.form.controls).forEach(key => {
        this.form.controls[key].markAsTouched();
      });
      return;
    }

    // If embedded, emit form data to parent component instead of submitting directly
    if (this.isEmbedded) {
      console.log('Embedded mode: Emitting form data to parent workflow');
      this.formSubmit.emit({
        formValue: this.form.value,
        formValid: this.form.valid
      });
      return;
    }

    // Standalone mode: Handle submission directly
    // Check for duplicate AGS serial if provided
    if (this.form.value?.generated_SG_asset) {
      let data = await this.api.checkIfSerialIsFound(
        this.form.value?.generated_SG_asset
      );

      if (data) {
        const { value: accept } = await SweetAlert.confirmV1({
          title:
            "Duplicate AGS serial found. Are you sure you want to continue?",
        });
        if (!accept) return;
      }
    }

    try {
      this.isLoading = true;
      const response = await this.api.create(this.form.value);
      this.isLoading = false;
      
      // Store the created asset data with timestamp
      this.createdAssetData = {
        ...this.form.value,
        timeStamp: moment().format("YYYY-MM-DD HH:mm:ss"),
        insertId: response?.insertId
      };
      
      this.toastrService.success("AGS Serial Created Successfully!");
      this.showSuccessMessage = true;
      this.submitted = false;
    } catch (err) {
      this.isLoading = false;
      this.toastrService.error("Error creating AGS serial");
      console.error('Error creating AGS serial:', err);
    }
  }

  createAnother(): void {
    this.showSuccessMessage = false;
    this.createdAssetData = null;
    this.resetForm();
  }

  resetForm() {
    this.submitted = false;
    if (this.form) {
      this.form.reset();
      if (this.isAuthenticated && this.currentUser) {
        this.form.patchValue(
          {
            inspectorName: this.currentUser.full_name,
            timeStamp: moment().format("YYYY-MM-DD HH:mm:ss"),
            created_by: this.currentUser.id,
            lastUpdate: moment().format("YYYY-MM-DD HH:mm:ss"),
          },
          { emitEvent: false }
        );
      }
    }
  }

  logout(): void {
    this.onUserLoggedOut();
  }

  formatTimestamp(timestamp: string): string {
    if (!timestamp) return '';
    return moment(timestamp).format('MM/DD/YYYY hh:mm A');
  }

  printLabel(): void {
    const eyefiSerial = this.createdAssetData?.serialNumber;
    
    if (!eyefiSerial) {
      this.toastrService.warning('No EyeFi serial number found to print');
      return;
    }

    this.zebraLabelPrintModalService.open({
      serialNumber: eyefiSerial,
      title: 'Print AGS Asset Label',
      partNumber: this.createdAssetData?.generated_SG_asset || ''
    });
  }
}
