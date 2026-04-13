import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from 'src/app/core/services/auth.service';

export type ProjectStatus = 'Draft' | 'On Track' | 'At Risk' | 'Overdue';

export interface GateProgressItem {
  label: string;
  days: number;
  complete: boolean;
  checklistCompletion: number;
  taskCompletion: number;
  executionHealth: number;
  mismatch: boolean;
}

export interface ProjectDashboardItem {
  id: string;
  code: string;
  name: string;
  customer: string;
  category: string;
  gateLabel: string;
  gateTag: string;
  readiness: number;
  status: ProjectStatus;
  owner: string;
  revenue: string;
  strategy: string;
  awarded: boolean;
  rfpDate: string;
  targetProd: string;
  taskCompletion: number;
  executionHealth: number;
  hasGateTaskMismatch: boolean;
  gateProgress: GateProgressItem[];
}

export interface ProjectCreationInput {
  id: string;
  productName: string;
  customer: string;
  projectCategory: string;
  strategyType: string;
  roughRevenuePotential?: string;
  estimatedRevenue?: string;
  initialRfpDate: string;
  targetProductionDate: string;
  readinessScore: number;
  readinessStatus: 'Green' | 'Yellow' | 'Red';
  activeGate: 1 | 2 | 3 | 4 | 5 | 6;
  gateCompletion: Record<'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6', number>;
  gateCompletedAt: Record<'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6', string | null>;
  isDraft?: boolean;
}

type GateKey = 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6';

type IntakeStoragePayload = {
  formValue?: Record<string, any>;
  activeInputSystem?: GateKey;
  activeGate?: 1 | 2 | 3 | 4 | 5 | 6;
  gateCompletedAt?: Partial<Record<GateKey, string | null>>;
};

@Injectable({ providedIn: 'root' })
export class ProjectManagerProjectsService {
  private readonly projectsStorageKey = 'pm_projects_v1';
  private readonly selectedProjectStorageKey = 'pm_selected_project_v1';
  private readonly intakeStoragePrefix = 'pm_project_intake_v1_';
  private readonly tasksStoragePrefix = 'pm_tasks_state_v1_';
  private readonly workflowStoragePrefix = 'pm_workflow_engine_v1_';

  private readonly gateFieldMap: Record<GateKey, string[]> = {
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

  constructor(private authService: AuthenticationService) {}

  getProjects(): ProjectDashboardItem[] {
    if (this.isApiMode) {
      return this.getProjectsFromApi();
    }

    const raw = localStorage.getItem(this.projectsStorageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as ProjectDashboardItem[];
      return Array.isArray(parsed) ? parsed.map(project => this.syncProjectFromIntake(project)) : [];
    } catch {
      return [];
    }
  }

  saveProjects(projects: ProjectDashboardItem[]): void {
    if (this.isApiMode) {
      this.saveProjectsToApi(projects);
      return;
    }

    try {
      localStorage.setItem(this.projectsStorageKey, JSON.stringify(projects));
    } catch {
      // Ignore localStorage write issues in browser test mode.
    }
  }

  getSelectedProjectId(projects: ProjectDashboardItem[]): string {
    if (this.isApiMode) {
      return this.getSelectedProjectIdFromApi(projects);
    }

    const saved = localStorage.getItem(this.selectedProjectStorageKey);
    if (saved && projects.some(project => project.id === saved)) {
      return saved;
    }
    return projects[0]?.id || '';
  }

  setSelectedProjectId(projectId: string): void {
    if (this.isApiMode) {
      this.setSelectedProjectIdToApi(projectId);
      return;
    }

    localStorage.setItem(this.selectedProjectStorageKey, projectId);
  }

  createProject(input: ProjectCreationInput): ProjectDashboardItem {
    const taskCompletionByGate = this.loadTaskCompletionByGate(input.id);
    const activeGateKey = this.mapGateNumberToKey(input.activeGate);
    const gateProgress = this.buildGateProgress(input.gateCompletion, taskCompletionByGate, input.gateCompletedAt, input.initialRfpDate);

    const newProject: ProjectDashboardItem = {
      id: input.id,
      code: input.id,
      name: input.productName,
      customer: input.customer,
      category: input.projectCategory,
      gateLabel: this.toGateLabel(input.activeGate),
      gateTag: this.toGateTag(input.activeGate),
      readiness: input.readinessScore,
      status: input.isDraft ? 'Draft' : this.toStatus(input.readinessStatus),
      owner: this.getCurrentOwnerName(),
      revenue:
        this.normalizeRevenueInput(input.estimatedRevenue) ||
        this.toRevenueByPotential(input.roughRevenuePotential) ||
        this.toRevenueByCategory(input.projectCategory),
      strategy: input.strategyType,
      awarded: input.activeGate >= 3,
      rfpDate: input.initialRfpDate,
      targetProd: input.targetProductionDate,
      taskCompletion: taskCompletionByGate[activeGateKey],
      executionHealth: Math.min(input.gateCompletion[activeGateKey], taskCompletionByGate[activeGateKey]),
      hasGateTaskMismatch: gateProgress.some(gate => gate.mismatch),
      gateProgress
    };

    const projects = [newProject, ...this.getProjects().filter(project => project.id !== input.id)];
    this.saveProjects(projects);
    this.setSelectedProjectId(newProject.id);
    return newProject;
  }

  deleteProject(projectId: string): void {
    if (!projectId) {
      return;
    }

    const remainingProjects = this.getProjects().filter(project => project.id !== projectId);
    this.saveProjects(remainingProjects);

    const nextSelectedProjectId = remainingProjects[0]?.id || '';
    if (nextSelectedProjectId) {
      this.setSelectedProjectId(nextSelectedProjectId);
    } else {
      localStorage.removeItem(this.selectedProjectStorageKey);
    }

    this.removeScopedProjectState(projectId);
  }

  generateProjectId(): string {
    return `PRJ-${Date.now().toString().slice(-8)}`;
  }

  private get isApiMode(): boolean {
    return environment.projectManagerDataSource === 'api';
  }

  private getProjectsFromApi(): ProjectDashboardItem[] {
    // TODO: Replace with HttpClient integration when PM API is ready.
    return this.getProjectsFromLocalStorage();
  }

  private saveProjectsToApi(projects: ProjectDashboardItem[]): void {
    // TODO: Replace with HttpClient integration when PM API is ready.
    this.saveProjectsToLocalStorage(projects);
  }

  private getSelectedProjectIdFromApi(projects: ProjectDashboardItem[]): string {
    // TODO: Replace with API-backed user preference state.
    return this.getSelectedProjectIdFromLocalStorage(projects);
  }

  private setSelectedProjectIdToApi(projectId: string): void {
    // TODO: Replace with API-backed user preference state.
    this.setSelectedProjectIdToLocalStorage(projectId);
  }

  private getProjectsFromLocalStorage(): ProjectDashboardItem[] {
    const raw = localStorage.getItem(this.projectsStorageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as ProjectDashboardItem[];
      return Array.isArray(parsed) ? parsed.map(project => this.syncProjectFromIntake(project)) : [];
    } catch {
      return [];
    }
  }

  private saveProjectsToLocalStorage(projects: ProjectDashboardItem[]): void {
    try {
      localStorage.setItem(this.projectsStorageKey, JSON.stringify(projects));
    } catch {
      // Ignore localStorage write issues in browser test mode.
    }
  }

  private getSelectedProjectIdFromLocalStorage(projects: ProjectDashboardItem[]): string {
    const saved = localStorage.getItem(this.selectedProjectStorageKey);
    if (saved && projects.some(project => project.id === saved)) {
      return saved;
    }
    return projects[0]?.id || '';
  }

  private setSelectedProjectIdToLocalStorage(projectId: string): void {
    localStorage.setItem(this.selectedProjectStorageKey, projectId);
  }

  private toGateLabel(gate: 1 | 2 | 3 | 4 | 5 | 6): string {
    const labels: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
      1: 'G1 - Opportunity',
      2: 'G2 - Concept',
      3: 'G3 - Awarded',
      4: 'G4 - Engineering',
      5: 'G5 - Validation',
      6: 'G6 - Production'
    };
    return labels[gate];
  }

  private toGateTag(gate: 1 | 2 | 3 | 4 | 5 | 6): string {
    const tags: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
      1: 'opportunity',
      2: 'concept',
      3: 'awarded',
      4: 'engineering',
      5: 'validation',
      6: 'production'
    };
    return tags[gate];
  }

  private toStatus(status: 'Green' | 'Yellow' | 'Red'): ProjectStatus {
    if (status === 'Green') {
      return 'On Track';
    }
    if (status === 'Yellow') {
      return 'At Risk';
    }
    return 'Overdue';
  }

  private toOwnerByStrategy(strategy: string): string {
    const ownerByStrategy: Record<string, string> = {
      Growth: 'James K.',
      Retention: 'Carlos M.',
      Platform: 'Dana L.',
      Sustainment: 'Mike Bristol'
    };
    return ownerByStrategy[strategy] || 'Project Manager';
  }

  private getCurrentOwnerName(): string {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      return 'Project Manager';
    }

    const nameCandidates = [
      currentUser.full_name,
      currentUser.fullName,
      `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
      `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
      currentUser.name,
      currentUser.username,
      currentUser.email
    ];

    const displayName = nameCandidates.find((candidate: any) => String(candidate || '').trim().length > 0);
    return String(displayName || 'Project Manager').trim();
  }

  private toRevenueByPotential(potential?: string): string {
    const revenueByPotential: Record<string, string> = {
      Low: '$120K-$200K',
      Medium: '$220K-$320K',
      High: '$300K-$400K'
    };

    const key = String(potential || '').trim();
    return revenueByPotential[key] || '';
  }

  private normalizeRevenueInput(value?: string): string {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }

    const numeric = Number(raw.replace(/[$,\s]/g, ''));
    if (Number.isFinite(numeric) && numeric > 0) {
      return `$${Math.round(numeric).toLocaleString()}`;
    }

    return raw;
  }

  private toRevenueByCategory(category: string): string {
    const revenueByCategory: Record<string, string> = {
      New: '$300K-$400K',
      Revision: '$180K-$250K',
      'Cost Down': '$220K-$320K',
      Custom: '$120K-$200K'
    };
    return revenueByCategory[category] || '$120K-$200K';
  }

  private buildGateProgress(
    gateCompletion: Record<'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6', number>,
    taskCompletion: Record<'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6', number>,
    gateCompletedAt: Record<'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6', string | null>,
    initialRfpDate: string
  ): GateProgressItem[] {
    const today = new Date().toISOString().split('T')[0];
    const rfp = initialRfpDate || today;

    const g1End = gateCompletedAt.gate1 ?? (gateCompletion.gate1 > 0 ? today : null);
    const g1Days = g1End ? this.daysBetween(rfp, g1End) : 0;

    const g2End = gateCompletedAt.gate2 ?? (gateCompletion.gate2 > 0 ? today : null);
    const g2Days = g2End ? this.daysBetween(gateCompletedAt.gate1 ?? rfp, g2End) : 0;

    const g3End = gateCompletedAt.gate3 ?? (gateCompletion.gate3 > 0 ? today : null);
    const g3Days = g3End ? this.daysBetween(gateCompletedAt.gate2 ?? gateCompletedAt.gate1 ?? rfp, g3End) : 0;

    const g4End = gateCompletedAt.gate4 ?? (gateCompletion.gate4 > 0 ? today : null);
    const g4Days = g4End ? this.daysBetween(gateCompletedAt.gate3 ?? gateCompletedAt.gate2 ?? rfp, g4End) : 0;

    const g5End = gateCompletedAt.gate5 ?? (gateCompletion.gate5 > 0 ? today : null);
    const g5Days = g5End ? this.daysBetween(gateCompletedAt.gate4 ?? gateCompletedAt.gate3 ?? rfp, g5End) : 0;

    const g6End = gateCompletedAt.gate6 ?? (gateCompletion.gate6 > 0 ? today : null);
    const g6Days = g6End ? this.daysBetween(gateCompletedAt.gate5 ?? gateCompletedAt.gate4 ?? rfp, g6End) : 0;

    return [
      {
        label: 'Gate #1',
        days: g1Days,
        complete: gateCompletion.gate1 >= 100,
        checklistCompletion: gateCompletion.gate1,
        taskCompletion: taskCompletion.gate1,
        executionHealth: Math.min(gateCompletion.gate1, taskCompletion.gate1),
        mismatch: this.isGateTaskMismatched(gateCompletion.gate1, taskCompletion.gate1)
      },
      {
        label: 'Gate #2',
        days: g2Days,
        complete: gateCompletion.gate2 >= 100,
        checklistCompletion: gateCompletion.gate2,
        taskCompletion: taskCompletion.gate2,
        executionHealth: Math.min(gateCompletion.gate2, taskCompletion.gate2),
        mismatch: this.isGateTaskMismatched(gateCompletion.gate2, taskCompletion.gate2)
      },
      {
        label: 'Gate #3',
        days: g3Days,
        complete: gateCompletion.gate3 >= 100,
        checklistCompletion: gateCompletion.gate3,
        taskCompletion: taskCompletion.gate3,
        executionHealth: Math.min(gateCompletion.gate3, taskCompletion.gate3),
        mismatch: this.isGateTaskMismatched(gateCompletion.gate3, taskCompletion.gate3)
      },
      {
        label: 'Gate #4',
        days: g4Days,
        complete: gateCompletion.gate4 >= 100,
        checklistCompletion: gateCompletion.gate4,
        taskCompletion: taskCompletion.gate4,
        executionHealth: Math.min(gateCompletion.gate4, taskCompletion.gate4),
        mismatch: this.isGateTaskMismatched(gateCompletion.gate4, taskCompletion.gate4)
      },
      {
        label: 'Gate #5',
        days: g5Days,
        complete: gateCompletion.gate5 >= 100,
        checklistCompletion: gateCompletion.gate5,
        taskCompletion: taskCompletion.gate5,
        executionHealth: Math.min(gateCompletion.gate5, taskCompletion.gate5),
        mismatch: this.isGateTaskMismatched(gateCompletion.gate5, taskCompletion.gate5)
      },
      {
        label: 'Gate #6',
        days: g6Days,
        complete: gateCompletion.gate6 >= 100,
        checklistCompletion: gateCompletion.gate6,
        taskCompletion: taskCompletion.gate6,
        executionHealth: Math.min(gateCompletion.gate6, taskCompletion.gate6),
        mismatch: this.isGateTaskMismatched(gateCompletion.gate6, taskCompletion.gate6)
      }
    ];
  }

  private daysBetween(from: string, to: string): number {
    const a = new Date(from);
    const b = new Date(to);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) {
      return 0;
    }
    return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
  }

  private syncProjectFromIntake(project: ProjectDashboardItem): ProjectDashboardItem {
    const intake = this.loadIntakeState(project.id);
    if (!intake?.formValue) {
      const fallbackTaskCompletion = this.loadTaskCompletionByGate(project.id);
      const fallbackGateProgress = (project.gateProgress || []).map((gate, index) => {
        const gateKey = this.mapGateNumberToKey((index + 1) as 1 | 2 | 3 | 4 | 5 | 6);
        const taskValue = fallbackTaskCompletion[gateKey];
        const checklistValue = Number(gate.checklistCompletion ?? 0);
        return {
          ...gate,
          checklistCompletion: checklistValue,
          taskCompletion: taskValue,
          executionHealth: Math.min(checklistValue, taskValue),
          mismatch: this.isGateTaskMismatched(checklistValue, taskValue)
        };
      });

      const activeIndex = this.getGateIndexFromTag(project.gateTag);
      const activeGate = fallbackGateProgress[activeIndex];
      const activeTaskCompletion = activeGate ? activeGate.taskCompletion : 0;
      const activeExecutionHealth = activeGate ? activeGate.executionHealth : 0;

      return {
        ...project,
        taskCompletion: activeTaskCompletion,
        executionHealth: activeExecutionHealth,
        hasGateTaskMismatch: fallbackGateProgress.some(gate => gate.mismatch),
        gateProgress: fallbackGateProgress
      };
    }

    const form = intake.formValue;
    const gateCompletion = this.computeGateCompletion(form);
    const activeGate = this.resolveActiveGate(intake, gateCompletion);
    const activeGateKey = this.mapGateNumberToKey(activeGate);
    const taskCompletionByGate = this.loadTaskCompletionByGate(project.id);
    const readiness = this.computeReadinessFromForm(form);
    const readinessStatus = this.computeReadinessStatus(readiness, String(form['targetProductionDate'] || project.targetProd || ''));
    const gateCompletedAt = this.normalizeGateCompletedAt(intake.gateCompletedAt);
    const initialRfpDate = String(form['initialRfpDate'] || project.rfpDate || '');
    const gateProgress = this.buildGateProgress(gateCompletion, taskCompletionByGate, gateCompletedAt, initialRfpDate);

    return {
      ...project,
      name: String(form['productName'] || '').trim() || project.name,
      customer: String(form['customer'] || '').trim() || project.customer,
      category: String(form['projectCategory'] || '').trim() || project.category,
      strategy: String(form['strategyType'] || '').trim() || project.strategy,
      gateLabel: this.toGateLabel(activeGate),
      gateTag: this.toGateTag(activeGate),
      readiness,
      status: project.status === 'Draft' ? 'Draft' : this.toStatus(readinessStatus),
      revenue:
        this.normalizeRevenueInput(String(form['estimatedRevenue'] || '')) ||
        this.toRevenueByPotential(String(form['roughRevenuePotential'] || '')) ||
        project.revenue,
      awarded: activeGate >= 3,
      rfpDate: initialRfpDate || project.rfpDate,
      targetProd: String(form['targetProductionDate'] || project.targetProd || ''),
      taskCompletion: taskCompletionByGate[activeGateKey],
      executionHealth: Math.min(gateCompletion[activeGateKey], taskCompletionByGate[activeGateKey]),
      hasGateTaskMismatch: gateProgress.some(gate => gate.mismatch),
      gateProgress
    };
  }

  private mapGateNumberToKey(gate: 1 | 2 | 3 | 4 | 5 | 6): GateKey {
    const map: Record<1 | 2 | 3 | 4 | 5 | 6, GateKey> = {
      1: 'gate1',
      2: 'gate2',
      3: 'gate3',
      4: 'gate4',
      5: 'gate5',
      6: 'gate6'
    };
    return map[gate];
  }

  private getGateIndexFromTag(tag: string): number {
    const indexByTag: Record<string, number> = {
      opportunity: 0,
      concept: 1,
      awarded: 2,
      engineering: 3,
      validation: 4,
      production: 5
    };

    return indexByTag[String(tag || '').toLowerCase()] ?? 0;
  }

  private loadTaskCompletionByGate(projectId: string): Record<GateKey, number> {
    const base: Record<GateKey, number> = {
      gate1: 0,
      gate2: 0,
      gate3: 0,
      gate4: 0,
      gate5: 0,
      gate6: 0
    };

    if (!projectId) {
      return base;
    }

    try {
      const raw = localStorage.getItem(`${this.tasksStoragePrefix}${projectId}`);
      if (!raw) {
        return base;
      }

      const parsed = JSON.parse(raw) as { taskRecords?: Array<{ gate?: string; completion?: number; status?: string }> };
      const taskRecords = Array.isArray(parsed.taskRecords) ? parsed.taskRecords : [];
      const byGate: Record<GateKey, number[]> = {
        gate1: [],
        gate2: [],
        gate3: [],
        gate4: [],
        gate5: [],
        gate6: []
      };

      taskRecords.forEach((task) => {
        const gateMap: Record<string, GateKey> = {
          G1: 'gate1',
          G2: 'gate2',
          G3: 'gate3',
          G4: 'gate4',
          G5: 'gate5',
          G6: 'gate6'
        };
        const gate = gateMap[String(task.gate || '').toUpperCase()];
        if (!gate) {
          return;
        }

        const rawCompletion = Number(task.completion ?? 0);
        const normalized = task.status === 'Completed'
          ? 100
          : Math.max(0, Math.min(100, Number.isFinite(rawCompletion) ? rawCompletion : 0));
        byGate[gate].push(Math.round(normalized));
      });

      (Object.keys(base) as GateKey[]).forEach((gate) => {
        const values = byGate[gate];
        if (!values.length) {
          base[gate] = 0;
          return;
        }

        const total = values.reduce((sum, value) => sum + value, 0);
        base[gate] = Math.round(total / values.length);
      });

      return base;
    } catch {
      return base;
    }
  }

  private isGateTaskMismatched(checklistCompletion: number, taskCompletion: number): boolean {
    if ((checklistCompletion >= 100 && taskCompletion < 100) || (taskCompletion >= 100 && checklistCompletion < 100)) {
      return true;
    }

    return Math.abs(checklistCompletion - taskCompletion) >= 25;
  }

  private loadIntakeState(projectId: string): IntakeStoragePayload | null {
    if (!projectId) {
      return null;
    }

    try {
      const raw = localStorage.getItem(`${this.intakeStoragePrefix}${projectId}`);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as IntakeStoragePayload;
    } catch {
      return null;
    }
  }

  private computeGateCompletion(form: Record<string, any>): Record<GateKey, number> {
    const result = {} as Record<GateKey, number>;

    (Object.keys(this.gateFieldMap) as GateKey[]).forEach((gate) => {
      const fields = this.gateFieldMap[gate];
      const completed = fields.filter((field) => this.isFieldComplete(form[field])).length;
      result[gate] = fields.length ? Math.round((completed / fields.length) * 100) : 0;
    });

    return result;
  }

  private isFieldComplete(value: any): boolean {
    if (typeof value === 'boolean') {
      return true;
    }

    if (value === null || value === undefined) {
      return false;
    }

    return String(value).trim().length > 0;
  }

  private isFieldReady(value: any): boolean {
    if (typeof value === 'boolean') {
      return value === true;
    }

    if (value === null || value === undefined) {
      return false;
    }

    return String(value).trim().length > 0;
  }

  private resolveActiveGate(
    intake: IntakeStoragePayload,
    gateCompletion: Record<GateKey, number>
  ): 1 | 2 | 3 | 4 | 5 | 6 {
    if (intake.activeGate && intake.activeGate >= 1 && intake.activeGate <= 6) {
      return intake.activeGate;
    }

    const byInputSystem: Record<GateKey, 1 | 2 | 3 | 4 | 5 | 6> = {
      gate1: 1,
      gate2: 2,
      gate3: 3,
      gate4: 4,
      gate5: 5,
      gate6: 6
    };

    if (intake.activeInputSystem && byInputSystem[intake.activeInputSystem]) {
      return byInputSystem[intake.activeInputSystem];
    }

    const ordered: GateKey[] = ['gate1', 'gate2', 'gate3', 'gate4', 'gate5', 'gate6'];
    for (let i = ordered.length - 1; i >= 0; i--) {
      if (gateCompletion[ordered[i]] > 0) {
        return (i + 1) as 1 | 2 | 3 | 4 | 5 | 6;
      }
    }

    return 1;
  }

  private computeReadiness(gateCompletion: Record<GateKey, number>): number {
    const values = (Object.keys(gateCompletion) as GateKey[]).map((gate) => gateCompletion[gate]);
    if (!values.length) {
      return 0;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round(total / values.length);
  }

  private computeReadinessFromForm(form: Record<string, any>): number {
    const allFields = (Object.keys(this.gateFieldMap) as GateKey[])
      .flatMap((gate) => this.gateFieldMap[gate]);

    if (!allFields.length) {
      return 0;
    }

    const completed = allFields.filter((field) => this.isFieldReady(form[field])).length;
    return Math.round((completed / allFields.length) * 100);
  }

  private computeReadinessStatus(readiness: number, targetProductionDate: string): 'Green' | 'Yellow' | 'Red' {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(targetProductionDate);
    const isOverdue = !Number.isNaN(target.getTime()) && (() => {
      target.setHours(0, 0, 0, 0);
      return target.getTime() < today.getTime();
    })();

    if (isOverdue && readiness < 80) {
      return 'Red';
    }

    if (readiness >= 80) {
      return 'Green';
    }

    if (readiness >= 50) {
      return 'Yellow';
    }

    return 'Red';
  }

  private normalizeGateCompletedAt(input?: Partial<Record<GateKey, string | null>>): Record<GateKey, string | null> {
    return {
      gate1: input?.gate1 ?? null,
      gate2: input?.gate2 ?? null,
      gate3: input?.gate3 ?? null,
      gate4: input?.gate4 ?? null,
      gate5: input?.gate5 ?? null,
      gate6: input?.gate6 ?? null
    };
  }

  private removeScopedProjectState(projectId: string): void {
    try {
      localStorage.removeItem(`${this.intakeStoragePrefix}${projectId}`);
      localStorage.removeItem(`${this.tasksStoragePrefix}${projectId}`);
      localStorage.removeItem(`${this.workflowStoragePrefix}${projectId}`);
    } catch {
      // Ignore localStorage cleanup issues in test mode.
    }
  }

}
