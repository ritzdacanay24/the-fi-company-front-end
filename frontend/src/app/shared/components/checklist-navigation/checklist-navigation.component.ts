import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, CdkDragMove, CdkDragSortEvent, DragDropModule } from '@angular/cdk/drag-drop';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { PhotoChecklistConfigService, ChecklistTemplate, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { Subject, takeUntil } from 'rxjs';
import { ChecklistNavItem } from '@app/shared/models/checklist-navigation.model';

@Component({
  selector: 'app-checklist-navigation',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, ScrollingModule, NgbDropdownModule],
  templateUrl: './checklist-navigation.component.html',
  styleUrls: ['./checklist-navigation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChecklistNavigationComponent implements OnChanges, OnDestroy {
  private static reorderModeByScope = new Map<string, boolean>();

  @Input() templateId: number | string | null = null;
  @Input() items: ChecklistNavItem[] | null = null;
  @Input() activeItemId: number | null = null;
  @Input() activeItemIndex: number | null = null;
  @Input() showSearch = true;
  @Input() showExpandCollapse = true;
  @Input() showMediaContext = false;
  @Input() mode: 'editor' | 'readonly' = 'readonly';
  @Input() allowReadonlyReorder = false;
  @Input() autoScrollActive = true;
  @Input() showItemNumbers = true;
  @Input() summary: { completed: number; total: number; percent: number } | null = null;
  @Input() cardStyle = true;
  @Input() height: string | null = null;  // e.g., '500px', 'calc(100vh - 300px)'
  @Input() disableVirtualScroll = false;

  @Input() showOnlyOpenItems = false;
  @Output() showOnlyOpenItemsChange = new EventEmitter<boolean>();

  @Output() itemSelected = new EventEmitter<{ itemId: number; index: number }>();
  @Output() navDrop = new EventEmitter<CdkDragDrop<any[]> | { sourceIndex: number; targetIndex: number; dropPosition: 'before' | 'inside' | 'after' }>();
  @Output() navAction = new EventEmitter<{ action: string; index: number }>();
  @Output() primaryImageRequested = new EventEmitter<{ index: number }>();
  @Output() sampleVideoRequested = new EventEmitter<{ index: number }>();
  @Output() userPhotoRequested = new EventEmitter<{ index: number; url: string }>();

  @ViewChild('navContainer') navContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('readonlyContainer') readonlyContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('editorViewport') editorViewport?: CdkVirtualScrollViewport;
  @ViewChild('readonlyViewport') readonlyViewport?: CdkVirtualScrollViewport;

  navItems: ChecklistNavItem[] = [];
  visibleNavItems: { item: ChecklistNavItem; originalIndex: number; hasChildren: boolean; isMatch: boolean }[] = [];
  navOutlineNumbers: string[] = [];
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
  private hasInitializedExpansionState = false;

  activeNavItemIndex = -1;
  isReorderDragging = false;
  reorderModeEnabled = false;
  isInvalidDropTarget = false;
  invalidDropTargetIndex: number | null = null;
  dragHoverTargetIndex: number | null = null;
  dragHoverPosition: 'before' | 'inside' | 'after' | null = null;
  private hoverExpandTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private hoverExpandTargetIndex: number | null = null;
  private insideLockTargetIndex: number | null = null;
  private hasRestoredReorderMode = false;

  // Read-only navigation filter: show only open (incomplete) items

  private destroy$ = new Subject<void>();

  constructor(
    private checklistService: PhotoChecklistConfigService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 Nav ngOnChanges:', changes);

    if (changes['templateId'] || changes['mode'] || changes['allowReadonlyReorder']) {
      this.hasRestoredReorderMode = false;
    }

    if (changes['items']) {
      console.log('📝 Items changed, count:', this.items?.length);
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

    if ((changes['mode'] || changes['allowReadonlyReorder']) && !this.canUseReorderControls()) {
      console.log('❌ Disabling reorder mode');
      this.reorderModeEnabled = false;
      this.isReorderDragging = false;
    }

    if ((changes['mode'] || changes['allowReadonlyReorder']) && this.isReadonlyMode() && this.allowReadonlyReorder && !this.isNavSearchActive()) {
      console.log('✅ Auto-enabling reorder mode for readonly with allowReadonlyReorder');
      this.reorderModeEnabled = true;
    }

    this.restoreReorderModeState();
  }

  ngOnDestroy(): void {
    if (this.hoverExpandTimeoutId) {
      clearTimeout(this.hoverExpandTimeoutId);
      this.hoverExpandTimeoutId = null;
    }
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
          this.recomputeVisible();
        },
        error: () => {
          this.isLoading = false;
          this.loadError = 'Unable to load navigation.';
          this.cdr.markForCheck();
        }
      });
  }

  private setItemsFromInput(): void {
    console.log('📥 setItemsFromInput called, items:', this.items?.length);

    if (!this.items || this.items.length === 0) {
      this.navItems = [];
      this.visibleNavItems = [];
      this.loadError = null;
      this.isLoading = false;
      this.cdr.markForCheck();
      console.log('📥 Cleared navItems (no input)');
      return;
    }

    const previousNavItems = this.navItems;
    const previousExpanded = new Set(this.expandedItems);
    const wasFullyExpanded = this.wereAllParentsExpanded(previousNavItems, previousExpanded);

    this.navItems = [...this.items];
    this.isLoading = false;
    this.loadError = null;

    console.log('📥 Updated navItems:', this.navItems.map((item, i) => `${i}: ${item.title}`));

    this.remapExpandedItems(previousNavItems, previousExpanded, this.navItems);

    if (wasFullyExpanded) {
      this.expandAllParentsInCurrentItems();
    }

    this.initializeNavExpansion();
    this.updateNavSearchSets();
    this.updateActiveFromInputs();
    this.recomputeVisible();
  }

  private wereAllParentsExpanded(items: ChecklistNavItem[], expanded: Set<number>): boolean {
    if (items.length === 0) {
      return false;
    }

    let parentCount = 0;
    for (let i = 0; i < items.length; i++) {
      if (this.hasChildrenFromList(items, i)) {
        parentCount++;
        if (!expanded.has(i)) {
          return false;
        }
      }
    }

    return parentCount > 0;
  }

  private expandAllParentsInCurrentItems(): void {
    this.navItems.forEach((_, i) => {
      if (this.hasChildren(i)) {
        this.expandedItems.add(i);
      }
    });
  }

  private hasChildrenFromList(items: ChecklistNavItem[], itemIndex: number): boolean {
    const currentLevel = items[itemIndex]?.level ?? 0;
    if (itemIndex + 1 >= items.length) {
      return false;
    }
    const nextLevel = items[itemIndex + 1]?.level ?? 0;
    return nextLevel > currentLevel;
  }

  private remapExpandedItems(
    previousItems: ChecklistNavItem[],
    previousExpanded: Set<number>,
    nextItems: ChecklistNavItem[]
  ): void {
    if (previousItems.length === 0 || previousExpanded.size === 0 || nextItems.length === 0) {
      return;
    }

    const nextIndicesByKey = new Map<string, number[]>();
    nextItems.forEach((item, index) => {
      const key = this.getExpansionIdentityKey(item);
      const bucket = nextIndicesByKey.get(key);
      if (bucket) {
        bucket.push(index);
      } else {
        nextIndicesByKey.set(key, [index]);
      }
    });

    const takenIndices = new Set<number>();
    const remapped = new Set<number>();

    previousExpanded.forEach((oldIndex) => {
      const oldItem = previousItems[oldIndex];
      if (!oldItem) {
        return;
      }

      const key = this.getExpansionIdentityKey(oldItem);
      const candidates = nextIndicesByKey.get(key) ?? [];
      const mappedIndex = candidates.find((idx) => !takenIndices.has(idx));

      if (mappedIndex !== undefined) {
        remapped.add(mappedIndex);
        takenIndices.add(mappedIndex);
        return;
      }

      // Fallback: retain same index when identity matching is ambiguous.
      if (oldIndex >= 0 && oldIndex < nextItems.length && !takenIndices.has(oldIndex)) {
        remapped.add(oldIndex);
        takenIndices.add(oldIndex);
      }
    });

    this.expandedItems = remapped;
  }

  private getExpansionIdentityKey(item: ChecklistNavItem): string {
    const numericId = Number(item?.id);
    if (Number.isFinite(numericId) && numericId > 0) {
      return `id:${numericId}`;
    }

    const normalizedTitle = String(item?.title ?? '').trim().toLowerCase();
    const level = item?.level ?? 0;
    const submissionType = item?.submissionType ?? 'photo';
    return `tmp:${normalizedTitle}|${level}|${submissionType}`;
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

    const normalizedTitle = String(item.title ?? '').trim() || 'Untitled';
    const searchText = `${normalizedTitle} ${item.description || ''}`.trim();

    return {
      id: item.id,
      title: normalizedTitle,
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

  trackByVisibleItem(index: number, entry: { item: ChecklistNavItem; originalIndex: number }): number {
    return entry.item.id ?? entry.originalIndex;
  }

  getNavIndexLabel(itemIndex: number): string {
    return this.navOutlineNumbers[itemIndex] ?? String(itemIndex + 1);
  }

  private recomputeOutlineNumbers(): void {
    const labels: string[] = [];
    const counters: number[] = [0];

    for (let i = 0; i < this.navItems.length; i++) {
      const rawLevel = Number(this.navItems[i]?.level ?? 0);
      const level = Number.isFinite(rawLevel) ? Math.max(0, Math.floor(rawLevel)) : 0;

      while (counters.length > level + 1) {
        counters.pop();
      }

      while (counters.length < level + 1) {
        counters.push(0);
      }

      counters[level] = (counters[level] ?? 0) + 1;
      labels[i] = counters.slice(0, level + 1).join('.');
    }

    this.navOutlineNumbers = labels;
  }

  recomputeVisible(): void {
    this.recomputeOutlineNumbers();

    const isSearchActive = this.isNavSearchActive();
    const result: { item: ChecklistNavItem; originalIndex: number; hasChildren: boolean; isMatch: boolean }[] = [];

    // Single O(n) forward pass — no recursive isNavItemVisible calls.
    // parentOpen[L] = true means the last visible item at level L-1 was expanded,
    // so items at level L are potentially accessible.
    // parentOpen[0] is always true (level-0 items have virtual root which is always open).
    const parentOpen: boolean[] = [];
    parentOpen[0] = true;

    for (let i = 0; i < this.navItems.length; i++) {
      const item = this.navItems[i];
      const L = item.level ?? 0;

      // Visibility: parent context must be open
      let visible = parentOpen[L] === true;

      // Apply search / open-items filters
      if (visible) {
        if (isSearchActive) {
          visible = this.navSearchVisibleIndices.has(i);
        } else if (this.showOnlyOpenItems && !this.isEditorMode()) {
          visible =
            i === this.activeNavItemIndex ||
            item.isComplete !== true ||
            this.hasOpenDescendant(i);
        }
      }

      // Precompute hasChildren: next item has a deeper level
      const hasChildren =
        i + 1 < this.navItems.length &&
        (this.navItems[i + 1]?.level ?? 0) > L;

      if (visible) {
        result.push({
          item,
          originalIndex: i,
          hasChildren,
          isMatch: isSearchActive && this.navSearchMatchedIndices.has(i),
        });
      }

      // Update parentOpen for children (L+1)
      parentOpen[L + 1] = visible && this.expandedItems.has(i);

      // Reset deeper levels — exiting this item's subtree invalidates previously
      // open contexts at levels L+2 and beyond for the remaining siblings/cousins.
      for (let k = L + 2; k < parentOpen.length; k++) {
        parentOpen[k] = false;
      }
    }

    this.visibleNavItems = result;
    this.editorViewport?.checkViewportSize();
    this.readonlyViewport?.checkViewportSize();
    this.cdr.markForCheck();
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
    this.recomputeVisible();
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

    this.recomputeVisible();
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
      this.isReorderDragging = false;
    }

    if (normalized) {
      this.navSearchMatchedIndices.forEach((i) => this.expandParentsOfItem(i));
    }

    this.recomputeVisible();
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
    // Auto-expand only once on first data load.
    if (!this.hasInitializedExpansionState && this.expandedItems.size === 0) {
      this.navItems.forEach((_, i) => {
        if (this.hasChildren(i)) {
          this.expandedItems.add(i);
        }
      });
      this.hasInitializedExpansionState = true;
      return;
    }

    this.hasInitializedExpansionState = true;

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
    this.recomputeVisible();
  }

  collapseAllNav(): void {
    this.expandedItems.clear();
    this.recomputeVisible();
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

  canUseReorderControls(): boolean {
    return this.isEditorMode() || this.allowReadonlyReorder;
  }

  isReorderViewportMode(): boolean {
    return this.canUseReorderControls();
  }

  shouldUseVirtualScroll(): boolean {
    return !this.disableVirtualScroll;
  }

  isReadonlyMode(): boolean {
    return this.mode === 'readonly';
  }

  canReorderInNav(): boolean {
    const result = this.canUseReorderControls() && this.reorderModeEnabled && !this.isNavSearchActive();
    console.log('🔍 canReorderInNav:', {
      result,
      canUseReorderControls: this.canUseReorderControls(),
      reorderModeEnabled: this.reorderModeEnabled,
      isNavSearchActive: this.isNavSearchActive(),
      mode: this.mode,
      allowReadonlyReorder: this.allowReadonlyReorder
    });
    return result;
  }

  toggleReorderMode(): void {
    if (!this.canUseReorderControls()) {
      return;
    }

    this.reorderModeEnabled = !this.reorderModeEnabled;
    if (!this.reorderModeEnabled) {
      this.isReorderDragging = false;
    }
    this.persistReorderModeState();
    this.cdr.markForCheck();
  }

  private getReorderModeScopeKey(): string {
    const template = this.parseTemplateId(this.templateId);
    const templatePart = template === null ? 'none' : String(template);
    return `${this.mode}|${templatePart}|${this.allowReadonlyReorder ? 'ro' : 'rw'}`;
  }

  private persistReorderModeState(): void {
    const key = this.getReorderModeScopeKey();
    ChecklistNavigationComponent.reorderModeByScope.set(key, !!this.reorderModeEnabled);
  }

  private restoreReorderModeState(): void {
    if (this.hasRestoredReorderMode) {
      return;
    }

    if (!this.canUseReorderControls()) {
      this.hasRestoredReorderMode = true;
      return;
    }

    if (this.isNavSearchActive()) {
      return;
    }

    const key = this.getReorderModeScopeKey();
    const persisted = ChecklistNavigationComponent.reorderModeByScope.get(key);
    if (typeof persisted === 'boolean') {
      this.reorderModeEnabled = persisted;
    }

    this.hasRestoredReorderMode = true;
  }

  onDrop(event: CdkDragDrop<any[]>): void {
    console.log('🚀 Nav onDrop called', { event, canReorder: this.canReorderInNav() });
    console.log('Event details:', {
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      itemData: event.item?.data,
      containerData: event.container?.data
    });

    if (!this.canReorderInNav()) {
      console.log('❌ Nav blocked: canReorderInNav is false');
      return;
    }

    this.isReorderDragging = false;
    this.isInvalidDropTarget = false;
    this.invalidDropTargetIndex = null;

    const sourceIndex = Number(event.item?.data);
    const liveIntent = Number.isInteger(sourceIndex)
      && sourceIndex >= 0
      && sourceIndex < this.navItems.length
      && this.dragHoverTargetIndex !== null
      && this.dragHoverPosition !== null
      ? {
          sourceIndex,
          targetIndex: this.dragHoverTargetIndex,
          dropPosition: this.dragHoverPosition
        }
      : null;

    const dropPoint = (event as any)?.dropPoint;
    const intent = liveIntent ?? this.resolveDropIntent(sourceIndex, dropPoint);
    if (intent) {
      console.log('✅ Nav emitting intent drop event', intent);
      this.navDrop.emit(intent);
      return;
    }

    console.log('✅ Nav emitting drop event');
    this.navDrop.emit(event);
  }

  onReorderDragStarted(): void {
    if (!this.canReorderInNav()) {
      return;
    }

    this.isReorderDragging = true;
    this.isInvalidDropTarget = false;
    this.invalidDropTargetIndex = null;
    this.dragHoverTargetIndex = null;
    this.dragHoverPosition = null;
    this.hoverExpandTargetIndex = null;
    this.insideLockTargetIndex = null;
    if (this.hoverExpandTimeoutId) {
      clearTimeout(this.hoverExpandTimeoutId);
      this.hoverExpandTimeoutId = null;
    }
    this.cdr.markForCheck();
  }

  onReorderDragMoved(event: CdkDragMove<any>): void {
    if (!this.canReorderInNav()) {
      return;
    }

    const sourceIndex = Number(event.source?.data);
    const point = event.pointerPosition;
    const intent = this.resolveDropIntent(sourceIndex, point);

    if (intent?.dropPosition === 'inside') {
      this.insideLockTargetIndex = intent.targetIndex;
    } else if (intent && this.insideLockTargetIndex !== null && intent.targetIndex !== this.insideLockTargetIndex) {
      this.insideLockTargetIndex = null;
    }

    this.dragHoverTargetIndex = intent?.targetIndex ?? null;
    this.dragHoverPosition = intent?.dropPosition ?? null;

    if (!intent || intent.dropPosition !== 'inside' || !this.hasChildren(intent.targetIndex) || this.expandedItems.has(intent.targetIndex)) {
      if (this.hoverExpandTimeoutId) {
        clearTimeout(this.hoverExpandTimeoutId);
        this.hoverExpandTimeoutId = null;
      }
      this.hoverExpandTargetIndex = null;
      this.cdr.markForCheck();
      return;
    }

    if (this.hoverExpandTargetIndex !== intent.targetIndex) {
      if (this.hoverExpandTimeoutId) {
        clearTimeout(this.hoverExpandTimeoutId);
      }
      this.hoverExpandTargetIndex = intent.targetIndex;
      this.hoverExpandTimeoutId = setTimeout(() => {
        if (this.hoverExpandTargetIndex !== null && !this.expandedItems.has(this.hoverExpandTargetIndex)) {
          this.expandedItems.add(this.hoverExpandTargetIndex);
          this.recomputeVisible();
        }
        this.hoverExpandTimeoutId = null;
      }, 450);
    }

    this.cdr.markForCheck();
  }

  onReorderDragEnded(): void {
    this.isReorderDragging = false;
    this.isInvalidDropTarget = false;
    this.invalidDropTargetIndex = null;
    this.dragHoverTargetIndex = null;
    this.dragHoverPosition = null;
    this.hoverExpandTargetIndex = null;
    this.insideLockTargetIndex = null;
    if (this.hoverExpandTimeoutId) {
      clearTimeout(this.hoverExpandTimeoutId);
      this.hoverExpandTimeoutId = null;
    }
    this.cdr.markForCheck();
  }

  onReorderDragSorted(event: CdkDragSortEvent<any[]>): void {
    void event;
    if (!this.canReorderInNav()) {
      this.isInvalidDropTarget = false;
      this.invalidDropTargetIndex = null;
      return;
    }

    // VS Code-like behavior: do not pre-block targets while dragging.
    // Final placement is resolved by drop intent (before/inside/after).
    this.isInvalidDropTarget = false;
    this.invalidDropTargetIndex = null;
    this.cdr.markForCheck();
  }

  private resolveDropIntent(sourceIndex: number, point: { x: number; y: number } | null | undefined): { sourceIndex: number; targetIndex: number; dropPosition: 'before' | 'inside' | 'after' } | null {
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= this.navItems.length || !point || typeof document === 'undefined') {
      return null;
    }

    const hitElement = document.elementFromPoint(point.x, point.y) as HTMLElement | null;
    let rowElement = hitElement?.closest('[id^="nav-item-"]') as HTMLElement | null;

    // Drag preview/placeholder can obscure elementFromPoint; scan full stack.
    if (!rowElement && typeof document.elementsFromPoint === 'function') {
      const stack = document.elementsFromPoint(point.x, point.y) as HTMLElement[];
      rowElement = stack
        .map((el) => el?.closest?.('[id^="nav-item-"]') as HTMLElement | null)
        .find((el) => !!el) || null;
    }

    if (!rowElement) {
      return null;
    }

    const id = rowElement.id || '';
    const targetIndex = parseInt(id.replace('nav-item-', ''), 10);
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= this.navItems.length) {
      return null;
    }

    const rect = rowElement.getBoundingClientRect();

    if (this.insideLockTargetIndex !== null && this.insideLockTargetIndex === targetIndex) {
      return { sourceIndex, targetIndex, dropPosition: 'inside' };
    }

    const topCutoff = rect.top + rect.height * 0.2;
    const bottomCutoff = rect.bottom - rect.height * 0.2;
    const stickyTopCutoff = rect.top + rect.height * 0.1;
    const stickyBottomCutoff = rect.bottom - rect.height * 0.1;

    let dropPosition: 'before' | 'inside' | 'after' = point.y < topCutoff
      ? 'before'
      : point.y > bottomCutoff
        ? 'after'
        : 'inside';

    // Hysteresis: when already hovering "inside" the same row, keep inside
    // unless pointer is clearly near the top/bottom edge.
    if (
      this.dragHoverTargetIndex === targetIndex
      && this.dragHoverPosition === 'inside'
      && point.y >= stickyTopCutoff
      && point.y <= stickyBottomCutoff
    ) {
      dropPosition = 'inside';
    }

    return { sourceIndex, targetIndex, dropPosition };
  }

  private wouldCreateInvalidHierarchy(sourceIndex: number, targetIndex: number): boolean {
    const sourceLevel = Number(this.navItems[sourceIndex]?.level ?? 0);
    const targetLevel = Number(this.navItems[targetIndex]?.level ?? 0);

    if (sourceLevel === 0) {
      return targetLevel > 0;
    }

    const sourceParentAnchor = this.findNearestAncestorIndexByLevel(sourceIndex, sourceLevel - 1);
    const targetParentAnchor = this.findNearestAncestorIndexByLevel(targetIndex, sourceLevel - 1);
    return targetLevel > sourceLevel || targetParentAnchor !== sourceParentAnchor;
  }

  private findNearestAncestorIndexByLevel(startIndex: number, targetLevel: number): number {
    for (let i = startIndex - 1; i >= 0; i--) {
      const level = Number(this.navItems[i]?.level ?? 0);
      if (level === targetLevel) {
        return i;
      }
    }
    return -1;
  }

  canMoveUpInGroup(index: number): boolean {
    return this.findPreviousSortableSiblingIndex(index) !== null;
  }

  canMoveDownInGroup(index: number): boolean {
    return this.findNextSortableSiblingIndex(index) !== null;
  }

  canPromoteInGroup(index: number): boolean {
    const level = Number(this.navItems[index]?.level ?? 0);
    return level > 0;
  }

  canPromoteToTopLevel(index: number): boolean {
    const level = Number(this.navItems[index]?.level ?? 0);
    return level > 0;
  }

  canDemoteInGroup(index: number): boolean {
    return this.findDemoteTargetIndex(index) !== null;
  }

  getPromoteDestinationLabel(index: number): string {
    const level = Number(this.navItems[index]?.level ?? 0);
    if (level <= 0) {
      return 'Already top level';
    }

    if (level === 1) {
      return 'Top level';
    }

    const newParentIndex = this.findNearestAncestorIndexByLevel(index, level - 2);
    if (newParentIndex < 0) {
      return 'Top level';
    }

    return this.getNavTargetLabel(newParentIndex);
  }

  getDemoteDestinationLabel(index: number): string {
    const targetIndex = this.findDemoteTargetIndex(index);
    if (targetIndex === null) {
      return 'No valid demote target';
    }

    return this.getNavTargetLabel(targetIndex);
  }

  private findDemoteTargetIndex(index: number): number | null {
    return this.findPreviousSortableSiblingIndex(index);
  }

  private getNavTargetLabel(index: number): string {
    const item = this.navItems[index];
    if (!item) {
      return 'Unknown item';
    }

    const outline = this.getNavIndexLabel(index);
    const title = String(item.title || 'Untitled').trim() || 'Untitled';
    return `${outline} ${title}`;
  }

  private findPreviousSortableSiblingIndex(index: number): number | null {
    const currentLevel = Number(this.navItems[index]?.level ?? 0);
    const currentParentAnchor = currentLevel > 0
      ? this.findNearestAncestorIndexByLevel(index, currentLevel - 1)
      : -1;

    for (let i = index - 1; i >= 0; i--) {
      const level = Number(this.navItems[i]?.level ?? 0);

      if (level < currentLevel) {
        break;
      }

      if (level !== currentLevel) {
        continue;
      }

      const parentAnchor = currentLevel > 0
        ? this.findNearestAncestorIndexByLevel(i, currentLevel - 1)
        : -1;

      if (parentAnchor === currentParentAnchor) {
        return i;
      }
    }

    return null;
  }

  private findNextSortableSiblingIndex(index: number): number | null {
    const currentLevel = Number(this.navItems[index]?.level ?? 0);
    const currentParentAnchor = currentLevel > 0
      ? this.findNearestAncestorIndexByLevel(index, currentLevel - 1)
      : -1;

    for (let i = this.getSubtreeEndExclusive(index); i < this.navItems.length; i++) {
      const level = Number(this.navItems[i]?.level ?? 0);

      if (level < currentLevel) {
        break;
      }

      if (level !== currentLevel) {
        continue;
      }

      const parentAnchor = currentLevel > 0
        ? this.findNearestAncestorIndexByLevel(i, currentLevel - 1)
        : -1;

      if (parentAnchor === currentParentAnchor) {
        return i;
      }
    }

    return null;
  }

  private getSubtreeEndExclusive(startIndex: number): number {
    const startLevel = Number(this.navItems[startIndex]?.level ?? 0);
    let end = startIndex + 1;

    while (end < this.navItems.length) {
      const level = Number(this.navItems[end]?.level ?? 0);
      if (level <= startLevel) {
        break;
      }
      end++;
    }

    return end;
  }

  isInHoveredDropGroup(itemIndex: number): boolean {
    if (!this.isReorderDragging || this.dragHoverPosition !== 'inside' || this.dragHoverTargetIndex === null) {
      return false;
    }

    const groupStart = this.dragHoverTargetIndex;
    const groupLevel = Number(this.navItems[groupStart]?.level ?? 0);
    if (!Number.isInteger(groupLevel)) {
      return false;
    }

    if (itemIndex < groupStart) {
      return false;
    }

    if (itemIndex === groupStart) {
      return true;
    }

    for (let i = groupStart + 1; i <= itemIndex && i < this.navItems.length; i++) {
      const level = Number(this.navItems[i]?.level ?? 0);
      if (level <= groupLevel) {
        return false;
      }
    }

    return true;
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
      this.recomputeVisible();  // parents may have been expanded above
      if (this.autoScrollActive) {
        this.scrollNavToActiveItem(newActiveIndex);
      }
    }
  }

  private scrollNavToActiveItem(itemIndex: number): void {
    setTimeout(() => {
      if (this.editorViewport) {
        const visibleIndex = this.visibleNavItems.findIndex((entry) => entry.originalIndex === itemIndex);
        if (visibleIndex >= 0) {
          this.editorViewport.scrollToIndex(visibleIndex, 'auto');
        }
        return;
      }

      if (this.readonlyViewport) {
        const visibleIndex = this.visibleNavItems.findIndex((entry) => entry.originalIndex === itemIndex);
        if (visibleIndex >= 0) {
          this.readonlyViewport.scrollToIndex(visibleIndex, 'auto');
        }
        return;
      }

      // Editor mode has all visible items in the DOM.
      const container = this.navContainer?.nativeElement ?? this.readonlyContainer?.nativeElement;
      if (!container) return;
      const navElement = container.querySelector(`#nav-item-${itemIndex}`) as HTMLElement | null;
      if (!navElement) return;
      navElement.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }, 100);
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
