import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, interval, of } from 'rxjs';
import { catchError, startWith, switchMap, takeUntil } from 'rxjs/operators';

export interface DeployStatusState {
  deploying: boolean;
  message: string;
  retryAfterSeconds: number;
  updatedAt?: string;
}

const DEFAULT_STATE: DeployStatusState = {
  deploying: false,
  message: 'A new version is currently being deployed. Please retry in a moment.',
  retryAfterSeconds: 15,
};

@Injectable({ providedIn: 'root' })
export class DeployStatusService {
  private readonly stateSubject = new BehaviorSubject<DeployStatusState>(DEFAULT_STATE);
  readonly state$ = this.stateSubject.asObservable();

  private readonly stop$ = new Subject<void>();
  private started = false;

  constructor(private readonly http: HttpClient) {}

  get snapshot(): DeployStatusState {
    return this.stateSubject.value;
  }

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    interval(15000)
      .pipe(
        startWith(0),
        takeUntil(this.stop$),
        switchMap(() => this.http.get<Partial<DeployStatusState>>('apiv2/health/deploy-status').pipe(
          catchError(() => of(null)),
        )),
      )
      .subscribe((payload) => {
        if (!payload) {
          return;
        }

        this.stateSubject.next({
          deploying: payload.deploying === true,
          message: String(payload.message || DEFAULT_STATE.message),
          retryAfterSeconds: this.normalizeRetryAfter(payload.retryAfterSeconds),
          updatedAt: payload.updatedAt,
        });
      });
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;
    this.stop$.next();
  }

  reset(): void {
    this.stateSubject.next(DEFAULT_STATE);
  }

  markDeploying(message?: string, retryAfterSeconds?: number): void {
    const current = this.stateSubject.value;
    this.stateSubject.next({
      deploying: true,
      message: String(message || current.message || DEFAULT_STATE.message),
      retryAfterSeconds: this.normalizeRetryAfter(retryAfterSeconds ?? current.retryAfterSeconds),
      updatedAt: new Date().toISOString(),
    });
  }

  private normalizeRetryAfter(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return DEFAULT_STATE.retryAfterSeconds;
    }

    return Math.min(Math.round(parsed), 300);
  }
}
