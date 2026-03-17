import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

export type ProjectStatus = 'On Track' | 'At Risk' | 'Overdue';

export interface GateProgressItem {
  label: string;
  days: number;
  complete: boolean;
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
  gateProgress: GateProgressItem[];
}

export interface ProjectCreationInput {
  id: string;
  productName: string;
  customer: string;
  projectCategory: string;
  strategyType: string;
  initialRfpDate: string;
  targetProductionDate: string;
  readinessScore: number;
  readinessStatus: 'Green' | 'Yellow' | 'Red';
  activeGate: 1 | 2 | 3 | 4 | 5 | 6;
  gateCompletion: Record<'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6', number>;
  gateCompletedAt: Record<'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6', string | null>;
}

@Injectable({ providedIn: 'root' })
export class ProjectManagerProjectsService {
  private readonly projectsStorageKey = 'pm_projects_v1';
  private readonly selectedProjectStorageKey = 'pm_selected_project_v1';

  getProjects(): ProjectDashboardItem[] {
    if (this.isApiMode) {
      return this.getProjectsFromApi();
    }

    const raw = localStorage.getItem(this.projectsStorageKey);
    if (!raw) {
      const defaults = this.defaultProjects();
      this.saveProjects(defaults);
      return defaults;
    }

    try {
      const parsed = JSON.parse(raw) as ProjectDashboardItem[];
      return Array.isArray(parsed) ? parsed : this.defaultProjects();
    } catch {
      return this.defaultProjects();
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
    const newProject: ProjectDashboardItem = {
      id: input.id,
      code: input.id,
      name: input.productName,
      customer: input.customer,
      category: input.projectCategory,
      gateLabel: this.toGateLabel(input.activeGate),
      gateTag: this.toGateTag(input.activeGate),
      readiness: input.readinessScore,
      status: this.toStatus(input.readinessStatus),
      owner: this.toOwnerByStrategy(input.strategyType),
      revenue: this.toRevenueByCategory(input.projectCategory),
      strategy: input.strategyType,
      awarded: input.activeGate >= 3,
      rfpDate: input.initialRfpDate,
      targetProd: input.targetProductionDate,
      gateProgress: this.buildGateProgress(input.gateCompletion, input.gateCompletedAt, input.initialRfpDate)
    };

    const projects = [newProject, ...this.getProjects().filter(project => project.id !== input.id)];
    this.saveProjects(projects);
    this.setSelectedProjectId(newProject.id);
    return newProject;
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
      const defaults = this.defaultProjects();
      this.saveProjectsToLocalStorage(defaults);
      return defaults;
    }

    try {
      const parsed = JSON.parse(raw) as ProjectDashboardItem[];
      return Array.isArray(parsed) ? parsed : this.defaultProjects();
    } catch {
      return this.defaultProjects();
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
      { label: 'Gate #1', days: g1Days, complete: gateCompletion.gate1 >= 100 },
      { label: 'Gate #2', days: g2Days, complete: gateCompletion.gate2 >= 100 },
      { label: 'Gate #3', days: g3Days, complete: gateCompletion.gate3 >= 100 },
      { label: 'Gate #4', days: g4Days, complete: gateCompletion.gate4 >= 100 },
      { label: 'Gate #5', days: g5Days, complete: gateCompletion.gate5 >= 100 },
      { label: 'Gate #6', days: g6Days, complete: gateCompletion.gate6 >= 100 }
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

  private defaultProjects(): ProjectDashboardItem[] {
    return [
      {
        id: 'PRJ-001',
        code: 'PRJ-001',
        name: 'LED Matrix Panel X200',
        customer: 'LightTech Corp',
        category: 'New',
        gateLabel: 'G3 - Awarded',
        gateTag: 'awarded',
        readiness: 72,
        status: 'At Risk',
        owner: 'Maria R.',
        revenue: '$300K-$400K',
        strategy: 'Retention',
        awarded: true,
        rfpDate: '2025-12-01',
        targetProd: '2026-05-30',
        gateProgress: [
          { label: 'Gate #1', days: 29, complete: true },
          { label: 'Gate #2', days: 15, complete: true },
          { label: 'Gate #3', days: 14, complete: false },
          { label: 'Gate #4', days: 0, complete: false },
          { label: 'Gate #5', days: 0, complete: false },
          { label: 'Gate #6', days: 0, complete: false }
        ]
      },
      {
        id: 'PRJ-002',
        code: 'PRJ-002',
        name: 'Pixel Pitch Revision P3.9',
        customer: 'EventVision LLC',
        category: 'Revision',
        gateLabel: 'G4 - Engineering',
        gateTag: 'engineering',
        readiness: 88,
        status: 'On Track',
        owner: 'James K.',
        revenue: '$180K-$250K',
        strategy: 'Growth',
        awarded: true,
        rfpDate: '2025-11-20',
        targetProd: '2026-04-15',
        gateProgress: [
          { label: 'Gate #1', days: 25, complete: true },
          { label: 'Gate #2', days: 10, complete: true },
          { label: 'Gate #3', days: 8, complete: false },
          { label: 'Gate #4', days: 0, complete: false },
          { label: 'Gate #5', days: 0, complete: false },
          { label: 'Gate #6', days: 0, complete: false }
        ]
      },
      {
        id: 'PRJ-003',
        code: 'PRJ-003',
        name: 'Custom Indoor Cabinet CI-500',
        customer: 'StadiumTech Inc',
        category: 'Custom',
        gateLabel: 'G2 - Concept',
        gateTag: 'concept',
        readiness: 41,
        status: 'Overdue',
        owner: 'Dana L.',
        revenue: '$120K-$200K',
        strategy: 'Platform',
        awarded: false,
        rfpDate: '2025-10-15',
        targetProd: '2026-02-10',
        gateProgress: [
          { label: 'Gate #1', days: 72, complete: true },
          { label: 'Gate #2', days: 30, complete: true },
          { label: 'Gate #3', days: 19, complete: false },
          { label: 'Gate #4', days: 0, complete: false },
          { label: 'Gate #5', days: 0, complete: false },
          { label: 'Gate #6', days: 0, complete: false }
        ]
      },
      {
        id: 'PRJ-004',
        code: 'PRJ-004',
        name: 'Cost Down CD-Outdoor 2.0',
        customer: 'BrightSign Global',
        category: 'Cost Down',
        gateLabel: 'G5 - Validation',
        gateTag: 'validation',
        readiness: 95,
        status: 'On Track',
        owner: 'Carlos M.',
        revenue: '$300K-$400K',
        strategy: 'Retention',
        awarded: true,
        rfpDate: '2025-12-01',
        targetProd: '2026-05-30',
        gateProgress: [
          { label: 'Gate #1', days: 28, complete: true },
          { label: 'Gate #2', days: 20, complete: true },
          { label: 'Gate #3', days: 15, complete: true },
          { label: 'Gate #4', days: 20, complete: true },
          { label: 'Gate #5', days: 3, complete: false },
          { label: 'Gate #6', days: 0, complete: false }
        ]
      }
    ];
  }
}
