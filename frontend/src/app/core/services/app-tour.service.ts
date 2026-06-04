import { Injectable } from '@angular/core';

export interface AppTourStep {
  selector: string;
  title: string;
  description: string;
  optional?: boolean;
  includeWhen?: () => boolean;
  beforeStep?: () => void | Promise<void>;
  duringStep?: () => void | Promise<void>;
  preferredPlacements?: Array<'bottom' | 'right' | 'left' | 'top'>;
  requiresAction?: boolean;
  actionComplete?: () => boolean;
  incompleteMessage?: string;
  nextLabel?: string;
}

export interface AppTourDefinition {
  id: string;
  name: string;
  version: number;
  steps: AppTourStep[];
}

@Injectable({ providedIn: 'root' })
export class AppTourService {
  private readonly tours = new Map<string, AppTourDefinition>();
  private readonly completedPrefix = 'app-tour-completed:';
  private activeHighlightEl: HTMLElement | null = null;
  private activePanelEl: HTMLDivElement | null = null;
  private panelPositionCleanup: (() => void) | null = null;
  private activePanelPlacement: 'bottom' | 'right' | 'left' | 'top' | null = null;
  private activeTourRunId = 0;

  registerTour(definition: AppTourDefinition): void {
    this.tours.set(definition.id, definition);
  }

  isCompleted(tourId: string, version: number): boolean {
    const key = `${this.completedPrefix}${tourId}`;
    return localStorage.getItem(key) === String(version);
  }

  resetCompletion(tourId: string): void {
    const key = `${this.completedPrefix}${tourId}`;
    localStorage.removeItem(key);
  }

  async startTour(tourId: string): Promise<void> {
    const tour = this.tours.get(tourId);
    if (!tour || !Array.isArray(tour.steps) || tour.steps.length === 0) {
      return;
    }

    const runtimeSteps = tour.steps.filter((step) => {
      if (!step.includeWhen) {
        return true;
      }

      try {
        return !!step.includeWhen();
      } catch {
        return true;
      }
    });

    if (!runtimeSteps.length) {
      return;
    }

    this.stopActiveTour();
    const runId = ++this.activeTourRunId;

    let index = 0;

    while (index < runtimeSteps.length && runId === this.activeTourRunId) {
      const step = runtimeSteps[index];

      if (step.beforeStep) {
        try {
          await step.beforeStep();
        } catch {
          // Keep tour resilient even if hook fails.
        }
      }

      const element = await this.waitForElement(step.selector, step.optional ? 350 : 2500);

      if (runId !== this.activeTourRunId) {
        return;
      }

      if (!element) {
        if (step.optional) {
          // Optional steps may be hidden by current form state; skip quickly.
          this.clearHighlight();
          index += 1;
          continue;
        }

        const missingAction = await this.showStepPanel({
          tourName: tour.name,
          title: `Step ${index + 1}/${runtimeSteps.length}: ${step.title}`,
          description: 'This section is not visible right now. You can continue to the next step or exit the tour.',
          nextLabel: 'Skip',
          showBack: index > 0,
          isLast: index === runtimeSteps.length - 1,
            anchorEl: null,
        });

        if (missingAction === 'back') {
          this.destroyPanel();
          this.clearHighlight();
          index = Math.max(0, index - 1);
          continue;
        }

        if (missingAction === 'next') {
          this.destroyPanel();
          this.clearHighlight();
          index += 1;
          continue;
        }

        this.stopActiveTour();
        return;
      }

      this.highlightElement(element);
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

      const action = await this.showStepPanel({
        tourName: tour.name,
        title: `Step ${index + 1}/${runtimeSteps.length}: ${step.title}`,
        description: step.description,
        nextLabel: step.nextLabel || (index === runtimeSteps.length - 1 ? 'Finish' : 'Next'),
        showBack: index > 0,
        isLast: index === runtimeSteps.length - 1,
        requiresAction: !!step.requiresAction,
        actionComplete: step.actionComplete,
        incompleteMessage: step.incompleteMessage,
        anchorEl: element,
        duringStep: step.duringStep,
        preferredPlacements: step.preferredPlacements,
      });

      // Always clear current panel/highlight before moving to the next state.
      this.destroyPanel();
      this.clearHighlight();

      if (action === 'exit') {
        this.stopActiveTour();
        return;
      }

      if (action === 'back') {
        index = Math.max(0, index - 1);
        continue;
      }

      if (action === 'next') {
        index += 1;
      }
    }

    this.stopActiveTour();
    this.markCompleted(tour.id, tour.version);
    this.showCompletionToast();
  }

  private stopActiveTour(): void {
    this.clearHighlight();
    this.destroyPanel();
  }

  private markCompleted(tourId: string, version: number): void {
    const key = `${this.completedPrefix}${tourId}`;
    localStorage.setItem(key, String(version));
  }

  private async waitForElement(selector: string, timeoutMs = 2500): Promise<HTMLElement | null> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const match = document.querySelector(selector);
      if (match instanceof HTMLElement && this.isElementVisible(match)) {
        return match;
      }

      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    return null;
  }

  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  private highlightElement(element: HTMLElement): void {
    this.clearHighlight();
    this.activeHighlightEl = element;
    element.classList.add('app-tour-highlight');
  }

  private clearHighlight(): void {
    if (!this.activeHighlightEl) {
      return;
    }

    this.activeHighlightEl.classList.remove('app-tour-highlight');
    this.activeHighlightEl = null;
  }

  private destroyPanel(): void {
    if (this.panelPositionCleanup) {
      this.panelPositionCleanup();
      this.panelPositionCleanup = null;
    }

    if (!this.activePanelEl) {
      return;
    }

    this.activePanelEl.remove();
    this.activePanelEl = null;
    this.activePanelPlacement = null;
  }

  private showCompletionToast(): void {
    const toast = document.createElement('div');
    toast.className = 'app-tour-complete-toast';
    toast.textContent = 'Tour complete. You can restart this guide any time.';
    document.body.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 2600);
  }

  private showStepPanel(options: {
    tourName: string;
    title: string;
    description: string;
    nextLabel: string;
    showBack: boolean;
    isLast: boolean;
    requiresAction?: boolean;
    actionComplete?: () => boolean;
    incompleteMessage?: string;
    anchorEl: HTMLElement | null;
    duringStep?: () => void | Promise<void>;
    preferredPlacements?: Array<'bottom' | 'right' | 'left' | 'top'>;
  }): Promise<'next' | 'back' | 'exit'> {
    this.destroyPanel();

    return new Promise((resolve) => {
      const panel = document.createElement('div');
      panel.className = 'app-tour-panel app-tour-panel--hidden';

      const header = document.createElement('div');
      header.className = 'app-tour-panel__header';

      const tourName = document.createElement('div');
      tourName.className = 'app-tour-panel__tour-name';
      tourName.textContent = options.tourName;

      const title = document.createElement('div');
      title.className = 'app-tour-panel__title';
      title.textContent = options.title;

      const description = document.createElement('div');
      description.className = 'app-tour-panel__description';
      description.textContent = options.description;

      const validation = document.createElement('div');
      validation.className = 'app-tour-panel__validation';
      validation.style.display = 'none';

      const actions = document.createElement('div');
      actions.className = 'app-tour-panel__actions';

      const exitButton = document.createElement('button');
      exitButton.type = 'button';
      exitButton.className = 'btn btn-sm btn-light';
      exitButton.textContent = 'Exit';
      exitButton.onclick = () => resolve('exit');
      actions.appendChild(exitButton);

      if (options.showBack) {
        const backButton = document.createElement('button');
        backButton.type = 'button';
        backButton.className = 'btn btn-sm btn-outline-secondary';
        backButton.textContent = 'Back';
        backButton.onclick = () => resolve('back');
        actions.appendChild(backButton);
      }

      const nextButton = document.createElement('button');
      nextButton.type = 'button';
      nextButton.className = 'btn btn-sm btn-primary';
      nextButton.textContent = options.nextLabel;
      nextButton.onclick = () => {
        if (options.requiresAction) {
          const completed = options.actionComplete ? options.actionComplete() : false;
          if (!completed) {
            validation.textContent = options.incompleteMessage || 'Complete this action on the page first, then continue.';
            validation.style.display = 'block';
            return;
          }
        }

        resolve('next');
      };
      actions.appendChild(nextButton);

      header.appendChild(tourName);
      header.appendChild(title);
      panel.appendChild(header);
      panel.appendChild(description);
      panel.appendChild(validation);
      panel.appendChild(actions);

      document.body.appendChild(panel);
      this.activePanelEl = panel;
      this.bindPanelPositioning(panel, options.anchorEl, options.preferredPlacements, options.duringStep);
    });
  }

  private bindPanelPositioning(
    panel: HTMLElement,
    anchorEl: HTMLElement | null,
    preferredPlacements?: Array<'bottom' | 'right' | 'left' | 'top'>,
    duringStep?: () => void | Promise<void>,
  ): void {
    if (!anchorEl) {
      // Fixed mode is only for explicit missing-target steps.
      this.applyFixedPanelPosition(panel);
      return;
    }

    const reposition = async () => {
      if (duringStep) {
        try {
          await duringStep();
        } catch {
          // Keep tour resilient if step hook fails.
        }
      }

      this.positionPanelNearAnchor(panel, anchorEl, preferredPlacements);
    };

    void reposition();

    const onViewportChange = () => {
      void reposition();
    };

    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    document.addEventListener('click', onViewportChange, true);

    this.panelPositionCleanup = () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
      document.removeEventListener('click', onViewportChange, true);
    };
  }

  private positionPanelNearAnchor(
    panel: HTMLElement,
    anchorEl: HTMLElement,
    preferredPlacements?: Array<'bottom' | 'right' | 'left' | 'top'>,
  ): void {
    if (!document.body.contains(anchorEl) || !this.isElementVisible(anchorEl)) {
      // Keep hidden if the anchor is not available anymore during transitions.
      panel.classList.add('app-tour-panel--hidden');
      return;
    }

    panel.classList.remove('app-tour-panel--fixed', 'app-tour-panel--top', 'app-tour-panel--bottom', 'app-tour-panel--left', 'app-tour-panel--right');

    const anchorRect = anchorEl.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || panel.getBoundingClientRect().width;
    const panelHeight = panel.offsetHeight || panel.getBoundingClientRect().height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 12;
    const margin = 12;

    const defaultPlacements: Array<'bottom' | 'right' | 'left' | 'top'> = ['bottom', 'right', 'left', 'top'];
    const placements = (preferredPlacements && preferredPlacements.length > 0)
      ? preferredPlacements
      : defaultPlacements;

    const placementCoordinates: Record<'bottom' | 'right' | 'left' | 'top', { left: number; top: number }> = {
      bottom: {
        left: anchorRect.left + (anchorRect.width / 2) - (panelWidth / 2),
        top: anchorRect.bottom + gap,
      },
      right: {
        left: anchorRect.right + gap,
        top: anchorRect.top + (anchorRect.height / 2) - (panelHeight / 2),
      },
      left: {
        left: anchorRect.left - panelWidth - gap,
        top: anchorRect.top + (anchorRect.height / 2) - (panelHeight / 2),
      },
      top: {
        left: anchorRect.left + (anchorRect.width / 2) - (panelWidth / 2),
        top: anchorRect.top - panelHeight - gap,
      },
    };

    const placementScore = (coords: { left: number; top: number }) => {
      const overflowLeft = Math.max(0, margin - coords.left);
      const overflowTop = Math.max(0, margin - coords.top);
      const overflowRight = Math.max(0, (coords.left + panelWidth) - (viewportWidth - margin));
      const overflowBottom = Math.max(0, (coords.top + panelHeight) - (viewportHeight - margin));
      return overflowLeft + overflowTop + overflowRight + overflowBottom;
    };

    const bestPlacement = placements.reduce((best, placement) => {
      const score = placementScore(placementCoordinates[placement]);
      if (!best || score < best.score) {
        return { placement, score };
      }
      return best;
    }, null as { placement: 'bottom' | 'right' | 'left' | 'top'; score: number } | null);

    const fallback = bestPlacement?.placement || 'bottom';
    const previous = this.activePanelPlacement;

    // Hysteresis: keep current placement during scroll unless it becomes meaningfully worse.
    const SWITCH_THRESHOLD = 80;
    const previousScore = previous ? placementScore(placementCoordinates[previous]) : Number.POSITIVE_INFINITY;
    const bestScore = bestPlacement?.score ?? previousScore;

    const chosen = previous && (previousScore <= bestScore + SWITCH_THRESHOLD)
      ? previous
      : fallback;

    const coords = placementCoordinates[chosen];
    const clampedLeft = Math.min(Math.max(coords.left, margin), viewportWidth - panelWidth - margin);
    const clampedTop = Math.min(Math.max(coords.top, margin), viewportHeight - panelHeight - margin);

    panel.style.left = `${clampedLeft}px`;
    panel.style.top = `${clampedTop}px`;
    panel.classList.add(`app-tour-panel--${chosen}`);
    panel.classList.remove('app-tour-panel--hidden');
    this.activePanelPlacement = chosen;

    this.applyArrowOffset(panel, chosen, {
      left: clampedLeft,
      top: clampedTop,
      width: panelWidth,
      height: panelHeight,
    }, anchorRect);
  }

  private applyArrowOffset(
    panel: HTMLElement,
    placement: 'bottom' | 'right' | 'left' | 'top',
    panelBox: { left: number; top: number; width: number; height: number },
    anchorRect: DOMRect,
  ): void {
    const minOffset = 18;

    if (placement === 'bottom' || placement === 'top') {
      const anchorCenterX = anchorRect.left + (anchorRect.width / 2);
      const rawOffset = anchorCenterX - panelBox.left;
      const maxOffset = panelBox.width - minOffset;
      const clamped = Math.min(Math.max(rawOffset, minOffset), maxOffset);
      panel.style.setProperty('--app-tour-arrow-x', `${clamped}px`);
      panel.style.removeProperty('--app-tour-arrow-y');
      return;
    }

    const anchorCenterY = anchorRect.top + (anchorRect.height / 2);
    const rawOffset = anchorCenterY - panelBox.top;
    const maxOffset = panelBox.height - minOffset;
    const clamped = Math.min(Math.max(rawOffset, minOffset), maxOffset);
    panel.style.setProperty('--app-tour-arrow-y', `${clamped}px`);
    panel.style.removeProperty('--app-tour-arrow-x');
  }

  private applyFixedPanelPosition(panel: HTMLElement): void {
    panel.classList.remove('app-tour-panel--top', 'app-tour-panel--bottom', 'app-tour-panel--left', 'app-tour-panel--right');
    panel.classList.add('app-tour-panel--fixed');
    panel.classList.remove('app-tour-panel--hidden');
    panel.style.left = '';
    panel.style.top = '';
    panel.style.removeProperty('--app-tour-arrow-x');
    panel.style.removeProperty('--app-tour-arrow-y');
    this.activePanelPlacement = null;
  }
}
