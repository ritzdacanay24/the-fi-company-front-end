import { Injectable, signal } from '@angular/core';
import { TicketImpactLevel, TicketPriority, TicketType, TicketUrgencyLevel } from '@app/shared/interfaces/ticket.interface';

export interface SupportTicketDraft {
  readonly type: TicketType;
  readonly title: string;
  readonly description: string;
  readonly priority: TicketPriority;
  readonly steps: string;
  readonly requestFor: string;
  readonly onBehalfOfSomeoneElse: boolean;
  readonly impactLevel: TicketImpactLevel;
  readonly urgencyLevel: TicketUrgencyLevel;
  readonly updateRecipients: string;
  readonly selectedFiles: readonly File[];
}

interface PersistedSupportTicketDraft {
  readonly type: TicketType;
  readonly title: string;
  readonly description: string;
  readonly priority: TicketPriority;
  readonly steps: string;
  readonly requestFor: string;
  readonly onBehalfOfSomeoneElse: boolean;
  readonly impactLevel: TicketImpactLevel;
  readonly urgencyLevel: TicketUrgencyLevel;
  readonly updateRecipients: string;
  readonly minimized: boolean;
  readonly savedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupportTicketDraftService {
  private static readonly STORAGE_KEY = 'supportTicketDraft:v1';

  private readonly _draft = signal<SupportTicketDraft | null>(null);
  readonly draft = this._draft.asReadonly();

  private readonly _isMinimized = signal(false);
  readonly isMinimized = this._isMinimized.asReadonly();

  constructor() {
    this.restoreFromStorage();
  }

  setDraft(draft: SupportTicketDraft): void {
    this._draft.set(draft);
  }

  clearDraft(): void {
    this._draft.set(null);
    this._isMinimized.set(false);
    this.clearStorage();
  }

  minimize(): void {
    if (!this._draft()) return;
    this._isMinimized.set(true);
    this.persistToStorage();
  }

  restore(): void {
    if (!this._draft()) return;
    this._isMinimized.set(false);
    this.clearStorage();
  }

  private persistToStorage(): void {
    const current = this._draft();
    if (!current || !this._isMinimized()) return;

    const persisted: PersistedSupportTicketDraft = {
      type: current.type,
      title: current.title,
      description: current.description,
      priority: current.priority,
      steps: current.steps,
      requestFor: current.requestFor,
      onBehalfOfSomeoneElse: current.onBehalfOfSomeoneElse,
      impactLevel: current.impactLevel,
      urgencyLevel: current.urgencyLevel,
      updateRecipients: current.updateRecipients,
      minimized: true,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(SupportTicketDraftService.STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Ignore storage failures (private mode / quota) — draft still exists in memory.
    }
  }

  private restoreFromStorage(): void {
    try {
      const raw = localStorage.getItem(SupportTicketDraftService.STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<PersistedSupportTicketDraft>;
      if (!parsed || parsed.minimized !== true) return;
      if (!parsed.type || !parsed.priority) return;

      this._draft.set({
        type: parsed.type as TicketType,
        title: (parsed.title ?? '') as string,
        description: (parsed.description ?? '') as string,
        priority: parsed.priority as TicketPriority,
        steps: (parsed.steps ?? '') as string,
        requestFor: (parsed.requestFor ?? '') as string,
        onBehalfOfSomeoneElse: Boolean(parsed.onBehalfOfSomeoneElse),
        impactLevel: (parsed.impactLevel ?? TicketImpactLevel.LOW) as TicketImpactLevel,
        urgencyLevel: (parsed.urgencyLevel ?? TicketUrgencyLevel.LOW) as TicketUrgencyLevel,
        updateRecipients: (parsed.updateRecipients ?? '') as string,
        selectedFiles: [],
      });
      this._isMinimized.set(true);
    } catch {
      this.clearStorage();
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(SupportTicketDraftService.STORAGE_KEY);
    } catch {
      // Ignore.
    }
  }
}
