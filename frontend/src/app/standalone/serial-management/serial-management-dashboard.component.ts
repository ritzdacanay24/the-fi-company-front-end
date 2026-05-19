import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SerialNumberService } from '@app/features/serial-number-management/services/serial-number.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

interface SerialAvailabilitySummaryData {
  eyefi_available: number;
  ul_new_available: number;
  ul_used_available: number;
  igt_available: number;
  eyefi_recently_used: number;
  ul_new_recently_used: number;
  ul_used_recently_used: number;
  igt_recently_used: number;
  eyefi_used_last_7_days: number;
  ul_new_used_last_7_days: number;
  ul_used_used_last_7_days: number;
  igt_used_last_7_days: number;
}

interface SerialAvailabilitySummaryResponse {
  success: boolean;
  data: SerialAvailabilitySummaryData;
}

interface SerialHealthCard {
  key: 'ul_new' | 'ul_used' | 'igt' | 'eyefi';
  title: string;
  route: string;
  available: number;
  recentlyUsed: number;
  threshold: number;
}

type SerialThresholdMap = Record<SerialHealthCard['key'], number>;

const DEFAULT_THRESHOLDS: SerialThresholdMap = {
  ul_new: 150,
  ul_used: 100,
  igt: 200,
  eyefi: 300,
};

@Component({
  selector: 'app-serial-management-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './serial-management-dashboard.component.html',
  styleUrl: './serial-management-dashboard.component.scss',
})
export class SerialManagementDashboardComponent implements OnInit {
  private readonly serialNumberService = inject(SerialNumberService);
  private readonly modalService = inject(NgbModal);

  loading = true;
  lastUpdated = '';
  loadError = '';
  thresholdSaveError = '';
  thresholdDraft: SerialThresholdMap = { ...DEFAULT_THRESHOLDS };

  cards: SerialHealthCard[] = [
    {
      key: 'ul_new',
      title: 'UL Labels (New)',
      route: '/serial-management/ul-labels',
      available: 0,
      recentlyUsed: 0,
      threshold: DEFAULT_THRESHOLDS.ul_new,
    },
    {
      key: 'ul_used',
      title: 'UL Labels (Used)',
      route: '/serial-management/ul-labels',
      available: 0,
      recentlyUsed: 0,
      threshold: DEFAULT_THRESHOLDS.ul_used,
    },
    {
      key: 'igt',
      title: 'IGT Serials',
      route: '/serial-management/igt-inventory',
      available: 0,
      recentlyUsed: 0,
      threshold: DEFAULT_THRESHOLDS.igt,
    },
    {
      key: 'eyefi',
      title: 'EyeFi Serials',
      route: '/serial-management/eyefi-serials',
      available: 0,
      recentlyUsed: 0,
      threshold: DEFAULT_THRESHOLDS.eyefi,
    },
  ];

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadThresholdsFromAPI(), this.loadDashboard()]);
  }

  openThresholdModal(content: TemplateRef<unknown>): void {
    this.thresholdDraft = this.cards.reduce((acc, card) => {
      acc[card.key] = card.threshold;
      return acc;
    }, { ...DEFAULT_THRESHOLDS });

    this.modalService.open(content, {
      centered: true,
      size: 'lg',
      backdrop: 'static',
    });
  }

  async saveThresholdsAndClose(modal: { close: () => void }): Promise<void> {
    this.thresholdSaveError = '';
    const nextThresholds: SerialThresholdMap = {
      ul_new: this.sanitizeThreshold(this.thresholdDraft.ul_new),
      ul_used: this.sanitizeThreshold(this.thresholdDraft.ul_used),
      igt: this.sanitizeThreshold(this.thresholdDraft.igt),
      eyefi: this.sanitizeThreshold(this.thresholdDraft.eyefi),
    };

    try {
      const response = await this.serialNumberService.updateSerialStockThresholdsFromAPI({
        eyefi: nextThresholds.eyefi,
        ul_new: nextThresholds.ul_new,
        ul_used: nextThresholds.ul_used,
        igt: nextThresholds.igt,
      });

      const saved = this.toThresholdMap(response?.data);
      this.cards = this.cards.map((card) => ({
        ...card,
        threshold: saved[card.key],
      }));
      this.thresholdDraft = { ...saved };
      modal.close();
    } catch {
      this.thresholdSaveError = 'Could not save thresholds. Please try again.';
    }
  }

  resetThresholds(): void {
    this.thresholdDraft = { ...DEFAULT_THRESHOLDS };
    this.thresholdSaveError = '';
  }

  async refresh(): Promise<void> {
    await this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      const summary = await this.serialNumberService.getAvailabilitySummaryFromAPI();
      const parsedSummary = this.extractSummary(summary);

      this.updateCard('ul_new', parsedSummary.ul_new_available, parsedSummary.ul_new_recently_used);
      this.updateCard('ul_used', parsedSummary.ul_used_available, parsedSummary.ul_used_recently_used);
      this.updateCard('igt', parsedSummary.igt_available, parsedSummary.igt_recently_used);
      this.updateCard('eyefi', parsedSummary.eyefi_available, parsedSummary.eyefi_recently_used);
      this.lastUpdated = new Date().toLocaleString();
    } catch {
      this.cards = this.cards.map((c) => ({ ...c, available: 0, recentlyUsed: 0 }));
      this.loadError = 'Could not load serial availability metrics. Values shown as zero.';
      this.lastUpdated = new Date().toLocaleString();
    } finally {
      this.loading = false;
    }
  }

  stockStatus(card: SerialHealthCard): 'critical' | 'low' | 'healthy' {
    if (card.available <= Math.floor(card.threshold * 0.3)) return 'critical';
    if (card.available <= card.threshold) return 'low';
    return 'healthy';
  }

  statusLabel(card: SerialHealthCard): string {
    const status = this.stockStatus(card);
    if (status === 'critical') return 'Critical';
    if (status === 'low') return 'Low';
    return 'Healthy';
  }

  hasCriticalRisk(): boolean {
    return this.cards.some((card) => this.stockStatus(card) === 'critical');
  }

  hasAnyRisk(): boolean {
    return this.cards.some((card) => this.stockStatus(card) !== 'healthy');
  }

  alertTitle(): string {
    return this.hasCriticalRisk() ? 'CRITICAL ALERT' : 'STOCK ALERT';
  }

  alertMessage(): string {
    if (!this.hasAnyRisk()) {
      return 'All serial pools are healthy and above threshold.';
    }

    const atRiskPools = this.cards
      .filter((card) => this.stockStatus(card) !== 'healthy')
      .map((card) => card.title)
      .join(', ');

    if (this.hasCriticalRisk()) {
      return `${atRiskPools} are critically low and need immediate action.`;
    }

    return `${atRiskPools} are below the minimum threshold.`;
  }

  totalAvailable(): number {
    return this.cards.reduce((sum, c) => sum + c.available, 0);
  }

  totalThreshold(): number {
    return this.cards.reduce((sum, c) => sum + c.threshold, 0);
  }

  systemsAtRisk(): number {
    return this.cards.filter((c) => this.stockStatus(c) !== 'healthy').length;
  }

  healthPercent(): number {
    const threshold = this.totalThreshold();
    if (threshold <= 0) {
      return 0;
    }
    const pct = (this.totalAvailable() / threshold) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  shortfallFor(card: SerialHealthCard): number {
    return Math.max(0, card.threshold - card.available);
  }

  bufferFor(card: SerialHealthCard): number {
    return Math.max(0, card.available - card.threshold);
  }

  shortfallDisplay(card: SerialHealthCard): string {
    const shortfall = this.shortfallFor(card);
    if (shortfall > 0) {
      return `-${shortfall.toLocaleString()}`;
    }

    return `${this.bufferFor(card).toLocaleString()} buffer`;
  }

  stockProgressFor(card: SerialHealthCard): number {
    if (card.threshold <= 0) {
      return 0;
    }
    const pct = (card.available / card.threshold) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  private updateCard(key: SerialHealthCard['key'], available: number, recentlyUsed: number): void {
    this.cards = this.cards.map((c) =>
      c.key === key
        ? {
            ...c,
            available,
            recentlyUsed,
          }
        : c,
    );
  }

  private sanitizeThreshold(value: number | undefined, fallback = 1): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return Math.max(1, Math.round(Number(fallback) || 1));
    }
    return Math.round(numeric);
  }

  private async loadThresholdsFromAPI(): Promise<void> {
    try {
      const response = await this.serialNumberService.getSerialStockThresholdsFromAPI();
      const safeThresholds = this.toThresholdMap(response?.data);
      this.cards = this.cards.map((card) => ({
        ...card,
        threshold: safeThresholds[card.key],
      }));
      this.thresholdDraft = safeThresholds;
    } catch {
      this.thresholdDraft = { ...DEFAULT_THRESHOLDS };
    }
  }

  private toThresholdMap(raw: Partial<Record<SerialHealthCard['key'], number>> | undefined): SerialThresholdMap {
    return {
      ul_new: this.sanitizeThreshold(raw?.ul_new, DEFAULT_THRESHOLDS.ul_new),
      ul_used: this.sanitizeThreshold(raw?.ul_used, DEFAULT_THRESHOLDS.ul_used),
      igt: this.sanitizeThreshold(raw?.igt, DEFAULT_THRESHOLDS.igt),
      eyefi: this.sanitizeThreshold(raw?.eyefi, DEFAULT_THRESHOLDS.eyefi),
    };
  }

  private extractSummary(response: unknown): SerialAvailabilitySummaryData {
    const parsed = response as Partial<SerialAvailabilitySummaryResponse>;
    if (parsed?.success !== true || !parsed.data) {
      return {
        eyefi_available: 0,
        ul_new_available: 0,
        ul_used_available: 0,
        igt_available: 0,
        eyefi_recently_used: 0,
        ul_new_recently_used: 0,
        ul_used_recently_used: 0,
        igt_recently_used: 0,
        eyefi_used_last_7_days: 0,
        ul_new_used_last_7_days: 0,
        ul_used_used_last_7_days: 0,
        igt_used_last_7_days: 0,
      };
    }

    return {
      eyefi_available: Number(parsed.data.eyefi_available ?? 0),
      ul_new_available: Number(parsed.data.ul_new_available ?? 0),
      ul_used_available: Number(parsed.data.ul_used_available ?? 0),
      igt_available: Number(parsed.data.igt_available ?? 0),
      eyefi_recently_used: Number(parsed.data.eyefi_recently_used ?? 0),
      ul_new_recently_used: Number(parsed.data.ul_new_recently_used ?? 0),
      ul_used_recently_used: Number(parsed.data.ul_used_recently_used ?? 0),
      igt_recently_used: Number(parsed.data.igt_recently_used ?? 0),
      eyefi_used_last_7_days: Number(parsed.data.eyefi_used_last_7_days ?? 0),
      ul_new_used_last_7_days: Number(parsed.data.ul_new_used_last_7_days ?? 0),
      ul_used_used_last_7_days: Number(parsed.data.ul_used_used_last_7_days ?? 0),
      igt_used_last_7_days: Number(parsed.data.igt_used_last_7_days ?? 0),
    };
  }
}
