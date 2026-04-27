import { Injectable } from "@angular/core";
import { Subscription } from "rxjs";
import {
  MrAlertPreferences,
  MrAlertPreferencesService,
} from "@app/core/api/operations/material-request/mr-alert-preferences.service";
import {
  MaterialPickingMessageType,
  MaterialRequestPickingWebsocketService,
} from "@app/core/services/material-request-picking-websocket.service";
import { TokenStorageService } from "@app/core/services/token-storage.service";

const MR_TOPBAR_ALERT_CHANNEL = "mr-topbar-alert-channel-v1";
const MR_TOPBAR_LEADER_LOCK_KEY = "mr-topbar-alert-leader-lock-v1";
const MR_TOPBAR_LEADER_HEARTBEAT_MS = 5000;
const MR_TOPBAR_LEADER_STALE_MS = 15000;

interface MrTopbarLeaderLock {
  tabId: string;
  timestamp: number;
}

interface MrAlertMirrorState {
  pendingPickingCount: number;
  pendingValidationCount: number;
  recentItems: any[];
  isLoading: boolean;
  alarmActive: boolean;
}

interface MrAlertSnapshotPayload {
  pendingPickingCount?: number;
  pendingValidationCount?: number;
  recentItems?: any[];
}

type MrAlertChannelMessage =
  | { type: "state"; payload: MrAlertMirrorState }
  | { type: "dismiss" }
  | { type: "refresh" };

@Injectable({
  providedIn: "root",
})
export class MrAlertTopbarFacadeService {
  mrMonitorEnabled = false;
  mrPendingPickingCount = 0;
  mrPendingValidationCount = 0;
  mrRecentItems: any[] = [];
  mrAlarmActive = false;
  mrLoading = false;

  mrAlertEnabled = true;
  mrSoundEnabled = true;
  mrRepeatSeconds = 30;
  mrQueueFilter: "both" | "picking" | "validation" = "both";
  mrQuietHoursStart: string | null = null;
  mrQuietHoursEnd: string | null = null;

  isMrLeaderTab = false;

  private readonly mrTabId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  private mrWsSubscriptions: Subscription[] = [];
  private mrCoordinationTimer: number | null = null;
  private mrStatusTimer: number | null = null;
  private mrChannel: BroadcastChannel | null = null;
  private mrAudio: HTMLAudioElement | null = null;
  private mrDismissedUntil = 0;
  private mrDismissedDurationMs = 0;
  private mrLastAlarmAt = 0;
  private mrLastSyncAt = 0;
  private mrStatusNow = Date.now();
  private mrAudioUnlocked = false;
  private mrAudioBlocked = false;
  private readonly unlockMrAudioHandler = () => this.unlockMrAudioOnce();
  private initialized = false;
  private userData: any;

  constructor(
    private readonly mrAlertPreferencesService: MrAlertPreferencesService,
    private readonly materialRequestPickingWebsocketService: MaterialRequestPickingWebsocketService,
    private readonly tokenStorageService: TokenStorageService,
  ) {}

  get mrTotalPendingCount(): number {
    return this.mrPendingPickingCount + this.mrPendingValidationCount;
  }

  get mrSuppressionRemainingMs(): number {
    return Math.max(0, this.mrDismissedUntil - this.mrStatusNow);
  }

  get isMrSuppressed(): boolean {
    return this.mrSuppressionRemainingMs > 0;
  }

  get mrSuppressionLabel(): string {
    if (!this.isMrSuppressed) {
      return "";
    }

    const totalSeconds = Math.ceil(this.mrSuppressionRemainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const mode = this.mrDismissedDurationMs >= 60 * 60 * 1000 ? "Muted" : "Snoozed";

    if (hours > 0) {
      return `${mode} ${hours}h ${minutes}m left`;
    }

    if (minutes > 0) {
      return `${mode} ${minutes}m ${seconds}s left`;
    }

    return `${mode} ${seconds}s left`;
  }

  init(): void {
    if (this.initialized) {
      return;
    }

    this.userData = this.tokenStorageService.getUser();
    this.startMrStatusTimer();
    this.setupMrAudioUnlock();
    void this.loadMrAlertPreferences();
    this.startMrAlertCoordination();
    this.initialized = true;
  }

  destroy(): void {
    if (!this.initialized) {
      return;
    }

  this.stopMrStatusTimer();
    this.teardownMrAudioUnlock();
    this.stopMrAlertCoordination();
    this.initialized = false;
  }

  onWindowFocus(): void {
    this.maybeResyncMrAlerts();
  }

  onVisibilityVisible(): void {
    this.maybeResyncMrAlerts();
  }

  refreshMrAlerts(): void {
    if (this.isMrLeaderTab) {
      this.requestMrAlertSnapshot();
      return;
    }

    this.mrChannel?.postMessage({ type: "refresh" } as MrAlertChannelMessage);
  }

  dismissMrAlarm(minutes = 5): void {
    this.mrAlarmActive = false;
    this.stopMrAlarmSound();
    this.mrDismissedDurationMs = minutes * 60 * 1000;
    this.mrDismissedUntil = Date.now() + minutes * 60 * 1000;

    if (this.isMrLeaderTab) {
      this.broadcastMrAlertState();
    }

    this.mrChannel?.postMessage({ type: "dismiss" } as MrAlertChannelMessage);
  }

  clearMrSuppression(): void {
    this.mrDismissedUntil = 0;
    this.mrDismissedDurationMs = 0;

    if (this.isMrLeaderTab) {
      this.tryPlayMrAlarmIfNeeded();
      this.broadcastMrAlertState();
    }

    this.mrChannel?.postMessage({ type: "refresh" } as MrAlertChannelMessage);
  }

  toggleMrAlertEnabled(): void {
    this.mrAlertEnabled = !this.mrAlertEnabled;
    if (!this.mrAlertEnabled) {
      this.dismissMrAlarm(60);
    } else {
      this.mrDismissedDurationMs = 0;
      this.mrDismissedUntil = 0;
      this.tryPlayMrAlarmIfNeeded();
      this.broadcastMrAlertState();
    }
    void this.saveMrAlertPreferences();
  }

  toggleMrMonitorEnabled(): void {
    this.setMrMonitorEnabled(!this.mrMonitorEnabled);
  }

  setMrMonitorEnabled(enabled: boolean): void {
    const next = !!enabled;
    if (this.mrMonitorEnabled === next) {
      return;
    }

    this.mrMonitorEnabled = next;

    if (!this.mrMonitorEnabled) {
      this.mrPendingPickingCount = 0;
      this.mrPendingValidationCount = 0;
      this.mrRecentItems = [];
      this.mrLoading = false;
      this.mrAlarmActive = false;
      this.stopMrAlarmSound();
      this.stopMrRealtime();
      this.broadcastMrAlertState();
    } else if (this.isMrLeaderTab) {
      this.startMrRealtime();
      this.broadcastMrAlertState();
    }

    void this.saveMrAlertPreferences();
  }

  toggleMrSoundEnabled(): void {
    this.mrSoundEnabled = !this.mrSoundEnabled;
    this.unlockMrAudio();
    if (!this.mrSoundEnabled) {
      this.stopMrAlarmSound();
      this.mrAlarmActive = false;
      this.mrAudioBlocked = false;
    } else {
      this.mrDismissedDurationMs = 0;
      this.mrDismissedUntil = 0;
      this.tryPlayMrAlarmIfNeeded();
      this.broadcastMrAlertState();
    }
    void this.saveMrAlertPreferences();
  }

  setMrRepeatSeconds(seconds: number): void {
    this.mrRepeatSeconds = seconds;
    void this.saveMrAlertPreferences();
  }

  setMrQueueFilter(filter: "both" | "picking" | "validation"): void {
    this.mrQueueFilter = filter;
    void this.saveMrAlertPreferences();
    if (this.isMrLeaderTab) {
      this.requestMrAlertSnapshot();
    }
  }

  unlockMrAudio(): void {
    const unlock = new Audio("assets/sounds/mixkit-alert-alarm-1005 (1).wav");
    unlock.volume = 0;
    unlock.play().then(() => {
      unlock.pause();
      unlock.src = "";
      this.mrAudioUnlocked = true;
      this.mrAudioBlocked = false;
      this.tryPlayMrAlarmIfNeeded();
    }).catch(() => {});
  }

  private setupMrAudioUnlock(): void {
    window.addEventListener("pointerdown", this.unlockMrAudioHandler, { passive: true });
    window.addEventListener("keydown", this.unlockMrAudioHandler, { passive: true });
  }

  private startMrStatusTimer(): void {
    this.mrStatusNow = Date.now();
    if (this.mrStatusTimer != null) {
      return;
    }

    this.mrStatusTimer = window.setInterval(() => {
      this.mrStatusNow = Date.now();
      if (this.mrDismissedUntil > 0 && this.mrStatusNow >= this.mrDismissedUntil) {
        this.mrDismissedUntil = 0;
        this.mrDismissedDurationMs = 0;
      }
    }, 1000);
  }

  private stopMrStatusTimer(): void {
    if (this.mrStatusTimer != null) {
      window.clearInterval(this.mrStatusTimer);
      this.mrStatusTimer = null;
    }
  }

  private teardownMrAudioUnlock(): void {
    window.removeEventListener("pointerdown", this.unlockMrAudioHandler);
    window.removeEventListener("keydown", this.unlockMrAudioHandler);
  }

  private unlockMrAudioOnce(): void {
    if (this.mrAudioUnlocked) {
      return;
    }

    this.unlockMrAudio();
  }

  private getMrPreferenceKey(): string {
    const userId = this.userData?.id || "anon";
    return `mr-alert-pref-${userId}`;
  }

  private applyMrPreferences(pref: Partial<MrAlertPreferences>): void {
    this.mrMonitorEnabled = pref.monitorEnabled ?? this.mrMonitorEnabled;
    this.mrAlertEnabled = pref.enabled ?? this.mrAlertEnabled;
    this.mrSoundEnabled = pref.soundEnabled ?? this.mrSoundEnabled;
    this.mrRepeatSeconds = [30, 60, 120, 300].includes(Number(pref.repeatSeconds))
      ? Number(pref.repeatSeconds)
      : this.mrRepeatSeconds;
    this.mrQueueFilter = ["both", "picking", "validation"].includes(String(pref.queues))
      ? (pref.queues as "both" | "picking" | "validation")
      : this.mrQueueFilter;
    this.mrQuietHoursStart = pref.quietHoursStart ?? this.mrQuietHoursStart;
    this.mrQuietHoursEnd = pref.quietHoursEnd ?? this.mrQuietHoursEnd;
  }

  private async loadMrAlertPreferences(): Promise<void> {
    const raw = localStorage.getItem(this.getMrPreferenceKey());
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.applyMrPreferences({
          monitorEnabled: parsed?.monitorEnabled,
          enabled: parsed?.enabled,
          soundEnabled: parsed?.soundEnabled,
          repeatSeconds: parsed?.repeatSeconds,
          queues: parsed?.queueFilter,
          quietHoursStart: parsed?.quietHoursStart,
          quietHoursEnd: parsed?.quietHoursEnd,
        });
      } catch {
        // Ignore malformed local payload.
      }
    }

    try {
      const pref = await this.mrAlertPreferencesService.getMine();
      this.applyMrPreferences(pref);
      this.syncMrMonitoringState();
      localStorage.setItem(
        this.getMrPreferenceKey(),
        JSON.stringify({
          monitorEnabled: this.mrMonitorEnabled,
          enabled: this.mrAlertEnabled,
          soundEnabled: this.mrSoundEnabled,
          repeatSeconds: this.mrRepeatSeconds,
          queueFilter: this.mrQueueFilter,
          quietHoursStart: this.mrQuietHoursStart,
          quietHoursEnd: this.mrQuietHoursEnd,
        }),
      );
    } catch {
      // If API is unavailable, keep local fallback.
    }
  }

  private async saveMrAlertPreferences(): Promise<void> {
    localStorage.setItem(
      this.getMrPreferenceKey(),
      JSON.stringify({
        monitorEnabled: this.mrMonitorEnabled,
        enabled: this.mrAlertEnabled,
        soundEnabled: this.mrSoundEnabled,
        repeatSeconds: this.mrRepeatSeconds,
        queueFilter: this.mrQueueFilter,
        quietHoursStart: this.mrQuietHoursStart,
        quietHoursEnd: this.mrQuietHoursEnd,
      }),
    );

    try {
      const updated = await this.mrAlertPreferencesService.updateMine({
        monitorEnabled: this.mrMonitorEnabled,
        enabled: this.mrAlertEnabled,
        soundEnabled: this.mrSoundEnabled,
        repeatSeconds: this.mrRepeatSeconds,
        queues: this.mrQueueFilter,
        quietHoursStart: this.mrQuietHoursStart,
        quietHoursEnd: this.mrQuietHoursEnd,
      });
      this.applyMrPreferences(updated);
      this.syncMrMonitoringState();
    } catch {
      // Keep local state on save error.
    }
  }

  private syncMrMonitoringState(): void {
    if (!this.mrMonitorEnabled) {
      this.mrPendingPickingCount = 0;
      this.mrPendingValidationCount = 0;
      this.mrRecentItems = [];
      this.mrLoading = false;
      this.mrAlarmActive = false;
      this.stopMrAlarmSound();
      this.stopMrRealtime();
      this.broadcastMrAlertState();
      return;
    }

    if (this.isMrLeaderTab) {
      this.startMrRealtime();
      this.requestMrAlertSnapshot();
    }
  }

  private isWithinQuietHours(now: Date): boolean {
    if (!this.mrQuietHoursStart || !this.mrQuietHoursEnd) {
      return false;
    }

    const parseMinutes = (value: string): number | null => {
      const match = /^(\d{2}):(\d{2})$/.exec(value);
      if (!match) {
        return null;
      }
      const h = Number(match[1]);
      const m = Number(match[2]);
      if (!Number.isInteger(h) || !Number.isInteger(m)) {
        return null;
      }
      return h * 60 + m;
    };

    const start = parseMinutes(this.mrQuietHoursStart);
    const end = parseMinutes(this.mrQuietHoursEnd);
    if (start == null || end == null) {
      return false;
    }

    const current = now.getHours() * 60 + now.getMinutes();
    if (start <= end) {
      return current >= start && current < end;
    }

    return current >= start || current < end;
  }

  private startMrAlertCoordination(): void {
    this.mrChannel = typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(MR_TOPBAR_ALERT_CHANNEL)
      : null;

    if (this.mrChannel) {
      this.mrChannel.onmessage = (event: MessageEvent<MrAlertChannelMessage>) => {
        const message = event.data;
        if (!message || typeof message !== "object") {
          return;
        }

        if (message.type === "state" && !this.isMrLeaderTab) {
          if (!this.mrMonitorEnabled) {
            return;
          }

          const payload = message.payload;
          this.mrPendingPickingCount = payload.pendingPickingCount;
          this.mrPendingValidationCount = payload.pendingValidationCount;
          this.mrRecentItems = Array.isArray(payload.recentItems) ? payload.recentItems : [];
          this.mrLoading = !!payload.isLoading;
          this.mrAlarmActive = !!payload.alarmActive;
          this.stopMrAlarmSound();
        }

        if (message.type === "dismiss" && this.isMrLeaderTab) {
          this.mrAlarmActive = false;
          this.stopMrAlarmSound();
          this.mrDismissedUntil = Date.now() + 5 * 60 * 1000;
          this.broadcastMrAlertState();
        }

        if (message.type === "refresh" && this.isMrLeaderTab) {
          this.requestMrAlertSnapshot();
        }
      };
    }

    this.tryBecomeMrLeader();
    this.mrCoordinationTimer = window.setInterval(
      () => this.tryBecomeMrLeader(),
      MR_TOPBAR_LEADER_HEARTBEAT_MS
    );
  }

  private stopMrAlertCoordination(): void {
    if (this.mrCoordinationTimer != null) {
      window.clearInterval(this.mrCoordinationTimer);
      this.mrCoordinationTimer = null;
    }

    if (this.isMrLeaderTab) {
      this.releaseMrLeaderLock();
    }

    this.stopMrRealtime();
    this.stopMrAlarmSound();
    this.mrChannel?.close();
    this.mrChannel = null;
    this.isMrLeaderTab = false;
  }

  private maybeResyncMrAlerts(): void {
    if (!this.isMrLeaderTab && document.hasFocus()) {
      this.forceBecomeMrLeader();
      return;
    }

    if (!this.isMrLeaderTab || this.mrLoading) {
      return;
    }

    const now = Date.now();
    if (now - this.mrLastSyncAt < 15000) {
      return;
    }

    this.requestMrAlertSnapshot();
  }

  private forceBecomeMrLeader(): void {
    const now = Date.now();
    localStorage.setItem(
      MR_TOPBAR_LEADER_LOCK_KEY,
      JSON.stringify({ tabId: this.mrTabId, timestamp: now })
    );

    if (!this.isMrLeaderTab) {
      this.isMrLeaderTab = true;
      this.startMrRealtime();
      return;
    }

    this.requestMrAlertSnapshot();
  }

  private tryBecomeMrLeader(): void {
    const now = Date.now();
    const raw = localStorage.getItem(MR_TOPBAR_LEADER_LOCK_KEY);
    let currentLock: MrTopbarLeaderLock | null = null;

    if (raw) {
      try {
        currentLock = JSON.parse(raw) as MrTopbarLeaderLock;
      } catch {
        currentLock = null;
      }
    }

    const isStale = !currentLock || now - Number(currentLock.timestamp || 0) > MR_TOPBAR_LEADER_STALE_MS;
    const isMine = currentLock?.tabId === this.mrTabId;

    if (isStale || isMine) {
      localStorage.setItem(MR_TOPBAR_LEADER_LOCK_KEY, JSON.stringify({ tabId: this.mrTabId, timestamp: now }));
      if (!this.isMrLeaderTab) {
        this.isMrLeaderTab = true;
        this.startMrRealtime();
      }
      return;
    }

    if (this.isMrLeaderTab) {
      this.isMrLeaderTab = false;
      this.stopMrRealtime();
      this.stopMrAlarmSound();
      this.mrAlarmActive = false;
      this.mrLoading = false;
    }
  }

  private startMrRealtime(): void {
    if (!this.mrMonitorEnabled || this.mrWsSubscriptions.length > 0) {
      return;
    }

    this.materialRequestPickingWebsocketService.init();
    this.mrWsSubscriptions = [
      this.materialRequestPickingWebsocketService
        .subscribe<MrAlertSnapshotPayload>(MaterialPickingMessageType.MR_ALERT_SNAPSHOT)
        .subscribe((socketMessage) => {
          this.applyMrAlertSnapshot(socketMessage?.data);
        }),
    ];

    this.requestMrAlertSnapshot();
  }

  private stopMrRealtime(): void {
    if (this.mrWsSubscriptions.length === 0) {
      return;
    }

    this.mrWsSubscriptions.forEach((s) => s.unsubscribe());
    this.mrWsSubscriptions = [];
    this.materialRequestPickingWebsocketService.destroy();
  }

  private requestMrAlertSnapshot(): void {
    if (!this.isMrLeaderTab || !this.mrMonitorEnabled) {
      return;
    }

    this.mrLastSyncAt = Date.now();
    this.materialRequestPickingWebsocketService.publish<void>(
      MaterialPickingMessageType.MR_ALERT_REQUEST_SNAPSHOT,
      undefined,
      'requesting-mr-alert-snapshot'
    );
  }

  private applyMrAlertSnapshot(payload?: MrAlertSnapshotPayload): void {
    if (!payload) {
      return;
    }

    const prevTotal = this.mrTotalPendingCount;

    this.mrPendingPickingCount = Number(payload.pendingPickingCount || 0);
    this.mrPendingValidationCount = Number(payload.pendingValidationCount || 0);
    this.mrRecentItems = Array.isArray(payload.recentItems) ? payload.recentItems : [];

    const effectiveTotal =
      this.mrQueueFilter === "picking"
        ? this.mrPendingPickingCount
        : this.mrQueueFilter === "validation"
          ? this.mrPendingValidationCount
          : this.mrTotalPendingCount;

    this.evaluateMrAlarm(prevTotal, effectiveTotal);
    this.broadcastMrAlertState();
  }

  private evaluateMrAlarm(previousTotal: number, effectiveTotal: number): void {
    if (!this.mrAlertEnabled || effectiveTotal <= 0) {
      this.mrAlarmActive = false;
      this.stopMrAlarmSound();
      return;
    }

    if (!this.mrSoundEnabled) {
      this.mrAlarmActive = true;
      this.stopMrAlarmSound();
      return;
    }

    const now = Date.now();
    if (this.isWithinQuietHours(new Date(now))) {
      this.mrAlarmActive = false;
      this.stopMrAlarmSound();
      return;
    }

    if (now < this.mrDismissedUntil) {
      this.mrAlarmActive = false;
      this.stopMrAlarmSound();
      return;
    }

    const isNewWork = previousTotal === 0 && effectiveTotal > 0;
    const repeatElapsed = now - this.mrLastAlarmAt >= this.mrRepeatSeconds * 1000;
    this.mrAlarmActive = true;

    if (isNewWork || repeatElapsed || !this.mrAudio) {
      this.playMrAlarmSound();
      this.mrLastAlarmAt = now;
      return;
    }
  }

  private getMrEffectivePendingCount(): number {
    if (this.mrQueueFilter === "picking") {
      return this.mrPendingPickingCount;
    }
    if (this.mrQueueFilter === "validation") {
      return this.mrPendingValidationCount;
    }
    return this.mrTotalPendingCount;
  }

  private tryPlayMrAlarmIfNeeded(): void {
    if (!this.isMrLeaderTab) {
      return;
    }

    const now = Date.now();
    if (!this.mrAlertEnabled || !this.mrSoundEnabled || this.getMrEffectivePendingCount() <= 0) {
      return;
    }

    if (this.isWithinQuietHours(new Date(now)) || now < this.mrDismissedUntil) {
      return;
    }

    if (this.mrAudioBlocked && !this.mrAudioUnlocked) {
      return;
    }

    if (!this.mrAudio) {
      this.playMrAlarmSound();
      this.mrLastAlarmAt = now;
      this.mrAlarmActive = true;
      this.broadcastMrAlertState();
    }
  }

  private playMrAlarmSound(): void {
    if (this.mrAudio) {
      return;
    }

    this.mrAudio = new Audio("assets/sounds/mixkit-alert-alarm-1005 (1).wav");
    this.mrAudio.loop = true;
    this.mrAudio.play().catch(() => {
      this.mrAudioBlocked = true;
      this.stopMrAlarmSound();
    });
  }

  private stopMrAlarmSound(): void {
    if (!this.mrAudio) {
      return;
    }

    this.mrAudio.pause();
    this.mrAudio.currentTime = 0;
    this.mrAudio = null;
  }

  private broadcastMrAlertState(): void {
    if (!this.mrChannel || !this.isMrLeaderTab) {
      return;
    }

    this.mrChannel.postMessage({
      type: "state",
      payload: {
        pendingPickingCount: this.mrPendingPickingCount,
        pendingValidationCount: this.mrPendingValidationCount,
        recentItems: this.mrRecentItems,
        isLoading: this.mrLoading,
        alarmActive: this.mrAlarmActive,
      },
    } as MrAlertChannelMessage);
  }

  private releaseMrLeaderLock(): void {
    const raw = localStorage.getItem(MR_TOPBAR_LEADER_LOCK_KEY);
    if (!raw) {
      return;
    }

    try {
      const lock = JSON.parse(raw) as MrTopbarLeaderLock;
      if (lock?.tabId === this.mrTabId) {
        localStorage.removeItem(MR_TOPBAR_LEADER_LOCK_KEY);
      }
    } catch {
      localStorage.removeItem(MR_TOPBAR_LEADER_LOCK_KEY);
    }
  }
}
