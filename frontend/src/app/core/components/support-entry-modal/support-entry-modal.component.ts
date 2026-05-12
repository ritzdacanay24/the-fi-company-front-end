import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export type SupportEntrySelection = 'dashboard' | 'it';

@Component({
  standalone: true,
  selector: 'app-support-entry-modal',
  imports: [CommonModule],
  template: `
    <div class="modal-header border-0 pb-0">
      <button
        type="button"
        class="btn-close"
        aria-label="Close"
        (click)="activeModal.dismiss('cancel')"></button>
    </div>

    <div class="modal-body pt-1 px-4 pb-4 support-entry-modal">
      <div class="support-entry-icon mb-2 text-center">
        <i class="mdi mdi-help-circle-outline"></i>
      </div>

      <h4 class="fw-semibold mb-1 text-center">What do you need help with?</h4>
      <p class="text-muted mb-4 text-center">Pick one of the options below.</p>

      <div class="decision-grid mb-3">
        <button type="button" class="decision-card decision-card--avvero" (click)="select('it')">
          <img
            class="decision-card__logo"
            src="https://d3qscgr6xsioh.cloudfront.net/52KbhFOcTBabSmWYrPUs_transformed.png?format=webp"
            alt="Avvero"
            loading="lazy" />
          <div class="decision-card__title">IT / Access (Avvero)</div>
          <div class="decision-card__desc">Account lockouts, internet, Outlook, hardware, printers, and device setup.</div>
        </button>

        <button type="button" class="decision-card decision-card--dashboard" (click)="select('dashboard')">
          <div class="decision-card__title">DB Issue / App</div>
          <div class="decision-card__desc">Data mismatches, workflow bugs, page errors, or missing app actions.</div>
        </button>
      </div>

      <div class="decision-help mb-3">
        <div class="decision-help__title">Best decision to choose:</div>
        <div class="decision-help__line"><strong>Choose IT / Access (Avvero)</strong> if it impacts your computer, account, email, network, or device.</div>
        <div class="decision-help__line"><strong>Choose DB Issue / App</strong> if the issue is inside this application workflow or related to dashboard data.</div>
      </div>

      <div class="text-center">
        <button type="button" class="btn btn-outline-secondary" (click)="activeModal.dismiss('cancel')">
          Cancel
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .support-entry-modal {
        max-width: 640px;
        margin: 0 auto;
        color: var(--sem-text);
      }

      :host {
        --sem-text: #1f2937;
        --sem-muted: #4b5563;
        --sem-card-bg: #ffffff;
        --sem-card-border: #dbe4f0;
        --sem-help-bg: #f8fafc;
        --sem-help-border: #dbe4f0;
      }

      .support-entry-icon i {
        font-size: 3.5rem;
        color: #45b4e2;
      }

      .decision-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }

      .decision-card {
        text-align: left;
        border-radius: 0.75rem;
        border: 1px solid var(--sem-card-border);
        background: var(--sem-card-bg);
        padding: 0.9rem;
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      }

      .decision-card:hover,
      .decision-card:focus {
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
      }

      .decision-card__title {
        font-weight: 700;
        margin-bottom: 0.35rem;
      }

      .decision-card__logo {
        display: block;
        width: auto;
        height: 18px;
        margin-bottom: 0.5rem;
      }

      .decision-card__desc {
        color: var(--sem-muted);
        font-size: 0.9rem;
        line-height: 1.35;
      }

      .decision-card--avvero {
        border-left: 4px solid #f06c3b;
      }

      .decision-card--dashboard {
        border-left: 4px solid #1d3f8f;
      }

      .decision-help {
        border-radius: 0.75rem;
        border: 1px solid var(--sem-help-border);
        background: var(--sem-help-bg);
        padding: 0.8rem;
      }

      .decision-help__title {
        font-weight: 700;
        margin-bottom: 0.35rem;
      }

      .decision-help__line {
        color: var(--sem-text);
        font-size: 0.9rem;
        line-height: 1.35;
      }

      :host-context([data-bs-theme='dark']) {
        --sem-text: #e5e7eb;
        --sem-muted: #cbd5e1;
        --sem-card-bg: #212b36;
        --sem-card-border: #334155;
        --sem-help-bg: #1b2530;
        --sem-help-border: #334155;
      }

      :host-context([data-bs-theme='dark']) .btn-outline-secondary {
        color: #e2e8f0;
        border-color: #64748b;
      }

      :host-context([data-bs-theme='dark']) .btn-outline-secondary:hover,
      :host-context([data-bs-theme='dark']) .btn-outline-secondary:focus {
        color: #0f172a;
        background: #cbd5e1;
        border-color: #cbd5e1;
      }

      @media (max-width: 767.98px) {
        .decision-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SupportEntryModalComponent {
  constructor(public readonly activeModal: NgbActiveModal) {}

  select(selection: SupportEntrySelection): void {
    this.activeModal.close(selection);
  }
}
