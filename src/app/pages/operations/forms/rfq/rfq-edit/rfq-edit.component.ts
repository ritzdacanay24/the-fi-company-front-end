import { Component, Input, OnDestroy, HostListener } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import {
  RfqFormComponent,
  onFormatDataBeforeEmail,
} from "../rfq-form/rfq-form.component";
import { FormArray, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { NAVIGATION_ROUTE } from "../rfq-constant";
import { RfqService } from "@app/core/api/rfq/rfq-service";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import moment from "moment";

function _json_parse(data) {
  return JSON.parse(data);
}

@Component({
  standalone: true,
  imports: [SharedModule, RfqFormComponent],
  selector: "app-rfq-edit",
  templateUrl: "./rfq-edit.component.html",
})
export class RfqEditComponent implements OnDestroy {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: RfqService,
    private toastrService: ToastrService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) {
      this.getData();
      this.acquireRecordLock();
    }
  }

  ngOnDestroy(): void {
    this.releaseRecordLock();
  }

  @HostListener("window:beforeunload")
  canDeactivate() {
    if (this.form?.dirty) {
      return confirm("You have unsaved changes. Discard and leave?");
    }
    return true;
  }

  title = "Edit RFQ";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  // Record locking properties
  isRecordLocked = false;
  lockedBy = null;
  lockAcquiredAt = null;
  lockCheckInterval: any = null;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;

  lines: FormArray;
  palletSizeInformationSendInfo: FormArray;

  async getData() {
    try {
      this.isLoading = true;
      let data = await this.api.getById(this.id);

      data.bolFaxEmail = _json_parse(data.bolFaxEmail);
      data.ccEmails = _json_parse(data.ccEmails);
      data.emailToSendTo = _json_parse(data.emailToSendTo);
      data.palletSizeInformationSendInfo = _json_parse(
        data.palletSizeInformationSendInfo
      );
      data.vendor = _json_parse(data.vendor);
      data.lines = _json_parse(data.lines);

      this.lines = this.form.get("lines") as FormArray;
      let openBalance = 0;
      for (let i = 0; i < data.lines.length; i++) {
        let row = data.lines[i];
        openBalance += row.sod_list_pr * row.qty_open;
        this.lines.push(
          this.fb.group({
            sod_part: [row.sod_part, Validators.required],
            open_balance: [openBalance],
            sod_list_pr: [row.sod_price, Validators.required],
            qty: [row.qty_open, Validators.required],
            addItemsList: [row.qty_open > 0 ? true : false],
          })
        );
      }

      this.palletSizeInformationSendInfo = this.form.get(
        "palletSizeInformationSendInfo"
      ) as FormArray;
      for (let i = 0; i < data.palletSizeInformationSendInfo.length; i++) {
        let row = data.palletSizeInformationSendInfo[i];
        this.palletSizeInformationSendInfo.push(
          this.fb.group({
            size: [row.size, Validators.required],
          })
        );
      }

      this.data = data;
      this.form.patchValue(this.data);
      
      // Apply form lock if record is locked by another user
      if (this.isRecordLocked) {
        this.lockForm();
      }
      
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  jsonStringify(data) {
    for (const property in data) {
      if (Array.isArray(data[property])) {
        data[property] = JSON.stringify(data[property]);
      } else if (
        typeof data[property] === "object" &&
        data[property] !== null
      ) {
        data[property] = JSON.stringify(data[property]);
      }
    }
  }

  async onSubmit() {
    // Check if record is locked by another user
    if (this.isRecordLocked) {
      this.toastrService.error("Cannot save changes. Record is locked by another user.", "Record Locked");
      return;
    }

    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    this.jsonStringify(this.form.value);

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
      this.form.markAsPristine();
      //this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    if (this.form?.dirty && !confirm("You have unsaved changes. Discard and leave?")) {
      return;
    }
    
    // Release the record lock before leaving
    this.releaseRecordLock();
    this.goBack();
  }

  onPrint() {
    var printContents = document.getElementById("pickSheet").innerHTML;
    var popupWin = window.open("", "_blank", "width=1000,height=600");
    popupWin.document.open();
    var pathCss =
      "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
    popupWin.document.write(
      '<html><head><link type="text/css" rel="stylesheet" media="screen, print" href="' +
        pathCss +
        '" /></head><body onload="window.print()">' +
        printContents +
        "</body></html>"
    );
    popupWin.document.close();
    popupWin.onload = function () {
      popupWin.print();
      popupWin.close();
    };
  }

  /**
   * If validation is passed send email
   */
  public async onSendEmail($event?) {
    if (this.form.dirty) {
      alert("Please save before sending email.");
      return;
    }

    if (this.data.email_sent_date) {
      if (
        !confirm(
          "Email was sent on " +
            this.data.email_sent_date +
            ". Are you sure you want to resend?"
        )
      )
        return;
    }

    let params = onFormatDataBeforeEmail(this.form.value);

    SweetAlert.fire({
      title: "Are you sure you want to send email?",
      text: "Email will be sent to " + params["emailToSendTo"].toString(),
      showDenyButton: false,
      showCancelButton: true,
      confirmButtonText: `Send Email`,
    }).then(async (result) => {
      /* Read more about isConfirmed, isDenied below */
      if (result.isConfirmed) {
        try {
          let res: any = await this.api.sendEmail(this.id, params);
          this.data.email_sent_date = moment().format("YYYY-MM-DD HH:mm:ss");
          if (res?.message) {
            this.toastrService.error("Access denied");
          } else {
            this.toastrService.success("Email sent", "Successful");
          }
        } catch (err) {}
      }
    });
  }

  // ==============================================
  // Record Locking Methods
  // ==============================================

  /**
   * Acquire a record lock to prevent concurrent editing
   */
  private async acquireRecordLock(): Promise<void> {
    try {
      // Try to acquire lock (will be implemented in backend API)
      const lockResult = await this.tryAcquireLock();
      
      if (lockResult.success) {
        this.isRecordLocked = false;
        this.lockAcquiredAt = new Date();
        
        // Set up periodic lock refresh (every 30 seconds)
        this.lockCheckInterval = setInterval(() => {
          this.refreshLock();
        }, 30000);
        
      } else {
        this.isRecordLocked = true;
        this.lockedBy = lockResult.lockedBy;
        this.lockForm();
        
        this.toastrService.warning(
          `This RFQ is currently being edited by ${lockResult.lockedBy}. You can view the record but cannot make changes.`,
          'Record Locked',
          { timeOut: 0, extendedTimeOut: 0 }
        );
      }
    } catch (error) {
      console.warn('Could not acquire record lock:', error);
      // Continue in read-only mode if lock service is unavailable
      this.isRecordLocked = true;
      this.lockForm();
    }
  }

  /**
   * Try to acquire lock (placeholder for backend implementation)
   */
  private async tryAcquireLock(): Promise<{success: boolean, lockedBy?: string}> {
    // TODO: Replace with actual API call when backend is implemented
    // For now, simulate lock acquisition (always succeeds)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 100);
    });
  }

  /**
   * Refresh the record lock to maintain ownership
   */
  private async refreshLock(): Promise<void> {
    if (!this.isRecordLocked && this.id) {
      try {
        const refreshResult = await this.tryRefreshLock();
        if (!refreshResult.success) {
          this.handleLockLost();
        }
      } catch (error) {
        console.warn('Could not refresh record lock:', error);
        this.handleLockLost();
      }
    }
  }

  /**
   * Try to refresh lock (placeholder for backend implementation)
   */
  private async tryRefreshLock(): Promise<{success: boolean}> {
    // TODO: Replace with actual API call when backend is implemented
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 100);
    });
  }

  /**
   * Handle when record lock is lost
   */
  private handleLockLost(): void {
    this.isRecordLocked = true;
    this.lockForm();
    
    SweetAlert.fire({
      title: 'Record Lock Lost',
      text: 'Another user has started editing this RFQ. Your changes cannot be saved.',
      icon: 'warning',
      confirmButtonText: 'Refresh Page',
      allowOutsideClick: false
    }).then(() => {
      window.location.reload();
    });
  }

  /**
   * Release the record lock
   */
  private async releaseRecordLock(): Promise<void> {
    if (this.lockCheckInterval) {
      clearInterval(this.lockCheckInterval);
    }
    
    if (!this.isRecordLocked && this.id) {
      try {
        await this.tryReleaseLock();
      } catch (error) {
        console.warn('Could not release record lock:', error);
      }
    }
  }

  /**
   * Try to release lock (placeholder for backend implementation)
   */
  private async tryReleaseLock(): Promise<void> {
    // TODO: Replace with actual API call when backend is implemented
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }

  /**
   * Lock the form to prevent editing
   */
  private lockForm(): void {
    if (this.form) {
      this.form.disable();
    }
  }

  /**
   * Check if user can edit the record
   */
  get canEdit(): boolean {
    return !this.isRecordLocked;
  }
}
