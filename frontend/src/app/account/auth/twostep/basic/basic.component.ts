import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TwostepService } from "@app/core/api/twostep/twostep.service";
import {
  THE_FI_COMPANY_CURRENT_USER,
  THE_FI_COMPANY_TWOSTEP_TOKEN,
} from "@app/core/guards/admin.guard";
import { Location } from "@angular/common";

@Component({
  selector: "app-basic",
  templateUrl: "./basic.component.html",
  styleUrls: ["./basic.component.scss"],
})

/**
 * Two Step Basic Component
 */
export class BasicComponent implements OnInit {
  // set the current year
  year: number = new Date().getFullYear();

  constructor(
    private router: Router,
    private twostepService: TwostepService,
    private location: Location,
    private route: ActivatedRoute
  ) {}

  returnUrl!: string;

  stateData;
  ngOnInit(): void {
    this.stateData = this.location.getState();

    this.returnUrl =
      this.route.snapshot.queryParams["returnUrl"] || "/dashboard";
  }

  valid;
  code;

  onOtpChange(event) {
    this.code = event;
  }

  /**
   * Confirm Otp Verification
   */
  config = {
    allowNumbersOnly: true,
    length: 4,
    isPasswordInput: false,
    disableAutoFocus: false,
    placeholder: "",
    inputStyles: {
      width: "80px",
      height: "50px",
    },
  };

  async onSubmit() {
    this.valid = null;
    try {
      let data = await this.twostepService.validatetwoStepCodeAndPassCode({
        passCode: this.stateData.passCode,
        code: this.code,
        userAgent: this.stateData.userAgent,
      });

      this.valid = data.valid;

      if (data?.valid) {
        localStorage.setItem(
          THE_FI_COMPANY_CURRENT_USER,
          JSON.stringify(this.stateData.data.user)
        );
        localStorage.setItem(THE_FI_COMPANY_TWOSTEP_TOKEN, data.twostep_token);

        this.router.navigateByUrl(this.returnUrl);
      }
    } catch (err) {
    }
  }
}
