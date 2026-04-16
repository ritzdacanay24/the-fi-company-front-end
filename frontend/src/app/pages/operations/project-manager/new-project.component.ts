import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { SharedModule } from '@app/shared/shared.module';
import { ExecutionRole, ProjectWorkflowEngineService } from './services/project-workflow-engine.service';
import { ProjectDashboardItem, ProjectManagerProjectsService } from './services/project-manager-projects.service';
import { Router } from '@angular/router';
import { AuthenticationService } from '@app/core/services/auth.service';

type IntakeStoragePayload = {
  formValue: any;
  activeInputSystem: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6';
  activeGate: 1 | 2 | 3 | 4 | 5 | 6;
  gateCompletedAt: {
    gate1: string | null;
    gate2: string | null;
    gate3: string | null;
    gate4: string | null;
    gate5: string | null;
    gate6: string | null;
  };
};

@Component({
  standalone: true,
  selector: 'app-new-project',
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './new-project.component.html',
  styleUrls: ['./new-project.component.scss']
})
export class NewProjectComponent implements OnDestroy {
  private readonly projectManagerBaseRoute = '/project-manager';
  private readonly operationsBaseRoute = '/operations/project-manager';
  readonly stakeholderSignoffConfig: Array<{ key: 'production' | 'qc' | 'npi' | 'gm'; label: string; owner: string; aliases: string[] }> = [
    { key: 'production', label: 'Production', owner: 'Juvenal', aliases: ['juvenal', 'production'] },
    { key: 'qc', label: 'QC', owner: 'Temenuga', aliases: ['temenuga', 'qc', 'quality'] },
    { key: 'npi', label: 'NPI', owner: 'Mike', aliases: ['mike', 'npi'] },
    { key: 'gm', label: 'GM', owner: 'Nick', aliases: ['nick', 'gm', 'general manager'] }
  ];
  saveSuccessful = false;
  saveMessage = '';
  saveMessageType: 'success' | 'info' = 'success';
  activeView: 'workflow' | 'checklist' = 'checklist';
  activeInputSystem: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6' = 'gate1';
  activeGate: 1 | 2 | 3 | 4 | 5 | 6 = 1;
  generatedProjectId = '';
  activeProjectId = '';
  lastSavedProjectId = '';
  executionRole: ExecutionRole = 'Project Manager';

  gate1CompletedAt: string | null = null;
  gate2CompletedAt: string | null = null;
  gate3CompletedAt: string | null = null;
  gate4CompletedAt: string | null = null;
  gate5CompletedAt: string | null = null;
  gate6CompletedAt: string | null = null;
  private formSub: Subscription | undefined;
  gateNavigationMessage = '';
  isDraftProject = false;

  private readonly gateOrder: Array<'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6'> = [
    'gate1', 'gate2', 'gate3', 'gate4', 'gate5', 'gate6'
  ];
  private isApplyingProjectState = false;
  private readonly intakeStoragePrefix = 'pm_project_intake_v1_';

  customers = ['Aristocrat', 'Light & Wonder', 'IGT', 'Konami', 'Ainsworth', 'Custom'];
  projectCategories = ['New', 'Revision', 'Cost Down', 'Custom'];
  strategyTypes = ['Growth', 'Retention', 'Platform', 'Sustainment'];
  rangeOptions = ['Low', 'Medium', 'High'];

  projectForm: FormGroup = this.fb.group({
    // Gate #1
    newBusinessOpportunity: [null],
    rfpReceived: [null],
    productExpectationDoc: [null],
    pixelPitchDimsCaptured: [null],
    customer: ['', Validators.required],
    productName: ['', [Validators.required, Validators.maxLength(120)]],
    projectCategory: ['', Validators.required],
    strategyType: ['', Validators.required],
    initialRfpDate: ['', Validators.required],
    targetProductionDate: ['', Validators.required],
    volumeEstimate: ['Medium'],
    roughRevenuePotential: ['Medium'],
    estimatedRevenue: [''],
    priceProposalSubmitted: [null],
    businessAwarded: [null],
    businessAwardedDate: [''],
    forecastConfirmed: [null],

    // Gate #2-4
  designTeamConceptProposal: [null],
    conceptArchitectureDefined: [null],
    roughCostEntered: [null],
  timelineEstimatedLlt: [null],
  preliminaryBomForSourcing: [null],
    preliminaryBomUploaded: [null],
  firstPosConfirmed: [null],
  detailedEngineeringDesign: [null],
    longLeadItemsIdentified: [null],
    longLeadItemsDate: [''],
    dfmCompleted: [null],
  sourcingProductionLogisticsAligned: [null],
    changeRequestLog: [''],
    engineeringReleaseEta: [''],
    protoQty: [null],
    partNumberMapped: [null],
  finalBomReview: [null],
    engChecklistPixelMapping: [null],
    engChecklistInstallationInstructions: [null],
    engChecklistWorkInstruction: [null],
    engChecklistPdc: [null],
    engChecklistQualityDocs: [null],

    // Gate #5-6
  customerReviewValidation: [null],
    functionalValidationComplete: [null],
  pilotRunCompleted: [null],
    pilotRunCompletedDate: [''],
  instructionValidation: [null],
  softwareFilesValidation: [null],
  supplierFeedbackCaptured: [null],
    finalBomApproved: [null],
    qcProcedureDefined: [null],
    packagingInstructionsComplete: [null],
  productionPoReceived: [null],
    inventoryStrategyAligned: [null],
    productionSignoffBy: [''],
    productionSignoffAt: [''],
    qcSignoffBy: [''],
    qcSignoffAt: [''],
    npiSignoffBy: [''],
    npiSignoffAt: [''],
    gmSignoffBy: [''],
    gmSignoffAt: [''],

    notes: [''],

    // Gate statuses
    gate1Status: ['In Progress'],
    gate2Status: ['Not Started'],
    gate3Status: ['Not Started'],
    gate4Status: ['Not Started'],
    gate5Status: ['Not Started'],
    gate6Status: ['Not Started']
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private workflow: ProjectWorkflowEngineService,
    private projectsService: ProjectManagerProjectsService,
    private authService: AuthenticationService
  ) {
    this.syncExecutionRoleFromCurrentUser();

    const today = this.formatDate(new Date());
    this.generatedProjectId = '';
    this.projectForm.patchValue({
      initialRfpDate: today
    });
    this.formSub = this.projectForm.valueChanges.subscribe(() => {
      this.updateGateCompletionTimestamps();

      if (!this.isApplyingProjectState && this.hasPersistableProjectContext) {
        this.persistProjectIntakeState(this.persistableProjectId);
      }
    });

    this.route.queryParamMap.subscribe(params => {
      const projectId = (params.get('projectId') || '').trim();
      const view = (params.get('view') || '').trim();
      const requestedGate = this.parseGateInputSystem(params.get('gate'));
      if (view === 'workflow' || view === 'checklist') {
        this.activeView = view;
      }

      const projects = this.projectsService.getProjects();
      const selected = projects.find(project => project.id === projectId);
      if (selected) {
        this.projectsService.setSelectedProjectId(selected.id);
        this.activeProjectId = selected.id;
        this.generatedProjectId = selected.id;
        this.isDraftProject = selected.status === 'Draft';
        this.loadProjectIntakeState(selected.id, selected);
        this.applyRequestedGateFromQuery(requestedGate);
        return;
      }

      if (projectId) {
        this.activeProjectId = projectId;
        this.generatedProjectId = projectId;
        this.isDraftProject = false;
        this.loadProjectIntakeState(projectId);
        this.applyRequestedGateFromQuery(requestedGate);
        return;
      }

      // No project in URL: stay in new-intake mode until submit creates one.
      this.activeProjectId = '';
      this.lastSavedProjectId = '';
      this.generatedProjectId = '';
      this.isDraftProject = false;
      this.applyRequestedGateFromQuery(requestedGate);
    });
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
  }

  submit(): void {
    this.saveSuccessful = false;
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    const createdProjectId = this.generatedProjectId || this.projectsService.generateProjectId();
    this.generatedProjectId = createdProjectId;

    this.projectsService.createProject({
      id: createdProjectId,
      productName: String(this.projectForm.get('productName')?.value || '').trim(),
      customer: String(this.projectForm.get('customer')?.value || '').trim(),
      projectCategory: String(this.projectForm.get('projectCategory')?.value || '').trim(),
      strategyType: String(this.projectForm.get('strategyType')?.value || '').trim(),
      roughRevenuePotential: String(this.projectForm.get('roughRevenuePotential')?.value || '').trim(),
      estimatedRevenue: String(this.projectForm.get('estimatedRevenue')?.value || '').trim(),
      initialRfpDate: String(this.projectForm.get('initialRfpDate')?.value || ''),
      targetProductionDate: String(this.projectForm.get('targetProductionDate')?.value || ''),
      readinessScore: this.readinessScore,
      readinessStatus: this.readinessStatus,
      activeGate: this.activeGate,
      gateCompletion: {
        gate1: this.gate1Completion,
        gate2: this.gate2Completion,
        gate3: this.gate3Completion,
        gate4: this.gate4Completion,
        gate5: this.gate5Completion,
        gate6: this.gate6Completion
      },
      gateCompletedAt: {
        gate1: this.gate1CompletedAt,
        gate2: this.gate2CompletedAt,
        gate3: this.gate3CompletedAt,
        gate4: this.gate4CompletedAt,
        gate5: this.gate5CompletedAt,
        gate6: this.gate6CompletedAt
      },
      isDraft: false
    });

    this.lastSavedProjectId = createdProjectId;
    this.activeProjectId = createdProjectId;
    this.isDraftProject = false;
    this.persistProjectIntakeState(createdProjectId);
    this.saveSuccessful = true;
    this.saveMessageType = 'success';
    this.saveMessage = 'Project intake is complete and ready for backend submission.';

    // Continue in the checklist execution view for the newly created project.
    this.router.navigate([`${this.baseRoute}/new-project`], {
      queryParams: { projectId: createdProjectId, view: 'checklist' }
    });
  }

  saveDraft(): void {
    this.saveSuccessful = false;

    const draftProjectId = this.generatedProjectId || this.projectsService.generateProjectId();
    this.generatedProjectId = draftProjectId;

    this.projectsService.createProject({
      id: draftProjectId,
      productName: String(this.projectForm.get('productName')?.value || '').trim() || 'Draft Project',
      customer: String(this.projectForm.get('customer')?.value || '').trim() || 'TBD',
      projectCategory: String(this.projectForm.get('projectCategory')?.value || '').trim() || 'New',
      strategyType: String(this.projectForm.get('strategyType')?.value || '').trim() || 'Growth',
      roughRevenuePotential: String(this.projectForm.get('roughRevenuePotential')?.value || '').trim() || 'Medium',
      estimatedRevenue: String(this.projectForm.get('estimatedRevenue')?.value || '').trim(),
      initialRfpDate: String(this.projectForm.get('initialRfpDate')?.value || this.formatDate(new Date())),
      targetProductionDate: String(this.projectForm.get('targetProductionDate')?.value || ''),
      readinessScore: this.readinessScore,
      readinessStatus: this.readinessStatus,
      activeGate: this.activeGate,
      gateCompletion: {
        gate1: this.gate1Completion,
        gate2: this.gate2Completion,
        gate3: this.gate3Completion,
        gate4: this.gate4Completion,
        gate5: this.gate5Completion,
        gate6: this.gate6Completion
      },
      gateCompletedAt: {
        gate1: this.gate1CompletedAt,
        gate2: this.gate2CompletedAt,
        gate3: this.gate3CompletedAt,
        gate4: this.gate4CompletedAt,
        gate5: this.gate5CompletedAt,
        gate6: this.gate6CompletedAt
      },
      isDraft: true
    });

    this.lastSavedProjectId = draftProjectId;
    this.activeProjectId = draftProjectId;
    this.isDraftProject = true;
    this.persistProjectIntakeState(draftProjectId);
    this.saveSuccessful = true;
    this.saveMessageType = 'info';
    this.saveMessage = 'Draft saved. You can continue this project later from any gate.';

    this.router.navigate([`${this.baseRoute}/new-project`], {
      queryParams: { projectId: draftProjectId, view: 'checklist' },
      replaceUrl: true
    });
  }

  resetForm(): void {
    const today = this.formatDate(new Date());
    this.projectForm.reset({
      newBusinessOpportunity: null,
      rfpReceived: null,
      productExpectationDoc: null,
      pixelPitchDimsCaptured: null,
      customer: '',
      productName: '',
      projectCategory: '',
      strategyType: '',
      initialRfpDate: today,
      targetProductionDate: '',
      volumeEstimate: 'Medium',
      roughRevenuePotential: 'Medium',
      estimatedRevenue: '',
      priceProposalSubmitted: null,
      businessAwarded: null,
      businessAwardedDate: '',
      forecastConfirmed: null,
      designTeamConceptProposal: null,
      conceptArchitectureDefined: null,
      roughCostEntered: null,
      timelineEstimatedLlt: null,
      preliminaryBomForSourcing: null,
      preliminaryBomUploaded: null,
      firstPosConfirmed: null,
      detailedEngineeringDesign: null,
      longLeadItemsIdentified: null,
      longLeadItemsDate: '',
      dfmCompleted: null,
      sourcingProductionLogisticsAligned: null,
      changeRequestLog: '',
      engineeringReleaseEta: '',
      protoQty: null,
      partNumberMapped: null,
      finalBomReview: null,
      engChecklistPixelMapping: null,
      engChecklistInstallationInstructions: null,
      engChecklistWorkInstruction: null,
      engChecklistPdc: null,
      engChecklistQualityDocs: null,
      customerReviewValidation: null,
      functionalValidationComplete: null,
      pilotRunCompleted: null,
      pilotRunCompletedDate: '',
      instructionValidation: null,
      softwareFilesValidation: null,
      supplierFeedbackCaptured: null,
      finalBomApproved: null,
      qcProcedureDefined: null,
      packagingInstructionsComplete: null,
      productionPoReceived: null,
      inventoryStrategyAligned: null,
      productionSignoffBy: '',
      productionSignoffAt: '',
      qcSignoffBy: '',
      qcSignoffAt: '',
      npiSignoffBy: '',
      npiSignoffAt: '',
      gmSignoffBy: '',
      gmSignoffAt: '',
      notes: ''
    });
    this.saveSuccessful = false;
    this.saveMessage = '';
    this.workflow.reset();
    this.generatedProjectId = '';
    this.activeProjectId = '';
    this.lastSavedProjectId = '';
    this.isDraftProject = false;
    this.gate1CompletedAt = null;
    this.gate2CompletedAt = null;
    this.gate3CompletedAt = null;
    this.gate4CompletedAt = null;
    this.gate5CompletedAt = null;
    this.gate6CompletedAt = null;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { projectId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  executeStep(step: number): void {
    this.workflow.executeStep(step, this.executionRole, this.isStepDataReady(step));
  }

  canExecuteStep(step: number): boolean {
    return this.workflow.canExecuteStep(step, this.executionRole, this.isStepDataReady(step));
  }

  getStepOwner(step: number): string {
    return this.workflow.getStepOwner(step);
  }

  isStepOwnedByRole(step: number): boolean {
    return this.workflow.isStepOwnedByRole(step, this.executionRole);
  }

  setApprovalStatus(status: 'pending' | 'approved' | 'rejected'): void {
    this.workflow.setApprovalStatus(status);
  }

  get workflowProgress(): number {
    return this.workflow.workflowProgress;
  }

  get workflowStatusClass(): string {
    return this.workflow.workflowStatusClass;
  }

  get workflowState(): Record<number, boolean> {
    return this.workflow.workflowState;
  }

  get approvalStatus(): 'pending' | 'approved' | 'rejected' {
    return this.workflow.approvalStatus;
  }

  get workflowMessage(): string {
    return this.workflow.workflowMessage;
  }

  get ecoTriggered(): boolean {
    return this.workflow.ecoTriggered;
  }

  get ecoTriggerSource(): 'project-init' | 'document-change' | null {
    return this.workflow.ecoTriggerSource;
  }

  get ecoTriggeredAt(): string | null {
    return this.workflow.ecoTriggeredAt;
  }

  get executionHistory(): Array<{ step: number; role: string; timestamp: string; note: string }> {
    return this.workflow.executionHistory;
  }

  private isStepDataReady(step: number): boolean {
    switch (step) {
      case 1:
        return this.hasCoreProjectSetup;
      case 2:
        return this.hasTaskAndPoInputs;
      case 3:
        return this.hasAssignedOwner;
      case 4:
        return this.hasGatePlanningData;
      case 5:
        return true;
      case 6:
        return this.hasDocumentSignals;
      case 7:
        return this.hasEcoInputs;
      case 8:
        return this.hasPoInputs;
      case 9:
        return true;
      default:
        return false;
    }
  }

  private get hasCoreProjectSetup(): boolean {
    return !!(
      this.projectForm.get('customer')?.value &&
      this.projectForm.get('productName')?.value &&
      this.projectForm.get('projectCategory')?.value &&
      this.projectForm.get('priceProposalSubmitted')?.value
    );
  }

  private get hasTaskAndPoInputs(): boolean {
    return !!(
      this.projectForm.get('partNumberMapped')?.value ||
      this.projectForm.get('protoQty')?.value
    );
  }

  private get hasAssignedOwner(): boolean {
    return !!this.projectForm.get('strategyType')?.value;
  }

  private get hasGatePlanningData(): boolean {
    return !!(
      this.projectForm.get('targetProductionDate')?.value &&
      this.projectForm.get('initialRfpDate')?.value
    );
  }

  private get hasDocumentSignals(): boolean {
    return !!(
      this.projectForm.get('engChecklistWorkInstruction')?.value ||
      this.projectForm.get('engChecklistQualityDocs')?.value
    );
  }

  private get hasEcoInputs(): boolean {
    return !!(
      this.projectForm.get('changeRequestLog')?.value ||
      this.projectForm.get('functionalValidationComplete')?.value
    );
  }

  private get hasPoInputs(): boolean {
    return !!(
      this.projectForm.get('productionPoReceived')?.value ||
      this.projectForm.get('businessAwarded')?.value
    );
  }

  get autoChangeRequestCount(): number {
    const raw = String(this.projectForm.get('changeRequestLog')?.value || '').trim();
    if (!raw) {
      return 0;
    }
    return raw
      .split(/\r?\n|,/)
      .map(entry => entry.trim())
      .filter(Boolean).length;
  }

  get gateAgeDays(): number {
    const raw = this.projectForm.get('initialRfpDate')?.value;
    if (!raw) {
      return 0;
    }
    const start = new Date(raw);
    if (Number.isNaN(start.getTime())) {
      return 0;
    }
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffMs = now.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffMs / 86400000));
  }

  get isOverdue(): boolean {
    const raw = this.projectForm.get('targetProductionDate')?.value;
    if (!raw) {
      return false;
    }
    const target = new Date(raw);
    if (Number.isNaN(target.getTime())) {
      return false;
    }
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return target.getTime() < today.getTime();
  }

  get readinessScore(): number {
    const checks = [
      ...this.gateFieldMap.gate1,
      ...this.gateFieldMap.gate2,
      ...this.gateFieldMap.gate3,
      ...this.gateFieldMap.gate4,
      ...this.gateFieldMap.gate5,
      ...this.gateFieldMap.gate6
    ];

    const readyCount = checks.filter(field => this.isFieldReady(field)).length;
    return checks.length ? Math.round((readyCount / checks.length) * 100) : 0;
  }

  get gate1Completion(): number { return this.getGateCompletion('gate1'); }
  get gate2Completion(): number { return this.getGateCompletion('gate2'); }
  get gate3Completion(): number { return this.getGateCompletion('gate3'); }
  get gate4Completion(): number { return this.getGateCompletion('gate4'); }
  get gate5Completion(): number { return this.getGateCompletion('gate5'); }
  get gate6Completion(): number { return this.getGateCompletion('gate6'); }

  private gateFieldMap: Record<'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6', string[]> = {
    gate1: [
      'customer',
      'productName',
      'projectCategory',
      'strategyType',
      'initialRfpDate',
      'targetProductionDate',
      'priceProposalSubmitted',
      'businessAwarded',
      'forecastConfirmed'
    ],
    gate2: [
      'conceptArchitectureDefined',
      'roughCostEntered',
      'longLeadItemsIdentified'
    ],
    gate3: [
      'preliminaryBomUploaded',
      'protoQty',
      'partNumberMapped',
      'engineeringReleaseEta'
    ],
    gate4: [
      'dfmCompleted',
      'engChecklistPixelMapping',
      'engChecklistInstallationInstructions',
      'engChecklistWorkInstruction',
      'engChecklistPdc',
      'engChecklistQualityDocs'
    ],
    gate5: [
      'functionalValidationComplete',
      'pilotRunCompletedDate',
      'finalBomApproved',
      'packagingInstructionsComplete'
    ],
    gate6: [
      'qcProcedureDefined',
      'productionPoReceived',
      'inventoryStrategyAligned',
      'productionSignoffAt',
      'qcSignoffAt',
      'npiSignoffAt',
      'gmSignoffAt'
    ]
  };

  get currentUserDisplayName(): string {
    const user = this.authService.currentUserValue || {};
    return String(
      user.full_name || user.fullName || user.username || user.name || user.email || 'Current User'
    ).trim();
  }

  canSignOffStakeholder(stakeholder: 'production' | 'qc' | 'npi' | 'gm'): boolean {
    if (this.isStakeholderSigned(stakeholder)) {
      return false;
    }

    const matchedStakeholder = this.getMatchedStakeholderForCurrentUser();
    return matchedStakeholder === stakeholder;
  }

  signOffStakeholder(stakeholder: 'production' | 'qc' | 'npi' | 'gm'): void {
    if (!this.canSignOffStakeholder(stakeholder)) {
      return;
    }

    const atField = this.getStakeholderAtField(stakeholder);
    const byField = this.getStakeholderByField(stakeholder);
    const signedAt = this.formatDateTime(new Date());
    this.projectForm.patchValue({
      [atField]: signedAt,
      [byField]: this.currentUserDisplayName
    });
  }

  isStakeholderSigned(stakeholder: 'production' | 'qc' | 'npi' | 'gm'): boolean {
    return !!this.projectForm.get(this.getStakeholderAtField(stakeholder))?.value;
  }

  getStakeholderSignedBy(stakeholder: 'production' | 'qc' | 'npi' | 'gm'): string {
    return String(this.projectForm.get(this.getStakeholderByField(stakeholder))?.value || '');
  }

  getStakeholderSignedAt(stakeholder: 'production' | 'qc' | 'npi' | 'gm'): string {
    const raw = this.projectForm.get(this.getStakeholderAtField(stakeholder))?.value;
    if (!raw) {
      return '';
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return String(raw);
    }

    return date.toLocaleString();
  }

  getStakeholderSignoffHint(stakeholder: 'production' | 'qc' | 'npi' | 'gm'): string {
    if (this.isStakeholderSigned(stakeholder)) {
      return 'Signed';
    }

    const matchedStakeholder = this.getMatchedStakeholderForCurrentUser();
    if (matchedStakeholder === stakeholder) {
      return 'You can sign off';
    }

    const stakeholderConfig = this.stakeholderSignoffConfig.find(config => config.key === stakeholder);
    return stakeholderConfig ? `Only ${stakeholderConfig.owner} can sign` : 'Restricted';
  }

  private getMatchedStakeholderForCurrentUser(): 'production' | 'qc' | 'npi' | 'gm' | null {
    const user = this.authService.currentUserValue || {};
    const fullText = [
      user.full_name,
      user.fullName,
      user.username,
      user.name,
      user.role,
      user.user_role,
      user.department,
      user.title,
      this.executionRole
    ]
      .map(value => String(value || '').toLowerCase())
      .join(' ');

    for (const stakeholder of this.stakeholderSignoffConfig) {
      if (stakeholder.aliases.some(alias => fullText.includes(alias))) {
        return stakeholder.key;
      }
    }

    return null;
  }

  private getStakeholderByField(stakeholder: 'production' | 'qc' | 'npi' | 'gm'): string {
    if (stakeholder === 'production') return 'productionSignoffBy';
    if (stakeholder === 'qc') return 'qcSignoffBy';
    if (stakeholder === 'npi') return 'npiSignoffBy';
    return 'gmSignoffBy';
  }

  private getStakeholderAtField(stakeholder: 'production' | 'qc' | 'npi' | 'gm'): string {
    if (stakeholder === 'production') return 'productionSignoffAt';
    if (stakeholder === 'qc') return 'qcSignoffAt';
    if (stakeholder === 'npi') return 'npiSignoffAt';
    return 'gmSignoffAt';
  }

  private syncExecutionRoleFromCurrentUser(): void {
    const user = this.authService.currentUserValue || {};
    const roleText = String(
      user.role || user.user_role || user.department || user.title || user.position || ''
    ).toLowerCase();

    if (!roleText) {
      return;
    }

    if (roleText.includes('engineer')) {
      this.executionRole = 'Engineering';
    } else if (roleText.includes('supply')) {
      this.executionRole = 'Supply Chain';
    } else if (roleText.includes('quality') || roleText.includes('doc control') || roleText.includes('qc')) {
      this.executionRole = 'Quality (Doc Control)';
    } else if (roleText.includes('csm')) {
      this.executionRole = 'CSM';
    } else {
      this.executionRole = 'Project Manager';
    }
  }

  private updateGateCompletionTimestamps(): void {
    const completedAt = this.formatDateTime(new Date());
    if (this.gate1Completion >= 100 && !this.gate1CompletedAt) { this.gate1CompletedAt = completedAt; }
    else if (this.gate1Completion < 100) { this.gate1CompletedAt = null; }
    if (this.gate2Completion >= 100 && !this.gate2CompletedAt) { this.gate2CompletedAt = completedAt; }
    else if (this.gate2Completion < 100) { this.gate2CompletedAt = null; }
    if (this.gate3Completion >= 100 && !this.gate3CompletedAt) { this.gate3CompletedAt = completedAt; }
    else if (this.gate3Completion < 100) { this.gate3CompletedAt = null; }
    if (this.gate4Completion >= 100 && !this.gate4CompletedAt) { this.gate4CompletedAt = completedAt; }
    else if (this.gate4Completion < 100) { this.gate4CompletedAt = null; }
    if (this.gate5Completion >= 100 && !this.gate5CompletedAt) { this.gate5CompletedAt = completedAt; }
    else if (this.gate5Completion < 100) { this.gate5CompletedAt = null; }
    if (this.gate6Completion >= 100 && !this.gate6CompletedAt) { this.gate6CompletedAt = completedAt; }
    else if (this.gate6Completion < 100) { this.gate6CompletedAt = null; }
  }

  private getGateCompletion(gate: keyof NewProjectComponent['gateFieldMap']): number {
    const fields = this.gateFieldMap[gate];
    if (!fields.length) {
      return 0;
    }
    const completeCount = fields.filter(field => this.isFieldComplete(field)).length;
    return Math.round((completeCount / fields.length) * 100);
  }

  private isFieldComplete(fieldName: string): boolean {
    const control = this.projectForm.get(fieldName);
    if (!control) {
      return false;
    }
    const value = control.value;

    if (typeof value === 'boolean') {
      return true;
    }
    if (value === null || value === undefined) {
      return false;
    }
    return String(value).trim().length > 0;
  }

  private isFieldReady(fieldName: string): boolean {
    const control = this.projectForm.get(fieldName);
    if (!control) {
      return false;
    }

    const value = control.value;
    if (typeof value === 'boolean') {
      return value === true;
    }

    if (value === null || value === undefined) {
      return false;
    }

    return String(value).trim().length > 0;
  }

  get readinessStatus(): 'Green' | 'Yellow' | 'Red' {
    if (this.isOverdue && this.readinessScore < 80) {
      return 'Red';
    }
    if (this.readinessScore >= 80) {
      return 'Green';
    }
    if (this.readinessScore >= 50) {
      return 'Yellow';
    }
    return 'Red';
  }

  get readinessStatusClass(): string {
    if (this.readinessStatus === 'Green') {
      return 'bg-success';
    }
    if (this.readinessStatus === 'Yellow') {
      return 'bg-warning text-dark';
    }
    return 'bg-danger';
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateTime(date: Date): string {
    return date.toISOString();
  }

  setView(view: 'workflow' | 'checklist'): void {
    this.activeView = view;
  }

  setActiveInputSystem(inputSystem: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6'): void {
    if (!this.canAccessGate(inputSystem)) {
      this.gateNavigationMessage = this.getGateLockMessage(inputSystem);
      return;
    }

    this.gateNavigationMessage = '';
    this.activeInputSystem = inputSystem;
    const gateNumber = Number(inputSystem.replace('gate', ''));
    if (Number.isFinite(gateNumber) && gateNumber >= 1 && gateNumber <= 6) {
      this.activeGate = gateNumber as 1 | 2 | 3 | 4 | 5 | 6;
    }
    if (this.hasPersistableProjectContext) {
      this.persistProjectIntakeState(this.persistableProjectId);
    }
  }

  canAccessGate(inputSystem: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6'): boolean {
    if (this.isDraftProject) {
      return true;
    }

    if (inputSystem === this.activeInputSystem) {
      return true;
    }

    const targetIndex = this.gateOrder.indexOf(inputSystem);
    if (targetIndex <= 0) {
      return true;
    }

    const priorGate = this.gateOrder[targetIndex - 1];
    return this.getGateCompletionByInputSystem(priorGate) >= 100;
  }

  setBooleanFieldValue(fieldName: string, value: boolean): void {
    const control = this.projectForm.get(fieldName);
    if (!control) {
      return;
    }

    // Clicking the already selected option clears the choice back to blank.
    const nextValue = control.value === value ? null : value;
    control.setValue(nextValue);
    control.markAsDirty();
    control.markAsTouched();
  }

  isBooleanFieldSelected(fieldName: string, value: boolean): boolean {
    return this.projectForm.get(fieldName)?.value === value;
  }

  get taskBoardContextLabel(): string {
    const labels: Record<string, string> = { gate1: 'Gate 1', gate2: 'Gate 2', gate3: 'Gate 3', gate4: 'Gate 4', gate5: 'Gate 5', gate6: 'Gate 6' };
    return labels[this.activeInputSystem] || 'Gate 1';
  }

  get taskBoardQueryParams(): { gateContext: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6'; gate: number; projectId: string } {
    const gateNumber = Number(this.activeInputSystem.replace('gate', ''));
    return {
      gateContext: this.activeInputSystem,
      gate: Number.isFinite(gateNumber) ? gateNumber : this.activeGate,
      projectId: this.linkProjectId
    };
  }

  get canOpenTasksBoard(): boolean {
    return !!this.linkProjectId;
  }

  get hasProjectContext(): boolean {
    return !!this.linkProjectId;
  }

  openTasksBoard(): void {
    if (!this.canOpenTasksBoard) {
      return;
    }

    this.router.navigate([`${this.baseRoute}/tasks`], {
      queryParams: this.taskBoardQueryParams
    });
  }

  private get baseRoute(): string {
    return this.router.url.startsWith(this.projectManagerBaseRoute)
      ? this.projectManagerBaseRoute
      : this.operationsBaseRoute;
  }

  private get linkProjectId(): string {
    if (this.lastSavedProjectId || this.activeProjectId) {
      return this.lastSavedProjectId || this.activeProjectId;
    }

    return '';
  }

  private get hasPersistableProjectContext(): boolean {
    return !!this.persistableProjectId;
  }

  private get persistableProjectId(): string {
    return this.lastSavedProjectId || this.activeProjectId || '';
  }

  setActiveGate(gate: 1 | 2 | 3 | 4 | 5 | 6): void {
    const inputSystem = `gate${gate}` as 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6';
    if (!this.canAccessGate(inputSystem)) {
      this.gateNavigationMessage = this.getGateLockMessage(inputSystem);
      return;
    }

    this.gateNavigationMessage = '';
    this.activeGate = gate;
    this.activeInputSystem = inputSystem;
    if (this.hasPersistableProjectContext) {
      this.persistProjectIntakeState(this.persistableProjectId);
    }
  }

  nextGate(): void {
    if (this.activeGate < 6) {
      this.setActiveGate((this.activeGate + 1) as 1 | 2 | 3 | 4 | 5 | 6);
    }
  }

  previousGate(): void {
    if (this.activeGate > 1) {
      this.setActiveGate((this.activeGate - 1) as 1 | 2 | 3 | 4 | 5 | 6);
    }
  }

  private getGateCompletionByInputSystem(inputSystem: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6'): number {
    if (inputSystem === 'gate1') return this.gate1Completion;
    if (inputSystem === 'gate2') return this.gate2Completion;
    if (inputSystem === 'gate3') return this.gate3Completion;
    if (inputSystem === 'gate4') return this.gate4Completion;
    if (inputSystem === 'gate5') return this.gate5Completion;
    return this.gate6Completion;
  }

  private getGateLockMessage(targetGate: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6'): string {
    const targetIndex = this.gateOrder.indexOf(targetGate);
    if (targetIndex <= 0) {
      return '';
    }

    const priorGate = this.gateOrder[targetIndex - 1];
    const priorCompletion = this.getGateCompletionByInputSystem(priorGate);
    const priorLabel = priorGate.replace('gate', 'Gate ');
    const targetLabel = targetGate.replace('gate', 'Gate ');

    return `Complete ${priorLabel} to 100% before moving to ${targetLabel}. Current ${priorLabel}: ${priorCompletion}%.`;
  }

  private applyRequestedGateFromQuery(requestedGate: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6' | null): void {
    if (!requestedGate) {
      return;
    }

    if (this.canAccessGate(requestedGate)) {
      this.gateNavigationMessage = '';
      this.activeInputSystem = requestedGate;
      const gateNumber = Number(requestedGate.replace('gate', ''));
      if (Number.isFinite(gateNumber) && gateNumber >= 1 && gateNumber <= 6) {
        this.activeGate = gateNumber as 1 | 2 | 3 | 4 | 5 | 6;
      }
      return;
    }

    this.gateNavigationMessage = this.getGateLockMessage(requestedGate);
  }

  private parseGateInputSystem(rawGate: string | null): 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6' | null {
    if (!rawGate) {
      return null;
    }

    const normalized = String(rawGate).trim().toLowerCase();
    const gateMap: Record<string, 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6'> = {
      '1': 'gate1',
      gate1: 'gate1',
      '2': 'gate2',
      gate2: 'gate2',
      '3': 'gate3',
      gate3: 'gate3',
      '4': 'gate4',
      gate4: 'gate4',
      '5': 'gate5',
      gate5: 'gate5',
      '6': 'gate6',
      gate6: 'gate6'
    };

    return gateMap[normalized] || null;
  }

  private getIntakeStorageKey(projectId: string): string {
    return `${this.intakeStoragePrefix}${projectId}`;
  }

  private persistProjectIntakeState(projectId: string): void {
    if (!projectId) {
      return;
    }

    const payload: IntakeStoragePayload = {
      formValue: this.projectForm.getRawValue(),
      activeInputSystem: this.activeInputSystem,
      activeGate: this.activeGate,
      gateCompletedAt: {
        gate1: this.gate1CompletedAt,
        gate2: this.gate2CompletedAt,
        gate3: this.gate3CompletedAt,
        gate4: this.gate4CompletedAt,
        gate5: this.gate5CompletedAt,
        gate6: this.gate6CompletedAt
      }
    };

    try {
      localStorage.setItem(this.getIntakeStorageKey(projectId), JSON.stringify(payload));
    } catch {
      // Ignore localStorage write issues in test mode.
    }
  }

  private loadProjectIntakeState(projectId: string, projectSummary?: ProjectDashboardItem): void {
    if (!projectId) {
      return;
    }

    this.isApplyingProjectState = true;
    try {
      const baseState = this.createBaseProjectFormState(projectSummary);
      this.projectForm.reset(baseState, { emitEvent: false });

      this.gate1CompletedAt = null;
      this.gate2CompletedAt = null;
      this.gate3CompletedAt = null;
      this.gate4CompletedAt = null;
      this.gate5CompletedAt = null;
      this.gate6CompletedAt = null;

      const raw = localStorage.getItem(this.getIntakeStorageKey(projectId));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<IntakeStoragePayload>;
        if (parsed.formValue) {
          this.projectForm.patchValue(parsed.formValue, { emitEvent: false });
        }

        if (parsed.activeInputSystem && ['gate1', 'gate2', 'gate3', 'gate4', 'gate5', 'gate6'].includes(parsed.activeInputSystem)) {
          this.activeInputSystem = parsed.activeInputSystem;
        }

        if (parsed.activeGate && parsed.activeGate >= 1 && parsed.activeGate <= 6) {
          this.activeGate = parsed.activeGate;
        }

        this.gate1CompletedAt = parsed.gateCompletedAt?.gate1 ?? null;
        this.gate2CompletedAt = parsed.gateCompletedAt?.gate2 ?? null;
        this.gate3CompletedAt = parsed.gateCompletedAt?.gate3 ?? null;
        this.gate4CompletedAt = parsed.gateCompletedAt?.gate4 ?? null;
        this.gate5CompletedAt = parsed.gateCompletedAt?.gate5 ?? null;
        this.gate6CompletedAt = parsed.gateCompletedAt?.gate6 ?? null;
      }

      this.saveSuccessful = false;
      this.updateGateCompletionTimestamps();
    } catch {
      this.projectForm.reset(this.createBaseProjectFormState(projectSummary), { emitEvent: false });
    } finally {
      this.isApplyingProjectState = false;
    }
  }

  private createBaseProjectFormState(projectSummary?: ProjectDashboardItem): any {
    const today = this.formatDate(new Date());

    return {
      newBusinessOpportunity: null,
      rfpReceived: null,
      productExpectationDoc: null,
      pixelPitchDimsCaptured: null,
      customer: projectSummary?.customer || '',
      productName: projectSummary?.name || '',
      projectCategory: projectSummary?.category || '',
      strategyType: projectSummary?.strategy || '',
      initialRfpDate: projectSummary?.rfpDate || today,
      targetProductionDate: projectSummary?.targetProd || '',
      volumeEstimate: 'Medium',
      roughRevenuePotential: 'Medium',
      estimatedRevenue: '',
      priceProposalSubmitted: null,
      businessAwarded: null,
      businessAwardedDate: '',
      forecastConfirmed: null,
      designTeamConceptProposal: null,
      conceptArchitectureDefined: null,
      roughCostEntered: null,
      timelineEstimatedLlt: null,
      preliminaryBomForSourcing: null,
      preliminaryBomUploaded: null,
      firstPosConfirmed: null,
      detailedEngineeringDesign: null,
      longLeadItemsIdentified: null,
      longLeadItemsDate: '',
      dfmCompleted: null,
      sourcingProductionLogisticsAligned: null,
      changeRequestLog: '',
      engineeringReleaseEta: '',
      protoQty: null,
      partNumberMapped: null,
      finalBomReview: null,
      engChecklistPixelMapping: null,
      engChecklistInstallationInstructions: null,
      engChecklistWorkInstruction: null,
      engChecklistPdc: null,
      engChecklistQualityDocs: null,
      customerReviewValidation: null,
      functionalValidationComplete: null,
      pilotRunCompleted: null,
      pilotRunCompletedDate: '',
      instructionValidation: null,
      softwareFilesValidation: null,
      supplierFeedbackCaptured: null,
      finalBomApproved: null,
      qcProcedureDefined: null,
      packagingInstructionsComplete: null,
      productionPoReceived: null,
      inventoryStrategyAligned: null,
      productionSignoffBy: '',
      productionSignoffAt: '',
      qcSignoffBy: '',
      qcSignoffAt: '',
      npiSignoffBy: '',
      npiSignoffAt: '',
      gmSignoffBy: '',
      gmSignoffAt: '',
      notes: '',
      gate1Status: 'In Progress',
      gate2Status: 'Not Started',
      gate3Status: 'Not Started',
      gate4Status: 'Not Started',
      gate5Status: 'Not Started',
      gate6Status: 'Not Started'
    };
  }
}
