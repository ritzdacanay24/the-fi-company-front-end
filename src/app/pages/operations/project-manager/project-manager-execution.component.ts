import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ExecutionRole, ProjectWorkflowEngineService } from './services/project-workflow-engine.service';
import { ProjectManagerProjectsService } from './services/project-manager-projects.service';

@Component({
  standalone: true,
  selector: 'app-project-manager-execution',
  imports: [SharedModule, FormsModule],
  templateUrl: './project-manager-execution.component.html',
  styleUrls: ['./project-manager-execution.component.scss']
})
export class ProjectManagerExecutionComponent implements OnInit {
  executionRole: ExecutionRole = 'Project Manager';

  // Placeholder input readiness toggles until backend-linked project context is wired.
  stepReadiness: Record<number, boolean> = {
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
    8: true,
    9: true
  };

  constructor(
    public workflow: ProjectWorkflowEngineService,
    private projectsService: ProjectManagerProjectsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const projectId = (params.get('projectId') || '').trim();
      if (!projectId) {
        return;
      }

      const projects = this.projectsService.getProjects();
      if (projects.some(project => project.id === projectId)) {
        this.projectsService.setSelectedProjectId(projectId);
      }
    });
  }

  canExecuteStep(step: number): boolean {
    return this.workflow.canExecuteStep(step, this.executionRole, !!this.stepReadiness[step]);
  }

  executeStep(step: number): void {
    this.workflow.executeStep(step, this.executionRole, !!this.stepReadiness[step]);
  }

  getStepOwner(step: number): string {
    return this.workflow.getStepOwner(step);
  }

  isStepOwnedByRole(step: number): boolean {
    return this.workflow.isStepOwnedByRole(step, this.executionRole);
  }

  get activeProjectLabel(): string {
    const projects = this.projectsService.getProjects();
    const selectedId = this.projectsService.getSelectedProjectId(projects);
    const selected = projects.find(project => project.id === selectedId);
    if (!selected) {
      return 'No project selected';
    }

    return `${selected.code} - ${selected.name}`;
  }

  get activeProjectId(): string {
    const projects = this.projectsService.getProjects();
    return this.projectsService.getSelectedProjectId(projects) || 'No project selected';
  }
}
