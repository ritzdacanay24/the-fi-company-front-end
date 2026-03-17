import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SharedModule } from '@app/shared/shared.module';
import { ExecutionRole, ProjectWorkflowEngineService } from './services/project-workflow-engine.service';
import { ProjectManagerProjectsService } from './services/project-manager-projects.service';

@Component({
  standalone: true,
  selector: 'app-new-project',
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './new-project.component.html',
  styleUrls: ['./new-project.component.scss']
})
export class NewProjectComponent implements OnDestroy {
  saveSuccessful = false;
  activeView: 'workflow' | 'checklist' = 'workflow';
  activeInputSystem: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6' = 'gate1';
  activeGate: 1 | 2 | 3 | 4 | 5 | 6 = 1;
  generatedProjectId = '';
  executionRole: ExecutionRole = 'Project Manager';

  gate1CompletedAt: string | null = null;
  gate2CompletedAt: string | null = null;
  gate3CompletedAt: string | null = null;
  gate4CompletedAt: string | null = null;
  gate5CompletedAt: string | null = null;
  gate6CompletedAt: string | null = null;
  private formSub: Subscription | undefined;

  customers = ['Aristocrat', 'Light & Wonder', 'IGT', 'Konami', 'Ainsworth', 'Custom'];
  projectCategories = ['New', 'Revision', 'Cost Down', 'Custom'];
  strategyTypes = ['Growth', 'Retention', 'Platform', 'Sustainment'];
  rangeOptions = ['Low', 'Medium', 'High'];

  projectForm: FormGroup = this.fb.group({
    // Gate #1
    newBusinessOpportunity: [false],
    rfpReceived: [false],
    productExpectationDoc: [false],
    pixelPitchDimsCaptured: [false],
    customer: ['', Validators.required],
    productName: ['', [Validators.required, Validators.maxLength(120)]],
    projectCategory: ['', Validators.required],
    strategyType: ['', Validators.required],
    initialRfpDate: ['', Validators.required],
    targetProductionDate: ['', Validators.required],
    volumeEstimate: ['Medium'],
    roughRevenuePotential: ['Medium'],
    priceProposalSubmitted: [false],
    businessAwarded: [false],
    businessAwardedDate: [''],
    forecastConfirmed: [false],

    // Gate #2-4
  designTeamConceptProposal: [false],
    conceptArchitectureDefined: [false],
    roughCostEntered: [false],
  timelineEstimatedLlt: [false],
  preliminaryBomForSourcing: [false],
    preliminaryBomUploaded: [false],
  firstPosConfirmed: [false],
  detailedEngineeringDesign: [false],
    longLeadItemsIdentified: [false],
    longLeadItemsDate: [''],
    dfmCompleted: [false],
  sourcingProductionLogisticsAligned: [false],
    changeRequestLog: [''],
    engineeringReleaseEta: [''],
    protoQty: [null],
    partNumberMapped: [false],
  finalBomReview: [false],
    engChecklistPixelMapping: [false],
    engChecklistInstallationInstructions: [false],
    engChecklistWorkInstruction: [false],
    engChecklistPdc: [false],
    engChecklistQualityDocs: [false],

    // Gate #5-6
  customerReviewValidation: [false],
    functionalValidationComplete: [false],
  pilotRunCompleted: [false],
    pilotRunCompletedDate: [''],
  instructionValidation: [false],
  softwareFilesValidation: [false],
  supplierFeedbackCaptured: [false],
    finalBomApproved: [false],
    qcProcedureDefined: [false],
    packagingInstructionsComplete: [false],
  productionPoReceived: [false],
    inventoryStrategyAligned: [false],

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
    private workflow: ProjectWorkflowEngineService,
    private projectsService: ProjectManagerProjectsService
  ) {
    const today = this.formatDate(new Date());
    this.generatedProjectId = this.projectsService.generateProjectId();
    this.projectForm.patchValue({
      initialRfpDate: today
    });
    this.formSub = this.projectForm.valueChanges.subscribe(() => {
      this.updateGateCompletionTimestamps();
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

    this.projectsService.createProject({
      id: this.generatedProjectId,
      productName: String(this.projectForm.get('productName')?.value || '').trim(),
      customer: String(this.projectForm.get('customer')?.value || '').trim(),
      projectCategory: String(this.projectForm.get('projectCategory')?.value || '').trim(),
      strategyType: String(this.projectForm.get('strategyType')?.value || '').trim(),
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
      }
    });

    this.generatedProjectId = this.projectsService.generateProjectId();
    this.saveSuccessful = true;
  }

  resetForm(): void {
    const today = this.formatDate(new Date());
    this.projectForm.reset({
      newBusinessOpportunity: false,
      rfpReceived: false,
      productExpectationDoc: false,
      pixelPitchDimsCaptured: false,
      customer: '',
      productName: '',
      projectCategory: '',
      strategyType: '',
      initialRfpDate: today,
      targetProductionDate: '',
      volumeEstimate: 'Medium',
      roughRevenuePotential: 'Medium',
      priceProposalSubmitted: false,
      businessAwarded: false,
      businessAwardedDate: '',
      forecastConfirmed: false,
      designTeamConceptProposal: false,
      conceptArchitectureDefined: false,
      roughCostEntered: false,
      timelineEstimatedLlt: false,
      preliminaryBomForSourcing: false,
      preliminaryBomUploaded: false,
      firstPosConfirmed: false,
      detailedEngineeringDesign: false,
      longLeadItemsIdentified: false,
      longLeadItemsDate: '',
      dfmCompleted: false,
      sourcingProductionLogisticsAligned: false,
      changeRequestLog: '',
      engineeringReleaseEta: '',
      protoQty: null,
      partNumberMapped: false,
      finalBomReview: false,
      engChecklistPixelMapping: false,
      engChecklistInstallationInstructions: false,
      engChecklistWorkInstruction: false,
      engChecklistPdc: false,
      engChecklistQualityDocs: false,
      customerReviewValidation: false,
      functionalValidationComplete: false,
      pilotRunCompleted: false,
      pilotRunCompletedDate: '',
      instructionValidation: false,
      softwareFilesValidation: false,
      supplierFeedbackCaptured: false,
      finalBomApproved: false,
      qcProcedureDefined: false,
      packagingInstructionsComplete: false,
      productionPoReceived: false,
      inventoryStrategyAligned: false,
      notes: ''
    });
    this.saveSuccessful = false;
    this.workflow.reset();
    this.generatedProjectId = this.projectsService.generateProjectId();
    this.gate1CompletedAt = null;
    this.gate2CompletedAt = null;
    this.gate3CompletedAt = null;
    this.gate4CompletedAt = null;
    this.gate5CompletedAt = null;
    this.gate6CompletedAt = null;
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

    const completed = checks.filter(field => this.isFieldComplete(field)).length;
    return checks.length ? Math.round((completed / checks.length) * 100) : 0;
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
      'designTeamConceptProposal',
      'conceptArchitectureDefined',
      'roughCostEntered',
      'timelineEstimatedLlt'
    ],
    gate3: [
      'preliminaryBomForSourcing',
      'preliminaryBomUploaded',
      'longLeadItemsIdentified',
      'firstPosConfirmed'
    ],
    gate4: [
      'detailedEngineeringDesign',
      'dfmCompleted',
      'sourcingProductionLogisticsAligned',
      'engineeringReleaseEta',
      'protoQty',
      'partNumberMapped',
      'finalBomReview',
      'engChecklistPixelMapping',
      'engChecklistInstallationInstructions',
      'engChecklistWorkInstruction',
      'engChecklistPdc',
      'engChecklistQualityDocs'
    ],
    gate5: [
      'customerReviewValidation',
      'functionalValidationComplete',
      'pilotRunCompletedDate',
      'instructionValidation',
      'softwareFilesValidation',
      'supplierFeedbackCaptured'
    ],
    gate6: [
      'finalBomApproved',
      'qcProcedureDefined',
      'packagingInstructionsComplete',
      'productionPoReceived',
      'inventoryStrategyAligned'
    ]
  };

  private updateGateCompletionTimestamps(): void {
    const today = this.formatDate(new Date());
    if (this.gate1Completion >= 100 && !this.gate1CompletedAt) { this.gate1CompletedAt = today; }
    else if (this.gate1Completion < 100) { this.gate1CompletedAt = null; }
    if (this.gate2Completion >= 100 && !this.gate2CompletedAt) { this.gate2CompletedAt = today; }
    else if (this.gate2Completion < 100) { this.gate2CompletedAt = null; }
    if (this.gate3Completion >= 100 && !this.gate3CompletedAt) { this.gate3CompletedAt = today; }
    else if (this.gate3Completion < 100) { this.gate3CompletedAt = null; }
    if (this.gate4Completion >= 100 && !this.gate4CompletedAt) { this.gate4CompletedAt = today; }
    else if (this.gate4Completion < 100) { this.gate4CompletedAt = null; }
    if (this.gate5Completion >= 100 && !this.gate5CompletedAt) { this.gate5CompletedAt = today; }
    else if (this.gate5Completion < 100) { this.gate5CompletedAt = null; }
    if (this.gate6Completion >= 100 && !this.gate6CompletedAt) { this.gate6CompletedAt = today; }
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
      return value;
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

  setView(view: 'workflow' | 'checklist'): void {
    this.activeView = view;
  }

  setActiveInputSystem(inputSystem: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6'): void {
    this.activeInputSystem = inputSystem;
  }

  get taskBoardContextLabel(): string {
    const labels: Record<string, string> = { gate1: 'Gate 1', gate2: 'Gate 2', gate3: 'Gate 3', gate4: 'Gate 4', gate5: 'Gate 5', gate6: 'Gate 6' };
    return labels[this.activeInputSystem] || 'Gate 1';
  }

  get taskBoardQueryParams(): { gateContext: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6'; gate: number } {
    return {
      gateContext: this.activeInputSystem,
      gate: this.activeGate
    };
  }

  setActiveGate(gate: 1 | 2 | 3 | 4 | 5 | 6): void {
    this.activeGate = gate;
  }

  nextGate(): void {
    if (this.activeGate < 6) {
      this.activeGate = (this.activeGate + 1) as 1 | 2 | 3 | 4 | 5 | 6;
    }
  }

  previousGate(): void {
    if (this.activeGate > 1) {
      this.activeGate = (this.activeGate - 1) as 1 | 2 | 3 | 4 | 5 | 6;
    }
  }
}
