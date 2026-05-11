import { Component, OnInit } from "@angular/core";
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";

// Login Auth
import { AuthenticationService } from "../../core/services/auth.service";
import { ToastService } from "./toast-service";
import {
  THE_FI_COMPANY_CURRENT_USER,
  THE_FI_COMPANY_TWOSTEP_TOKEN,
} from "@app/core/guards/admin.guard";
import { TwostepService } from "@app/core/api/twostep/twostep.service";
import { ToastrService } from "ngx-toastr";
import { SupportEntryService } from "@app/core/services/support-entry.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})

/**
 * Login Component
 */
export class LoginComponent implements OnInit {
  // Login Form
  loginForm!: UntypedFormGroup;
  submitted = false;
  fieldTextType!: boolean;
  error = "";
  returnUrl!: string;
  // set the current year
  year: number = new Date().getFullYear();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private authenticationService: AuthenticationService,
    private router: Router,
    private route: ActivatedRoute,
    public toastservice: ToastService,
    private twostepService: TwostepService,
    private toastrService: ToastrService,
    private supportEntryService: SupportEntryService,
  ) {
    // redirect to home if already logged in
    if (this.authenticationService.currentUserValue) {
      this.router.navigate(["/operations"]);
    }
  }

  ngOnInit(): void {
    if (localStorage.getItem(THE_FI_COMPANY_CURRENT_USER)) {
      this.router.navigate(["/operations"]);
    }
    /**
     * Form Validatyion
     */
    this.loginForm = this.formBuilder.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required]],
    });
    // get return url from route parameters or default to '/'
    this.returnUrl =
      this.route.snapshot.queryParams["returnUrl"] || "/operations";
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.loginForm.controls;
  }

  twostep = true;

  /**
   * Form submit
   */
  onSubmit() {
    this.submitted = true;
    this.error = '';

    if (this.loginForm.invalid) {
      return;
    }

    // Login Api
    this.authenticationService
      .login(this.f["email"].value, this.f["password"].value)
      .subscribe({
        next: async (data: any) => {
          if (data.status == "success") {
            localStorage.setItem("toast", "true");

            localStorage.setItem("token", data.access_token);

            if (data.refresh_token) {
              this.authenticationService.storeRefreshToken(data.refresh_token);
            }

            localStorage.setItem(
              THE_FI_COMPANY_CURRENT_USER,
              JSON.stringify(data.user)
            );

            this.toastrService.clear();
            this.router.navigateByUrl(this.returnUrl);
            return;
          }

          this.error = data?.message || 'Invalid email or password.';
        },
        error: (error: any) => {
          this.error =
            error?.error?.message ||
            error?.message ||
            'Invalid email or password.';
        },
      });
  }

  /**
   * Password Hide/Show
   */
  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

  openSupport(): void {
    void this.supportEntryService.openSupport({ source: 'login' });
  }
}
