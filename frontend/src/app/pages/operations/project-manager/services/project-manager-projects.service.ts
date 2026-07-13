import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, tap } from 'rxjs';
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

export interface VolumeEstimateOption {
  key: 'Low' | 'Medium' | 'High';
  label: string;
}

export interface GateComment {
  id: number;
  projectId: string;
  gateNumber: 1 | 2 | 3 | 4 | 5 | 6;
  commentText: string;
  createdBy: string;
  createdById: number;
  createdAt: string;
}

export interface StakeholderSignoffConfigItem {
  key: string;
  label: string;
  owner: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectManagerProjectsService {
  private readonly projectsCache: ProjectDashboardItem[] = [];
  private selectedProjectIdCache = '';
  private readonly intakeStateCache = new Map<string, IntakeStoragePayload>();
  private readonly gateCommentsCache = new Map<string, GateComment[]>();
  private readonly stakeholderSignoffDefaultsStorageKey = 'pmStakeholderSignoffDefaults';
  private stakeholderSignoffDefaultsCache: StakeholderSignoffConfigItem[] = [
    { key: 'signoff_user_1', label: 'Temenuga Terzieva', owner: 'Temenuga Terzieva' },
    { key: 'signoff_user_2', label: 'Mike Bristol', owner: 'Mike Bristol' },
    { key: 'signoff_user_3', label: 'Nick Walter', owner: 'Nick Walter' },
    { key: 'signoff_user_4', label: 'Juvenal Torres', owner: 'Juvenal Torres' },
  ];

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
      'productionSignoffAt',
      'qcSignoffAt',
      'npiSignoffAt',
      'gmSignoffAt'
    ]
  };

  constructor(private authService: AuthenticationService, private http: HttpClient) {
    const persistedDefaults = this.loadStakeholderSignoffDefaultsFromStorage();
    if (persistedDefaults.length) {
      this.stakeholderSignoffDefaultsCache = persistedDefaults;
    }
  }

  // ─── Observable API (used by components) ───────────────────────────────────

  /** Fetch all projects. In API mode, loads from server and caches in memory. */
  getProjects$(): Observable<ProjectDashboardItem[]> {
    if (!this.isApiMode) {
      return of(this.getProjectsFromCache());
    }

    return this.http.get<any[]>(environment.pmApiUrl).pipe(
      map(rows => rows.map(row => this.apiRowToDashboardItem(row))),
      tap(projects => this.saveProjectsToCache(projects)),
      catchError(err => {
        console.error('[PM] getProjects$ failed, falling back to in-memory cache', err);
        return of(this.getProjectsFromCache());
      })
    );
  }

  /** Upsert a project to API and update in-memory cache. Returns the saved dashboard item. */
  upsertProject$(input: ProjectCreationInput): Observable<ProjectDashboardItem> {
    const project = this.buildDashboardItem(input);

    if (!this.isApiMode) {
      const projects = [project, ...this.getProjectsFromCache().filter(p => p.id !== project.id)];
      this.saveProjectsToCache(projects);
      this.setSelectedProjectId(project.id);
      return of(project);
    }

    return this.http.post<any>(environment.pmApiUrl, {
      id: input.id,
      productName: input.productName,
      customer: input.customer,
      projectCategory: input.projectCategory,
      strategyType: input.strategyType,
      roughRevenuePotential: input.roughRevenuePotential || '',
      estimatedRevenue: input.estimatedRevenue || '',
      initialRfpDate: input.initialRfpDate || null,
      targetProductionDate: input.targetProductionDate || null,
      readinessScore: input.readinessScore,
      readinessStatus: input.readinessStatus,
      activeGate: input.activeGate,
      isDraft: !!input.isDraft,
      owner: this.getCurrentOwnerName(),
      gateCompletion: input.gateCompletion,
      gateCompletedAt: input.gateCompletedAt,
    }).pipe(
      map(row => this.apiRowToDashboardItem(row)),
      tap(saved => {
        const projects = [saved, ...this.getProjectsFromCache().filter(p => p.id !== saved.id)];
        this.saveProjectsToCache(projects);
        this.setSelectedProjectId(saved.id);
      }),
      catchError(err => {
        console.error('[PM] upsertProject$ failed, keeping in-memory state only', err);
        const projects = [project, ...this.getProjectsFromCache().filter(p => p.id !== project.id)];
        this.saveProjectsToCache(projects);
        this.setSelectedProjectId(project.id);
        return of(project);
      })
    );
  }

  /** Delete a project from API and in-memory cache. */
  deleteProject$(projectId: string): Observable<void> {
    if (!projectId) {
      return of(undefined);
    }

    this.removeProjectFromCache(projectId);

    if (!this.isApiMode) {
      return of(undefined);
    }

    return this.http.delete<void>(`${environment.pmApiUrl}/${encodeURIComponent(projectId)}`).pipe(
      catchError(err => {
        console.error('[PM] deleteProject$ failed', err);
        return of(undefined);
      })
    );
  }

  /** Load intake state (form values) for a project. */
  getIntakeState$(projectId: string): Observable<IntakeStoragePayload | null> {
    if (!this.isApiMode) {
      return of(this.loadIntakeState(projectId));
    }

    return this.http.get<any>(`${environment.pmApiUrl}/${encodeURIComponent(projectId)}/intake`).pipe(
      map(raw => {
        if (!raw) return null;
        const payload: IntakeStoragePayload = {
          formValue: raw.formValue || null,
          activeInputSystem: raw.activeInputSystem || 'gate1',
          activeGate: raw.activeGate || 1,
          gateCompletedAt: raw.gateCompletedAt || {},
        };
        this.intakeStateCache.set(projectId, payload);
        return payload;
      }),
      catchError(err => {
        console.error('[PM] getIntakeState$ failed, falling back to in-memory cache', err);
        return of(this.loadIntakeState(projectId));
      })
    );
  }

  /** Persist intake state (form values) for a project. */
  saveIntakeState$(projectId: string, payload: IntakeStoragePayload): Observable<void> {
    if (!projectId) return of(undefined);

    this.intakeStateCache.set(projectId, payload);

    if (!this.isApiMode) {
      return of(undefined);
    }

    return this.http.put<void>(`${environment.pmApiUrl}/${encodeURIComponent(projectId)}/intake`, {
      formValue: payload.formValue || {},
      activeInputSystem: payload.activeInputSystem || 'gate1',
      activeGate: payload.activeGate || 1,
      gateCompletedAt: payload.gateCompletedAt || {},
    }).pipe(
      catchError(err => {
        console.error('[PM] saveIntakeState$ failed (in-memory cache already updated)', err);
        return of(undefined);
      })
    );
  }

  getCustomerOptions$(): Observable<string[]> {
    if (!this.isApiMode) {
      return of([]);
    }

    return this.http.get<string[]>(`${environment.pmApiUrl}/customer-options`).pipe(
      map((items) => Array.isArray(items)
        ? Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)))
        : []
      ),
      catchError((err) => {
        console.error('[PM] getCustomerOptions$ failed', err);
        return of([]);
      })
    );
  }

  saveCustomerOptions$(customers: string[]): Observable<string[]> {
    if (!this.isApiMode) {
      return of(customers);
    }

    return this.http.put<string[]>(`${environment.pmApiUrl}/customer-options`, {
      customers,
    }).pipe(
      map((items) => Array.isArray(items)
        ? Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)))
        : []
      ),
      catchError((err) => {
        console.error('[PM] saveCustomerOptions$ failed', err);
        return of(customers);
      })
    );
  }

  getVolumeEstimateOptions$(): Observable<VolumeEstimateOption[]> {
    if (!this.isApiMode) {
      return of([]);
    }

    return this.http.get<VolumeEstimateOption[]>(`${environment.pmApiUrl}/volume-estimate-options`).pipe(
      map((items) => {
        if (!Array.isArray(items)) {
          return [];
        }

        const normalized = items
          .map((item) => ({
            key: String(item?.key || '').trim() as 'Low' | 'Medium' | 'High',
            label: String(item?.label || '').trim().replace(/\s+/g, ' '),
          }))
          .filter((item) => ['Low', 'Medium', 'High'].includes(item.key) && !!item.label);

        const byKey = new Map(normalized.map(item => [item.key, item]));
        return (['Low', 'Medium', 'High'] as const)
          .filter(key => byKey.has(key))
          .map(key => byKey.get(key) as VolumeEstimateOption);
      }),
      catchError((err) => {
        console.error('[PM] getVolumeEstimateOptions$ failed', err);
        return of([]);
      })
    );
  }

  saveVolumeEstimateOptions$(options: VolumeEstimateOption[]): Observable<VolumeEstimateOption[]> {
    if (!this.isApiMode) {
      return of(options);
    }

    return this.http.put<VolumeEstimateOption[]>(`${environment.pmApiUrl}/volume-estimate-options`, {
      options,
    }).pipe(
      map((items) => {
        if (!Array.isArray(items)) {
          return options;
        }

        const normalized = items
          .map((item) => ({
            key: String(item?.key || '').trim() as 'Low' | 'Medium' | 'High',
            label: String(item?.label || '').trim().replace(/\s+/g, ' '),
          }))
          .filter((item) => ['Low', 'Medium', 'High'].includes(item.key) && !!item.label);

        const byKey = new Map(normalized.map(item => [item.key, item]));
        return (['Low', 'Medium', 'High'] as const)
          .map(key => byKey.get(key))
          .filter((item): item is VolumeEstimateOption => !!item);
      }),
      catchError((err) => {
        console.error('[PM] saveVolumeEstimateOptions$ failed', err);
        return of(options);
      })
    );
  }

  getStakeholderSignoffDefaults$(): Observable<StakeholderSignoffConfigItem[]> {
    const persistedDefaults = this.loadStakeholderSignoffDefaultsFromStorage();
    if (persistedDefaults.length) {
      this.stakeholderSignoffDefaultsCache = persistedDefaults;
    }

    return of(this.stakeholderSignoffDefaultsCache.map((item) => ({ ...item })));
  }

  saveStakeholderSignoffDefaults$(items: StakeholderSignoffConfigItem[]): Observable<StakeholderSignoffConfigItem[]> {
    const normalized = this.normalizeStakeholderSignoffConfig(items);
    if (!normalized.length) {
      return of(this.stakeholderSignoffDefaultsCache.map((item) => ({ ...item })));
    }

    this.stakeholderSignoffDefaultsCache = normalized;
    this.saveStakeholderSignoffDefaultsToStorage(normalized);
    return of(normalized.map((item) => ({ ...item })));
  }

  getGateComments$(projectId: string, gateNumber: 1 | 2 | 3 | 4 | 5 | 6): Observable<GateComment[]> {
    const cacheKey = `${projectId}:${gateNumber}`;
    if (!projectId) {
      return of([]);
    }

    if (!this.isApiMode) {
      return of(this.gateCommentsCache.get(cacheKey) || []);
    }

    return this.http.get<GateComment[]>(`${environment.pmApiUrl}/${encodeURIComponent(projectId)}/gates/${gateNumber}/comments`).pipe(
      map((items) => {
        const normalized = Array.isArray(items)
          ? items.map((item) => ({
            id: Number(item?.id || 0),
            projectId: String(item?.projectId || projectId),
            gateNumber: Number(item?.gateNumber || gateNumber) as 1 | 2 | 3 | 4 | 5 | 6,
            commentText: String(item?.commentText || '').trim(),
            createdBy: String(item?.createdBy || '').trim() || 'Unknown',
            createdById: Number(item?.createdById || 0),
            createdAt: String(item?.createdAt || ''),
          })).filter(item => !!item.commentText)
          : [];

        this.gateCommentsCache.set(cacheKey, normalized);
        return normalized;
      }),
      catchError((err) => {
        console.error('[PM] getGateComments$ failed', err);
        return of(this.gateCommentsCache.get(cacheKey) || []);
      })
    );
  }

  addGateComment$(
    projectId: string,
    gateNumber: 1 | 2 | 3 | 4 | 5 | 6,
    commentText: string,
    createdBy: string
  ): Observable<GateComment | null> {
    const cacheKey = `${projectId}:${gateNumber}`;
    if (!projectId) {
      return of(null);
    }

    const trimmedText = String(commentText || '').trim();
    if (!trimmedText) {
      return of(null);
    }

    if (!this.isApiMode) {
      const newComment: GateComment = {
        id: Date.now(),
        projectId,
        gateNumber,
        commentText: trimmedText,
        createdBy: String(createdBy || '').trim() || 'Unknown',
        createdById: 0,
        createdAt: new Date().toISOString(),
      };
      const existing = this.gateCommentsCache.get(cacheKey) || [];
      this.gateCommentsCache.set(cacheKey, [newComment, ...existing]);
      return of(newComment);
    }

    return this.http.post<GateComment>(`${environment.pmApiUrl}/${encodeURIComponent(projectId)}/gates/${gateNumber}/comments`, {
      commentText: trimmedText,
      createdBy,
    }).pipe(
      map((item) => {
        if (!item) {
          return null;
        }

        const normalized: GateComment = {
          id: Number(item.id || 0),
          projectId: String(item.projectId || projectId),
          gateNumber: Number(item.gateNumber || gateNumber) as 1 | 2 | 3 | 4 | 5 | 6,
          commentText: String(item.commentText || '').trim(),
          createdBy: String(item.createdBy || '').trim() || 'Unknown',
          createdById: Number(item.createdById || 0),
          createdAt: String(item.createdAt || ''),
        };

        const existing = this.gateCommentsCache.get(cacheKey) || [];
        this.gateCommentsCache.set(cacheKey, [normalized, ...existing]);
        return normalized;
      }),
      catchError((err) => {
        console.error('[PM] addGateComment$ failed', err);
        return of(null);
      })
    );
  }

  deleteGateComment$(projectId: string, gateNumber: 1 | 2 | 3 | 4 | 5 | 6, commentId: number): Observable<boolean> {
    const cacheKey = `${projectId}:${gateNumber}`;
    if (!projectId || !commentId) {
      return of(false);
    }

    if (!this.isApiMode) {
      const existing = this.gateCommentsCache.get(cacheKey) || [];
      this.gateCommentsCache.set(cacheKey, existing.filter(item => item.id !== commentId));
      return of(true);
    }

    return this.http.delete<{ success?: boolean }>(
      `${environment.pmApiUrl}/${encodeURIComponent(projectId)}/gates/${gateNumber}/comments/${commentId}`
    ).pipe(
      map((result) => {
        const success = !!result?.success;
        if (success) {
          const existing = this.gateCommentsCache.get(cacheKey) || [];
          this.gateCommentsCache.set(cacheKey, existing.filter(item => item.id !== commentId));
        }
        return success;
      }),
      catchError((err) => {
        console.error('[PM] deleteGateComment$ failed', err);
        return of(false);
      })
    );
  }

  // ─── Synchronous helpers (retained for backward compatibility) ──────────────

  getProjects(): ProjectDashboardItem[] {
    return this.getProjectsFromCache();
  }

  saveProjects(projects: ProjectDashboardItem[]): void {
    this.saveProjectsToCache(projects);
  }

  getSelectedProjectId(projects: ProjectDashboardItem[]): string {
    return this.getSelectedProjectIdFromCache(projects);
  }

  setSelectedProjectId(projectId: string): void {
    this.selectedProjectIdCache = projectId;
  }

  createProject(input: ProjectCreationInput): ProjectDashboardItem {
    const newProject = this.buildDashboardItem(input);
    const projects = [newProject, ...this.getProjectsFromCache().filter(project => project.id !== input.id)];
    this.saveProjectsToCache(projects);
    this.setSelectedProjectId(newProject.id);
    return newProject;
  }

  deleteProject(projectId: string): void {
    if (!projectId) return;
    this.removeProjectFromCache(projectId);
  }

  generateProjectId(): string {
    return `PRJ-${Date.now().toString().slice(-8)}`;
  }

  private get isApiMode(): boolean {
    return environment.projectManagerDataSource === 'api';
  }

  private buildDashboardItem(input: ProjectCreationInput): ProjectDashboardItem {
    const taskCompletionByGate = this.loadTaskCompletionByGate(input.id);
    const activeGateKey = this.mapGateNumberToKey(input.activeGate);
    const gateProgress = this.buildGateProgress(input.gateCompletion, taskCompletionByGate, input.gateCompletedAt, input.initialRfpDate);

    return {
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
      gateProgress,
    };
  }

  private removeProjectFromCache(projectId: string): void {
    const remaining = this.getProjectsFromCache().filter(p => p.id !== projectId);
    this.saveProjectsToCache(remaining);
    const next = remaining[0]?.id || '';
    if (next) {
      this.setSelectedProjectId(next);
    } else {
      this.selectedProjectIdCache = '';
    }
    this.removeScopedProjectState(projectId);
  }

  /**
   * Convert an API row (from UpsertProjectDto response shape) back to a ProjectDashboardItem.
   * The API returns the same shape as UpsertProjectDto with camelCase fields.
   */
  private apiRowToDashboardItem(row: any): ProjectDashboardItem {
    const taskCompletion = this.loadTaskCompletionByGate(row.id);
    const activeGate = (row.activeGate as 1 | 2 | 3 | 4 | 5 | 6) || 1;
    const activeGateKey = this.mapGateNumberToKey(activeGate);
    const gateCompletion = row.gateCompletion || { gate1: 0, gate2: 0, gate3: 0, gate4: 0, gate5: 0, gate6: 0 };
    const gateCompletedAt = row.gateCompletedAt || { gate1: null, gate2: null, gate3: null, gate4: null, gate5: null, gate6: null };
    const gateProgress = this.buildGateProgress(gateCompletion, taskCompletion, gateCompletedAt, row.initialRfpDate || '');

    return {
      id: row.id,
      code: row.id,
      name: row.productName || '',
      customer: row.customer || '',
      category: row.projectCategory || '',
      gateLabel: this.toGateLabel(activeGate),
      gateTag: this.toGateTag(activeGate),
      readiness: row.readinessScore || 0,
      status: row.isDraft ? 'Draft' : this.toStatus(row.readinessStatus || 'Red'),
      owner: row.owner || '',
      revenue: this.normalizeRevenueInput(row.estimatedRevenue) || this.toRevenueByPotential(row.roughRevenuePotential) || '',
      strategy: row.strategyType || '',
      awarded: activeGate >= 3,
      rfpDate: row.initialRfpDate || '',
      targetProd: row.targetProductionDate || '',
      taskCompletion: taskCompletion[activeGateKey],
      executionHealth: Math.min(gateCompletion[activeGateKey], taskCompletion[activeGateKey]),
      hasGateTaskMismatch: gateProgress.some(g => g.mismatch),
      gateProgress,
    };
  }

  private getIntakeStorageKey(projectId: string): string {
    return projectId;
  }

  private loadIntakeState(projectId: string): IntakeStoragePayload | null {
    return this.intakeStateCache.get(projectId) || null;
  }

  private getProjectsFromCache(): ProjectDashboardItem[] {
    return this.projectsCache.map(project => this.syncProjectFromIntake(project));
  }

  private saveProjectsToCache(projects: ProjectDashboardItem[]): void {
    this.projectsCache.splice(0, this.projectsCache.length, ...projects);
    if (!this.selectedProjectIdCache && this.projectsCache.length) {
      this.selectedProjectIdCache = this.projectsCache[0].id;
    }
  }

  private getSelectedProjectIdFromCache(projects: ProjectDashboardItem[]): string {
    if (this.selectedProjectIdCache && projects.some(project => project.id === this.selectedProjectIdCache)) {
      return this.selectedProjectIdCache;
    }
    return projects[0]?.id || '';
  }

  private setSelectedProjectIdInCache(projectId: string): void {
    this.selectedProjectIdCache = projectId;
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

  private normalizeStakeholderSignoffConfig(items: unknown): StakeholderSignoffConfigItem[] {
    if (!Array.isArray(items)) {
      return [];
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
    const unique = new Map<string, StakeholderSignoffConfigItem>();

    items.forEach((rawItem, index) => {
      const row = rawItem as Partial<StakeholderSignoffConfigItem>;
      const key = String(row?.key || '').trim().toLowerCase() || `signoff_user_${index + 1}`;
      const ownerRaw = String(row?.owner || '').trim();
      const owner = canonicalOwnerNames.get(ownerRaw.toLowerCase()) || ownerRaw;
      if (!owner || blockedRoleNames.has(owner.toLowerCase())) {
        return;
      }

      unique.set(key, {
        key,
        label: owner,
        owner,
      });
    });

    return Array.from(unique.values());
  }

  private loadStakeholderSignoffDefaultsFromStorage(): StakeholderSignoffConfigItem[] {
    try {
      const raw = localStorage.getItem(this.stakeholderSignoffDefaultsStorageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return this.normalizeStakeholderSignoffConfig(parsed);
    } catch {
      return [];
    }
  }

  private saveStakeholderSignoffDefaultsToStorage(items: StakeholderSignoffConfigItem[]): void {
    try {
      localStorage.setItem(this.stakeholderSignoffDefaultsStorageKey, JSON.stringify(items));
    } catch {
      // Ignore storage failures; in-memory defaults remain usable.
    }
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

    return base;
  }

  private isGateTaskMismatched(checklistCompletion: number, taskCompletion: number): boolean {
    if ((checklistCompletion >= 100 && taskCompletion < 100) || (taskCompletion >= 100 && checklistCompletion < 100)) {
      return true;
    }

    return Math.abs(checklistCompletion - taskCompletion) >= 25;
  }

  private computeGateCompletion(form: Record<string, any>): Record<GateKey, number> {
    const result = {} as Record<GateKey, number>;

    (Object.keys(this.gateFieldMap) as GateKey[]).forEach((gate) => {
      const fields = this.gateFieldMap[gate];
      const completed = fields.filter((field) => this.isFormFieldComplete(form, field)).length;
      result[gate] = fields.length ? Math.round((completed / fields.length) * 100) : 0;
    });

    return result;
  }

  private isFormFieldComplete(form: Record<string, any>, fieldName: string): boolean {
    if ((fieldName === 'longLeadItemsStartDate' || fieldName === 'longLeadItemsEndDate') && form['longLeadItemsIdentified'] !== true) {
      return true;
    }

    return this.isFieldComplete(form[fieldName]);
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

    const completed = allFields.filter((field) => this.isFormFieldReady(form, field)).length;
    return Math.round((completed / allFields.length) * 100);
  }

  private isFormFieldReady(form: Record<string, any>, fieldName: string): boolean {
    if ((fieldName === 'longLeadItemsStartDate' || fieldName === 'longLeadItemsEndDate') && form['longLeadItemsIdentified'] !== true) {
      return true;
    }

    return this.isFieldReady(form[fieldName]);
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
    this.intakeStateCache.delete(projectId);
  }

}
