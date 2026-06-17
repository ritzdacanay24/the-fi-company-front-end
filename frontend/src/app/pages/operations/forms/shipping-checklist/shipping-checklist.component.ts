import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom, Subscription } from 'rxjs';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { SalesOrderInfoService } from '@app/core/api/sales-order/sales-order-info.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { FileViewerModalComponent } from '@app/shared/components/file-viewer-modal/file-viewer-modal.component';
import { SharedModule } from '@app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import {
  ShippingChecklistInstancePayload,
  ShippingChecklistTemplate,
  ShippingChecklistsService,
} from '@app/core/api/operations/shipping-checklists/shipping-checklists.service';
import { environment } from 'src/environments/environment';
import { AppTourDefinition, AppTourService } from '@app/core/services/app-tour.service';
import { AppGuideContext, AppGuideService } from '@app/core/services/app-guide.service';
import { GuideOffcanvasComponent } from '@app/shared/components/guide-offcanvas/guide-offcanvas.component';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { AppGuidePanelService } from '@app/core/services/app-guide-panel.service';

interface ShippingChecklistListItem {
  id: number;
  checklistNumber: string;
  customerName: string;
  status: string;
  salesOrder: string;
  packingSlip: string;
  secondVerifierEmailSentAt: string;
  updatedAt: string;
}

@Component({
  standalone: true,
  selector: 'app-shipping-checklist',
  templateUrl: './shipping-checklist.component.html',
  styleUrls: ['./shipping-checklist.component.scss'],
  imports: [CommonModule, SharedModule, ReactiveFormsModule],
})
export class ShippingChecklistComponent implements OnInit {
  private readonly minLineRows = 1;
  private readonly shippingChecklistTourId = 'shipping-checklist-workflow';
  private readonly shippingChecklistGuideId = 'shipping-checklist';
  private draftSaveVersion = 0;
  private tourDraftSaveBaseline = 0;

  form: FormGroup;
  templates: ShippingChecklistTemplate[] = [];
  instances: ShippingChecklistListItem[] = [];
  createdByDisplay = '';

  selectedTemplate: ShippingChecklistTemplate | null = null;
  selectedInstanceId: number | null = null;
  checklistStatus: 'draft' | 'submitted' | 'verified' | '' = '';

  isLoading = false;
  isSaving = false;
  isLoadingSalesOrderLines = false;
  isLoadingPackingSlipSerials = false;
  uploadingByQuestion: Record<string, boolean> = {};
  questionAttachments: Record<string, Array<{ id: number; fileName: string; link: string }>> = {};
  uploadTargets: Array<{ questionCode: string; questionText: string }> = [];
  selectedUploadQuestionCode = '';
  uploadScopeId = this.createUploadScopeId();
  expandedLineIndexes: Record<number, boolean> = {};
  private linesValueChangesSub: Subscription | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: ShippingChecklistsService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly salesOrderInfoService: SalesOrderInfoService,
    private readonly attachmentsService: AttachmentsService,
    private readonly authService: AuthenticationService,
    private readonly modalService: NgbModal,
    private readonly offcanvasService: NgbOffcanvas,
    private readonly toastr: ToastrService,
    private readonly appTourService: AppTourService,
    private readonly appGuideService: AppGuideService,
    private readonly appGuidePanelService: AppGuidePanelService,
  ) {
    this.form = this.fb.group({
      templateId: [null, Validators.required],
      customerCode: ['', Validators.required],
      customerName: ['', Validators.required],
      formTitle: ['', Validators.required],
      formCode: [''],
      formDate: [''],
      shipVia: [''],
      shippingAccount: [''],
      salesOrder: ['', Validators.required],
      packingSlip: [''],
      arrivalDate: [''],
      totalPallets: [''],
      verifierName: ['', Validators.required],
      verifierDate: [''],
      secondVerifierName: [''],
      secondVerifierEmail: [''],
      secondVerifierDate: [''],
      notes: [''],
      lines: this.fb.array([]),
      responses: this.fb.array([]),
    });
  }

  async ngOnInit(): Promise<void> {
    this.registerShippingChecklistTour();
    await this.loadTemplatesAndInstances();

    const idParam = this.route.snapshot.queryParamMap.get('id');
    const urlInstanceId = Number(idParam || 0);
    if (Number.isFinite(urlInstanceId) && urlInstanceId > 0) {
      await this.openInstance(urlInstanceId);
    }
  }

  ngOnDestroy(): void {
    this.linesValueChangesSub?.unsubscribe();
    this.linesValueChangesSub = null;
    this.appGuidePanelService.close();
  }

  async startGuidedTour(): Promise<void> {
    this.tourDraftSaveBaseline = this.draftSaveVersion;
    // Re-register at launch so labels and conditional steps reflect current page state.
    this.registerShippingChecklistTour();
    await this.appTourService.startTour(this.shippingChecklistTourId);
  }

  openHelpGuide(): void {
    const context = this.buildGuideContext();
    const guide = this.appGuideService.buildGuide(this.shippingChecklistGuideId, context);
    if (!guide) {
      this.toastr.warning('Guide is not available for this page yet.');
      return;
    }

    const modeLabel = context.mode === 'new'
      ? 'New Checklist'
      : context.mode === 'pending_verification'
        ? 'Pending Verification'
        : context.mode === 'verified'
          ? 'Verified'
          : 'Draft';

    const isDesktop = window.innerWidth >= 1200;

    const ref = this.offcanvasService.open(GuideOffcanvasComponent, {
      position: 'end',
      panelClass: isDesktop ? undefined : 'guide-offcanvas-panel',
      scroll: false,
      backdrop: !isDesktop,
    });

    if (isDesktop) {
      this.appGuidePanelService.open(guide, modeLabel);
      ref.result.finally(() => {
        this.appGuidePanelService.close();
      }).catch(() => {
        // Dismissed path is handled by finally.
      });
    }

    ref.componentInstance.data = guide;
    ref.componentInstance.modeLabel = modeLabel;
  }

  get linesArray(): FormArray<FormGroup> {
    return this.form.get('lines') as FormArray<FormGroup>;
  }

  get responsesArray(): FormArray<FormGroup> {
    return this.form.get('responses') as FormArray<FormGroup>;
  }

  get canSubmit(): boolean {
    if (this.form.invalid || !this.selectedTemplate) {
      return false;
    }

    return this.responsesArray.controls.every((control) => {
      const isRequired = Boolean(control.get('isRequired')?.value);
      const value = String(control.get('responseValue')?.value || '');
      return !isRequired || Boolean(value);
    });
  }

  get isVerifiedFinal(): boolean {
    return Boolean(this.selectedInstanceId) && this.checklistStatus === 'verified';
  }

  get isPendingSecondaryVerification(): boolean {
    return Boolean(this.selectedInstanceId) && this.checklistStatus === 'submitted';
  }

  get isChecklistLocked(): boolean {
    return Boolean(this.selectedInstanceId) && (this.checklistStatus === 'submitted' || this.checklistStatus === 'verified');
  }

  get canEditSecondVerifierDate(): boolean {
    return false;
  }

  get showVerificationProcessStep(): boolean {
    return Boolean(this.selectedInstanceId) && (this.isPendingSecondaryVerification || this.isVerifiedFinal);
  }

  get secondVerifierRoutingEmail(): string {
    const instanceVerifierEmail = String(this.form.get('secondVerifierEmail')?.value || '').trim();
    return instanceVerifierEmail || this.getAssignedVerifierEmail();
  }

  get hasSecondVerifierRouting(): boolean {
    return this.secondVerifierRoutingEmail.length > 0;
  }

  get templateLogoUrl(): string {
    const raw = String(this.selectedTemplate?.logoUrl || '').trim();
    if (!raw) {
      return '';
    }

    if (/^(https?:|data:|blob:)/i.test(raw)) {
      return raw;
    }

    const uploadBase = String(environment.apiV2UploadBaseUrl || '').trim();
    const legacyBase = String(environment.legacyApiBaseUrl || '').trim();
    const hostBase = this.extractOrigin(uploadBase) || this.extractOrigin(legacyBase) || 'https://dashboard.eye-fi.com';

    // FS customer detail images are often saved as /img/... or /attachments/... paths.
    if (raw.startsWith('/')) {
      return `${hostBase}${raw}`;
    }

    if (/^(img|attachments)\//i.test(raw)) {
      return `${hostBase}/${raw}`;
    }

    return `${hostBase}/${raw.replace(/^\.\//, '')}`;
  }

  get templateLogoFallbackText(): string {
    const logoText = String(this.selectedTemplate?.logoText || '').trim();
    if (logoText) {
      return logoText.toUpperCase();
    }

    const customerCode = String(this.form.get('customerCode')?.value || '').trim();
    if (customerCode) {
      return customerCode.toUpperCase();
    }

    const customerName = String(this.selectedTemplate?.customerName || this.form.get('customerName')?.value || '').trim();
    if (!customerName) {
      return '';
    }

    const initials = customerName
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .slice(0, 3)
      .map((token) => token.charAt(0).toUpperCase())
      .join('');

    return initials || customerName.slice(0, 3).toUpperCase();
  }

  get isSubmittedFinal(): boolean {
    return this.isVerifiedFinal;
  }

  private registerShippingChecklistTour(): void {
    const isEditMode = Boolean(this.selectedInstanceId);

    const definition: AppTourDefinition = {
      id: this.shippingChecklistTourId,
      name: 'Shipping Checklist Workflow',
      version: 2,
      steps: [
        {
          selector: '[data-tour="shipping-header"]',
          title: isEditMode ? 'Editing Checklist Overview' : 'Page Overview',
          description: isEditMode
            ? 'You are editing an existing checklist. This tour will focus on completion, verification, and follow-up actions.'
            : 'This form creates and verifies shipping checklists with a full audit trail.',
        },
        {
          selector: '[data-tour="shipping-template"]',
          title: 'Step 1: Select Template',
          description: 'Choose the customer template first. This determines checklist questions and default verifier routing.',
          includeWhen: () => !this.selectedInstanceId,
        },
        {
          selector: '[data-tour="shipping-sales-order"]',
          title: 'Add Sales Order',
          description: 'Enter the Sales Order number, then preview lines before creating the checklist.',
          includeWhen: () => !this.selectedInstanceId,
        },
        {
          selector: '[data-tour="shipping-create-checklist"]',
          title: 'Create Checklist',
          description: 'Click this button now to create a real draft checklist. Keep the tour panel open, then click Continue once created.',
          includeWhen: () => !this.selectedInstanceId,
          requiresAction: true,
          actionComplete: () => Boolean(this.selectedInstanceId),
          incompleteMessage: 'Create Checklist first. After it appears, click Continue.',
          nextLabel: 'Continue',
        },
        {
          selector: '[data-tour="shipping-save-draft"]',
          title: 'Save Draft',
          description: 'Changes are not auto-saved. Click Save Draft now so your progress is stored before submission or verification.',
          includeWhen: () => Boolean(this.selectedInstanceId) && this.checklistStatus === 'draft' && !this.isChecklistLocked,
          requiresAction: true,
          actionComplete: () => this.draftSaveVersion > this.tourDraftSaveBaseline,
          incompleteMessage: 'Click Save Draft first. Then continue the tour.',
          nextLabel: 'Continue',
        },
        {
          selector: '[data-tour="shipping-line-items"]',
          title: 'Step 3: Line Items',
          description: 'Mark ship rows, enter quantities, and add serial numbers. Total pallets are auto-calculated from selected rows.',
          optional: true,
        },
        {
          selector: '[data-tour="shipping-verification"]',
          title: 'Step 4: Verification',
          description: 'Complete each checklist item with Yes, No, or N/A. Required responses must be completed before submission.',
          optional: true,
        },
        {
          selector: '[data-tour="shipping-verification"]',
          title: 'Required Items Before Submit',
          description: 'If Submit is disabled, check required checklist items here and ensure each one has a response.',
          includeWhen: () => Boolean(this.selectedInstanceId) && !this.canSubmit && !this.isChecklistLocked,
          optional: true,
        },
        {
          selector: '[data-tour="shipping-attachments"]',
          title: 'Attach Image Proof',
          description: 'Attach images to specific checklist questions as evidence for verification and audits.',
          optional: true,
        },
        {
          selector: '[data-tour="shipping-verifier-routing"]',
          title: 'Missing Verifier Routing',
          description: 'Final verification email routing is missing. Open Actions and go to Template Settings to assign a verifier email.',
          includeWhen: () => this.showVerificationProcessStep && !this.hasSecondVerifierRouting,
          optional: true,
        },
        {
          selector: '[data-tour="shipping-locked-state"]',
          title: 'Checklist Locked State',
          description: 'Submitted or verified checklists are locked for audit integrity. Use Reopen Draft from Actions only when corrections are needed.',
          includeWhen: () => this.isChecklistLocked,
          optional: true,
        },
        {
          selector: '[data-tour="shipping-ready-verify"]',
          title: 'Complete Final Verification',
          description: 'When this alert appears, the checklist is ready for verifier sign-off. Use this button to complete final verification.',
          includeWhen: () => this.isPendingSecondaryVerification,
          optional: true,
        },
        {
          selector: '[data-tour="shipping-actions"]',
          title: 'Submit for Verification',
          description: 'Use Actions to submit Draft checklists for verification, reopen drafts when needed, and access other workflow controls.',
          includeWhen: () => !this.isPendingSecondaryVerification,
        },
        {
          selector: '[data-tour="shipping-actions"]',
          title: 'Templates, Settings, and History',
          description: 'Use Actions to reach template management, workflow settings, and checklist history for troubleshooting and admin updates.',
          includeWhen: () => true,
          optional: true,
        },
        {
          selector: '[data-tour="shipping-recent"]',
          title: 'Recent Checklists',
          description: 'Open recent checklist instances to continue work or review status quickly.',
        },
      ],
    };

    this.appTourService.registerTour(definition);
  }

  private buildGuideContext(): AppGuideContext {
    const mode: AppGuideContext['mode'] = !this.selectedInstanceId
      ? 'new'
      : this.isPendingSecondaryVerification
        ? 'pending_verification'
        : this.isVerifiedFinal
          ? 'verified'
          : 'draft';

    return {
      mode,
      selectedInstanceId: this.selectedInstanceId,
      canManage: true,
      isLocked: this.isChecklistLocked,
      hasVerifierRouting: this.hasSecondVerifierRouting,
    };
  }

  private extractOrigin(urlInput: string): string {
    const normalized = String(urlInput || '').trim();
    if (!normalized) {
      return '';
    }

    try {
      return new URL(normalized).origin;
    } catch {
      return '';
    }
  }

  async loadTemplatesAndInstances(): Promise<void> {
    this.isLoading = true;
    if (this.linesArray.length === 0) {
      this.resetLineRows(this.minLineRows);
    }

    try {
      const templates = await this.service.getTemplates();
      this.templates = templates;

      const instances = await this.service.getInstances();
      this.instances = (instances || []).map((item) => ({
        id: Number(item.id),
        checklistNumber: String(item.formCode || this.templates.find((template) => template.id === Number(item.templateId))?.formCode || '-'),
        customerName: String(item.customerName || ''),
        status: String(item.status || ''),
        salesOrder: String(item.salesOrder || ''),
        packingSlip: String(item.packingSlip || ''),
        secondVerifierEmailSentAt: String(item.secondVerifierEmailSentAt || ''),
        updatedAt: String(item.updatedAt || ''),
      }));
    } catch (error) {
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  onTemplateChanged(templateIdInput: string): void {
    const templateId = Number(templateIdInput || 0);
    const template = this.templates.find((item) => item.id === templateId) || null;
    if (!template) {
      this.selectedTemplate = null;
      this.selectedUploadQuestionCode = '';
      this.checklistStatus = '';
      return;
    }

    this.selectedInstanceId = null;
    this.checklistStatus = '';
    this.syncChecklistUrl(null);
    this.questionAttachments = {};
    this.uploadScopeId = this.createUploadScopeId();
    this.applyTemplate(template);
    this.resetLineRows(this.minLineRows);
  }

  async createChecklistFromTemplate(): Promise<void> {
    if (this.selectedInstanceId) {
      return;
    }

    if (!this.selectedTemplate) {
      this.toastr.warning('Select a customer template first.');
      return;
    }

    const salesOrder = String(this.form.get('salesOrder')?.value || '').trim();
    if (!salesOrder) {
      this.toastr.warning('Enter a Sales Order before creating checklist ID.');
      return;
    }

    const loaded = await this.loadSalesOrderLines();
    if (!loaded) {
      this.toastr.warning('Sales Order lines unavailable. Continuing with manual line entry.');
    }

    const currentFormDate = this.normalizeDate(this.form.get('formDate')?.value);
    if (!currentFormDate) {
      const today = this.normalizeDate(new Date().toISOString().slice(0, 10));
      this.form.patchValue({ formDate: today }, { emitEvent: false });
    }

    await this.persist('draft');
  }

  applyTemplate(template: ShippingChecklistTemplate): void {
    this.selectedTemplate = template;
    const defaultVerifierName = this.getCurrentUserDisplayName();
    const assignedVerifierEmail = String(template.assignedVerifierEmail || '').trim();
    const assignedVerifierName = String(template.assignedVerifierName || '').trim();

    this.form.patchValue({
      templateId: template.id,
      customerCode: template.customerCode,
      customerName: template.customerName,
      formTitle: template.formTitle,
      formCode: template.formCode,
      verifierName: defaultVerifierName,
      secondVerifierName: assignedVerifierName,
      secondVerifierEmail: assignedVerifierEmail,
    });

    const responses = this.fb.array<FormGroup>(
      template.questions.map((question) =>
        this.fb.group({
          questionCode: [question.questionCode],
          questionText: [question.questionText],
          isRequired: [question.isRequired],
          responseValue: [''],
          imageUrls: [[]],
        }),
      ),
    );

    this.form.setControl('responses', responses);
    this.refreshUploadTargets();
    this.selectedUploadQuestionCode = String(this.uploadTargets[0]?.questionCode || '');
  }

  resetLineRows(count: number): void {
    const rows = this.fb.array<FormGroup>([]);
    for (let i = 0; i < count; i += 1) {
      rows.push(this.createLineGroup(i + 1));
    }
    this.form.setControl('lines', rows);
    this.bindLineTotalsSync();
    this.expandedLineIndexes = {};
  }

  createLineGroup(lineOrder: number, payload?: Record<string, unknown>): FormGroup {
    const serialNumbers = this.normalizeSerialRows(payload?.['serialNumbers'] ?? payload?.['serialNumber']);
    const selectedRaw = payload?.['isSelected'];
    const isSelected =
      selectedRaw === true ||
      selectedRaw === 1 ||
      String(selectedRaw || '').trim().toLowerCase() === 'true' ||
      String(selectedRaw || '').trim() === '1';

    return this.fb.group({
      lineOrder: [lineOrder],
      isSelected: [isSelected],
      partNumber: [String(payload?.['partNumber'] || '')],
      qty: [String(payload?.['qty'] || '')],
      palletQty: [String(payload?.['palletQty'] || '')],
      serialNumbers: this.fb.array<FormGroup>(
        serialNumbers.map((serial) => this.createSerialGroup(serial)),
      ),
    });
  }

  createSerialGroup(serial = ''): FormGroup {
    return this.fb.group({
      serial: [String(serial || '').trim()],
    });
  }

  serialsArrayAt(lineIndex: number): FormArray<FormGroup> {
    return this.linesArray.at(lineIndex).get('serialNumbers') as FormArray<FormGroup>;
  }

  toggleSerials(lineIndex: number): void {
    this.expandedLineIndexes[lineIndex] = !this.expandedLineIndexes[lineIndex];
  }

  isSerialsExpanded(lineIndex: number): boolean {
    const manualState = this.expandedLineIndexes[lineIndex];
    if (typeof manualState === 'boolean') {
      return manualState;
    }

    return this.getSerialCount(lineIndex) > 0;
  }

  addSerialRow(lineIndex: number): void {
    this.serialsArrayAt(lineIndex).push(this.createSerialGroup(''));
    this.expandedLineIndexes[lineIndex] = true;
  }

  removeSerialRow(lineIndex: number, serialIndex: number): void {
    const serials = this.serialsArrayAt(lineIndex);
    if (serialIndex < 0 || serialIndex >= serials.length) {
      return;
    }

    serials.removeAt(serialIndex);
  }

  getSerialCount(lineIndex: number): number {
    return this.serialsArrayAt(lineIndex).length;
  }

  addRow(): void {
    this.linesArray.push(this.createLineGroup(this.linesArray.length + 1));
    this.recalculateTotalPalletsFromLines();
  }

  setAllLineSelections(isSelected: boolean): void {
    for (const control of this.linesArray.controls) {
      control.patchValue({ isSelected }, { emitEvent: false });
    }
  }

  async loadSalesOrderLines(): Promise<boolean> {
    const salesOrder = String(this.form.get('salesOrder')?.value || '').trim();
    if (!salesOrder) {
      this.toastr.warning('Enter a Sales Order number first.');
      return false;
    }

    this.isLoadingSalesOrderLines = true;
    try {
      const payload: any = await firstValueFrom(this.salesOrderInfoService.getSalesOrderNumberDetails(salesOrder));
      const rows = Array.isArray(payload?.mainDetails) ? payload.mainDetails : [];

      const mappedRows = rows
        .map((row: any, index: number) => {
          const partNumber = String(row?.sod_part ?? row?.SOD_PART ?? '').trim();
          const qty = row?.sod_qty_ord ?? row?.SOD_QTY_ORD ?? row?.short ?? row?.SHORT ?? '';
          return {
            lineOrder: index + 1,
            isSelected: false,
            partNumber,
            qty: String(qty ?? '').trim(),
            serialNumbers: [],
            palletQty: '',
          };
        })
        .filter((row: any) => row.partNumber.length > 0);

      if (mappedRows.length === 0) {
        this.resetLineRows(this.minLineRows);
        this.toastr.warning(`No SO line items found for ${salesOrder}.`);
        return false;
      }

      const lines = this.fb.array<FormGroup>(
        mappedRows.map((row: any) => this.createLineGroup(Number(row.lineOrder), row)),
      );

      this.form.setControl('lines', lines);
      this.bindLineTotalsSync();
      this.expandedLineIndexes = {};
      this.toastr.success(`Loaded ${mappedRows.length} line item(s) from SO ${salesOrder}.`);
      return true;
    } catch (error) {
      throw error;
    } finally {
      this.isLoadingSalesOrderLines = false;
    }
  }

  async loadPackingSlipSerials(): Promise<void> {
    const packingSlip = String(this.form.get('packingSlip')?.value || '').trim();
    if (!packingSlip) {
      return;
    }

    this.isLoadingPackingSlipSerials = true;
    try {
      const payload: any = await firstValueFrom(this.salesOrderInfoService.getPackingSlipSerials(packingSlip));
      const lines = Array.isArray(payload?.lines) ? payload.lines : [];

      if (!lines.length) {
        this.toastr.info(`No serial rows found for packing slip ${packingSlip}.`);
        return;
      }

      for (const row of lines) {
        const lineNumber = Number(row?.lineNumber);
        if (!Number.isFinite(lineNumber) || lineNumber <= 0) {
          continue;
        }

        const serialNumbers = this.normalizeSerialNumbers(row?.serialNumbers);

        let lineIndex = this.linesArray.controls.findIndex((control) => Number(control.get('lineOrder')?.value) === lineNumber);
        if (lineIndex < 0) {
          this.linesArray.push(this.createLineGroup(lineNumber, { lineOrder: lineNumber }));
          lineIndex = this.linesArray.length - 1;
        }

        this.linesArray.at(lineIndex).patchValue({ isSelected: true }, { emitEvent: false });

        const serialsArray = this.serialsArrayAt(lineIndex);
        const existing = new Set(
          this.normalizeSerialNumbers(serialsArray.getRawValue()).map((value) => String(value || '').trim()).filter(Boolean),
        );

        for (const serial of serialNumbers) {
          const token = String(serial || '').trim();
          if (!token || existing.has(token)) {
            continue;
          }
          serialsArray.push(this.createSerialGroup(token));
          existing.add(token);
        }

        if ((this.normalizeSerialNumbers(serialsArray.getRawValue()).length || 0) > 0) {
          this.expandedLineIndexes[lineIndex] = true;
        }
      }

      this.recalculateTotalPalletsFromLines();

      this.toastr.success(`Loaded packing slip serials for ${packingSlip}.`);
    } catch (error) {
      throw error;
    } finally {
      this.isLoadingPackingSlipSerials = false;
    }
  }

  async openInstance(id: number): Promise<void> {
    this.isLoading = true;
    try {
      const response = await this.service.getInstance(id);
      const instance = response?.instance;
      if (!instance) {
        this.toastr.error('Checklist instance not found');
        return;
      }

      const template = this.templates.find((item) => item.id === Number(instance.templateId)) || null;
      this.selectedTemplate = template;

      this.selectedInstanceId = Number(instance.id);
      const normalizedStatus = String(instance.status || '').toLowerCase();
      this.checklistStatus = normalizedStatus === 'verified' ? 'verified' : normalizedStatus === 'submitted' ? 'submitted' : 'draft';
      this.syncChecklistUrl(this.selectedInstanceId);
      this.uploadScopeId = `instance-${this.selectedInstanceId}`;
      this.questionAttachments = {};

      this.form.patchValue({
        templateId: Number(instance.templateId),
        customerCode: String(instance.customerCode || ''),
        customerName: String(instance.customerName || ''),
        formTitle: String(instance.formTitle || ''),
        formCode: String(instance.formCode || template?.formCode || ''),
        formDate: String(instance.formDate || ''),
        shipVia: String(instance.shipVia || ''),
        shippingAccount: String(instance.shippingAccount || ''),
        salesOrder: String(instance.salesOrder || ''),
        packingSlip: String(instance.packingSlip || ''),
        arrivalDate: String(instance.arrivalDate || ''),
        totalPallets: instance.totalPallets ?? '',
        verifierName: String(instance.verifierName || ''),
        verifierDate: String(instance.verifierDate || ''),
        secondVerifierName: String(instance.secondVerifierName || ''),
        secondVerifierEmail: String(instance.secondVerifierEmail || ''),
        secondVerifierDate: String(instance.secondVerifierDate || ''),
        notes: String(instance.notes || ''),
      });
      this.createdByDisplay = String(instance.createdBy || '').trim();

      const lineRows = Array.isArray(instance.lines) ? instance.lines : [];
      const mappedLines = this.fb.array<FormGroup>(
        lineRows.map((line: any, index: number) =>
          this.createLineGroup(Number(line.lineOrder || index + 1), {
            isSelected: line.isSelected !== false,
            partNumber: String(line.partNumber || ''),
            qty: String(line.qty || ''),
            serialNumber: String(line.serialNumber || ''),
            serialNumbers: Array.isArray(line.serialNumbers) ? line.serialNumbers : [],
            palletQty: String(line.palletQty || ''),
          }),
        ),
      );

      this.form.setControl('lines', mappedLines);
      this.bindLineTotalsSync();
      this.expandedLineIndexes = {};
      lineRows.forEach((line: any, index: number) => {
        const serialCount = this.normalizeSerialNumbers(line.serialNumbers ?? line.serialNumber).length;
        if (serialCount > 0) {
          this.expandedLineIndexes[index] = true;
        }
      });
      if (this.linesArray.length === 0) {
        this.resetLineRows(this.minLineRows);
      }

      const responseRows = Array.isArray(instance.responses) ? instance.responses : [];
      this.setInstanceResponses(responseRows, template);
      for (const control of this.responsesArray.controls) {
        const questionCode = String(control.get('questionCode')?.value || '');
        const imageUrls = Array.isArray(control.get('imageUrls')?.value) ? (control.get('imageUrls')?.value as string[]) : [];
        this.mergeQuestionImageUrls(questionCode, imageUrls);
      }

      await this.loadAllQuestionAttachments();
      for (const control of this.responsesArray.controls) {
        const questionCode = String(control.get('questionCode')?.value || '');
        control.patchValue({ imageUrls: this.getQuestionImageUrls(questionCode) }, { emitEvent: false });
      }

      this.refreshUploadTargets();
      if (this.uploadTargets.length > 0 && !this.uploadTargets.some((target) => target.questionCode === this.selectedUploadQuestionCode)) {
        this.selectedUploadQuestionCode = String(this.uploadTargets[0].questionCode || '');
      }

      this.applyFormLockState();

      this.toastr.success(`Loaded checklist #${id}`);
    } catch (error) {
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async saveDraft(): Promise<void> {
    await this.persist('draft');
  }

  async submitChecklist(): Promise<void> {
    await this.persist('submitted');
  }

  async verifyChecklist(): Promise<void> {
    await this.persist('verified');
  }

  async reopenChecklist(): Promise<void> {
    if (!this.selectedInstanceId || !this.isChecklistLocked) {
      return;
    }

    const confirmed = await Swal.fire({
      icon: 'warning',
      title: 'Reopen Draft?',
      text: `Reopen checklist #${this.selectedInstanceId} as draft? This will unlock the form for edits and clear the pending verification state.`,
      showCancelButton: true,
      confirmButtonText: 'Reopen Draft',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (!confirmed.isConfirmed) {
      return;
    }

    await this.persist('draft');
  }

  setAllResponses(value: 'yes' | 'no' | 'na'): void {
    for (const control of this.responsesArray.controls) {
      control.patchValue({ responseValue: value }, { emitEvent: false });
    }
  }

  clearAllResponses(): void {
    for (const control of this.responsesArray.controls) {
      control.patchValue({ responseValue: '' }, { emitEvent: false });
    }
  }

  async persist(status: 'draft' | 'submitted' | 'verified'): Promise<void> {
    if (!this.selectedTemplate) {
      this.toastr.warning('Select a customer template first');
      return;
    }

    if (status === 'submitted') {
      const currentVerifierDate = this.normalizeDate(this.form.get('verifierDate')?.value);
      if (!currentVerifierDate) {
        const today = this.normalizeDate(new Date().toISOString().slice(0, 10));
        this.form.patchValue({ verifierDate: today }, { emitEvent: false });
      }
    }

    if (status === 'verified') {
      const currentSecondVerifierDate = this.normalizeDate(this.form.get('secondVerifierDate')?.value);
      if (!currentSecondVerifierDate) {
        const today = this.normalizeDate(new Date().toISOString().slice(0, 10));
        this.form.patchValue({ secondVerifierDate: today }, { emitEvent: false });
      }
    }

    const wasNew = !this.selectedInstanceId;
    const assignedVerifierEmail = String(this.form.get('secondVerifierEmail')?.value || '').trim() || this.getAssignedVerifierEmail();
    const assignedVerifierName = String(this.form.get('secondVerifierName')?.value || '').trim() || String(this.selectedTemplate?.assignedVerifierName || '').trim();

    if (status === 'submitted' && !assignedVerifierEmail && !assignedVerifierName) {
      this.toastr.warning('Assign a 2nd verifier on the template before submitting for verification.');
      return;
    }

    if ((status === 'submitted' || status === 'verified') && !this.canSubmit) {
      this.toastr.warning('Complete required checklist responses before submitting');
      return;
    }

    if (!this.selectedInstanceId) {
      const salesOrder = String(this.form.get('salesOrder')?.value || '').trim();
      if (!salesOrder) {
        this.toastr.warning('Sales Order is required before creating checklist.');
        return;
      }
    }

    this.isSaving = true;
    try {
      const payload = this.buildPayload(status);

      let result: { success: boolean; id?: number; error?: string };
      if (!this.selectedInstanceId) {
        result = await this.service.createInstance(payload);
      } else if (status === 'submitted') {
        result = await this.service.submitInstance(this.selectedInstanceId, payload);
      } else if (status === 'verified') {
        result = await this.service.updateInstance(this.selectedInstanceId, payload);
      } else {
        result = await this.service.updateInstance(this.selectedInstanceId, payload);
      }

      if (!result?.success) {
        this.toastr.error(result?.error || 'Unable to save checklist');
        return;
      }

      if (status === 'draft') {
        this.draftSaveVersion += 1;
      }

      if (result.id) {
        this.selectedInstanceId = result.id;
        this.syncChecklistUrl(this.selectedInstanceId);
      }

      if (!this.createdByDisplay) {
        this.createdByDisplay = String(payload.createdBy || '').trim();
      }

      this.checklistStatus = status;
      this.applyFormLockState();

      this.toastr.success(status === 'submitted' ? 'Checklist submitted for verification' : status === 'verified' ? 'Checklist verified' : 'Draft saved');
      await this.loadTemplatesAndInstances();

      if (wasNew && this.selectedInstanceId) {
        await this.openInstance(this.selectedInstanceId);
      }
    } catch (error) {
      throw error;
    } finally {
      this.isSaving = false;
    }
  }

  startNew(): void {
    this.selectedInstanceId = null;
    this.checklistStatus = '';
    this.selectedTemplate = null;
    this.selectedUploadQuestionCode = '';
    this.syncChecklistUrl(null);
    this.questionAttachments = {};
    this.uploadingByQuestion = {};
    this.uploadScopeId = this.createUploadScopeId();
    this.createdByDisplay = '';

    this.form.patchValue({
      templateId: null,
      customerCode: '',
      customerName: '',
      formTitle: '',
      formCode: '',
      formDate: '',
      shipVia: '',
      shippingAccount: '',
      salesOrder: '',
      packingSlip: '',
      arrivalDate: '',
      totalPallets: '',
      verifierName: '',
      verifierDate: '',
      secondVerifierName: '',
      secondVerifierEmail: '',
      secondVerifierDate: '',
      notes: '',
    });

    this.form.setControl('responses', this.fb.array<FormGroup>([]));
    this.resetLineRows(this.minLineRows);
    this.refreshUploadTargets();
    this.applyFormLockState();
  }

  private getCurrentUserDisplayName(): string {
    const user = this.authService.currentUserValue;
    return String(user?.full_name || user?.username || user?.email || 'Unknown User').trim();
  }

  async printChecklist(): Promise<void> {
    if (!this.isVerifiedFinal) {
      this.toastr.warning('Checklist must be fully verified before printing.');
      return;
    }

    if (!this.selectedInstanceId) {
      this.toastr.warning('Open a verified checklist first.');
      return;
    }

    try {
      const pdfBlob = await this.service.downloadInstancePdf(this.selectedInstanceId);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `shipping-checklist-${this.selectedInstanceId}.pdf`;
      link.click();
      URL.revokeObjectURL(pdfUrl);
      this.toastr.success('PDF downloaded');
    } catch (error) {
      throw error;
    }
  }

  async deleteChecklist(): Promise<void> {
    if (!this.selectedInstanceId) {
      this.toastr.warning('Open a checklist first.');
      return;
    }

    const confirmed = await Swal.fire({
      icon: 'warning',
      title: 'Delete Checklist?',
      text: `Delete checklist instance #${this.selectedInstanceId}? This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: 'Delete Checklist',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (!confirmed.isConfirmed) {
      return;
    }

    this.isSaving = true;
    try {
      const result = await this.service.deleteInstance(Number(this.selectedInstanceId));
      if (!result.success) {
        this.toastr.error(result.error || 'Failed to delete checklist.');
        return;
      }

      this.toastr.success('Checklist deleted');
      await this.loadTemplatesAndInstances();
      this.startNew();
    } catch (error) {
      throw error;
    } finally {
      this.isSaving = false;
    }
  }

  refreshUploadTargets(): void {
    this.uploadTargets = this.responsesArray.controls
      .map((row) => ({
        questionCode: String(row.get('questionCode')?.value || '').trim(),
        questionText: String(row.get('questionText')?.value || '').trim(),
      }))
      .filter((row) => row.questionCode.length > 0);
  }

  onUploadTargetChanged(questionCodeInput: string): void {
    this.selectedUploadQuestionCode = String(questionCodeInput || '').trim();
  }

  getSelectedUploadAttachments(): Array<{ id: number; fileName: string; link: string }> {
    if (!this.selectedUploadQuestionCode) {
      return [];
    }

    return this.getQuestionAttachments(this.selectedUploadQuestionCode);
  }

  getLineSerialSummary(lineIndex: number): string {
    const serials = this.normalizeSerialNumbers(this.serialsArrayAt(lineIndex).getRawValue());
    if (serials.length === 0) {
      return '-';
    }

    return serials.join(', ');
  }

  displayAttachmentName(fileName: string, fallbackId: number): string {
    const raw = String(fileName || '').trim();
    if (!raw) {
      return `Image ${fallbackId}`;
    }

    if (raw.length <= 32) {
      return raw;
    }

    const extensionMatch = raw.match(/(\.[a-z0-9]{1,6})$/i);
    const extension = extensionMatch ? extensionMatch[1] : '';
    const baseName = extension ? raw.slice(0, -extension.length) : raw;

    if (baseName.length <= 20) {
      return `${baseName.slice(0, 16)}…${extension}`;
    }

    return `${baseName.slice(0, 14)}…${baseName.slice(-6)}${extension}`;
  }

  openAttachmentViewer(attachment: { fileName: string; link: string }): void {
    const url = String(attachment?.link || '').trim();
    if (!url) {
      this.toastr.warning('Attachment link is unavailable.');
      return;
    }

    const fileName = String(attachment?.fileName || '').trim() || 'Attachment';
    const modalRef = this.modalService.open(FileViewerModalComponent, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
      scrollable: false,
    });

    modalRef.componentInstance.url = url;
    modalRef.componentInstance.fileName = fileName;
  }

  async onSelectedTargetFilesChosen(event: Event): Promise<void> {
    if (!this.selectedUploadQuestionCode) {
      const input = event.target as HTMLInputElement;
      this.toastr.warning('Select a checklist item first.');
      if (input) {
        input.value = '';
      }
      return;
    }

    await this.onQuestionFilesSelected(event, this.selectedUploadQuestionCode);
  }

  async deleteSelectedUploadAttachment(attachmentId: number): Promise<void> {
    await this.deleteQuestionAttachment(this.selectedUploadQuestionCode, attachmentId);
  }

  async deleteQuestionAttachment(questionCode: string, attachmentId: number): Promise<void> {
    const normalizedQuestionCode = String(questionCode || '').trim();
    if (!normalizedQuestionCode) {
      this.toastr.warning('Select a checklist item first.');
      return;
    }

    const normalizedId = Number(attachmentId || 0);
    if (normalizedId <= 0) {
      this.toastr.warning('This image reference cannot be deleted from attachments.');
      return;
    }

    const confirmed = await Swal.fire({
      icon: 'warning',
      title: 'Delete Image?',
      text: 'Delete this image attachment?',
      showCancelButton: true,
      confirmButtonText: 'Delete Image',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (!confirmed.isConfirmed) {
      return;
    }

    const key = this.getQuestionKey(normalizedQuestionCode);
    this.uploadingByQuestion[key] = true;

    try {
      await this.attachmentsService.delete(normalizedId);
      await this.refreshQuestionAttachments(normalizedQuestionCode);
      this.patchResponseImageUrls(normalizedQuestionCode);
      this.toastr.success('Image deleted');
    } catch (error) {
      throw error;
    } finally {
      this.uploadingByQuestion[key] = false;
    }
  }

  buildPayload(status: 'draft' | 'submitted' | 'verified'): ShippingChecklistInstancePayload {
    const raw = this.form.getRawValue();
    const existingVerifierEmail = String(raw.secondVerifierEmail || '').trim();
    const existingVerifierName = String(raw.secondVerifierName || '').trim();
    const assignedVerifierEmail = existingVerifierEmail || this.getAssignedVerifierEmail();
    const isExistingInstance = Boolean(this.selectedInstanceId);
    const assignedVerifierName = isExistingInstance
      ? existingVerifierName
      : String(this.selectedTemplate?.assignedVerifierName || '').trim() || existingVerifierName;
    const lines = (raw.lines || [])
      .map((line: any, index: number) => {
        const serialNumbers = this.normalizeSerialRows(line.serialNumbers);
        const firstNonEmptySerial = serialNumbers.find((serial) => String(serial || '').trim().length > 0) || '';
        return {
          lineOrder: Number(line.lineOrder || index + 1),
          isSelected: line.isSelected !== false,
          partNumber: String(line.partNumber || '').trim(),
          qty: String(line.qty || '').trim(),
          serialNumber: firstNonEmptySerial,
          serialNumbers,
          palletQty: String(line.palletQty || '').trim(),
        };
      });

    const totalPallets = this.calculateTotalPalletsFromLines(raw.lines || []);

    const responses = (raw.responses || []).map((response: any) => {
      const questionCode = String(response.questionCode || '').trim();
      return {
        questionCode,
        questionText: String(response.questionText || '').trim(),
        responseValue: String(response.responseValue || '').trim().toLowerCase() as 'yes' | 'no' | 'na' | '',
        imageUrls: this.getQuestionImageUrls(questionCode),
      };
    });

    const user = this.authService.currentUserValue;
    const currentUserDisplay = String(user?.full_name || user?.username || user?.email || 'Unknown User').trim();
    const createdBy = this.selectedInstanceId
      ? String(this.createdByDisplay || currentUserDisplay).trim()
      : currentUserDisplay;
    const normalizedFormDate = this.normalizeDate(raw.formDate);
    const todayDate = this.normalizeDate(new Date().toISOString().slice(0, 10));
    const normalizedVerifierDate = this.normalizeDate(raw.verifierDate);

    return {
      templateId: Number(raw.templateId),
      customerCode: String(raw.customerCode || '').trim().toLowerCase(),
      customerName: String(raw.customerName || '').trim(),
      formTitle: String(raw.formTitle || '').trim(),
      formCode: String(raw.formCode || '').trim(),
      status,
      formDate: this.selectedInstanceId ? normalizedFormDate : normalizedFormDate || todayDate,
      shipVia: String(raw.shipVia || '').trim(),
      shippingAccount: String(raw.shippingAccount || '').trim(),
      salesOrder: String(raw.salesOrder || '').trim(),
      packingSlip: String(raw.packingSlip || '').trim(),
      arrivalDate: this.normalizeDate(raw.arrivalDate),
      totalPallets,
      verifierName: String(raw.verifierName || '').trim(),
      verifierDate:
        status === 'submitted'
          ? normalizedVerifierDate || todayDate
          : normalizedVerifierDate,
      secondVerifierName: assignedVerifierName || String(raw.secondVerifierName || '').trim(),
      secondVerifierEmail: assignedVerifierEmail || String(raw.secondVerifierEmail || '').trim(),
      secondVerifierDate:
        status === 'verified'
          ? this.normalizeDate(raw.secondVerifierDate) || this.normalizeDate(new Date().toISOString().slice(0, 10))
          : null,
      notes: String(raw.notes || '').trim(),
      createdBy,
      lines,
      responses,
    };
  }

  normalizeDate(value: unknown): string | null {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return normalized;
    }

    return null;
  }

  normalizeNumber(value: unknown): number | null {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return null;
    }

    const n = Number(normalized);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
  }

  normalizeSerialNumbers(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item: unknown) => {
          if (item && typeof item === 'object' && 'serial' in (item as Record<string, unknown>)) {
            return String((item as Record<string, unknown>)['serial'] || '').trim();
          }

          return String(item || '').trim();
        })
        .filter((item) => item.length > 0);
    }

    const raw = String(value || '').trim();
    if (!raw) {
      return [];
    }

    return raw
      .split(/\r?\n|,|;/g)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  normalizeSerialRows(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item: unknown) => {
          if (item && typeof item === 'object' && 'serial' in (item as Record<string, unknown>)) {
            return String((item as Record<string, unknown>)['serial'] || '').trim();
          }

          return String(item || '').trim();
        });
    }

    const raw = String(value || '').trim();
    if (!raw) {
      return [];
    }

    return raw
      .split(/\r?\n|,|;/g)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private setInstanceResponses(responseRows: any[], template: ShippingChecklistTemplate | null): void {
    const rows = Array.isArray(responseRows) ? responseRows : [];
    const templateRequiredByCode = new Map<string, boolean>();

    if (template) {
      for (const question of template.questions || []) {
        templateRequiredByCode.set(String(question.questionCode || '').trim(), Boolean(question.isRequired));
      }
    }

    if (rows.length > 0) {
      const responses = this.fb.array<FormGroup>(
        rows.map((row: any) => {
          const questionCode = String(row?.questionCode || '').trim();
          return this.fb.group({
            questionCode: [questionCode],
            questionText: [String(row?.questionText || '').trim()],
            isRequired: [templateRequiredByCode.get(questionCode) ?? true],
            responseValue: [String(row?.responseValue || '').trim().toLowerCase()],
            imageUrls: [Array.isArray(row?.imageUrls) ? row.imageUrls : []],
          });
        }),
      );

      this.form.setControl('responses', responses);
      return;
    }

    if (template) {
      const responses = this.fb.array<FormGroup>(
        template.questions.map((question) =>
          this.fb.group({
            questionCode: [question.questionCode],
            questionText: [question.questionText],
            isRequired: [question.isRequired],
            responseValue: [''],
            imageUrls: [[]],
          }),
        ),
      );

      this.form.setControl('responses', responses);
      return;
    }

    this.form.setControl('responses', this.fb.array<FormGroup>([]));
  }

  private getAssignedVerifierEmail(): string {
    return String(this.selectedTemplate?.assignedVerifierEmail || '').trim();
  }

  private applyFormLockState(): void {
    if (this.isChecklistLocked) {
      this.form.disable({ emitEvent: false });
      return;
    }

    this.form.enable({ emitEvent: false });
  }

  private bindLineTotalsSync(): void {
    this.linesValueChangesSub?.unsubscribe();
    this.linesValueChangesSub = this.linesArray.valueChanges.subscribe(() => {
      this.recalculateTotalPalletsFromLines();
    });
    this.recalculateTotalPalletsFromLines();
  }

  private recalculateTotalPalletsFromLines(): void {
    const lines = this.linesArray.getRawValue() || [];
    const total = this.calculateTotalPalletsFromLines(lines);
    this.form.patchValue({ totalPallets: total }, { emitEvent: false });
  }

  private calculateTotalPalletsFromLines(lines: Array<Record<string, unknown>>): number {
    return lines.reduce((sum, line) => {
      const isSelected = line?.['isSelected'] !== false;
      if (!isSelected) {
        return sum;
      }

      const palletQty = this.normalizeNumber(line?.['palletQty']);
      return sum + (palletQty || 0);
    }, 0);
  }

  get pendingSecondaryVerifications(): ShippingChecklistListItem[] {
    return this.instances.filter((item) => item.status === 'submitted');
  }

  get recentChecklistPreview(): ShippingChecklistListItem[] {
    return this.instances.slice(0, 10);
  }

  getQuestionKey(questionCode: string): string {
    return `${this.uploadScopeId}:${String(questionCode || '').trim()}`;
  }

  createUploadScopeId(): string {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `draft-${crypto.randomUUID()}`;
      }
    } catch {
      // Fallback when crypto UUID is unavailable.
    }

    return `draft-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  }

  mergeQuestionImageUrls(questionCode: string, imageUrls: string[]): void {
    const key = this.getQuestionKey(questionCode);
    const existing = this.questionAttachments[key] || [];

    const byLink = new Map<string, { id: number; fileName: string; link: string }>();
    for (const attachment of existing) {
      const link = String(attachment.link || '').trim();
      if (link) {
        byLink.set(link, attachment);
      }
    }

    for (const imageUrl of Array.isArray(imageUrls) ? imageUrls : []) {
      const link = String(imageUrl || '').trim();
      if (!link || byLink.has(link)) {
        continue;
      }

      byLink.set(link, {
        id: -1,
        fileName: link.split('/').pop() || 'Image',
        link,
      });
    }

    this.questionAttachments[key] = Array.from(byLink.values());
  }

  getQuestionAttachments(questionCode: string): Array<{ id: number; fileName: string; link: string }> {
    return this.questionAttachments[this.getQuestionKey(questionCode)] || [];
  }

  getQuestionImageUrls(questionCode: string): string[] {
    return this.getQuestionAttachments(questionCode)
      .map((attachment) => String(attachment.link || '').trim())
      .filter((link) => link.length > 0);
  }

  isUploadingQuestion(questionCode: string): boolean {
    return Boolean(this.uploadingByQuestion[this.getQuestionKey(questionCode)]);
  }

  async onQuestionFilesSelected(event: Event, questionCode: string): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input?.files || []);

    if (files.length === 0) {
      return;
    }

    const key = this.getQuestionKey(questionCode);
    this.uploadingByQuestion[key] = true;

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('field', 'shippingChecklistItem');
        formData.append('uniqueData', key);
        formData.append('subFolder', 'shippingChecklist');
        await this.attachmentsService.uploadfile(formData);
      }

      await this.refreshQuestionAttachments(questionCode);
      this.patchResponseImageUrls(questionCode);
      this.toastr.success('Images uploaded');
    } catch (error) {
      throw error;
    } finally {
      this.uploadingByQuestion[key] = false;
      input.value = '';
    }
  }

  async refreshQuestionAttachments(questionCode: string): Promise<void> {
    const key = this.getQuestionKey(questionCode);
    const rows = await this.attachmentsService.find({
      field: 'shippingChecklistItem',
      uniqueId: key,
    });

    const fetched = (rows || [])
      .map((row: any) => ({
        id: Number(row.id || 0),
        fileName: String(row.fileName || row.originalName || 'Image'),
        link: String(row.link || ''),
      }))
      .filter((row: any) => row.id > 0 && row.link);

    const existing = this.questionAttachments[key] || [];
    const byLink = new Map<string, { id: number; fileName: string; link: string }>();

    for (const item of fetched) {
      const link = String(item.link || '').trim();
      if (!link) {
        continue;
      }

      byLink.set(link, item);
    }

    for (const item of existing) {
      const link = String(item.link || '').trim();
      if (!link || byLink.has(link)) {
        continue;
      }

      byLink.set(link, item);
    }

    this.questionAttachments[key] = Array.from(byLink.values());
  }

  async loadAllQuestionAttachments(): Promise<void> {
    for (const control of this.responsesArray.controls) {
      const questionCode = String(control.get('questionCode')?.value || '');
      if (!questionCode) {
        continue;
      }

      try {
        await this.refreshQuestionAttachments(questionCode);
      } catch {
        // Continue loading remaining rows even if one attachment query fails.
      }
    }
  }

  patchResponseImageUrls(questionCode: string): void {
    const control = this.responsesArray.controls.find(
      (row) => String(row.get('questionCode')?.value || '') === String(questionCode || ''),
    );

    if (!control) {
      return;
    }

    control.patchValue({ imageUrls: this.getQuestionImageUrls(questionCode) }, { emitEvent: false });
  }

  syncChecklistUrl(id: number | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id: id || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}