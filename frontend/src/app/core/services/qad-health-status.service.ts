import { Injectable, NgZone } from "@angular/core";
import { BehaviorSubject, Subscription, fromEvent, interval } from "rxjs";
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
  private readonly defaultPollMs = 60000;

  private readonly stateSubject = new BehaviorSubject<QadHealthState>({
    isConnected: true,
    message: "",
    isChecking: false,
    lastUpdatedAt: null,
  });

  readonly state$ = this.stateSubject.asObservable();

  private pollSubscription?: Subscription;
  private focusSubscription?: Subscription;
  private onlineSubscription?: Subscription;
  private inFlightPromise?: Promise<QadHealthState>;

  constructor(
    private readonly healthService: HealthService,
    private readonly ngZone: NgZone
  ) {}

  start(pollMs = this.defaultPollMs): void {
    if (this.pollSubscription) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.pollSubscription = interval(pollMs).subscribe(() => {
        void this.refresh(false);
      });

      this.focusSubscription = fromEvent(window, "focus").subscribe(() => {
        void this.refresh(false);
      });

      this.onlineSubscription = fromEvent(window, "online").subscribe(() => {
        void this.refresh(true);
      });
    });
  }

  stop(): void {
    this.pollSubscription?.unsubscribe();
    this.focusSubscription?.unsubscribe();
    this.onlineSubscription?.unsubscribe();
    this.pollSubscription = undefined;
    this.focusSubscription = undefined;
    this.onlineSubscription = undefined;
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
