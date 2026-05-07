import { Injectable } from '@angular/core';
import { ProjectManagerProjectsService } from './project-manager-projects.service';

export type ExecutionRole = 'Project Manager' | 'Engineering' | 'Supply Chain' | 'Quality (Doc Control)' | 'CSM';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

@Injectable({ providedIn: 'root' })
export class ProjectWorkflowEngineService {
  private activeProjectId = '';

  workflowState: Record<number, boolean> = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
    8: false,
    9: false
  };

  workflowMessage = 'Workflow is ready. Start with Step 1.';
  approvalStatus: ApprovalStatus = 'pending';
  ecoTriggered = false;
  ecoTriggerSource: 'project-init' | 'document-change' | null = null;
  ecoTriggeredAt: string | null = null;
  executionHistory: Array<{ step: number; role: string; timestamp: string; note: string }> = [];

  private stepOwnerMap: Record<number, ExecutionRole> = {
    1: 'Project Manager',
    2: 'Project Manager',
    3: 'Engineering',
    4: 'Engineering',
    5: 'Supply Chain',
    6: 'Quality (Doc Control)',
    7: 'Engineering',
    8: 'CSM',
    9: 'Project Manager'
  };

  constructor(private projectsService: ProjectManagerProjectsService) {
    this.ensureProjectContext();
  }

  reset(): void {
    this.ensureProjectContext();
    this.workflowState = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false };
    this.workflowMessage = 'Workflow is ready. Start with Step 1.';
    this.approvalStatus = 'pending';
    this.ecoTriggered = false;
    this.ecoTriggerSource = null;
    this.ecoTriggeredAt = null;
    this.executionHistory = [];
    this.saveToStorage();
  }

  getStepOwner(step: number): ExecutionRole {
    return this.stepOwnerMap[step] || 'Project Manager';
  }

  isStepOwnedByRole(step: number, role: ExecutionRole): boolean {
    return role === this.getStepOwner(step);
  }

  canExecuteStep(step: number, role: ExecutionRole, dataReady: boolean): boolean {
    this.ensureProjectContext();
    if (!this.isStepOwnedByRole(step, role)) {
      return false;
    }

    const prerequisiteComplete = step === 1 ? true : !!this.workflowState[step - 1];
    if (!prerequisiteComplete) {
      return false;
    }

    if (!dataReady) {
      return false;
    }

    if (step === 9) {
      return this.approvalStatus === 'approved';
    }

    return true;
  }

  executeStep(step: number, role: ExecutionRole, dataReady: boolean): void {
    this.ensureProjectContext();
    if (!this.canExecuteStep(step, role, dataReady)) {
      const owner = this.getStepOwner(step);
      if (!this.isStepOwnedByRole(step, role)) {
        this.workflowMessage = `Step ${step} is assigned to ${owner}. Switch role to execute.`;
      } else {
        this.workflowMessage = `Step ${step} is blocked. Complete prerequisite data or prior steps first.`;
      }
      return;
    }

    this.workflowState[step] = true;

    if (step === 2) {
      this.triggerEco('project-init');
    }

    if (step === 6) {
      this.triggerEco('document-change');
    }

    if (step === 7) {
      this.approvalStatus = 'approved';
    }

    if (step === 9) {
      this.workflowMessage = 'Execution workflow completed. Project tracking is now active.';
      this.executionHistory.push({
        step,
        role,
        timestamp: new Date().toISOString(),
        note: 'Workflow completed and tracking published.'
      });
      this.saveToStorage();
      return;
    }

    this.executionHistory.push({
      step,
      role,
      timestamp: new Date().toISOString(),
      note: `Step ${step} executed successfully.`
    });

    this.workflowMessage = `Step ${step} completed. Continue to Step ${step + 1}.`;
    this.saveToStorage();
  }

  setApprovalStatus(status: ApprovalStatus): void {
    this.ensureProjectContext();
    this.approvalStatus = status;
    this.saveToStorage();
  }

  get workflowProgress(): number {
    this.ensureProjectContext();
    const completed = Object.values(this.workflowState).filter(Boolean).length;
    return Math.round((completed / 9) * 100);
  }

  get workflowStatusClass(): string {
    this.ensureProjectContext();
    if (this.workflowProgress >= 100) return 'bg-success';
    if (this.workflowProgress >= 50) return 'bg-warning text-dark';
    return 'bg-secondary';
  }

  private ensureProjectContext(): void {
    const projects = this.projectsService.getProjects();
    const selectedId = this.projectsService.getSelectedProjectId(projects) || '__default__';
    if (selectedId === this.activeProjectId) {
      return;
    }

    this.activeProjectId = selectedId;

    // Reset in-memory state before loading selected project payload.
    this.workflowState = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false };
    this.workflowMessage = 'Workflow is ready. Start with Step 1.';
    this.approvalStatus = 'pending';
    this.ecoTriggered = false;
    this.ecoTriggerSource = null;
    this.ecoTriggeredAt = null;
    this.executionHistory = [];

    // PM workflow persistence is API-backed; keep in-memory state until API wiring is completed.
  }

  private triggerEco(source: 'project-init' | 'document-change'): void {
    this.ecoTriggered = true;
    this.ecoTriggerSource = source;
    this.ecoTriggeredAt = new Date().toISOString();
  }

  private saveToStorage(): void {
    // No-op until workflow API persistence is implemented.
  }

  private loadFromStorage(): void {
    // No-op until workflow API persistence is implemented.
  }
}
