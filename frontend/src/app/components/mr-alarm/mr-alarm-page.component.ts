import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, interval, from } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';

@Component({
  standalone: true,
  selector: 'app-mr-alarm-page',
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Start screen — browser requires user gesture before audio can play -->
    <div *ngIf="!monitoring" style="min-height:100vh; background:#f3f4f8; display:flex; align-items:center; justify-content:center; padding:2rem;">
      <div style="width:100%; max-width:560px;">
        <div class="card border-0 shadow-lg" style="border-radius:1.25rem; overflow:hidden;">
          <!-- Red top band -->
          <div style="background:linear-gradient(135deg,#c0392b,#e74c3c); padding:2.5rem 2rem 2rem; text-align:center;">
            <div style="display:inline-flex; align-items:center; justify-content:center; width:80px; height:80px; background:rgba(255,255,255,0.15); border-radius:50%; margin-bottom:1rem;">
              <i class="mdi mdi-alarm-light text-white" style="font-size:2.6rem;"></i>
            </div>
            <h2 class="text-white fw-bold mb-1" style="letter-spacing:-0.02em;">MR Alarm Monitor</h2>
            <p class="mb-0" style="color:rgba(255,255,255,0.8); font-size:0.95rem;">Real-time picking &amp; validation queue alerts</p>
          </div>
          <!-- Body -->
          <div class="card-body px-4 py-4">
            <div class="row text-center g-3 mb-4">
              <div class="col-6">
                <div class="rounded-3 p-3" style="background:#fff5f5; border:1px solid #ffd6d6;">
                  <i class="mdi mdi-package-variant text-danger" style="font-size:1.8rem;"></i>
                  <div class="fw-semibold mt-1" style="font-size:0.85rem; color:#c0392b;">Picking Queue</div>
                  <small class="text-muted">Warehouse picks</small>
                </div>
              </div>
              <div class="col-6">
                <div class="rounded-3 p-3" style="background:#fffbf0; border:1px solid #ffe69c;">
                  <i class="mdi mdi-check-circle text-warning" style="font-size:1.8rem;"></i>
                  <div class="fw-semibold mt-1" style="font-size:0.85rem; color:#856404;">Validation Queue</div>
                  <small class="text-muted">Requests to approve</small>
                </div>
              </div>
            </div>
            <p class="text-muted text-center mb-4" style="font-size:0.9rem; line-height:1.6;">
              Keep this page open on a screen. The alarm will sound and repeat whenever there are pending items — auto-silences when the queue is cleared.
            </p>
            <div class="d-grid">
              <button class="btn btn-danger btn-lg fw-bold py-3" (click)="startMonitoring()" style="border-radius:0.75rem; font-size:1.05rem; letter-spacing:0.02em;">
                <i class="mdi mdi-play-circle me-2" style="font-size:1.2rem;"></i>Start Monitoring
              </button>
            </div>
            <p class="text-center text-muted mt-3 mb-0" style="font-size:0.78rem;">
              <i class="mdi mdi-volume-high me-1"></i>Clicking Start also enables alarm audio in your browser
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main monitoring UI -->
    <div *ngIf="monitoring">

      <!-- Jumbotron Header -->
      <div style="background:linear-gradient(135deg,#c0392b,#e74c3c); padding:2rem 2rem 4rem; color:#fff;">
        <div style="max-width:960px; margin:0 auto;">
          <div class="d-flex align-items-center gap-3 mb-2">
            <div style="width:52px; height:52px; background:rgba(255,255,255,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i class="mdi text-white"
                [class.mdi-alarm-light]="alarmActive"
                [class.mdi-check-circle]="!alarmActive"
                style="font-size:1.7rem;"
                [style.animation]="alarmActive ? 'mr-blink 0.7s step-start infinite' : 'none'"></i>
            </div>
            <div>
              <h2 class="mb-0 fw-bold text-white" style="letter-spacing:-0.02em;">MR Alarm Monitor</h2>
              <small style="color:rgba(255,255,255,0.75);">Live polling every 30s — picking &amp; validation queues</small>
            </div>
            <div class="ms-auto d-flex align-items-center gap-2">
              <span class="badge fs-6 px-3 py-2"
                [style.background]="alarmActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.2)'"
                style="border:1px solid rgba(255,255,255,0.4); color:#fff;">
                <i class="mdi me-1"
                  [class.mdi-alarm-light]="alarmActive"
                  [class.mdi-check-all]="!alarmActive"></i>
                {{ alarmActive ? 'ALARM ACTIVE' : 'ALL CLEAR' }}
              </span>
              <button *ngIf="alarmActive" class="btn btn-light btn-sm fw-semibold" (click)="dismissAlarm()">
                <i class="mdi mdi-volume-off me-1"></i>Silence
              </button>
              <button class="btn btn-outline-light btn-sm" (click)="refresh()" [disabled]="isLoading">
                <i class="mdi mdi-refresh me-1" [class.spin]="isLoading"></i>Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cards pulled up over the jumbotron -->
      <div style="max-width:960px; margin:-2.5rem auto 0; padding:0 1rem;">

        <!-- Summary Cards -->
        <div class="row mb-4">
          <div class="col-md-6">
            <div class="card border-0 shadow h-100"
              [style.borderLeft]="pendingPickingCount > 0 ? '5px solid #dc3545' : '5px solid #dee2e6'">
              <div class="card-body d-flex align-items-center gap-3 py-4">
                <div class="rounded-circle d-flex align-items-center justify-content-center"
                  [class.bg-danger]="pendingPickingCount > 0"
                  [class.bg-success]="pendingPickingCount === 0"
                  style="width:56px; height:56px; flex-shrink:0;">
                  <i class="mdi mdi-package-variant text-white" style="font-size:1.6rem;"></i>
                </div>
                <div>
                  <div class="text-muted" style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.06em;">Pending Picking</div>
                  <div class="fw-bold" style="font-size:2.2rem; line-height:1.1;">{{ pendingPickingCount }}</div>
                  <small class="text-muted">request{{ pendingPickingCount !== 1 ? 's' : '' }} awaiting pick</small>
                </div>
                <div class="ms-auto">
                  <a routerLink="/operations/material-request/picking" class="btn btn-sm"
                    [class.btn-danger]="pendingPickingCount > 0"
                    [class.btn-outline-secondary]="pendingPickingCount === 0">
                    Go to Picking <i class="mdi mdi-arrow-right ms-1"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card border-0 shadow h-100"
              [style.borderLeft]="pendingValidationCount > 0 ? '5px solid #ffc107' : '5px solid #dee2e6'">
              <div class="card-body d-flex align-items-center gap-3 py-4">
                <div class="rounded-circle d-flex align-items-center justify-content-center"
                  [class.bg-warning]="pendingValidationCount > 0"
                  [class.bg-success]="pendingValidationCount === 0"
                  style="width:56px; height:56px; flex-shrink:0;">
                  <i class="mdi mdi-check-circle text-white" style="font-size:1.6rem;"></i>
                </div>
                <div>
                  <div class="text-muted" style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.06em;">Pending Validation</div>
                  <div class="fw-bold" style="font-size:2.2rem; line-height:1.1;">{{ pendingValidationCount }}</div>
                  <small class="text-muted">request{{ pendingValidationCount !== 1 ? 's' : '' }} awaiting validation</small>
                </div>
                <div class="ms-auto">
                  <a routerLink="/operations/material-request/validate-list" class="btn btn-sm"
                    [class.btn-warning]="pendingValidationCount > 0"
                    [class.btn-outline-secondary]="pendingValidationCount === 0">
                    Go to Validation <i class="mdi mdi-arrow-right ms-1"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- All Clear State -->
        <div class="row" *ngIf="!alarmActive && !isLoading">
          <div class="col-12">
            <div class="card border-0 shadow-sm">
              <div class="card-body text-center py-5">
                <i class="mdi mdi-check-circle text-success" style="font-size:4rem;"></i>
                <h4 class="text-success mt-3 mb-2">All Clear!</h4>
                <p class="text-muted mb-0">No pending picking or validation requests. Next poll in ~30s.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Picking Items List -->
        <div class="row" *ngIf="pickingItems.length > 0">
          <div class="col-12">
            <div class="card border-0 shadow-sm mb-3">
              <div class="card-header bg-danger bg-opacity-10 border-0 d-flex align-items-center">
                <i class="mdi mdi-package-variant text-danger me-2 fs-5"></i>
                <strong class="text-danger">Picking Queue ({{ pickingItems.length }})</strong>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-hover mb-0">
                    <thead class="table-light">
                      <tr><th>MR #</th><th>Requestor</th><th>Assembly</th><th>Due Date</th><th>Priority</th><th>Parts</th><th></th></tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let item of pickingItems">
                        <td class="fw-semibold text-primary">#{{ item.id }}</td>
                        <td>{{ item.requestor }}</td>
                        <td>{{ item.assemblyNumber || '—' }}</td>
                        <td>{{ item.dueDate || '—' }}</td>
                        <td>
                          <span class="badge"
                            [class.bg-danger]="item.priority === 'High'"
                            [class.bg-warning]="item.priority === 'Medium'"
                            [class.bg-secondary]="item.priority === 'Low'">{{ item.priority }}</span>
                        </td>
                        <td>{{ item.details?.length || 0 }} line{{ item.details?.length !== 1 ? 's' : '' }}</td>
                        <td><a [routerLink]="['/operations/material-request/picking']" class="btn btn-sm btn-outline-danger">Pick <i class="mdi mdi-arrow-right"></i></a></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Validation Items List -->
        <div class="row" *ngIf="validationItems.length > 0">
          <div class="col-12">
            <div class="card border-0 shadow-sm mb-4">
              <div class="card-header bg-warning bg-opacity-10 border-0 d-flex align-items-center">
                <i class="mdi mdi-check-circle text-warning me-2 fs-5"></i>
                <strong class="text-warning">Validation Queue ({{ validationItems.length }})</strong>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-hover mb-0">
                    <thead class="table-light">
                      <tr><th>MR #</th><th>Requestor</th><th>Assembly</th><th>Due Date</th><th>Priority</th><th></th></tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let item of validationItems">
                        <td class="fw-semibold text-warning">#{{ item.id }}</td>
                        <td>{{ item.requestor }}</td>
                        <td>{{ item.assemblyNumber || '—' }}</td>
                        <td>{{ item.dueDate || '—' }}</td>
                        <td>
                          <span class="badge"
                            [class.bg-danger]="item.priority === 'High'"
                            [class.bg-warning]="item.priority === 'Medium'"
                            [class.bg-secondary]="item.priority === 'Low'">{{ item.priority }}</span>
                        </td>
                        <td><a routerLink="/operations/material-request/validate-list" class="btn btn-sm btn-outline-warning">Validate <i class="mdi mdi-arrow-right"></i></a></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div> <!-- /max-width container -->
    </div> <!-- /monitoring -->

    <style>
      @keyframes mr-blink { 50% { opacity: 0.2; } }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    </style>
  `
})
export class MrAlarmPageComponent implements OnInit, OnDestroy {

  pendingPickingCount = 0;
  pendingValidationCount = 0;
  pickingItems: any[] = [];
  validationItems: any[] = [];
  alarmActive = false;
  isLoading = false;
  monitoring = false;

  private pollSub: Subscription | null = null;
  private alarmAudio: HTMLAudioElement | null = null;
  private dismissed = false;
  private prevPickingCount = -1;
  private prevValidationCount = -1;

  constructor(private mrService: MaterialRequestService) {}

  ngOnInit(): void {
    // Don't auto-start — wait for user click to unlock browser audio
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.stopAlarm();
  }

  startMonitoring(): void {
    // Play + immediately pause a silent audio to unlock the audio context
    const unlock = new Audio('assets/sounds/mixkit-alert-alarm-1005 (1).wav');
    unlock.volume = 0;
    unlock.play().then(() => { unlock.pause(); unlock.src = ''; }).catch(() => {});
    this.monitoring = true;
    this.startPolling();
  }

  refresh(): void {
    this.pollSub?.unsubscribe();
    this.startPolling();
  }

  dismissAlarm(): void {
    this.dismissed = true;
    this.alarmActive = false;
    this.stopAlarm();
  }

  private startPolling(): void {
    this.isLoading = true;
    this.pollSub = interval(30000).pipe(
      startWith(0),
      switchMap(() => from(
        Promise.all([
          this.mrService.getPicking(),
          this.mrService.getValidation()
        ])
      ))
    ).subscribe({
      next: ([picking, validation]: [any, any]) => {
        this.isLoading = false;
        this.pickingItems = (Array.isArray(picking) ? picking : picking?.result) ?? [];
        this.validationItems = (Array.isArray(validation) ? validation : validation?.result) ?? [];

        const pickCount = this.pickingItems.length;
        const valCount = this.validationItems.length;
        const total = pickCount + valCount;
        const prevTotal = Math.max(0, this.prevPickingCount) + Math.max(0, this.prevValidationCount);
        const isFirst = this.prevPickingCount === -1;

        this.pendingPickingCount = pickCount;
        this.pendingValidationCount = valCount;

        if (total === 0) {
          this.stopAlarm();
          this.dismissed = false;
          this.alarmActive = false;
        } else if (isFirst && total > 0) {
          this.triggerAlarm();
        } else if (!isFirst && total > 0) {
          // Re-alarm on every poll as long as items exist,
          // unless already actively ringing (dismissed resets each cycle)
          this.dismissed = false;
          this.triggerAlarm();
        }

        this.prevPickingCount = pickCount;
        this.prevValidationCount = valCount;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private triggerAlarm(): void {
    if (this.dismissed) return;
    this.alarmActive = true;
    if (!this.alarmAudio) {
      this.alarmAudio = new Audio('assets/sounds/mixkit-alert-alarm-1005 (1).wav');
      this.alarmAudio.loop = true;
      this.alarmAudio.play().catch(() => {});
    }
  }

  private stopAlarm(): void {
    if (this.alarmAudio) {
      this.alarmAudio.pause();
      this.alarmAudio.currentTime = 0;
      this.alarmAudio = null;
    }
  }
}
