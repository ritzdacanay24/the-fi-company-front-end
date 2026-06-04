import { Injectable } from '@angular/core';

export interface AppGuideContext {
  mode: 'new' | 'draft' | 'pending_verification' | 'verified';
  selectedInstanceId: number | null;
  canManage: boolean;
  isLocked: boolean;
  hasVerifierRouting: boolean;
}

export interface AppGuideSectionAction {
  label: string;
  selector: string;
}

export interface AppGuideSection {
  id: string;
  title: string;
  points: string[];
  priority?: 'required' | 'recommended' | 'when_needed';
  expectedResult?: string;
  actions?: AppGuideSectionAction[];
  showWhen?: (context: AppGuideContext) => boolean;
}

export interface AppGuideData {
  id: string;
  title: string;
  subtitle: string;
  sections: AppGuideSection[];
}

@Injectable({ providedIn: 'root' })
export class AppGuideService {
  private readonly guides: Record<string, AppGuideData> = {
    'shipping-checklist': {
      id: 'shipping-checklist',
      title: 'Shipping Checklist SOP',
      subtitle: 'Use this step-by-step SOP to complete, verify, and close the checklist correctly.',
      sections: [
        {
          id: 'purpose',
          title: 'Purpose',
          priority: 'recommended',
          points: [
            'Create a complete shipping checklist with line, serial, and verification evidence.',
            'Preserve audit integrity from draft through final verification.',
            'Produce a reliable final PDF record for customer and internal traceability.',
          ],
          expectedResult: 'You understand the business goal and final output required before starting.',
        },
        {
          id: 'prerequisites',
          title: 'Prerequisites',
          priority: 'required',
          points: [
            'Customer template is selected and matches the shipment customer.',
            'Sales Order is available and line details can be loaded.',
            'Verifier routing is assigned for final verification handoff.',
          ],
          actions: [
            { label: 'Jump to Template', selector: '[data-tour="shipping-template"]' },
            { label: 'Jump to Sales Order', selector: '[data-tour="shipping-sales-order"]' },
            { label: 'Jump to Verifier Routing', selector: '[data-tour="shipping-verifier-routing"]' },
          ],
          expectedResult: 'Template, Sales Order, and verifier routing are ready and valid.',
        },
        {
          id: 'step-1-create',
          title: 'Step 1: Create Checklist ID',
          priority: 'required',
          points: [
            'Select template, enter Sales Order, then click Create Checklist.',
            'Confirm checklist ID is generated before continuing.',
            'Save Draft immediately after first successful creation.',
          ],
          actions: [
            { label: 'Jump to Create Checklist', selector: '[data-tour="shipping-create-checklist"]' },
            { label: 'Jump to Save Draft', selector: '[data-tour="shipping-save-draft"]' },
          ],
          expectedResult: 'A valid checklist ID exists and initial state is saved as draft.',
          showWhen: (ctx) => ctx.mode === 'new' || ctx.mode === 'draft',
        },
        {
          id: 'step-2-complete-lines',
          title: 'Step 2: Complete Lines and Serials',
          priority: 'required',
          points: [
            'Select only the lines that are shipping now.',
            'Enter qty, serials, and pallet counts accurately.',
            'Confirm total pallets before moving to verification.',
          ],
          actions: [
            { label: 'Jump to Line Items', selector: '[data-tour="shipping-line-items"]' },
          ],
          expectedResult: 'Line, serial, and pallet data reflect the exact shipment.',
          showWhen: (ctx) => !!ctx.selectedInstanceId,
        },
        {
          id: 'step-3-verify-evidence',
          title: 'Step 3: Verification and Evidence',
          priority: 'required',
          points: [
            'Answer all required checklist questions (Yes/No/N/A).',
            'Attach image evidence to relevant checklist items.',
            'If Submit is disabled, resolve all missing required responses first.',
          ],
          actions: [
            { label: 'Jump to Verification', selector: '[data-tour="shipping-verification"]' },
            { label: 'Jump to Attachments', selector: '[data-tour="shipping-attachments"]' },
          ],
          expectedResult: 'All required responses and supporting evidence are complete.',
          showWhen: (ctx) => !!ctx.selectedInstanceId,
        },
        {
          id: 'step-4-submit-or-verify',
          title: 'Step 4: Submit or Complete Verification',
          priority: 'required',
          points: [
            'Draft mode: submit checklist for secondary verification.',
            'Pending verification mode: use Complete Verification to finalize.',
            'After final verification, download PDF from Actions.',
          ],
          actions: [
            { label: 'Jump to Actions', selector: '[data-tour="shipping-actions"]' },
            { label: 'Jump to Final Verification Alert', selector: '[data-tour="shipping-ready-verify"]' },
          ],
          expectedResult: 'Checklist reaches submitted or verified status based on current workflow stage.',
          showWhen: (ctx) => !!ctx.selectedInstanceId,
        },
        {
          id: 'decision-rules',
          title: 'Decision Rules',
          priority: 'when_needed',
          points: [
            'If routing is missing: update verifier assignment in template settings before final handoff.',
            'If checklist is locked and correction is required: use Reopen Draft, then re-verify after fix.',
            'If required checks are incomplete: do not submit; complete responses and evidence first.',
          ],
          actions: [
            { label: 'Jump to Verifier Routing', selector: '[data-tour="shipping-verifier-routing"]' },
            { label: 'Jump to Locked Warning', selector: '[data-tour="shipping-locked-state"]' },
            { label: 'Jump to Actions', selector: '[data-tour="shipping-actions"]' },
          ],
          expectedResult: 'You can resolve blocking workflow conditions without escalating immediately.',
        },
        {
          id: 'common-mistakes',
          title: 'Common Mistakes to Avoid',
          priority: 'recommended',
          points: [
            'Starting line edits before checklist ID is created.',
            'Forgetting Save Draft and losing unsaved work.',
            'Submitting without required responses or evidence.',
            'Reopening locked checklists without documenting the correction reason.',
          ],
          expectedResult: 'You avoid preventable errors and rework during checklist processing.',
        },
        {
          id: 'completion-checklist',
          title: 'Completion Checklist',
          priority: 'required',
          points: [
            'Checklist status is Verified.',
            'All required responses and attachments are present.',
            'Final PDF has been downloaded and reviewed.',
            'Recent checklist/history reflects correct final state.',
          ],
          actions: [
            { label: 'Jump to Actions', selector: '[data-tour="shipping-actions"]' },
            { label: 'Jump to Recent Checklists', selector: '[data-tour="shipping-recent"]' },
          ],
          expectedResult: 'Checklist is complete, auditable, and ready for downstream use.',
        },
        {
          id: 'escalation',
          title: 'When to Ask for Help',
          priority: 'when_needed',
          points: [
            'Template data does not match shipment customer or required checklist logic.',
            'Sales Order lines fail to load after retrying and verifying order number.',
            'Verifier routing is missing and you cannot update template settings.',
            'Checklist cannot be submitted or verified after resolving required items.',
          ],
          expectedResult: 'You escalate only true blockers with enough context for fast resolution.',
        },
        {
          id: 'admin-nav',
          title: 'Admin Links',
          priority: 'when_needed',
          points: [
            'Use Templates and Settings for verifier routing and workflow updates.',
            'Use checklist history when auditing or troubleshooting.',
          ],
          actions: [
            { label: 'Jump to Actions', selector: '[data-tour="shipping-actions"]' },
            { label: 'Jump to Recent Checklists', selector: '[data-tour="shipping-recent"]' },
          ],
          expectedResult: 'You can quickly navigate to maintenance and audit paths when needed.',
          showWhen: (ctx) => ctx.canManage,
        },
      ],
    },
  };

  buildGuide(id: string, context: AppGuideContext): AppGuideData | null {
    const found = this.guides[id];
    if (!found) {
      return null;
    }

    const filteredSections = found.sections.filter((section) => {
      if (!section.showWhen) {
        return true;
      }

      try {
        return !!section.showWhen(context);
      } catch {
        return true;
      }
    });

    return {
      ...found,
      sections: filteredSections,
    };
  }
}
