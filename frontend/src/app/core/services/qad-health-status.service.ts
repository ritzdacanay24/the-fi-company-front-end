import { Injectable, NgZone } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { HealthService } from "@app/core/api/operations/health/health.service";

export interface QadHealthState {
  isConnected: boolean;
  message: string;
  isChecking: boolean;
  lastUpdatedAt: number | null;
}

@Injectable({
  providedIn: "root",
})
export class QadHealthStatusService {
  private readonly stateSubject = new BehaviorSubject<QadHealthState>({
    isConnected: true,
    message: "",
    isChecking: false,
    lastUpdatedAt: null,
  });

  readonly state$ = this.stateSubject.asObservable();

  private inFlightPromise?: Promise<QadHealthState>;

  constructor(
    private readonly healthService: HealthService,
    private readonly ngZone: NgZone
  ) {}

  start(): void {
    // Polling intentionally disabled. Refresh is triggered by app init/login flow.
  }

  stop(): void {
    // No polling subscriptions to clean up.
  }

  reset(): void {
    this.inFlightPromise = undefined;
    this.setState({
      isConnected: true,
      message: "",
      isChecking: false,
      lastUpdatedAt: null,
    });
  }

  async refresh(force = false): Promise<QadHealthState> {
    if (!force && this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.setState({ isChecking: true });

    const request = (async () => {
      try {
        const status = await this.healthService.getQadConnectionStatus();
        const nextState: QadHealthState = {
          isConnected: !!status?.isConnected,
          message: status?.message || "",
          isChecking: false,
          lastUpdatedAt: Date.now(),
        };
        this.setState(nextState);
        return nextState;
      } catch {
        const nextState: QadHealthState = {
          isConnected: false,
          message:
            "QAD validation is currently unavailable. Item validation will be bypassed.",
          isChecking: false,
          lastUpdatedAt: Date.now(),
        };

        this.setState(nextState);
        return nextState;
      } finally {
        this.inFlightPromise = undefined;
      }
    })();

    this.inFlightPromise = request;
    return request;
  }

  private setState(patch: Partial<QadHealthState>): void {
    const current = this.stateSubject.value;
    const next: QadHealthState = {
      ...current,
      ...patch,
    };

    const isSame =
      current.isConnected === next.isConnected &&
      current.message === next.message &&
      current.isChecking === next.isChecking &&
      current.lastUpdatedAt === next.lastUpdatedAt;

    if (!isSame) {
      this.ngZone.run(() => this.stateSubject.next(next));
    }
  }
}
