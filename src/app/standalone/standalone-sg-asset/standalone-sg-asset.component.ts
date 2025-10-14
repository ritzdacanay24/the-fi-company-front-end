import { Component, OnInit } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import moment from "moment";
import { SgAssetFormComponent } from "@app/pages/quality/sg-asset/sg-asset-form/sg-asset-form.component";
import { SgAssetService } from "@app/core/api/quality/sg-asset.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { SharedModule } from "@app/shared/shared.module";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import { PublicFormWrapperComponent } from "../public-form-wrapper/public-form-wrapper.component";

@Component({
  standalone: true,
  imports: [SharedModule, SgAssetFormComponent, PublicFormWrapperComponent],
  selector: "app-standalone-sg-asset",
  templateUrl: "./standalone-sg-asset.component.html",
  styleUrls: ["./standalone-sg-asset.component.scss"],
})
export class StandaloneSgAssetComponent implements OnInit {
  constructor(
    private router: Router,
    private api: SgAssetService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {
    // Component initialization
  }

  form: FormGroup;
  isLoading = false;
  submitted = false;
  isAuthenticated = false;
  currentUser: any = null;
  showSuccessMessage = false;
  createdAssetData: any = null;

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
    }
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

    // Check for duplicate SG asset if provided
    if (this.form.value?.generated_SG_asset) {
      let data = await this.api.checkIfSerialIsFound(
        this.form.value?.generated_SG_asset
      );

      if (data) {
        const { value: accept } = await SweetAlert.confirmV1({
          title:
            "Duplicate SG asset found. Are you sure you want to continue?",
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
      
      this.toastrService.success("Light and Wonder Asset Created Successfully!");
      this.showSuccessMessage = true;
      this.submitted = false;
    } catch (err) {
      this.isLoading = false;
      
      // Extract the error message
      let errorMessage = 'An error occurred while creating the Light and Wonder Asset';
      
      if (err?.error?.message) {
        errorMessage = err.error.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err?.error === 'string') {
        errorMessage = err.error;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Check if it's an EyeFi serial duplicate error
      if (errorMessage.includes('EyeFi serial') || 
          errorMessage.includes('SQLSTATE[45000]') || 
          errorMessage.includes('unique_sg_eyefi_serial') ||
          errorMessage.includes('Duplicate entry')) {
        
        const triggerMatch = errorMessage.match(/EyeFi serial "([^"]+)" is already ([^.]+)\./);
        if (triggerMatch) {
          errorMessage = `EyeFi serial "${triggerMatch[1]}" is already ${triggerMatch[2]}. Please select a different serial.`;
        } else {
          const uniqueMatch = errorMessage.match(/Duplicate entry '([^']+)' for key/);
          if (uniqueMatch) {
            errorMessage = `EyeFi serial "${uniqueMatch[1]}" is already in use. Please select a different serial.`;
          } else {
            errorMessage = 'This EyeFi serial number is already in use. Please select a different serial.';
          }
        }
      }
      
      this.toastrService.error(errorMessage, 'Error', {
        timeOut: 5000,
        closeButton: true,
        progressBar: true
      });
      console.error('Error creating Light and Wonder asset:', err);
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
}
