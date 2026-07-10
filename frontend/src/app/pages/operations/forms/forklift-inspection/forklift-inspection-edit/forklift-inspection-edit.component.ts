import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";
import { ToastrService } from "ngx-toastr";
import { FormGroup } from "@angular/forms";
import { NAVIGATION_ROUTE } from "../forklift-inspection-constant";
import { ForkliftInspectionFormComponent } from "../forklift-inspection-form/forklift-inspection-form.component";
import { ForkliftInspectionService } from "@app/core/api/operations/forklift-inspection/forklift-inspection.service";
import { formValues as formData } from "./../forklift-inspection-form/formData";
import { AuthenticationService } from "@app/core/services/auth.service";
import { FeatureType } from "@app/shared/enums/feature.enum";

interface ForkliftIssueItem {
  id: number;
  groupName: string;
  checklistName: string;
  status: number;
  resolvedDate?: string | null;
  resolvedBy?: number | null;
  resolvedMessage?: string | null;
  resolvedConfirmedDate?: string | null;
  resolvedConfirmedBy?: number | null;
  resolvedConfirmedMessage?: string | null;
}

@Component({
  standalone: true,
  imports: [SharedModule, ForkliftInspectionFormComponent],
  selector: "app-forklift-inspection-edit",
  templateUrl: "./forklift-inspection-edit.component.html",
})
export class ForkliftInspectionEditComponent {
  constructor(
    private router: Router,
    private api: ForkliftInspectionService,
    private toastrService: ToastrService,
    private activatedRoute: ActivatedRoute,
    private authenticationService: AuthenticationService,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit Forklift Inspection";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  readonly attachmentFeature = FeatureType.INSPECTIONS_FORKLIFT;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data;
  issueNote = "";
  confirmNote = "";
  resolveDateInput = "";
  confirmDateInput = "";
  issueActionLoadingId: number | null = null;

  compare(a, b) {
    if (a.name > b.name) {
      return -1;
    }
    if (a.name < b.name) {
      return 1;
    }
    return 0;
  }
  formValues;

  async getData() {
    try {
      this.isLoading = true;
      let data = await this.api._searchById(this.id);

      const checklist = (data?.details || []).map((group: any) => {
        const details = (group?.details || []).map((item: any) => {
          const normalizedStatus =
            item?.status === null || item?.status === undefined || item?.status === ""
              ? undefined
              : Number(item.status);

          return {
            ...item,
            status: normalizedStatus,
            needMaint: normalizedStatus === 0,
            error: false,
            remarks: item?.remarks || "",
          };
        });

        return {
          ...group,
          status: details.length > 0 && details.every((d: any) => d.status === 1),
          needMaint: details.some((d: any) => d.status === 0),
          details,
        };
      });

      this.data = data;
      this.form.patchValue({
        ...data.main,
        details: checklist,
      });

      this.formValues = {
        ...formData,
        checklist,
      };

      this.syncIssueInputsFromChecklist(checklist);

      this.form.disable();
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  setFormEmitter($event) {
    this.form = $event;
  }

  details;
  setDetailsFormEmitter($event) {
    this.details = $event?.checklist;
  }

  async archiveItem(): Promise<void> {
    if (!this.id || this.isLoading) {
      return;
    }

    const confirmed = window.confirm("Archive this inspection item?");
    if (!confirmed) {
      return;
    }

    try {
      this.isLoading = true;

      const payload = {
        ...(this.form?.getRawValue?.() || this.data?.main || {}),
        details: this.details || this.formValues?.checklist || [],
        active: 0,
      };

      await this.api.update(Number(this.id), payload);
      this.toastrService.success("Inspection item archived.");
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: "merge" });
    } catch (err) {
      this.toastrService.error("Failed to archive inspection item.");
    } finally {
      this.isLoading = false;
    }
  }

  async deleteItem(): Promise<void> {
    if (!this.id || this.isLoading) {
      return;
    }

    const confirmed = window.confirm("Delete this inspection item? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      this.isLoading = true;
      await this.api.delete(Number(this.id));
      this.toastrService.success("Inspection item deleted.");
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: "merge" });
    } catch (err) {
      this.toastrService.error("Failed to delete inspection item.");
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    this.submitted = true;
    this.form.value.details = this.details;

    try {
      this.isLoading = true;
      await this.api._create(this.form.value);

      this.isLoading = false;
      this.toastrService.success("Successfully Created");

      this.router.navigate([NAVIGATION_ROUTE.EDIT]);
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  hasFailedInspections(): boolean {
    if (!this.formValues?.checklist) return false;
    
    return this.formValues.checklist.some((section: any) => 
      section.details?.some((item: any) => item.status === 0)
    );
  }

  get failedIssueItems(): ForkliftIssueItem[] {
    if (!this.formValues?.checklist) {
      return [];
    }

    const items: ForkliftIssueItem[] = [];
    for (const group of this.formValues.checklist) {
      const details = Array.isArray(group?.details) ? group.details : [];
      for (const item of details) {
        if (Number(item?.status) !== 0) {
          continue;
        }

        items.push({
          id: Number(item?.id),
          groupName: String(group?.name || ""),
          checklistName: String(item?.name || ""),
          status: Number(item?.status),
          resolvedDate: item?.resolved_date || null,
          resolvedBy: item?.resolved_by ?? null,
          resolvedMessage: item?.resolved_message || null,
          resolvedConfirmedDate: item?.resolved_confirmed_date || null,
          resolvedConfirmedBy: item?.resolved_confirmed_by ?? null,
          resolvedConfirmedMessage: item?.resolved_confirmed_message || null,
        });
      }
    }

    return items.filter((item) => Number.isFinite(item.id) && item.id > 0);
  }

  isIssueResolved(item: ForkliftIssueItem): boolean {
    return this.hasValidDateTime(item?.resolvedDate);
  }

  isIssueConfirmed(item: ForkliftIssueItem): boolean {
    return this.hasValidDateTime(item?.resolvedConfirmedDate);
  }

  private hasValidDateTime(value: unknown): boolean {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return false;
    }

    // MySQL zero-date values should be treated as not resolved/confirmed.
    if (raw.startsWith("0000-00-00")) {
      return false;
    }

    const time = Date.parse(raw);
    return Number.isFinite(time);
  }

  private syncIssueInputsFromChecklist(checklist: any[]): void {
    for (const group of checklist || []) {
      const details = Array.isArray(group?.details) ? group.details : [];
      for (const item of details) {
        if (Number(item?.status) !== 0) {
          continue;
        }

        const resolvedMessage = String(item?.resolved_message || "").trim();
        const confirmedMessage = String(item?.resolved_confirmed_message || "").trim();
        const resolvedDateLocal = this.toDateTimeLocal(item?.resolved_date);
        const confirmedDateLocal = this.toDateTimeLocal(item?.resolved_confirmed_date);

        if (resolvedMessage) {
          this.issueNote = resolvedMessage;
        }

        if (confirmedMessage) {
          this.confirmNote = confirmedMessage;
        }

        if (resolvedDateLocal) {
          this.resolveDateInput = resolvedDateLocal;
        }

        if (confirmedDateLocal) {
          this.confirmDateInput = confirmedDateLocal;
        }

        return;
      }
    }
  }

  private toDateTimeLocal(value: unknown): string {
    const raw = String(value ?? "").trim();
    if (!raw || raw.startsWith("0000-00-00")) {
      return "";
    }

    const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
    return normalized.length >= 16 ? normalized.slice(0, 16) : "";
  }

  async markIssueResolved(item: ForkliftIssueItem): Promise<void> {
    if (!item?.id || this.issueActionLoadingId === item.id) {
      return;
    }

    const note = this.issueNote.trim() || "Marked resolved by maintenance.";
    const userId = Number(this.authenticationService.currentUserValue?.id);

    try {
      this.issueActionLoadingId = item.id;
      await this.api.resolveDetail(item.id, {
        resolved_by: Number.isFinite(userId) ? userId : undefined,
        resolved_message: note,
        resolved_date: this.resolveDateInput || undefined,
      });
      await this.getData();
      this.toastrService.success("Issue marked as resolved.");
    } catch (err) {
      this.toastrService.error(this.getApiErrorMessage(err), "Failed to mark issue as resolved.");
    } finally {
      this.issueActionLoadingId = null;
    }
  }

  onResolveIssueClick(item: ForkliftIssueItem, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    void this.markIssueResolved(item);
  }

  async markIssueConfirmed(item: ForkliftIssueItem): Promise<void> {
    if (!item?.id || this.issueActionLoadingId === item.id) {
      return;
    }

    const note = this.confirmNote.trim() || "Resolution confirmed.";
    const userId = Number(this.authenticationService.currentUserValue?.id);

    try {
      this.issueActionLoadingId = item.id;
      await this.api.confirmDetail(item.id, {
        resolved_confirmed_by: Number.isFinite(userId) ? userId : undefined,
        resolved_confirmed_message: note,
        resolved_confirmed_date: this.confirmDateInput || undefined,
      });
      this.confirmNote = "";
      this.confirmDateInput = "";
      await this.getData();
      this.toastrService.success("Issue resolution confirmed.");
    } catch (err) {
      this.toastrService.error(this.getApiErrorMessage(err), "Failed to confirm issue resolution.");
    } finally {
      this.issueActionLoadingId = null;
    }
  }

  onConfirmIssueClick(item: ForkliftIssueItem, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    void this.markIssueConfirmed(item);
  }

  private getApiErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message || error.message;
      return String(message || "Request failed");
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Request failed";
  }
}
