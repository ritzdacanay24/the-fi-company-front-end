import { Component, OnDestroy, TemplateRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { SharedModule } from '@app/shared/shared.module';
import { ExecutionRole, ProjectWorkflowEngineService } from './services/project-workflow-engine.service';
import {
  GateComment,
  ProjectDashboardItem,
  ProjectManagerProjectsService,
  StakeholderSignoffConfigItem,
  VolumeEstimateOption
} from './services/project-manager-projects.service';
import { ProjectManagerTasksDataService } from './services/project-manager-tasks-data.service';
import { Router } from '@angular/router';
import { AuthenticationService } from '@app/core/services/auth.service';
import { AccessControlApiService } from '@app/core/api/access-control/access-control.service';
import { NgbDropdownModule, NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { FeatureType } from '@app/shared/enums/feature.enum';

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
  imports: [SharedModule, ReactiveFormsModule, NgbDropdownModule, NgbModalModule],
  templateUrl: './new-project.component.html',
  styleUrls: ['./new-project.component.scss']
})
export class NewProjectComponent implements OnDestroy {
  readonly FeatureType = FeatureType;
  private estimateRangeDefinition = 'Low > 50, Medium 50-150, High 150+';
  private readonly projectManagerBaseRoute = '/project-manager';
  private readonly operationsBaseRoute = '/operations/project-manager';
  private readonly legacyStakeholderSignoffConfig: StakeholderSignoffConfigItem[] = [
    { key: 'signoff_user_1', label: 'Temenuga Terzieva', owner: 'Temenuga Terzieva' },
    { key: 'signoff_user_2', label: 'Mike Bristol', owner: 'Mike Bristol' },
    { key: 'signoff_user_3', label: 'Nick Walter', owner: 'Nick Walter' },
    { key: 'signoff_user_4', label: 'Juvenal Torres', owner: 'Juvenal Torres' }
  ];
  stakeholderSignoffConfig: StakeholderSignoffConfigItem[] = this.cloneStakeholderSignoffConfig(this.legacyStakeholderSignoffConfig);
  stakeholderSignoffDefaults: StakeholderSignoffConfigItem[] = this.cloneStakeholderSignoffConfig(this.legacyStakeholderSignoffConfig);
  stakeholderSignoffDraft: StakeholderSignoffConfigItem[] = [];
  stakeholderSignoffManagementError = '';
  stakeholderAssignableUsers: string[] = [];
  stakeholderUserToAdd = '';
  stakeholderProjectUserToAdd = '';
  saveSuccessful = false;
  saveMessage = '';
  saveMessageType: 'success' | 'info' = 'success';
  activeView: 'workflow' | 'checklist' = 'checklist';
  showChecklistForm = false;
  isCreatingChecklistProject = false;
  activeInputSystem: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6' = 'gate1';
  activeGate: 1 | 2 | 3 | 4 | 5 | 6 = 1;
  generatedProjectId = '';
  activeProjectId = '';
  lastSavedProjectId = '';
  executionRole: ExecutionRole = 'Project Manager';
  taskBoardNames: string[] = ['Project Tasks'];
  selectedTaskBoardName = 'Project Tasks';
  newTaskBoardName = '';

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

  customers = ['Aristocrat', 'Light & Wonder', 'IGT', 'Konami', 'Ainsworth', 'Custom'];
  customerDraftList: string[] = [];
  customerModalError = '';
  managedVolumeEstimateOptions: VolumeEstimateOption[] = [
    { key: 'Low', label: 'Low > 50' },
    { key: 'Medium', label: 'Medium 50-150' },
    { key: 'High', label: 'High 150+' },
  ];
  volumeEstimateDraftByKey: Record<'Low' | 'Medium' | 'High', string> = {
    Low: 'Low > 50',
    Medium: 'Medium 50-150',
    High: 'High 150+',
  };
  volumeEstimateModalError = '';
  gateCommentText = '';
  gateCommentError = '';
  isSavingGateComment = false;
  activeGateComments: GateComment[] = [];
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
    volumeEstimateDefinition: [this.estimateRangeDefinition],
    roughRevenuePotential: ['Medium'],
    roughRevenuePotentialDefinition: [this.estimateRangeDefinition],
    estimatedRevenue: [''],
    priceProposalSubmitted: [null],
    businessAwarded: [null],
    businessAwardedDate: [''],
    forecastConfirmed: [null],

    // Gate #2-4
  designTeamConceptProposal: [null],
    conceptArchitectureDefined: [null],
    newTechnologyToSource: [null],
    roughCostEntered: [null],
  timelineEstimatedLlt: [null],
  preliminaryBomForSourcing: [null],
    preliminaryBomUploaded: [null],
  firstPosConfirmed: [null],
  detailedEngineeringDesign: [null],
    longLeadItemsIdentified: [null],
  longLeadItemsStartDate: [''],
  longLeadItemsEndDate: [''],
  longLeadItemsComment: [''],
    dfmCompleted: [null],
  sourcingProductionLogisticsAligned: [null],
    changeRequestLog: [''],
    engineeringReleaseDate: [''],
    protoEtdDate: [''],
    protoEtaDate: [''],
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
    stakeholderSignoffConfig: [this.cloneStakeholderSignoffConfig(this.legacyStakeholderSignoffConfig)],
    stakeholderSignoffStatus: [{} as Record<string, { signedBy: string; signedAt: string }>],

    notes: [''],

    // Gate statuses
    gate1Status: ['In Progress'],
    gate2Status: ['Not Started'],
    gate3Status: ['Not Started'],
    gate4Status: ['Not Started'],
    gate5Status: ['Not Started'],
    gate6Status: ['Not Started']
  }, {
    validators: [this.longLeadDateRangeValidator]
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private workflow: ProjectWorkflowEngineService,
    private projectsService: ProjectManagerProjectsService,
    private tasksDataService: ProjectManagerTasksDataService,
    private authService: AuthenticationService,
    private accessControlApi: AccessControlApiService,
    private modalService: NgbModal
  ) {
    this.syncExecutionRoleFromCurrentUser();
    this.loadCustomerOptionsFromApi();
    this.loadVolumeEstimateOptionsFromApi();
    this.loadStakeholderSignoffDefaultsFromApi();
    this.loadStakeholderAssignableUsers();

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
      const requestedTaskBoard = String(params.get('taskBoard') || '').trim();
      this.selectedTaskBoardName = requestedTaskBoard || this.selectedTaskBoardName || 'Project Tasks';
      if (view === 'workflow' || view === 'checklist') {
        this.activeView = view;
      }

      this.projectsService.getProjects$().subscribe((projects) => {
        const selected = projects.find(project => project.id === projectId);
        if (selected) {
          this.showChecklistForm = true;
          this.saveSuccessful = false;
          this.projectsService.setSelectedProjectId(selected.id);
          this.activeProjectId = selected.id;
          this.generatedProjectId = selected.id;
          this.isDraftProject = selected.status === 'Draft';
          this.loadProjectIntakeState(selected.id, selected);
          this.refreshTaskBoards(selected.id);
          this.applyRequestedGateFromQuery(requestedGate);
          this.loadActiveGateComments();
          return;
        }

        if (projectId) {
          this.activeProjectId = '';
          this.lastSavedProjectId = '';
          this.generatedProjectId = '';
          this.isDraftProject = false;
          this.showChecklistForm = false;
          this.taskBoardNames = ['Project Tasks'];
          this.selectedTaskBoardName = requestedTaskBoard || 'Project Tasks';
          this.applyStakeholderSignoffConfig(this.getDefaultStakeholderSignoffSnapshot(), true);
          this.applyRequestedGateFromQuery(requestedGate);
          this.loadActiveGateComments();
          this.saveSuccessful = true;
          this.saveMessageType = 'info';
          this.saveMessage = `Project ${projectId} no longer exists.`;

          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { projectId: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
          return;
        }

        // No project in URL: stay in new-intake mode until submit creates one.
        this.activeProjectId = '';
        this.lastSavedProjectId = '';
        this.generatedProjectId = '';
        this.isDraftProject = false;
        this.showChecklistForm = false;
        this.taskBoardNames = ['Project Tasks'];
        this.selectedTaskBoardName = requestedTaskBoard || 'Project Tasks';
        this.applyStakeholderSignoffConfig(this.getDefaultStakeholderSignoffSnapshot(), true);
        this.applyRequestedGateFromQuery(requestedGate);
        this.loadActiveGateComments();
      });
    });
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
  }

  get volumeEstimateOptions(): Array<{ value: 'Low' | 'Medium' | 'High'; label: string }> {
    const definition = String(this.projectForm.get('volumeEstimateDefinition')?.value || this.estimateRangeDefinition);
    const labels = this.parseVolumeEstimateDefinition(definition);

    return [
      { value: 'Low', label: labels.Low },
      { value: 'Medium', label: labels.Medium },
      { value: 'High', label: labels.High }
    ];
  }

  openVolumeEstimateManagement(content: TemplateRef<unknown>): void {
    const current = this.optionsArrayToMap(this.managedVolumeEstimateOptions);
    this.volumeEstimateDraftByKey = {
      Low: current.Low,
      Medium: current.Medium,
      High: current.High,
    };
    this.volumeEstimateModalError = '';
    this.modalService.open(content, { centered: true });
  }

  saveVolumeEstimateManagement(modal: { close: () => void }): void {
    const normalized: VolumeEstimateOption[] = [
      { key: 'Low', label: this.normalizeVolumeLabel(this.volumeEstimateDraftByKey.Low) },
      { key: 'Medium', label: this.normalizeVolumeLabel(this.volumeEstimateDraftByKey.Medium) },
      { key: 'High', label: this.normalizeVolumeLabel(this.volumeEstimateDraftByKey.High) },
    ];

    if (normalized.some(item => !item.label)) {
      this.volumeEstimateModalError = 'All labels are required.';
      return;
    }

    this.projectsService.saveVolumeEstimateOptions$(normalized).subscribe((saved) => {
      const next = saved.length ? saved : normalized;
      this.managedVolumeEstimateOptions = next;
      const nextDefinition = this.optionsToDefinition(next);
      const currentDefinition = String(this.projectForm.get('volumeEstimateDefinition')?.value || '').trim();

      // Only auto-apply to new unsaved intakes; existing projects keep their historical snapshot.
      if (!this.hasPersistableProjectContext || currentDefinition === this.estimateRangeDefinition) {
        this.projectForm.patchValue({
          volumeEstimateDefinition: nextDefinition,
          roughRevenuePotentialDefinition: nextDefinition,
        });
      }

      this.estimateRangeDefinition = nextDefinition;
      modal.close();
    });
  }

  openCustomerManagement(content: TemplateRef<unknown>): void {
    this.customerDraftList = [...this.customers];
    this.customerModalError = '';
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  addCustomerOption(inputElement: HTMLInputElement): void {
    const nextName = this.normalizeCustomerName(inputElement.value);
    if (!nextName) {
      this.customerModalError = 'Enter a customer name.';
      return;
    }

    const exists = this.customerDraftList.some(customer => customer.toLowerCase() === nextName.toLowerCase());
    if (exists) {
      this.customerModalError = 'Customer already exists.';
      return;
    }

    this.customerDraftList = [...this.customerDraftList, nextName].sort((a, b) => a.localeCompare(b));
    this.customerModalError = '';
    inputElement.value = '';
    inputElement.focus();
  }

  removeCustomerOption(customerName: string): void {
    this.customerDraftList = this.customerDraftList.filter(customer => customer !== customerName);
  }

  saveCustomerManagement(modal: { close: () => void }): void {
    if (!this.customerDraftList.length) {
      this.customerModalError = 'At least one customer is required.';
      return;
    }

    this.projectsService.saveCustomerOptions$(this.customerDraftList).subscribe((savedCustomers) => {
      const nextCustomers = savedCustomers.length ? savedCustomers : this.customerDraftList;
      this.customers = [...nextCustomers];

      const selectedCustomer = String(this.projectForm.get('customer')?.value || '').trim();
      const selectedExists = this.customers.some(customer => customer === selectedCustomer);
      if (selectedCustomer && !selectedExists) {
        this.projectForm.patchValue({ customer: '' });
      }

      modal.close();
    });
  }

  openStakeholderSignoffManagement(content: TemplateRef<unknown>): void {
    this.stakeholderSignoffDraft = this.cloneStakeholderSignoffConfig(this.stakeholderSignoffDefaults);
    this.stakeholderSignoffManagementError = '';
    this.stakeholderUserToAdd = '';
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  addStakeholderUserToDraft(): void {
    const selectedUser = String(this.stakeholderUserToAdd || '').trim();
    if (!selectedUser) {
      return;
    }

    const exists = this.stakeholderSignoffDraft.some(
      (item) => String(item.owner || '').trim().toLowerCase() === selectedUser.toLowerCase(),
    );
    if (exists) {
      this.stakeholderUserToAdd = '';
      return;
    }

    const slug = selectedUser.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'user';
    let key = `signoff_${slug}`;
    let counter = 2;
    while (this.stakeholderSignoffDraft.some((item) => item.key === key)) {
      key = `signoff_${slug}_${counter++}`;
    }

    this.stakeholderSignoffDraft = [
      ...this.stakeholderSignoffDraft,
      { key, label: selectedUser, owner: selectedUser },
    ];
    this.stakeholderUserToAdd = '';
  }

  removeStakeholderUserFromDraft(key: string): void {
    this.stakeholderSignoffDraft = this.stakeholderSignoffDraft.filter((item) => item.key !== key);
  }

  updateStakeholderOwnerDraft(stakeholder: StakeholderSignoffConfigItem, owner: string): void {
    const normalizedOwner = String(owner || '').trim();
    stakeholder.owner = normalizedOwner;
  }

  saveStakeholderSignoffManagement(modal: { close: () => void }): void {
    const normalized = this.normalizeStakeholderSignoffConfig(this.stakeholderSignoffDraft, this.stakeholderSignoffDefaults);
    if (!normalized.length) {
      this.stakeholderSignoffManagementError = 'At least one sign-off user is required.';
      return;
    }

    this.projectsService.saveStakeholderSignoffDefaults$(normalized).subscribe((saved) => {
      this.stakeholderSignoffDefaults = this.normalizeStakeholderSignoffConfig(saved, normalized);

      if (!this.hasPersistableProjectContext) {
        this.applyStakeholderSignoffConfig(this.stakeholderSignoffDefaults, true);
      }

      modal.close();
    });
  }

  addGateComment(): void {
    const projectId = this.linkProjectId;
    if (!projectId) {
      this.gateCommentError = 'Save draft first to add gate comments.';
      return;
    }

    const commentText = String(this.gateCommentText || '').trim();
    if (!commentText) {
      this.gateCommentError = 'Enter a comment before saving.';
      return;
    }

    this.gateCommentError = '';
    this.isSavingGateComment = true;
    this.projectsService.addGateComment$(projectId, this.activeGate, commentText, this.currentUserDisplayName).subscribe((created) => {
      this.gateCommentText = '';
      this.isSavingGateComment = false;

      if (created) {
        this.activeGateComments = [created, ...this.activeGateComments.filter(item => item.id !== created.id)];
        return;
      }

      this.loadActiveGateComments();
    });
  }

  formatGateCommentTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value || '');
    }

    return date.toLocaleString();
  }

  createChecklistProject(): void {
    if (this.isCreatingChecklistProject) {
      return;
    }

    const createdProjectId = this.projectsService.generateProjectId();
    this.generatedProjectId = createdProjectId;
    this.isCreatingChecklistProject = true;

    this.projectsService.upsertProject$({
      id: createdProjectId,
      productName: 'Draft Project',
      customer: 'TBD',
      projectCategory: 'New',
      strategyType: 'Growth',
      roughRevenuePotential: 'Medium',
      estimatedRevenue: '',
      initialRfpDate: String(this.projectForm.get('initialRfpDate')?.value || this.formatDate(new Date())),
      targetProductionDate: String(this.projectForm.get('targetProductionDate')?.value || ''),
      readinessScore: this.readinessScore,
      readinessStatus: this.readinessStatus,
      activeGate: 1,
      gateCompletion: {
        gate1: this.gate1Completion,
        gate2: this.gate2Completion,
        gate3: this.gate3Completion,
        gate4: this.gate4Completion,
        gate5: this.gate5Completion,
        gate6: this.gate6Completion,
      },
      gateCompletedAt: {
        gate1: this.gate1CompletedAt,
        gate2: this.gate2CompletedAt,
        gate3: this.gate3CompletedAt,
        gate4: this.gate4CompletedAt,
        gate5: this.gate5CompletedAt,
        gate6: this.gate6CompletedAt,
      },
      isDraft: true,
    }).subscribe(() => {
      this.lastSavedProjectId = createdProjectId;
      this.activeProjectId = createdProjectId;
      this.isDraftProject = true;
      this.showChecklistForm = true;
      this.persistProjectIntakeState(createdProjectId);
      this.isCreatingChecklistProject = false;

      this.router.navigate([`${this.baseRoute}/new-project`], {
        queryParams: { projectId: createdProjectId, view: 'checklist' },
        replaceUrl: true,
      });
    });
  }

  submit(): void {
    this.saveSuccessful = false;
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    const createdProjectId = this.generatedProjectId || this.projectsService.generateProjectId();
    this.generatedProjectId = createdProjectId;

    this.projectsService.upsertProject$({
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
    }).subscribe(() => {
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
    });
  }

  saveDraft(): void {
    this.saveSuccessful = false;

    const draftProjectId = this.generatedProjectId || this.projectsService.generateProjectId();
    this.generatedProjectId = draftProjectId;

    this.projectsService.upsertProject$({
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
    }).subscribe(() => {
      this.lastSavedProjectId = draftProjectId;
      this.activeProjectId = draftProjectId;
      this.isDraftProject = true;
      this.persistProjectIntakeState(draftProjectId);
      this.saveSuccessful = true;
      this.saveMessageType = 'info';
        this.saveMessage = 'Draft saved. You can continue this project later from any gate.';

      // Only navigate if the projectId is not already in the URL.
      // Navigating when the param hasn't changed re-triggers the queryParamMap
      // subscription which calls loadProjectIntakeState() and resets the form.
      const currentProjectId = (this.route.snapshot.queryParamMap.get('projectId') || '').trim();
      if (currentProjectId !== draftProjectId) {
        this.router.navigate([`${this.baseRoute}/new-project`], {
          queryParams: { projectId: draftProjectId, view: 'checklist' },
          replaceUrl: true
        });
      }
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
      volumeEstimateDefinition: this.estimateRangeDefinition,
      roughRevenuePotential: 'Medium',
      roughRevenuePotentialDefinition: this.estimateRangeDefinition,
      estimatedRevenue: '',
      priceProposalSubmitted: null,
      businessAwarded: null,
      businessAwardedDate: '',
      forecastConfirmed: null,
      designTeamConceptProposal: null,
      conceptArchitectureDefined: null,
      newTechnologyToSource: null,
      roughCostEntered: null,
      timelineEstimatedLlt: null,
      preliminaryBomForSourcing: null,
      preliminaryBomUploaded: null,
      firstPosConfirmed: null,
      detailedEngineeringDesign: null,
      longLeadItemsIdentified: null,
      longLeadItemsStartDate: '',
      longLeadItemsEndDate: '',
      longLeadItemsComment: '',
      dfmCompleted: null,
      sourcingProductionLogisticsAligned: null,
      changeRequestLog: '',
      engineeringReleaseDate: '',
      protoEtdDate: '',
      protoEtaDate: '',
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
      stakeholderSignoffConfig: this.getDefaultStakeholderSignoffSnapshot(),
      stakeholderSignoffStatus: {},
      notes: ''
    });
    this.applyStakeholderSignoffConfig(this.getDefaultStakeholderSignoffSnapshot(), false);
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

  get isLongLeadDateRangeInvalid(): boolean {
    const hasRangeError = this.projectForm.hasError('longLeadDateRangeInvalid');
    if (!hasRangeError) {
      return false;
    }

    const startTouched = !!this.projectForm.get('longLeadItemsStartDate')?.touched;
    const endTouched = !!this.projectForm.get('longLeadItemsEndDate')?.touched;
    return startTouched || endTouched;
  }

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
      'newTechnologyToSource',
      'roughCostEntered',
      'longLeadItemsIdentified',
      'longLeadItemsStartDate',
      'longLeadItemsEndDate'
    ],
    gate3: [
      'preliminaryBomUploaded',
      'protoQty',
      'partNumberMapped',
      'engineeringReleaseDate',
      'protoEtdDate',
      'protoEtaDate'
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
      'stakeholderSignoffStatus'
    ]
  };

  get currentUserDisplayName(): string {
    const user = this.authService.currentUserValue || {};
    return String(
      user.full_name || user.fullName || user.username || user.name || user.email || 'Current User'
    ).trim();
  }

  get currentUserId(): number {
    const user = this.authService.currentUserValue || {};
    const possibleId = Number(user.id ?? user.user_id ?? user.userId ?? 0);
    return Number.isInteger(possibleId) && possibleId > 0 ? possibleId : 0;
  }

  canDeleteGateComment(comment: GateComment): boolean {
    return this.currentUserId > 0 && Number(comment.createdById || 0) === this.currentUserId;
  }

  deleteGateComment(comment: GateComment): void {
    if (!this.canDeleteGateComment(comment)) {
      return;
    }

    const projectId = this.linkProjectId;
    if (!projectId) {
      return;
    }

    const confirmed = window.confirm('Delete this comment?');
    if (!confirmed) {
      return;
    }

    this.projectsService.deleteGateComment$(projectId, this.activeGate, comment.id).subscribe((success) => {
      if (success) {
        this.loadActiveGateComments();
      }
    });
  }

  canSignOffStakeholder(stakeholderKey: string): boolean {
    if (this.isStakeholderSigned(stakeholderKey)) {
      return false;
    }

    const matchedStakeholder = this.getMatchedStakeholderForCurrentUser();
    return matchedStakeholder === stakeholderKey;
  }

  signOffStakeholder(stakeholderKey: string): void {
    if (!this.canSignOffStakeholder(stakeholderKey)) {
      return;
    }

    const current = this.getStakeholderSignoffStatusMap();
    const signedAt = this.formatDateTime(new Date());
    this.projectForm.patchValue({
      stakeholderSignoffStatus: {
        ...current,
        [stakeholderKey]: {
          signedBy: this.currentUserDisplayName,
          signedAt,
        },
      }
    });
  }

  unsignStakeholder(stakeholderKey: string): void {
    const key = String(stakeholderKey || '').trim();
    if (!key) {
      return;
    }

    const current = this.getStakeholderSignoffStatusMap();
    if (!current[key]) {
      return;
    }

    const next = { ...current };
    delete next[key];

    this.projectForm.patchValue({
      stakeholderSignoffStatus: next,
    });
  }

  removeStakeholderFromProject(stakeholderKey: string): void {
    const key = String(stakeholderKey || '').trim().toLowerCase();
    if (!key) {
      return;
    }

    const next = this.stakeholderSignoffConfig.filter((item) => item.key !== key);
    this.applyStakeholderSignoffConfig(next, true);
  }

  getProjectAddableSignoffUsers(): string[] {
    const existingOwners = new Set(
      this.stakeholderSignoffConfig
        .map((item) => String(item.owner || '').trim().toLowerCase())
        .filter(Boolean)
    );

    return this.getAllSignoffUsers().filter((name) => !existingOwners.has(String(name || '').trim().toLowerCase()));
  }

  addStakeholderToProject(): void {
    const selectedUser = String(this.stakeholderProjectUserToAdd || '').trim();
    if (!selectedUser) {
      return;
    }

    const exists = this.stakeholderSignoffConfig.some(
      (item) => String(item.owner || '').trim().toLowerCase() === selectedUser.toLowerCase(),
    );
    if (exists) {
      this.stakeholderProjectUserToAdd = '';
      return;
    }

    const slug = selectedUser.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'user';
    let key = `signoff_${slug}`;
    let counter = 2;
    while (this.stakeholderSignoffConfig.some((item) => item.key === key)) {
      key = `signoff_${slug}_${counter++}`;
    }

    const next = [
      ...this.stakeholderSignoffConfig,
      { key, label: selectedUser, owner: selectedUser },
    ];

    this.applyStakeholderSignoffConfig(next, true);
    this.stakeholderProjectUserToAdd = '';
  }

  isStakeholderSigned(stakeholderKey: string): boolean {
    const status = this.getStakeholderSignoffStatusMap()[stakeholderKey];
    return !!String(status?.signedAt || '').trim();
  }

  getStakeholderSignedBy(stakeholderKey: string): string {
    const status = this.getStakeholderSignoffStatusMap()[stakeholderKey];
    return String(status?.signedBy || '').trim();
  }

  getStakeholderSignedAt(stakeholderKey: string): string {
    const status = this.getStakeholderSignoffStatusMap()[stakeholderKey];
    const raw = String(status?.signedAt || '').trim();
    if (!raw) {
      return '';
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return String(raw);
    }

    return date.toLocaleString();
  }

  getStakeholderSignoffHint(stakeholderKey: string): string {
    if (this.isStakeholderSigned(stakeholderKey)) {
      return 'Signed';
    }

    const matchedStakeholder = this.getMatchedStakeholderForCurrentUser();
    if (matchedStakeholder === stakeholderKey) {
      return 'You can sign off';
    }

    const stakeholderConfig = this.stakeholderSignoffConfig.find(config => config.key === stakeholderKey);
    return stakeholderConfig ? `Only ${stakeholderConfig.owner} can sign` : 'Restricted';
  }

  private getMatchedStakeholderForCurrentUser(): string | null {
    const currentUserTokens = this.getCurrentUserIdentityTokens();
    for (const stakeholder of this.stakeholderSignoffConfig) {
      const owner = String(stakeholder.owner || '').trim().toLowerCase();
      if (owner && currentUserTokens.has(owner)) {
        return stakeholder.key;
      }
    }

    return null;
  }

  private getCurrentUserIdentityTokens(): Set<string> {
    const user = this.authService.currentUserValue || {};
    return new Set(
      [
        user.full_name,
        user.fullName,
        user.username,
        user.name,
        user.email,
      ]
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean),
    );
  }

  private getStakeholderSignoffStatusMap(): Record<string, { signedBy: string; signedAt: string }> {
    const raw = this.projectForm.get('stakeholderSignoffStatus')?.value;
    return raw && typeof raw === 'object' ? raw : {};
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
    if (fieldName === 'stakeholderSignoffStatus') {
      if (!this.stakeholderSignoffConfig.length) {
        return true;
      }

      const statusMap = this.getStakeholderSignoffStatusMap();
      return this.stakeholderSignoffConfig.every((item) => !!String(statusMap[item.key]?.signedAt || '').trim());
    }

    if (this.isDisabledStakeholderSignoffField(fieldName)) {
      return true;
    }

    if ((fieldName === 'longLeadItemsStartDate' || fieldName === 'longLeadItemsEndDate') && this.projectForm.get('longLeadItemsIdentified')?.value !== true) {
      return true;
    }

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
    if (fieldName === 'stakeholderSignoffStatus') {
      if (!this.stakeholderSignoffConfig.length) {
        return true;
      }

      const statusMap = this.getStakeholderSignoffStatusMap();
      return this.stakeholderSignoffConfig.every((item) => !!String(statusMap[item.key]?.signedAt || '').trim());
    }

    if (this.isDisabledStakeholderSignoffField(fieldName)) {
      return true;
    }

    if ((fieldName === 'longLeadItemsStartDate' || fieldName === 'longLeadItemsEndDate') && this.projectForm.get('longLeadItemsIdentified')?.value !== true) {
      return true;
    }

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
    this.loadActiveGateComments();
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

    for (let i = 0; i < targetIndex; i++) {
      const priorGate = this.gateOrder[i];
      if (this.getGateCompletionByInputSystem(priorGate) < 100) {
        return false;
      }
    }

    return true;
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

  get activeGateAttachmentResourceId(): number | null {
    const baseId = this.getProjectAttachmentBaseId();
    if (!baseId) {
      return null;
    }

    return (baseId * 10) + this.activeGate;
  }

  get taskBoardQueryParams(): { gateContext: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6'; gate: number; projectId: string; taskBoard: string } {
    const gateNumber = Number(this.activeInputSystem.replace('gate', ''));
    return {
      gateContext: this.activeInputSystem,
      gate: Number.isFinite(gateNumber) ? gateNumber : this.activeGate,
      projectId: this.linkProjectId,
      taskBoard: this.selectedTaskBoardName || 'Project Tasks'
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

  selectTaskBoard(boardName: string): void {
    const normalized = String(boardName || '').trim();
    if (!normalized) {
      return;
    }
    this.selectedTaskBoardName = normalized;
    this.persistTaskBoardSelection();
    this.openTasksBoard();
  }

  createTaskBoardFromIntake(): void {
    const normalized = String(this.newTaskBoardName || '').trim();
    if (!normalized || !this.canOpenTasksBoard) {
      return;
    }
    if (!this.taskBoardNames.some(name => name.toLowerCase() === normalized.toLowerCase())) {
      this.taskBoardNames = [...this.taskBoardNames, normalized];
    }
    this.selectedTaskBoardName = normalized;
    this.newTaskBoardName = '';
    this.persistTaskBoardSelection();
  }

  createTaskBoardFromPrompt(): void {
    if (!this.canOpenTasksBoard) {
      return;
    }

    const input = window.prompt('Enter new task board name', '');
    if (input === null) {
      return;
    }

    this.newTaskBoardName = String(input || '').trim();
    this.createTaskBoardFromIntake();
  }

  private refreshTaskBoards(projectId: string): void {
    const normalizedProjectId = String(projectId || '').trim();
    if (!normalizedProjectId) {
      this.taskBoardNames = ['Project Tasks'];
      this.selectedTaskBoardName = 'Project Tasks';
      return;
    }

    this.tasksDataService.loadState$(normalizedProjectId).subscribe((state) => {
      const boardNames = Array.from(new Set([
        ...(state.taskBoardNames || []),
        ...(state.taskRecords || []).map(task => String(task.projectTaskName || '').trim()).filter(Boolean),
        String(state.projectTaskBoardName || '').trim() || 'Project Tasks',
      ])).filter(Boolean);

      this.taskBoardNames = boardNames.length ? boardNames : ['Project Tasks'];
      if (!this.taskBoardNames.some(name => name.toLowerCase() === this.selectedTaskBoardName.toLowerCase())) {
        this.selectedTaskBoardName = this.taskBoardNames[0];
      }
    });
  }

  private persistTaskBoardSelection(): void {
    if (!this.canOpenTasksBoard) {
      return;
    }

    const projectId = this.linkProjectId;
    this.tasksDataService.loadState$(projectId).subscribe((state) => {
      const boardNames = Array.from(new Set([
        ...(state.taskBoardNames || []),
        ...this.taskBoardNames,
        this.selectedTaskBoardName,
      ].map(name => String(name || '').trim()).filter(Boolean)));

      this.taskBoardNames = boardNames.length ? boardNames : ['Project Tasks'];

      this.tasksDataService.saveState({
        ...state,
        projectTaskBoardName: this.selectedTaskBoardName || 'Project Tasks',
        taskBoardNames: this.taskBoardNames,
      }, projectId);
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

  private getProjectAttachmentBaseId(): number | null {
    const projectId = String(this.persistableProjectId || this.generatedProjectId || '').trim();
    if (!projectId) {
      return null;
    }

    const digitsOnly = projectId.replace(/\D+/g, '');
    if (digitsOnly) {
      const parsed = Number.parseInt(digitsOnly.slice(-9), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    // Fallback for non-numeric IDs: stable, deterministic hash that stays positive.
    let hash = 0;
    for (let i = 0; i < projectId.length; i++) {
      hash = ((hash * 31) + projectId.charCodeAt(i)) >>> 0;
    }

    return hash > 0 ? hash : null;
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
    this.loadActiveGateComments();
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

    let blockingGate = this.gateOrder[targetIndex - 1];
    for (let i = 0; i < targetIndex; i++) {
      const candidate = this.gateOrder[i];
      if (this.getGateCompletionByInputSystem(candidate) < 100) {
        blockingGate = candidate;
        break;
      }
    }

    const priorCompletion = this.getGateCompletionByInputSystem(blockingGate);
    const priorLabel = blockingGate.replace('gate', 'Gate ');
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
      this.loadActiveGateComments();
      return;
    }

    this.gateNavigationMessage = this.getGateLockMessage(requestedGate);
  }

  private loadActiveGateComments(): void {
    const projectId = this.linkProjectId;
    this.gateCommentError = '';
    if (!projectId) {
      this.activeGateComments = [];
      return;
    }

    this.projectsService.getGateComments$(projectId, this.activeGate).subscribe((items) => {
      this.activeGateComments = items;
    });
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

  private longLeadDateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const isEnabled = !!control.get('longLeadItemsIdentified')?.value;
    if (!isEnabled) {
      return null;
    }

    const startRaw = String(control.get('longLeadItemsStartDate')?.value || '').trim();
    const endRaw = String(control.get('longLeadItemsEndDate')?.value || '').trim();
    if (!startRaw || !endRaw) {
      return null;
    }

    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }

    return end.getTime() < start.getTime() ? { longLeadDateRangeInvalid: true } : null;
  }

  private parseVolumeEstimateDefinition(definition: string): Record<'Low' | 'Medium' | 'High', string> {
    const fallback: Record<'Low' | 'Medium' | 'High', string> = {
      Low: 'Low > 50',
      Medium: 'Medium 50-150',
      High: 'High 150+'
    };

    const parts = String(definition || '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      const lowMatch = part.match(/^low\b/i);
      if (lowMatch) {
        fallback.Low = part;
        continue;
      }

      const mediumMatch = part.match(/^medium\b/i);
      if (mediumMatch) {
        fallback.Medium = part;
        continue;
      }

      const highMatch = part.match(/^high\b/i);
      if (highMatch) {
        fallback.High = part;
      }
    }

    return fallback;
  }

  private loadVolumeEstimateOptionsFromApi(): void {
    this.projectsService.getVolumeEstimateOptions$().subscribe((items) => {
      if (!items.length) {
        return;
      }

      const previousDefinition = this.estimateRangeDefinition;
      const normalizedMap = this.optionsArrayToMap(items);
      const normalizedOptions: VolumeEstimateOption[] = [
        { key: 'Low', label: normalizedMap.Low },
        { key: 'Medium', label: normalizedMap.Medium },
        { key: 'High', label: normalizedMap.High },
      ];

      this.managedVolumeEstimateOptions = normalizedOptions;
      const nextDefinition = this.optionsToDefinition(normalizedOptions);
      this.estimateRangeDefinition = nextDefinition;

      const currentDefinition = String(this.projectForm.get('volumeEstimateDefinition')?.value || '').trim();
      if (!this.hasPersistableProjectContext && currentDefinition === previousDefinition) {
        this.projectForm.patchValue({
          volumeEstimateDefinition: nextDefinition,
          roughRevenuePotentialDefinition: nextDefinition,
        });
      }
    });
  }

  private optionsArrayToMap(options: VolumeEstimateOption[]): Record<'Low' | 'Medium' | 'High', string> {
    const byKey = new Map((options || []).map(item => [item.key, this.normalizeVolumeLabel(item.label)]));
    const fallback = this.parseVolumeEstimateDefinition(this.estimateRangeDefinition);
    return {
      Low: byKey.get('Low') || fallback.Low,
      Medium: byKey.get('Medium') || fallback.Medium,
      High: byKey.get('High') || fallback.High,
    };
  }

  private optionsToDefinition(options: VolumeEstimateOption[]): string {
    const map = this.optionsArrayToMap(options);
    return `${map.Low}, ${map.Medium}, ${map.High}`;
  }

  private normalizeVolumeLabel(value: unknown): string {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  }

  private loadCustomerOptionsFromApi(): void {
    this.projectsService.getCustomerOptions$().subscribe((items) => {
      if (items.length) {
        this.customers = items;
      }
    });
  }

  private loadStakeholderAssignableUsers(): void {
    this.accessControlApi.getUsers()
      .then((users) => {
        const names = users
          .map((user) => String(user?.name || user?.email || '').trim())
          .filter(Boolean);

        const defaults = this.legacyStakeholderSignoffConfig
          .map((item) => String(item.owner || '').trim())
          .filter(Boolean);

        this.stakeholderAssignableUsers = Array.from(new Set([...defaults, ...names]))
          .sort((a, b) => a.localeCompare(b));
      })
      .catch(() => {
        this.stakeholderAssignableUsers = this.legacyStakeholderSignoffConfig
          .map((item) => String(item.owner || '').trim())
          .filter(Boolean);
      });
  }

  getAllSignoffUsers(): string[] {
    const fromDefaults = this.stakeholderSignoffDefaults.map((item) => String(item.owner || '').trim());
    const fromDraft = this.stakeholderSignoffDraft.map((item) => String(item.owner || '').trim());

    return Array.from(new Set([
      ...fromDefaults,
      ...fromDraft,
      ...this.stakeholderAssignableUsers,
    ].filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  getStakeholderOwnerOptions(stakeholder: StakeholderSignoffConfigItem): string[] {
    const currentOwner = String(stakeholder?.owner || '').trim();
    const source = currentOwner
      ? [currentOwner, ...this.stakeholderAssignableUsers]
      : [...this.stakeholderAssignableUsers];

    return Array.from(new Set(source.map((item) => String(item || '').trim()).filter(Boolean)));
  }

  private loadStakeholderSignoffDefaultsFromApi(): void {
    this.projectsService.getStakeholderSignoffDefaults$().subscribe((items) => {
      const normalized = this.normalizeStakeholderSignoffConfig(items, this.legacyStakeholderSignoffConfig);
      this.stakeholderSignoffDefaults = normalized.length
        ? normalized
        : this.cloneStakeholderSignoffConfig(this.legacyStakeholderSignoffConfig);

      if (!this.hasPersistableProjectContext) {
        this.applyStakeholderSignoffConfig(this.getDefaultStakeholderSignoffSnapshot(), true);
      }
    });
  }

  private getDefaultStakeholderSignoffSnapshot(): StakeholderSignoffConfigItem[] {
    const source = this.stakeholderSignoffDefaults.length
      ? this.stakeholderSignoffDefaults
      : this.legacyStakeholderSignoffConfig;

    return this.cloneStakeholderSignoffConfig(source);
  }

  private cloneStakeholderSignoffConfig(items: StakeholderSignoffConfigItem[]): StakeholderSignoffConfigItem[] {
    return (items || []).map((item) => ({
      key: String(item.key || '').trim().toLowerCase(),
      label: String(item.label || '').trim(),
      owner: String(item.owner || '').trim(),
    }));
  }

  private normalizeStakeholderSignoffConfig(
    items: unknown,
    fallback: StakeholderSignoffConfigItem[]
  ): StakeholderSignoffConfigItem[] {
    if (!Array.isArray(items)) {
      return this.cloneStakeholderSignoffConfig(fallback);
    }

    const blockedRoleNames = new Set(['production', 'qc', 'npi', 'gm']);
    const canonicalOwnerNames = new Map<string, string>([
      ['temenuga', 'Temenuga Terzieva'],
      ['mike', 'Mike Bristol'],
      ['nick', 'Nick Walter'],
      ['juvenal', 'Juvenal Torres'],
      ['temenuga terzieva', 'Temenuga Terzieva'],
      ['mike bristol', 'Mike Bristol'],
      ['nick walter', 'Nick Walter'],
      ['juvenal torres', 'Juvenal Torres'],
    ]);
    const normalized: StakeholderSignoffConfigItem[] = [];

    items.forEach((raw, index) => {
      const item = raw as Partial<StakeholderSignoffConfigItem>;
      const key = String(item?.key || '').trim().toLowerCase() || `signoff_user_${index + 1}`;
      const ownerRaw = String(item?.owner || '').trim();
      const owner = canonicalOwnerNames.get(ownerRaw.toLowerCase()) || ownerRaw;

      if (!key || !owner || blockedRoleNames.has(owner.toLowerCase())) {
        return;
      }

      normalized.push({
        key,
        label: owner,
        owner,
      });
    });

    if (!normalized.length) {
      return this.cloneStakeholderSignoffConfig(fallback);
    }

    return normalized;
  }

  private applyStakeholderSignoffConfig(items: StakeholderSignoffConfigItem[], patchControl: boolean): void {
    this.stakeholderSignoffConfig = this.cloneStakeholderSignoffConfig(items);
    this.pruneStakeholderSignoffStatus();
    if (patchControl) {
      this.projectForm.patchValue({
        stakeholderSignoffConfig: this.stakeholderSignoffConfig,
      }, { emitEvent: false });
    }
  }

  private pruneStakeholderSignoffStatus(): void {
    const allowedKeys = new Set(this.stakeholderSignoffConfig.map((item) => item.key));
    const current = this.getStakeholderSignoffStatusMap();
    const next: Record<string, { signedBy: string; signedAt: string }> = {};

    Object.entries(current).forEach(([key, value]) => {
      if (!allowedKeys.has(key)) {
        return;
      }

      const signedBy = String((value as any)?.signedBy || '').trim();
      const signedAt = String((value as any)?.signedAt || '').trim();
      if (!signedBy && !signedAt) {
        return;
      }

      next[key] = { signedBy, signedAt };
    });

    this.projectForm.patchValue({ stakeholderSignoffStatus: next }, { emitEvent: false });
  }

  private isDisabledStakeholderSignoffField(fieldName: string): boolean {
    return false;
  }

  private normalizeCustomerName(value: unknown): string {
    const normalized = String(value || '').trim().replace(/\s+/g, ' ');
    if (!normalized) {
      return '';
    }

    return normalized.slice(0, 120);
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

    // Persist to API
    this.projectsService.saveIntakeState$(projectId, payload).subscribe();
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

      this.projectsService.getIntakeState$(projectId).subscribe(parsed => {
        if (parsed) {
          if (parsed.formValue) {
            this.projectForm.patchValue(parsed.formValue, { emitEvent: false });

            const savedStakeholderConfig = (parsed.formValue as any)?.stakeholderSignoffConfig;
            const normalizedStakeholderConfig = this.normalizeStakeholderSignoffConfig(
              savedStakeholderConfig,
              this.legacyStakeholderSignoffConfig
            );
            this.applyStakeholderSignoffConfig(normalizedStakeholderConfig, true);

            const legacyEngineeringReleaseEta = String((parsed.formValue as any)?.engineeringReleaseEta || '').trim();
            const hasEngineeringReleaseDate = String(this.projectForm.get('engineeringReleaseDate')?.value || '').trim();
            if (legacyEngineeringReleaseEta && !hasEngineeringReleaseDate) {
              this.projectForm.patchValue({ engineeringReleaseDate: legacyEngineeringReleaseEta }, { emitEvent: false });
            }
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
        this.loadActiveGateComments();
        this.isApplyingProjectState = false;
      });
      return; // rest of the finally block is replaced by the subscribe
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
      volumeEstimateDefinition: this.estimateRangeDefinition,
      roughRevenuePotential: 'Medium',
      roughRevenuePotentialDefinition: this.estimateRangeDefinition,
      estimatedRevenue: '',
      priceProposalSubmitted: null,
      businessAwarded: null,
      businessAwardedDate: '',
      forecastConfirmed: null,
      designTeamConceptProposal: null,
      conceptArchitectureDefined: null,
      newTechnologyToSource: null,
      roughCostEntered: null,
      timelineEstimatedLlt: null,
      preliminaryBomForSourcing: null,
      preliminaryBomUploaded: null,
      firstPosConfirmed: null,
      detailedEngineeringDesign: null,
      longLeadItemsIdentified: null,
      longLeadItemsStartDate: '',
      longLeadItemsEndDate: '',
      longLeadItemsComment: '',
      dfmCompleted: null,
      sourcingProductionLogisticsAligned: null,
      changeRequestLog: '',
      engineeringReleaseDate: '',
      protoEtdDate: '',
      protoEtaDate: '',
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
      stakeholderSignoffStatus: {},
      stakeholderSignoffConfig: projectSummary
        ? this.cloneStakeholderSignoffConfig(this.legacyStakeholderSignoffConfig)
        : this.getDefaultStakeholderSignoffSnapshot(),
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
