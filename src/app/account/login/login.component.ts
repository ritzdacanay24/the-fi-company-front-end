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
    private toastrService: ToastrService
  ) {
    // redirect to home if already logged in
    if (this.authenticationService.currentUserValue) {
      this.router.navigate(["/dashboard"]);
    }
  }

  ngOnInit(): void {
    if (localStorage.getItem(THE_FI_COMPANY_CURRENT_USER)) {
      this.router.navigate(["/dashboard"]);
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
      this.route.snapshot.queryParams["returnUrl"] || "/dashboard";
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

    if (this.loginForm.invalid) {
      return;
    }

    // Login Api
    this.authenticationService
      .login(this.f["email"].value, this.f["password"].value)
      .subscribe(async (data: any) => {
        
        if (data.status == "success") {
          let twostep = localStorage.getItem(THE_FI_COMPANY_TWOSTEP_TOKEN);

          let isTwostepEnabled = await this.twostepService.isTwostepEnabled();

          //if twostep is enabled
          if (!twostep && isTwostepEnabled == 1 && data?.user?.enableTwostep == 1) {
            try {
              let { passCode } = await this.twostepService.twoStepGenerateCode({
                email: data.user.email,
              });

              this.router.navigate(["auth/twostep/basic"], {
                state: {
                  email: data.user.email,
                  passCode,
                  returnUrl: this.returnUrl,
                  data: data,
                },
                queryParams: { passCode, returnUrl: this.returnUrl },
              });
              return;
            } catch (err) {
              return;
            }
          } else {

            localStorage.setItem("toast", "true");

            localStorage.setItem("token", data.access_token);

            localStorage.setItem(
              THE_FI_COMPANY_CURRENT_USER,
              JSON.stringify(data.user)
            );

            this.toastrService.clear();

            //this.router.navigate([this.returnUrl]);
            this.router.navigateByUrl(this.returnUrl);
          }
        } else {
          this.toastservice.show(data?.message, {
            classname: "bg-danger text-white",
            delay: 15000,
          });
        }
      });
  }

  /**
   * Password Hide/Show
   */
  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }
}
