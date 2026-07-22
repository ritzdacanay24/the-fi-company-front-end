import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, map, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ProjectManagerTasksDataService, ProjectManagerTasksState } from './services/project-manager-tasks-data.service';
import { ProjectCreationInput, ProjectDashboardItem, ProjectManagerProjectsService, ProjectStatus } from './services/project-manager-projects.service';

type DashboardTab = 'overview' | 'gates' | 'pipeline';

interface GateStageDefinition {
  key: 'opportunity' | 'concept' | 'awarded' | 'engineering' | 'validation' | 'production';
  title: string;
  gateNumber: number;
  timeline: string;
  description: string;
}

interface GateStageCard extends GateStageDefinition {
  projects: ProjectDashboardItem[];
}

@Component({
  standalone: true,
  selector: 'app-project-manager-dashboard',
  imports: [SharedModule],
  templateUrl: './project-manager-dashboard.component.html',
  styleUrls: ['./project-manager-dashboard.component.scss']
})
export class ProjectManagerDashboardComponent implements OnInit {
  @ViewChild('copyProjectModal') copyProjectModalTpl!: TemplateRef<any>;

  activeTab: DashboardTab = 'overview';
  private readonly projectManagerBaseRoute = '/project-manager';
  private readonly operationsBaseRoute = '/operations/project-manager';
  private activeModalRef: any = null;
  private hasInitializedRouteState = false;

  private gateStages: GateStageDefinition[] = [
    {
      key: 'opportunity',
      title: 'Opportunity',
      gateNumber: 1,
      timeline: '0-1 Month',
      description: 'RFP received, revenue potential defined. If not validated, the project does not move forward.'
    },
    {
      key: 'concept',
      title: 'Concept',
      gateNumber: 2,
      timeline: '0-1 Month',
      description: 'Design renders, rough cost estimation, and architecture are defined for feasibility.'
    },
    {
      key: 'awarded',
      title: 'Awarded',
      gateNumber: 3,
      timeline: '0-1 Week',
      description: 'Business is awarded, preliminary BOM and long-lead items are identified.'
    },
    {
      key: 'engineering',
      title: 'Engineering',
      gateNumber: 4,
      timeline: '4-8 Weeks',
      description: 'DFM, final BOM, work instructions, and mapping convert concept to buildable product.'
    },
    {
      key: 'validation',
      title: 'Validation',
      gateNumber: 5,
      timeline: '0-1 Week',
      description: 'Functional validation, pilot run, and QC procedures confirm production readiness.'
    },
    {
      key: 'production',
      title: 'Production',
      gateNumber: 6,
      timeline: 'EOL',
      description: 'Production POs and inventory strategy are finalized as project enters production.'
    }
  ];

  projects: ProjectDashboardItem[] = [];
  private readonly projectTaskCountById = new Map<string, number>();
  private readonly projectGateTaskCountById = new Map<string, Record<string, number>>();
  private readonly projectGateTaskCompletionById = new Map<string, Record<string, number>>();
  selectedProjectId = '';
  private routeProjectId = '';
  pendingCopyProject: ProjectDashboardItem | null = null;
  copyTargetMode: 'existing' | 'new' = 'existing';
  copyTargetProjectId = '';
  copyNewProjectId = '';

  constructor(
    private projectsService: ProjectManagerProjectsService,
    private tasksDataService: ProjectManagerTasksDataService,
    private modalService: NgbModal,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  get copyTargetProjectOptions(): Array<{ id: string; name: string }> {
    const sourceId = String(this.pendingCopyProject?.id || '').trim();
    return this.projects
      .filter((project) => String(project.id || '').trim() && project.id !== sourceId)
      .map((project) => ({
        id: String(project.id || '').trim(),
        name: String(project.name || project.id || '').trim(),
      }));
  }

  get canCopyProject(): boolean {
    if (this.copyTargetMode === 'new') {
      return !!String(this.copyNewProjectId || '').trim();
    }

    return !!String(this.copyTargetProjectId || '').trim();
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const nextProjectId = (params.get('projectId') || '').trim();
      const nextTab = this.parseDashboardTab(params.get('tab'));
      this.activeTab = nextTab;

      const shouldReloadProjects = !this.hasInitializedRouteState || nextProjectId !== this.routeProjectId;
      this.routeProjectId = nextProjectId;
      this.hasInitializedRouteState = true;

      if (shouldReloadProjects) {
        this.reloadProjects();
      }
    });
  }

  setTab(tab: DashboardTab): void {
    if (this.activeTab === tab) {
      return;
    }

    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private parseDashboardTab(value: string | null): DashboardTab {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'gates' || normalized === 'pipeline') {
      return normalized;
    }

    return 'overview';
  }

  selectProject(projectId: string): void {
    this.selectedProjectId = projectId;
    this.projectsService.setSelectedProjectId(projectId);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { projectId },
      queryParamsHandling: 'merge'
    });
  }

  openExecution(): void {
    if (!this.selectedProjectId) {
      return;
    }

    this.openExecutionFor(this.selectedProjectId);
  }

  openTasks(): void {
    if (!this.selectedProjectId) {
      return;
    }

    this.openTasksFor(this.selectedProjectId);
  }

  openIntake(): void {
    if (!this.selectedProjectId) {
      return;
    }

    this.openIntakeFor(this.selectedProjectId);
  }

  onProjectActionChange(project: ProjectDashboardItem, action: string): void {
    if (!action) {
      return;
    }

    this.selectProject(project.id);

    switch (action) {
      case 'checklist':
        this.openExecutionFor(project.id);
        break;
      case 'tasks':
        this.openTasksFor(project.id);
        break;
      case 'intake':
        this.openIntakeFor(project.id);
        break;
      case 'delete':
        this.deleteProject(project);
        break;
      case 'copy':
        this.copyProject(project);
        break;
      default:
        break;
    }
  }

  deleteSelectedProject(): void {
    if (!this.selectedProject) {
      return;
    }

    this.deleteProject(this.selectedProject);
  }

  private openExecutionFor(projectId: string): void {
    this.router.navigate([`${this.baseRoute}/new-project`], {
      queryParams: { projectId, view: 'checklist' }
    });
  }

  private openTasksFor(projectId: string): void {
    this.router.navigate([`${this.baseRoute}/tasks`], {
      queryParams: { projectId }
    });
  }

  private openIntakeFor(projectId: string): void {
    this.router.navigate([`${this.baseRoute}/new-project`], {
      queryParams: { projectId }
    });
  }

  openProjectGate(project: ProjectDashboardItem, event?: Event): void {
    event?.stopPropagation();
    const gateNumber = this.getGateIndex(project.gateTag) + 1;
    this.router.navigate([`${this.baseRoute}/new-project`], {
      queryParams: { projectId: project.id, view: 'checklist', gate: `gate${gateNumber}` }
    });
  }

  openSelectedProjectGate(gateLabel: string): void {
    const selected = this.selectedProject;
    if (!selected) {
      return;
    }

    const match = String(gateLabel || '').match(/(\d+)/);
    const gateNumber = match ? Number(match[1]) : this.getGateIndex(selected.gateTag) + 1;
    const safeGate = Number.isFinite(gateNumber) && gateNumber >= 1 && gateNumber <= 6 ? gateNumber : 1;

    this.router.navigate([`${this.baseRoute}/new-project`], {
      queryParams: { projectId: selected.id, view: 'checklist', gate: `gate${safeGate}` }
    });
  }

  getChecklistRoute(): string {
    return `${this.baseRoute}/new-project`;
  }

  getGateRouteQueryParams(project: ProjectDashboardItem): { projectId: string; view: 'checklist'; gate: string } {
    const gateNumber = this.getGateIndex(project.gateTag) + 1;
    return {
      projectId: project.id,
      view: 'checklist',
      gate: `gate${gateNumber}`,
    };
  }

  private get baseRoute(): string {
    return this.router.url.startsWith(this.projectManagerBaseRoute)
      ? this.projectManagerBaseRoute
      : this.operationsBaseRoute;
  }

  private deleteProject(project: ProjectDashboardItem): void {
    const confirmDelete = window.confirm(
      `Delete project "${project.name}" (${project.id})? This cannot be undone.`
    );

    if (!confirmDelete) {
      return;
    }

    this.projectsService.deleteProject$(project.id).subscribe(() => {
      this.reloadProjects(() => {
        if (this.selectedProjectId) {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { projectId: this.selectedProjectId },
            queryParamsHandling: 'merge'
          });
        } else {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { projectId: null },
            queryParamsHandling: 'merge'
          });
        }
      });
    });
  }

  private copyProject(project: ProjectDashboardItem): void {
    const source = project || null;
    const sourceProjectId = String(source?.id || '').trim();
    if (!source || !sourceProjectId) {
      return;
    }

    const options = this.projects.filter((item) => item.id !== sourceProjectId);

    this.pendingCopyProject = source;
    this.copyTargetMode = options.length ? 'existing' : 'new';
    this.copyTargetProjectId = options.length ? options[0].id : '';
    this.copyNewProjectId = this.generateUniqueProjectIdSuggestion();
    this.activeModalRef = this.modalService.open(this.copyProjectModalTpl, {
      size: 'sm',
      centered: true,
      backdrop: 'static',
      keyboard: true,
    });
  }

  confirmCopyProject(modal?: any): void {
    const source = this.pendingCopyProject;
    const sourceProjectId = String(source?.id || '').trim();
    const targetProjectId = String(
      this.copyTargetMode === 'new' ? this.copyNewProjectId : this.copyTargetProjectId
    ).trim();

    if (!source || !sourceProjectId) {
      modal?.dismiss?.();
      return;
    }

    if (!targetProjectId) {
      return;
    }

    if (targetProjectId === sourceProjectId) {
      window.alert('Target project ID must be different from source project ID.');
      return;
    }

    const existingTarget = this.projects.find(item => item.id === targetProjectId);
    if (this.copyTargetMode === 'new' && existingTarget) {
      window.alert(`Project ID ${targetProjectId} already exists. Use a different new ID.`);
      return;
    }

    if (this.copyTargetMode === 'existing' && existingTarget) {
      const shouldOverwrite = window.confirm(
        `Project ${targetProjectId} already exists. Overwrite it with data from ${sourceProjectId}?`
      );
      if (!shouldOverwrite) {
        return;
      }
    }

    const projectInput = this.toProjectCreationInput(source, targetProjectId);
    this.projectsService.upsertProject$(projectInput).pipe(
      switchMap(() => {
        const intakeCopy$ = this.projectsService.getIntakeState$(sourceProjectId).pipe(
          switchMap((state) => {
            if (!state) {
              return of(undefined);
            }

            return this.projectsService.saveIntakeState$(targetProjectId, {
              formValue: state.formValue ? { ...state.formValue } : state.formValue,
              activeInputSystem: state.activeInputSystem,
              activeGate: state.activeGate,
              gateCompletedAt: state.gateCompletedAt ? { ...state.gateCompletedAt } : state.gateCompletedAt,
            });
          })
        );

        const tasksCopy$ = this.tasksDataService.loadState$(sourceProjectId).pipe(
          switchMap((sourceState) => {
            return this.tasksDataService.loadState$(targetProjectId).pipe(
              switchMap((targetState) => {
                let nextTargetId = Math.max(1, Number(targetState.nextId || 1));
                const idMap = new Map<number, number>();

                const copiedTaskRecords = (sourceState.taskRecords || []).map((task) => {
                  const oldId = Number(task.id || 0);
                  const newId = nextTargetId++;
                  if (Number.isFinite(oldId) && oldId > 0) {
                    idMap.set(oldId, newId);
                  }

                  return {
                    ...task,
                    id: newId,
                    project: targetProjectId,
                    assignedTo: [...(task.assignedTo || [])],
                  };
                });

                const subgroupCatalog: Record<string, string[]> = { ...(targetState.subgroupCatalog || {}) };
                Object.entries(sourceState.subgroupCatalog || {}).forEach(([group, subgroups]) => {
                  const current = new Set(subgroupCatalog[group] || []);
                  (subgroups || []).forEach((subgroup) => {
                    const normalized = String(subgroup || '').trim();
                    if (normalized) {
                      current.add(normalized);
                    }
                  });
                  subgroupCatalog[group] = Array.from(current);
                });

                const taskAttachmentCounts: Record<number, number> = { ...(targetState.taskAttachmentCounts || {}) };
                Object.entries(sourceState.taskAttachmentCounts || {}).forEach(([oldIdRaw, countRaw]) => {
                  const oldId = Number(oldIdRaw);
                  const newId = idMap.get(oldId);
                  if (!newId) {
                    return;
                  }
                  const count = Number(countRaw);
                  if (Number.isFinite(count) && count > 0) {
                    taskAttachmentCounts[newId] = count;
                  }
                });

                const taskCommentCounts: Record<number, number> = { ...(targetState.taskCommentCounts || {}) };
                Object.entries(sourceState.taskCommentCounts || {}).forEach(([oldIdRaw, countRaw]) => {
                  const oldId = Number(oldIdRaw);
                  const newId = idMap.get(oldId);
                  if (!newId) {
                    return;
                  }
                  const count = Number(countRaw);
                  if (Number.isFinite(count) && count > 0) {
                    taskCommentCounts[newId] = count;
                  }
                });

                const taskBoardNames = Array.from(new Set([
                  ...(targetState.taskBoardNames || []),
                  ...(sourceState.taskBoardNames || []),
                ]));

                const mergedTargetState: ProjectManagerTasksState = {
                  ...targetState,
                  hasPersistedState: true,
                  nextId: nextTargetId,
                  taskRecords: [...copiedTaskRecords, ...(targetState.taskRecords || [])],
                  subgroupCatalog,
                  defaultTaskTemplates: (targetState.defaultTaskTemplates || []).length
                    ? [...(targetState.defaultTaskTemplates || [])]
                    : [...(sourceState.defaultTaskTemplates || [])],
                  projectTaskBoardName: String(
                    targetState.projectTaskBoardName || sourceState.projectTaskBoardName || 'Project Tasks'
                  ).trim() || 'Project Tasks',
                  taskBoardNames,
                  taskAttachmentCounts,
                  taskCommentCounts,
                };

                return this.tasksDataService.saveStateWithStatus$(mergedTargetState, targetProjectId);
              })
            );
          })
        );

        return forkJoin([intakeCopy$, tasksCopy$]);
      })
    ).subscribe(([, tasksSavedToApi]) => {
      if (!tasksSavedToApi) {
        window.alert('Project copy did not go through for tasks. Please try again.');
        return;
      }

      this.reloadProjects(() => {
        this.selectProject(targetProjectId);
      });

      this.pendingCopyProject = null;
      this.copyTargetMode = 'existing';
      this.copyTargetProjectId = '';
      this.copyNewProjectId = '';
      modal?.close?.();
    });
  }

  private generateUniqueProjectIdSuggestion(): string {
    const usedIds = new Set(this.projects.map((project) => String(project.id || '').trim()));
    let candidate = this.projectsService.generateProjectId();
    let attempts = 0;

    while (usedIds.has(candidate) && attempts < 10) {
      candidate = this.projectsService.generateProjectId();
      attempts += 1;
    }

    if (!usedIds.has(candidate)) {
      return candidate;
    }

    return `PRJ-${Date.now()}`;
  }

  private toProjectCreationInput(source: ProjectDashboardItem, targetProjectId: string): ProjectCreationInput {
    const activeGate = this.getGateIndex(source.gateTag) + 1;
    const safeActiveGate = (Math.min(Math.max(activeGate, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6);
    const gateCompletion = this.toGateCompletion(source);

    return {
      id: targetProjectId,
      productName: String(source.name || '').trim() || 'Copied Project',
      customer: String(source.customer || '').trim() || 'TBD',
      projectCategory: String(source.category || '').trim() || 'New',
      strategyType: String(source.strategy || '').trim() || 'Growth',
      roughRevenuePotential: 'Medium',
      estimatedRevenue: String(source.revenue || '').trim(),
      initialRfpDate: String(source.rfpDate || '').trim(),
      targetProductionDate: String(source.targetProd || '').trim(),
      readinessScore: Number(source.readiness || 0),
      readinessStatus: this.toReadinessStatus(source.status, Number(source.readiness || 0)),
      activeGate: safeActiveGate,
      gateCompletion,
      gateCompletedAt: {
        gate1: null,
        gate2: null,
        gate3: null,
        gate4: null,
        gate5: null,
        gate6: null,
      },
      isDraft: source.status === 'Draft',
    };
  }

  private toGateCompletion(project: ProjectDashboardItem): Record<'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5' | 'gate6', number> {
    const values = [0, 0, 0, 0, 0, 0];
    (project.gateProgress || []).slice(0, 6).forEach((item, index) => {
      const completion = Number(item?.checklistCompletion || 0);
      values[index] = Number.isFinite(completion) ? Math.min(Math.max(completion, 0), 100) : 0;
    });

    return {
      gate1: values[0],
      gate2: values[1],
      gate3: values[2],
      gate4: values[3],
      gate5: values[4],
      gate6: values[5],
    };
  }

  private toReadinessStatus(status: ProjectStatus, readiness: number): 'Green' | 'Yellow' | 'Red' {
    if (status === 'On Track') {
      return 'Green';
    }

    if (status === 'At Risk') {
      return 'Yellow';
    }

    if (status === 'Overdue') {
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

  get totalProjects(): number {
    return this.projects.length;
  }

  get onTrackCount(): number {
    return this.projects.filter(project => project.readiness >= 80).length;
  }

  get atRiskOrOverdueCount(): number {
    return this.projects.filter(project => project.readiness < 80).length;
  }

  get avgReadiness(): number {
    if (!this.projects.length) {
      return 0;
    }
    const total = this.projects.reduce((sum, project) => sum + project.readiness, 0);
    return Math.round(total / this.projects.length);
  }

  get selectedProject(): ProjectDashboardItem | undefined {
    return this.projects.find(project => project.id === this.selectedProjectId) || this.projects[0];
  }

  private reloadProjects(callback?: () => void): void {
    this.projectsService.getProjects$().pipe(
      switchMap((projects) => {
        if (!projects.length) {
          this.projectTaskCountById.clear();
          this.projectGateTaskCountById.clear();
          this.projectGateTaskCompletionById.clear();
          return of(projects);
        }

        return forkJoin(
          projects.map((project) => this.tasksDataService.loadState$(project.id).pipe(
            map((state) => ({ projectId: project.id, state }))
          ))
        ).pipe(
          map((projectTaskStates) => this.syncProjectsTaskCompletion(projects, projectTaskStates))
        );
      })
    ).subscribe(projects => {
      this.projects = projects;

      const routeMatch = this.routeProjectId
        ? projects.find(project => project.id === this.routeProjectId)
        : undefined;

      if (routeMatch) {
        this.selectedProjectId = routeMatch.id;
        this.projectsService.setSelectedProjectId(routeMatch.id);
      } else {
        this.selectedProjectId = this.projectsService.getSelectedProjectId(projects);
      }

      callback?.();
    });
  }

  private syncProjectsTaskCompletion(
    projects: ProjectDashboardItem[],
    projectTaskStates: Array<{ projectId: string; state: ProjectManagerTasksState }>
  ): ProjectDashboardItem[] {
    const stateMap = new Map<string, ProjectManagerTasksState>();
    this.projectTaskCountById.clear();
    this.projectGateTaskCountById.clear();
    this.projectGateTaskCompletionById.clear();
    projectTaskStates.forEach((item) => stateMap.set(String(item.projectId || '').trim(), item.state));

    return projects.map((project) => {
      const state = stateMap.get(String(project.id || '').trim());
      const taskRecords = state?.taskRecords || [];
      this.projectTaskCountById.set(String(project.id || '').trim(), taskRecords.length);
      if (!taskRecords.length) {
        this.projectGateTaskCountById.set(String(project.id || '').trim(), {
          G1: 0,
          G2: 0,
          G3: 0,
          G4: 0,
          G5: 0,
          G6: 0,
          PROJECT: 0,
        });
        this.projectGateTaskCompletionById.set(String(project.id || '').trim(), {
          G1: 0,
          G2: 0,
          G3: 0,
          G4: 0,
          G5: 0,
          G6: 0,
          PROJECT: 0,
        });
        return project;
      }

      const projectTaskCompletion = this.computeProjectTaskCompletion(taskRecords);
      const gateTaskStats = this.computeGateTaskStats(taskRecords);
      this.projectGateTaskCountById.set(String(project.id || '').trim(), gateTaskStats.counts);
      this.projectGateTaskCompletionById.set(String(project.id || '').trim(), gateTaskStats.completion);

      return {
        ...project,
        taskCompletion: projectTaskCompletion,
        gateProgress: (project.gateProgress || []).map((gate, index) => {
          const gateKey = `G${index + 1}`;
          return {
            ...gate,
            taskCompletion: gateTaskStats.completion[gateKey] ?? Number(gate.taskCompletion || 0),
          };
        }),
      };
    });
  }

  private computeProjectTaskCompletion(taskRecords: ProjectManagerTasksState['taskRecords']): number {
    if (!taskRecords.length) {
      return 0;
    }

    const total = taskRecords.reduce((sum, task) => {
      const completion = Number(task?.completion || 0);
      if (!Number.isFinite(completion)) {
        return sum;
      }

      return sum + Math.min(100, Math.max(0, completion));
    }, 0);

    return Math.round(total / taskRecords.length);
  }

  private computeGateTaskStats(taskRecords: ProjectManagerTasksState['taskRecords']): {
    completion: Record<string, number>;
    counts: Record<string, number>;
  } {
    const buckets: Record<string, number[]> = {
      G1: [],
      G2: [],
      G3: [],
      G4: [],
      G5: [],
      G6: [],
      PROJECT: [],
    };

    taskRecords.forEach((task) => {
      const gate = String(task?.gate || '').trim().toUpperCase();
      const completion = Number(task?.completion || 0);
      if (!Number.isFinite(completion)) {
        return;
      }

      const normalizedCompletion = Math.min(100, Math.max(0, completion));
      if (gate && gate in buckets && gate !== 'PROJECT') {
        buckets[gate].push(normalizedCompletion);
        return;
      }

      buckets['PROJECT'].push(normalizedCompletion);
    });

    const completion: Record<string, number> = {};
    const counts: Record<string, number> = {};
    Object.entries(buckets).forEach(([gate, values]) => {
      counts[gate] = values.length;
      if (!values.length) {
        completion[gate] = 0;
        return;
      }

      const total = values.reduce((sum, value) => sum + value, 0);
      completion[gate] = Math.round(total / values.length);
    });

    return { completion, counts };
  }

  hasGateTasks(projectId: string, gateLabel: string): boolean {
    const projectKey = String(projectId || '').trim();
    const gateMatch = String(gateLabel || '').match(/(\d+)/);
    const gateNumber = gateMatch ? Number(gateMatch[1]) : 0;
    if (gateNumber < 1 || gateNumber > 6) {
      return false;
    }

    const gateKey = `G${gateNumber}`;
    const gateCounts = this.projectGateTaskCountById.get(projectKey);
    return Number(gateCounts?.[gateKey] || 0) > 0;
  }

  hasProjectTasks(projectId: string): boolean {
    return Number(this.projectTaskCountById.get(String(projectId || '').trim()) || 0) > 0;
  }

  hasProjectLevelTasks(projectId: string): boolean {
    const projectKey = String(projectId || '').trim();
    const gateCounts = this.projectGateTaskCountById.get(projectKey);
    return Number(gateCounts?.['PROJECT'] || 0) > 0;
  }

  getProjectLevelTaskCompletion(projectId: string): number {
    const projectKey = String(projectId || '').trim();
    const completion = this.projectGateTaskCompletionById.get(projectKey);
    return Number(completion?.['PROJECT'] || 0);
  }

  get bottleneckAlerts(): ProjectDashboardItem[] {
    return this.projects.filter(project => project.status !== 'On Track' || project.readiness < 75);
  }

  get gateCards(): GateStageCard[] {
    return this.gateStages.map(stage => ({
      ...stage,
      projects: this.projects.filter(project => project.gateTag === stage.key)
    }));
  }

  trackByStageKey(_: number, stage: GateStageCard): string {
    return stage.key;
  }

  trackByProjectId(_: number, project: ProjectDashboardItem): string {
    return project.id;
  }

  get pipelineProjects(): ProjectDashboardItem[] {
    return [...this.projects].sort((a, b) => b.readiness - a.readiness);
  }

  getPipelineSegmentClass(index: number, project: ProjectDashboardItem): string {
    const activeIndex = this.getGateIndex(project.gateTag);
    if (index > activeIndex) {
      return 'segment-off';
    }

    const classes = [
      'segment-opportunity',
      'segment-concept',
      'segment-awarded',
      'segment-engineering',
      'segment-validation',
      'segment-production'
    ];
    return classes[index] || 'segment-off';
  }

  getPipelineCardClass(project: ProjectDashboardItem): string {
    if (project.status === 'Draft') {
      return 'pipeline-draft';
    }
    if (project.status === 'Overdue') {
      return 'pipeline-overdue';
    }
    if (project.status === 'At Risk') {
      return 'pipeline-risk';
    }
    return 'pipeline-track';
  }

  private getGateIndex(tag: string): number {
    const order: Record<string, number> = {
      opportunity: 0,
      concept: 1,
      awarded: 2,
      engineering: 3,
      validation: 4,
      production: 5
    };

    return order[tag] ?? 0;
  }

  getStatusClass(status: ProjectStatus): string {
    if (status === 'Draft') {
      return 'status-draft';
    }
    if (status === 'On Track') {
      return 'status-on-track';
    }
    if (status === 'At Risk') {
      return 'status-at-risk';
    }
    return 'status-overdue';
  }

  getGateTagClass(tag: string): string {
    const classMap: Record<string, string> = {
      awarded: 'tag-awarded',
      concept: 'tag-concept',
      engineering: 'tag-engineering',
      validation: 'tag-validation'
    };
    return classMap[tag] || 'tag-awarded';
  }

  getReadinessBarClass(readiness: number): string {
    if (readiness >= 80) {
      return 'bar-track';
    }
    if (readiness >= 50) {
      return 'bar-risk';
    }
    return 'bar-overdue';
  }

  getChecklistCompletion(project: ProjectDashboardItem): number {
    const activeGateIndex = this.getGateIndex(project.gateTag);
    const gateProgress = project.gateProgress?.[activeGateIndex];
    return Number(gateProgress?.checklistCompletion ?? 0);
  }
}
