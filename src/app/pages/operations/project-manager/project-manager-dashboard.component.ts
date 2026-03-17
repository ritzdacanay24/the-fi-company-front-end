import { Component } from '@angular/core';
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
export class ProjectManagerDashboardComponent {
  activeTab: DashboardTab = 'overview';

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

  constructor(private projectsService: ProjectManagerProjectsService) {
    this.reloadProjects();
  }

  setTab(tab: DashboardTab): void {
    this.activeTab = tab;
  }

  selectProject(projectId: string): void {
    this.selectedProjectId = projectId;
    this.projectsService.setSelectedProjectId(projectId);
  }

  get totalProjects(): number {
    return this.projects.length;
  }

  get onTrackCount(): number {
    return this.projects.filter(project => project.status === 'On Track').length;
  }

  get atRiskOrOverdueCount(): number {
    return this.projects.filter(project => project.status !== 'On Track').length;
  }

  get avgReadiness(): number {
    if (!this.projects.length) {
      return 0;
    }
    const total = this.projects.reduce((sum, project) => sum + project.readiness, 0);
    return Math.round(total / this.projects.length);
  }

  get selectedProject(): ProjectDashboardItem {
    return this.projects.find(project => project.id === this.selectedProjectId) || this.projects[0];
  }

  private reloadProjects(): void {
    this.projects = this.projectsService.getProjects();
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
}
