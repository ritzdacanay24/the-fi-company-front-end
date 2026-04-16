import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { GateProgressItem, ProjectDashboardItem, ProjectManagerProjectsService, ProjectStatus } from './services/project-manager-projects.service';

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
  activeTab: DashboardTab = 'overview';
  private readonly projectManagerBaseRoute = '/project-manager';
  private readonly operationsBaseRoute = '/operations/project-manager';

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
  selectedProjectId = '';
  private routeProjectId = '';

  constructor(
    private projectsService: ProjectManagerProjectsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.routeProjectId = (params.get('projectId') || '').trim();
      this.reloadProjects();
    });
  }

  setTab(tab: DashboardTab): void {
    this.activeTab = tab;
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

    this.projectsService.deleteProject(project.id);
    this.reloadProjects();

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

  private reloadProjects(): void {
    this.projects = this.projectsService.getProjects();

    const routeMatch = this.routeProjectId
      ? this.projects.find(project => project.id === this.routeProjectId)
      : undefined;

    if (routeMatch) {
      this.selectedProjectId = routeMatch.id;
      this.projectsService.setSelectedProjectId(routeMatch.id);
      return;
    }

    this.selectedProjectId = this.projectsService.getSelectedProjectId(this.projects);
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
