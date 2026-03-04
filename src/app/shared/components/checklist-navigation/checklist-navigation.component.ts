import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { PhotoChecklistConfigService, ChecklistTemplate, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { Subject, takeUntil } from 'rxjs';
import { ChecklistNavItem } from '@app/shared/models/checklist-navigation.model';

@Component({
  selector: 'app-checklist-navigation',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, NgbDropdownModule],
  templateUrl: './checklist-navigation.component.html',
  styleUrls: ['./checklist-navigation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChecklistNavigationComponent implements OnChanges, OnDestroy {
  @Input() templateId: number | string | null = null;
  @Input() items: ChecklistNavItem[] | null = null;
  @Input() activeItemId: number | null = null;
  @Input() activeItemIndex: number | null = null;
  @Input() showSearch = true;
  @Input() showExpandCollapse = true;
  @Input() mode: 'editor' | 'readonly' = 'readonly';
  @Input() summary: { completed: number; total: number; percent: number } | null = null;
  @Input() cardStyle = true;
  @Input() height: string | null = null;  // e.g., '500px', 'calc(100vh - 300px)'

  @Input() showOnlyOpenItems = false;
  @Output() showOnlyOpenItemsChange = new EventEmitter<boolean>();

  @Output() itemSelected = new EventEmitter<{ itemId: number; index: number }>();
  @Output() navDrop = new EventEmitter<CdkDragDrop<string[]>>();
  @Output() navAction = new EventEmitter<{ action: string; index: number }>();
  @Output() primaryImageRequested = new EventEmitter<{ index: number }>();
  @Output() sampleVideoRequested = new EventEmitter<{ index: number }>();
  @Output() userPhotoRequested = new EventEmitter<{ index: number; url: string }>();

  @ViewChild('navContainer') navContainer?: ElementRef<HTMLDivElement>;

  navItems: ChecklistNavItem[] = [];
  isLoading = false;
  loadError: string | null = null;

  // Navigation tree expansion state
  expandedItems = new Set<number>();

  // Navigation search/filter
  navSearchTerm = '';
  navSearchMatchCount = 0;
  private navSearchMatchedIndices = new Set<number>();
  private navSearchVisibleIndices = new Set<number>();
  private savedExpandedItemsBeforeSearch: Set<number> | null = null;
  private lastNormalizedSearchTerm = '';

  activeNavItemIndex = -1;

  // Read-only navigation filter: show only open (incomplete) items

  private destroy$ = new Subject<void>();

  constructor(
    private checklistService: PhotoChecklistConfigService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.setItemsFromInput();
    }

    if (changes['templateId']) {
      this.loadTemplate();
    }

    if (changes['activeItemId'] || changes['activeItemIndex']) {
      this.updateActiveFromInputs();
    }

    if (changes['showOnlyOpenItems']) {
      const next = !!changes['showOnlyOpenItems'].currentValue;
      this.setShowOnlyOpenItems(next, { emit: false });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTemplate(): void {
    if (this.items && this.items.length > 0) {
      return;
    }

    const templateId = this.parseTemplateId(this.templateId);
    if (templateId === null) {
      this.navItems = [];
      this.loadError = 'Template ID is missing or invalid.';
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.loadError = null;
    this.cdr.markForCheck();

    this.checklistService.getTemplate(templateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (template) => {
          this.navItems = this.mapTemplateToNavItems(template);
          this.initializeNavExpansion();
          this.updateNavSearchSets();
          this.updateActiveFromInputs();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.loadError = 'Unable to load navigation.';
          this.cdr.markForCheck();
        }
      });
  }

  private setItemsFromInput(): void {
    if (!this.items || this.items.length === 0) {
      this.navItems = [];
      this.loadError = null;
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.navItems = [...this.items];
    this.isLoading = false;
    this.loadError = null;
    this.initializeNavExpansion();
    this.updateNavSearchSets();
    this.updateActiveFromInputs();
    this.cdr.markForCheck();
  }

  private parseTemplateId(value: number | string | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private mapTemplateToNavItems(template: ChecklistTemplate): ChecklistNavItem[] {
    const items = template.items ?? [];
    const mapped = items.map((item, index) => this.mapItem(item, index));
    return mapped.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  private mapItem(item: ChecklistItem, index: number): ChecklistNavItem {
    const sampleImages = Array.isArray(item.sample_images) ? item.sample_images : [];
    const sampleVideos = Array.isArray(item.sample_videos) ? item.sample_videos : [];
    const primaryImage = sampleImages.find((img) => img.is_primary) ?? null;
    const primaryVideo = sampleVideos.find((vid) => vid.is_primary ?? true) ?? null;

    const searchText = `${item.title || ''} ${item.description || ''}`.trim();

    return {
      id: item.id,
      title: item.title || 'Untitled',
      level: item.level ?? 0,
      orderIndex: item.order_index ?? index,
      submissionType: item.submission_type ?? 'photo',
      isRequired: item.is_required ?? false,
      requiresPhoto: item.photo_requirements?.picture_required ?? false,
      hasPrimarySampleImage: sampleImages.some((img) => img.is_primary),
      hasSampleVideo: sampleVideos.some((vid) => vid.is_primary ?? true),
      primaryImageUrl: primaryImage?.url ?? null,
      sampleVideoUrl: primaryVideo?.url ?? null,
      isInvalid: false,
      searchText
    };
  }

  trackByItemId(index: number, item: ChecklistNavItem): number {
    return item.id ?? index;
  }

  toggleNavExpansion(itemIndex: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (this.expandedItems.has(itemIndex)) {
      this.expandedItems.delete(itemIndex);
    } else {
      this.expandedItems.add(itemIndex);
    }
  }

  hasChildren(itemIndex: number): boolean {
    const currentLevel = this.navItems[itemIndex]?.level ?? 0;
    if (itemIndex + 1 >= this.navItems.length) {
      return false;
    }
    const nextLevel = this.navItems[itemIndex + 1]?.level ?? 0;
    return nextLevel > currentLevel;
  }

  setShowOnlyOpenItems(value: boolean, opts?: { emit?: boolean }): void {
    const emit = opts?.emit !== false;
    const next = !!value;
    if (this.showOnlyOpenItems === next) {
      return;
    }

    this.showOnlyOpenItems = next;

    // When filtering to open items, ensure parents with open children are expanded
    if (this.showOnlyOpenItems) {
      this.expandParentsWithOpenDescendants();
    }

    if (emit) {
      this.showOnlyOpenItemsChange.emit(this.showOnlyOpenItems);
    }

    this.cdr.markForCheck();
  }

  private passesOpenFilter(itemIndex: number): boolean {
    if (!this.showOnlyOpenItems || this.isEditorMode()) {
      return true;
    }

    // Never hide the currently active item
    if (itemIndex === this.activeNavItemIndex) {
      return true;
    }

    const item = this.navItems[itemIndex];
    if (!item) return false;

    // Treat unknown completion as "open"
    if (item.isComplete !== true) {
      return true;
    }

    // Keep parents visible if any descendant is open
    if (this.hasOpenDescendant(itemIndex)) {
      return true;
    }

    return false;
  }

  private hasOpenDescendant(parentIndex: number): boolean {
    const parent = this.navItems[parentIndex];
    if (!parent) return false;

    const parentLevel = parent.level ?? 0;
    for (let i = parentIndex + 1; i < this.navItems.length; i++) {
      const candidate = this.navItems[i];
      const candidateLevel = candidate?.level ?? 0;
      if (candidateLevel <= parentLevel) {
        break;
      }

      if (candidate && candidate.isComplete !== true) {
        return true;
      }
    }

    return false;
  }

  private expandParentsWithOpenDescendants(): void {
    this.navItems.forEach((item, i) => {
      if ((item.level ?? 0) === 0 && this.hasOpenDescendant(i)) {
        this.expandedItems.add(i);
      }
    });
  }

  isNavItemVisible(itemIndex: number): boolean {
    const item = this.navItems[itemIndex];
    if (!item) {
      return false;
    }

    if (this.isNavSearchActive()) {
      return this.navSearchVisibleIndices.has(itemIndex) && this.passesOpenFilter(itemIndex);
    }

    if (!this.passesOpenFilter(itemIndex)) {
      return false;
    }

    if (item.level === 0) {
      return true;
    }

    for (let i = itemIndex - 1; i >= 0; i--) {
      const potentialParent = this.navItems[i];
      const parentLevel = potentialParent?.level ?? 0;
      if (parentLevel === item.level - 1) {
        return this.expandedItems.has(i) && this.isNavItemVisible(i);
      }
    }

    return false;
  }

  onNavSearchTermChanged(): void {
    const normalized = this.normalizeNavSearchTerm(this.navSearchTerm);

    if (!this.lastNormalizedSearchTerm && normalized) {
      this.savedExpandedItemsBeforeSearch = new Set(this.expandedItems);
    }

    if (this.lastNormalizedSearchTerm && !normalized) {
      if (this.savedExpandedItemsBeforeSearch) {
        this.expandedItems = new Set(this.savedExpandedItemsBeforeSearch);
      }
      this.savedExpandedItemsBeforeSearch = null;
    }

    this.lastNormalizedSearchTerm = normalized;
    this.updateNavSearchSets();

    if (normalized) {
      this.navSearchMatchedIndices.forEach((i) => this.expandParentsOfItem(i));
    }

    this.cdr.markForCheck();
  }

  clearNavSearch(): void {
    this.navSearchTerm = '';
    this.onNavSearchTermChanged();
  }

  isNavSearchActive(): boolean {
    return this.normalizeNavSearchTerm(this.navSearchTerm).length > 0;
  }

  isNavItemMatch(itemIndex: number): boolean {
    return this.isNavSearchActive() && this.navSearchMatchedIndices.has(itemIndex);
  }

  initializeNavExpansion(): void {
    // Don't wipe user expansion state on every items refresh.
    // This component receives frequent `items` updates (e.g., realtime refresh),
    // so only auto-expand on the initial load.
    if (this.expandedItems.size === 0) {
      this.navItems.forEach((_, i) => {
        if (this.hasChildren(i)) {
          this.expandedItems.add(i);
        }
      });
      return;
    }

    // Prune indices that no longer exist or no longer have children
    const maxIndex = this.navItems.length - 1;
    const next = new Set<number>();
    this.expandedItems.forEach((idx) => {
      if (idx >= 0 && idx <= maxIndex && this.hasChildren(idx)) {
        next.add(idx);
      }
    });
    this.expandedItems = next;
  }

  expandAllNav(): void {
    this.navItems.forEach((_, i) => {
      if (this.hasChildren(i)) {
        this.expandedItems.add(i);
      }
    });
  }

  collapseAllNav(): void {
    this.expandedItems.clear();
  }

  selectItem(itemIndex: number): void {
    const item = this.navItems[itemIndex];
    if (!item) {
      return;
    }

    this.activeNavItemIndex = itemIndex;
    this.itemSelected.emit({ itemId: item.id, index: itemIndex });
    this.cdr.markForCheck();
  }

  isEditorMode(): boolean {
    return this.mode === 'editor';
  }

  isReadonlyMode(): boolean {
    return this.mode === 'readonly';
  }

  onDrop(event: CdkDragDrop<string[]>): void {
    if (!this.isEditorMode() || this.isNavSearchActive()) {
      return;
    }

    this.navDrop.emit(event);
  }

  emitAction(action: string, index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.navAction.emit({ action, index });
  }

  requestPrimaryImage(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.primaryImageRequested.emit({ index });
  }

  requestSampleVideo(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.sampleVideoRequested.emit({ index });
  }

  requestUserPhoto(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const url = this.navItems[index]?.latestPhotoUrl;
    if (!url) {
      return;
    }
    this.userPhotoRequested.emit({ index, url });
  }

  private updateActiveFromInputs(): void {
    let newActiveIndex = -1;

    if (this.activeItemId !== null && this.activeItemId !== undefined) {
      newActiveIndex = this.navItems.findIndex((item) => item.id === this.activeItemId);
    } else if (this.activeItemIndex !== null && this.activeItemIndex !== undefined) {
      if (this.activeItemIndex >= 0 && this.activeItemIndex < this.navItems.length) {
        newActiveIndex = this.activeItemIndex;
      }
    }

    if (newActiveIndex !== -1 && newActiveIndex !== this.activeNavItemIndex) {
      this.activeNavItemIndex = newActiveIndex;
      this.expandParentsOfItem(newActiveIndex);
      this.scrollNavToActiveItem(newActiveIndex);
      this.cdr.markForCheck();
    }
  }

  private scrollNavToActiveItem(itemIndex: number): void {
    setTimeout(() => {
      const navElement = this.navContainer?.nativeElement.querySelector(`#nav-item-${itemIndex}`) as HTMLElement | null;
      const navContainer = this.navContainer?.nativeElement;

      if (navElement && navContainer) {
        const containerRect = navContainer.getBoundingClientRect();
        const elementRect = navElement.getBoundingClientRect();

        const isAboveView = elementRect.top < containerRect.top;
        const isBelowView = elementRect.bottom > containerRect.bottom;

        if (isAboveView || isBelowView) {
          const scrollTop = navElement.offsetTop - navContainer.clientHeight / 2 + navElement.clientHeight / 2;
          navContainer.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      }
    }, 150);
  }

  private expandParentsOfItem(itemIndex: number): void {
    const level = this.navItems[itemIndex]?.level ?? 0;
    if (level === 0) {
      return;
    }

    for (let i = itemIndex - 1; i >= 0; i--) {
      const parentLevel = this.navItems[i]?.level ?? 0;
      if (parentLevel < level && this.hasChildren(i)) {
        this.expandedItems.add(i);
      }
      if (parentLevel === 0) {
        break;
      }
    }
  }

  private normalizeNavSearchTerm(term: string): string {
    return (term || '').trim().toLowerCase();
  }

  private updateNavSearchSets(): void {
    const normalized = this.normalizeNavSearchTerm(this.navSearchTerm);

    this.navSearchMatchedIndices.clear();
    this.navSearchVisibleIndices.clear();
    this.navSearchMatchCount = 0;

    if (!normalized) {
      return;
    }

    this.navItems.forEach((item, i) => {
      const haystack = (item.searchText || item.title || '').toLowerCase();
      if (haystack.includes(normalized)) {
        this.navSearchMatchedIndices.add(i);
      }
    });

    this.navSearchMatchedIndices.forEach((i) => {
      this.navSearchVisibleIndices.add(i);
      this.getAncestorIndices(i).forEach((ancestor) => this.navSearchVisibleIndices.add(ancestor));
      this.getDescendantIndices(i).forEach((descendant) => this.navSearchVisibleIndices.add(descendant));
    });

    this.navSearchMatchCount = this.navSearchMatchedIndices.size;
  }

  private getAncestorIndices(itemIndex: number): number[] {
    const ancestors: number[] = [];
    const level = this.navItems[itemIndex]?.level ?? 0;
    if (level === 0) {
      return ancestors;
    }

    let currentLevel = level;
    for (let i = itemIndex - 1; i >= 0; i--) {
      const candidateLevel = this.navItems[i]?.level ?? 0;
      if (candidateLevel < currentLevel) {
        ancestors.push(i);
        currentLevel = candidateLevel;
      }
      if (candidateLevel === 0 && currentLevel === 0) {
        break;
      }
    }

    return ancestors;
  }

  private getDescendantIndices(itemIndex: number): number[] {
    const descendants: number[] = [];
    const level = this.navItems[itemIndex]?.level ?? 0;
    for (let i = itemIndex + 1; i < this.navItems.length; i++) {
      const candidateLevel = this.navItems[i]?.level ?? 0;
      if (candidateLevel <= level) {
        break;
      }
      descendants.push(i);
    }
    return descendants;
  }
}
