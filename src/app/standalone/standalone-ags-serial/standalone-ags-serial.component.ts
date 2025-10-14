import { Component, OnInit } from "@angular/core";
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

@Component({
  standalone: true,
  imports: [SharedModule, AgsSerialFormComponent, PublicFormWrapperComponent],
  selector: "app-standalone-ags-serial",
  templateUrl: "./standalone-ags-serial.component.html",
  styleUrls: ["./standalone-ags-serial.component.scss"],
})
export class StandaloneAgsSerialComponent implements OnInit {
  constructor(
    private router: Router,
    private api: AgsSerialService,
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
}
