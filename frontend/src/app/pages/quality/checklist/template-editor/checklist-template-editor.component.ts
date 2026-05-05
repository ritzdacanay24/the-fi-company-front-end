import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ViewChildren, TemplateRef, ChangeDetectorRef, ElementRef, QueryList, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { QuillModule, QuillModules } from 'ngx-quill';
import Quill from 'quill';
import { Subscription } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { PhotoChecklistConfigService, ChecklistTemplate, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { UploadService } from '@app/core/api/upload/upload.service';
import { PhotoChecklistUploadService } from '@app/core/api/photo-checklist/photo-checklist-upload.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { QualityDocumentSelectorComponent, QualityDocumentSelection } from '@app/shared/components/quality-document-selector/quality-document-selector.component';
import { ChecklistNavigationComponent } from '@app/shared/components/checklist-navigation/checklist-navigation.component';
import { ChecklistNavItem } from '@app/shared/models/checklist-navigation.model';
import { PdfParserService } from './services/pdf-parser.service';
import { WordParserService } from './services/word-parser.service';
import { RevisionDescriptionDialogComponent } from './components/revision-description-dialog.component';
import { FileViewerModalComponent } from '@app/shared/components/file-viewer-modal/file-viewer-modal.component';

interface SampleImage {
  id?: string;
  url: string;
  label?: string;
  description?: string;
  type?: 'photo' | 'drawing' | 'bom' | 'schematic' | 'reference' | 'diagram';
  image_type?: 'sample' | 'reference' | 'defect_example' | 'diagram';  // NEW: categorization for display
  is_primary: boolean;
  order_index: number;
  status?: 'loading' | 'loaded' | 'error';
}

interface SampleVideo {
  id?: string;
  url: string;
  label?: string;
  description?: string;
  type?: 'video' | 'screen' | 'other';
  is_primary: boolean;
  order_index: number;
  status?: 'loading' | 'loaded' | 'error';
  duration_seconds?: number | null;
}

interface ItemLink {
  title: string;
  url: string;
  description?: string;
}

interface CarouselImageItem {
  id: string;
  url: SafeUrl | string;
  isPrimary: boolean;
  refIndex: number | null;
}

interface ReorderUndoState {
  controls: AbstractControl[];
  sampleImages: { [itemIndex: number]: SampleImage | SampleImage[] | null };
  sampleVideos: { [itemIndex: number]: SampleVideo | SampleVideo[] | null };
  expandedItems: Set<number>;
  activeNavItemIndex: number;
}

@Component({
  selector: 'app-checklist-template-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbModule, QualityDocumentSelectorComponent, RouterModule, QuillModule, ChecklistNavigationComponent],
  templateUrl: './checklist-template-editor.component.html',
  styleUrls: ['./checklist-template-editor.component.scss']
})
export class ChecklistTemplateEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('importModal') importModalRef!: TemplateRef<any>;
  @ViewChild('copyAsParentModal') copyAsParentModalRef!: TemplateRef<any>;
  @ViewChild('imagePreviewModal') imagePreviewModalRef!: TemplateRef<any>;
  @ViewChild('videoPreviewModal') videoPreviewModalRef!: TemplateRef<any>;
  @ViewChild('previewModal') previewModalRef!: TemplateRef<any>;
  @ViewChild('linksModalTemplate') linksModalTemplate: any;
  @ViewChild('sidebarNavList') sidebarNavListRef?: ElementRef<HTMLElement>;
  @ViewChildren('itemTitleInput') itemTitleInputs!: QueryList<ElementRef<HTMLInputElement>>;

  templateForm: FormGroup;
  copyAsParentForm: FormGroup;
  editingTemplate: ChecklistTemplate | null = null;
  draftParentVersion: string | null = null;
  saving = false;
  copyingAsParent = false;
  loading = false;
  uploadingImage = false;
  selectedQualityDocument: QualityDocumentSelection | null = null;
  today = new Date();

  private static quillFileProtocolEnabled = false;
  private applyingAutoLinks = false;

  // Import functionality
  importing = false;
  importError: string | null = null;
  importManualName = '';
  importManualItemCount = 5;

  // Sample image management - single image per item
  sampleImages: { [itemIndex: number]: SampleImage | SampleImage[] | null } = {};
  sampleVideos: { [itemIndex: number]: SampleVideo | SampleVideo[] | null } = {};
  carouselActiveSlideByItem: { [itemIndex: number]: string } = {};
  currentModalItemIndex: number = -1;
  currentModalSubmissionType: 'photo' | 'video' | 'audio' | 'either' | 'none' = 'photo';
  currentLinksItemIndex: number = -1;

  // Navigation tree expansion state
  expandedItems: Set<number> = new Set<number>();

  // Navigation search/filter
  navSearchTerm = '';
  navSearchMatchCount = 0;
  private navSearchMatchedIndices = new Set<number>();
  private navSearchVisibleIndices = new Set<number>();
  private savedExpandedItemsBeforeSearch: Set<number> | null = null;
  private lastNormalizedSearchTerm = '';

  // Navigation view mode
  navViewMode: 'all' | 'groups' | 'items' = 'all';

  // Active panel in the master-detail layout
  activePanel: 'template-info' | 'item' = 'template-info';

  // Transient flag: hides the item panel (visibility:hidden) while Quill is being destroyed/recreated
  selectingItem = false;

  // Selected item for focused editing (null means show all)
  selectedFormItemIndex: number | null = null;

  // Focused edit mode toggle - when true, clicking items shows only that item; when false, just scrolls
  focusedEditMode: boolean = false;

  // Navigation media indicators toggle in editor/preview nav (default OFF)
  showNavMediaContext: boolean = false;

  // Active item tracking for scroll highlighting
  activeNavItemIndex: number = -1;
  stickyParentIndex: number | null = null;
  enableStickyNavParent = true;
  stickyNavAncestorIndices: number[] = [];
  private sidebarStickyRafPending = false;
  private lastSidebarStickyUpdateAt = 0;
  private readonly sidebarStickyThrottleMs = 110;
  private lastTopVisibleSidebarNavIndex: number | null = null;
  private lastStickyAncestorSignature = '';

  // Reorder state
  reorderFeedbackMessage = '';
  publishValidationErrors: string[] = [];
  private hasReorderMutations = false;

  private lastReorderUndoState: ReorderUndoState | null = null;
  private reorderFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly navMediaPreferenceStorageKey = 'checklist-template-editor.show-nav-media-context';

  // Navigation panel heights (customizable per view)
  editorNavHeight = 'calc(100vh - 190px)';
  previewNavHeight = 'calc(100vh - 230px)';
  private scrollCheckTimeout: any = null;
  private boundScrollHandler: (() => void) | null = null;
  private sidebarNavScrollHandler: (() => void) | null = null;
  private activeItemObserver: IntersectionObserver | null = null;
  private visibleItemEntries: Map<number, IntersectionObserverEntry> = new Map();
  private scheduledFallbackCheck = false;
  private activeTrackingRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
  private suppressObserverUpdatesUntil = 0;
  private readonly programmaticScrollLockMs = 650;
  private nextTempNavId = 1000000000;
  private tempNavIds = new WeakMap<FormGroup, number>();

  // Modal template references
  @ViewChild('sampleImagesModalTemplate') sampleImagesModalTemplate: any;
  @ViewChild('sampleVideoModalTemplate') sampleVideoModalTemplate: any;

  // Image preview
  previewImageUrl: string | null = null;
  // Video preview
  previewVideoUrl: string | null = null;

  // Video upload state
  uploadingVideo = false;

  // Auto-save functionality
  autoSaveEnabled = false;
  lastSavedAt: Date | null = null;
  private autoSaveTimeout: any = null;

  // Unsaved changes tracking (sequence-based so we can handle async saves)
  private suppressChangeTracking = false;
  private changeSeq = 0;
  private savedSeq = 0;
  private changeTrackingReady = false;

  private routeParamSub?: Subscription;
  private routeQueryParamSub?: Subscription;
  private templateFormChangesSub?: Subscription;
  private navItemsSub?: Subscription;
  private requestedNavItemIndex: number | null = null;
  private pendingUrlItemRestore = false;
  private restoreNavSelectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingSelectedItemQueryParamTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingStickyAncestorsRaf = false;
  editorNavItems: ChecklistNavItem[] = [];

  // Quill editor configuration
  quillConfig: QuillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ]
  };

  constructor(
    private fb: FormBuilder,
    public route: ActivatedRoute,
    private router: Router,
    private configService: PhotoChecklistConfigService,
    private authenticationService: AuthenticationService,
    private modalService: NgbModal,
    private attachmentsService: AttachmentsService,
    private uploadService: UploadService,
    private photoUploadService: PhotoChecklistUploadService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private pdfParser: PdfParserService,
    private wordParser: WordParserService,
    private sanitizer: DomSanitizer
  ) {
    this.ensureQuillFileLinksEnabled();
    this.templateForm = this.createTemplateForm();
    this.copyAsParentForm = this.createCopyAsParentForm();
  }

  private createCopyAsParentForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      category: ['inspection'],
      description: [''],
      part_number: [''],
      product_type: [''],
      customer_name: [''],
      is_active: [true]
    });
  }

  private stripVersionSuffixFromName(name: string): string {
    let cleaned = String(name || '').trim();

    // Remove trailing "(vX)", "(vX.Y)", or "(vX.Y.Z)" suffixes.
    const suffixRegex = /\s*\(v\d+(?:\.\d+){0,2}\)\s*$/i;
    while (suffixRegex.test(cleaned)) {
      cleaned = cleaned.replace(suffixRegex, '').trim();
    }

    return cleaned;
  }

  public getDisplayTemplateName(template: ChecklistTemplate | null): string {
    if (!template) {
      return '';
    }
    return this.stripVersionSuffixFromName(template.name);
  }

  printChecklist(): void {
    window.print();
  }

  setTemplateActiveStatus(makeActive: boolean): void {
    if (!this.editingTemplate || this.saving || this.loading) {
      return;
    }

    const templateId = Number(this.editingTemplate.id || 0);
    if (templateId <= 0) {
      return;
    }

    const nextActive = !!makeActive;
    const currentActive = !!this.editingTemplate.is_active;
    if (nextActive === currentActive) {
      return;
    }

    const actionLabel = nextActive ? 'activate' : 'deactivate';
    const confirmMessage = nextActive
      ? `Activate this template? It will be available for new checklist instances.`
      : `Deactivate this template? It will no longer be available for new checklist instances.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    this.saving = true;

    // Send a full metadata payload (not just is_active) to stay compatible with older backends
    // that expect required fields like name in update requests.
    const payload: any = {
      name: this.editingTemplate.name,
      description: this.editingTemplate.description ?? '',
      part_number: this.editingTemplate.part_number ?? '',
      customer_part_number: (this.editingTemplate as any)?.customer_part_number ?? null,
      customer_name: (this.editingTemplate as any)?.customer_name ?? null,
      revision: (this.editingTemplate as any)?.revision ?? null,
      original_filename: (this.editingTemplate as any)?.original_filename ?? null,
      review_date: (this.editingTemplate as any)?.review_date ?? null,
      revision_number: (this.editingTemplate as any)?.revision_number ?? null,
      revision_details: (this.editingTemplate as any)?.revision_details ?? null,
      revised_by: (this.editingTemplate as any)?.revised_by ?? null,
      product_type: (this.editingTemplate as any)?.product_type ?? '',
      category: 'inspection',
      version: this.editingTemplate.version ?? '1.0',
      is_active: nextActive ? 1 : 0
    };

    this.configService.updateTemplate(templateId, payload).subscribe({
      next: (response) => {
        this.saving = false;
        if ((response as any)?.success === false) {
          alert((response as any)?.error || (response as any)?.message || `Failed to ${actionLabel} template.`);
          return;
        }

        this.loadTemplate(templateId);
      },
      error: (error) => {
        console.error(`Error attempting to ${actionLabel} template:`, error);
        this.saving = false;
      }
    });
  }

  private ensureQuillFileLinksEnabled(): void {
    if (ChecklistTemplateEditorComponent.quillFileProtocolEnabled) {
      return;
    }

    try {
      const Link = (Quill as any).import('formats/link');
      const whitelist = Link?.PROTOCOL_WHITELIST;
      if (!Array.isArray(whitelist)) {
        return;
      }

      if (!whitelist.includes('file')) {
        whitelist.push('file');
        (Quill as any).register(Link, true);
      }

      ChecklistTemplateEditorComponent.quillFileProtocolEnabled = true;
    } catch {
      // If Quill internals change or aren't available, just skip the whitelist patch.
    }
  }

  onQuillContentChanged(event: any): void {
    const editor = event?.editor;
    const source = event?.source;
    if (!editor || source !== 'user' || this.applyingAutoLinks) {
      return;
    }

    const text: string = editor.getText?.() ?? '';
    if (!text || (!text.includes('\\') && !text.toLowerCase().includes('http') && !/\b[A-Z]:\\/.test(text))) {
      return;
    }

    const matches = this.findAutoLinkMatches(text);
    if (matches.length === 0) {
      return;
    }

    this.applyingAutoLinks = true;
    try {
      for (const match of matches) {
        const existing = editor.getFormat?.(match.index, match.length);
        if (existing?.link) {
          continue;
        }
        editor.formatText(match.index, match.length, 'link', match.href, 'silent');
      }
    } finally {
      this.applyingAutoLinks = false;
    }
  }

  private findAutoLinkMatches(text: string): Array<{ index: number; length: number; href: string }> {
    const results: Array<{ index: number; length: number; href: string }> = [];

    const add = (index: number, raw: string, href: string) => {
      let value = raw;
      while (value.length > 0 && /[\s\]\)\}\.,;:!?]+$/.test(value)) {
        value = value.replace(/[\s\]\)\}\.,;:!?]+$/, '');
      }
      if (!value) {
        return;
      }
      results.push({ index, length: value.length, href });
    };

    // http/https URLs
    const httpRegex = /\bhttps?:\/\/[^\s<]+/gi;
    let m: RegExpExecArray | null;
    while ((m = httpRegex.exec(text)) !== null) {
      add(m.index, m[0], m[0]);
    }

    // www.* URLs -> https://www.*
    const wwwRegex = /\bwww\.[^\s<]+/gi;
    while ((m = wwwRegex.exec(text)) !== null) {
      add(m.index, m[0], `https://${m[0]}`);
    }

    // Windows drive paths (link to file:///)
    const drivePathRegex = /\b[A-Z]:\\[^\n\r<>]+/g;
    while ((m = drivePathRegex.exec(text)) !== null) {
      const raw = m[0];
      const normalized = raw.replace(/\\/g, '/');
      const href = encodeURI(`file:///${normalized}`);
      add(m.index, raw, href);
    }

    // UNC paths (e.g. \\server\share\folder\file)
    const uncRegex = /\\\\[^\n\r<>]+/g;
    while ((m = uncRegex.exec(text)) !== null) {
      const raw = m[0];
      const uncNoPrefix = raw.replace(/^\\\\/, '');
      const normalized = uncNoPrefix.replace(/\\/g, '/');
      const href = encodeURI(`file://${normalized}`);
      add(m.index, raw, href);
    }

    // Prefer longer matches first to avoid partial overlaps.
    results.sort((a, b) => (b.length - a.length) || (a.index - b.index));

    // Drop overlaps.
    const filtered: typeof results = [];
    for (const r of results) {
      const overlaps = filtered.some(f => !(r.index + r.length <= f.index || f.index + f.length <= r.index));
      if (!overlaps) {
        filtered.push(r);
      }
    }
    filtered.sort((a, b) => a.index - b.index);
    return filtered;
  }

  ngOnInit(): void {
    document.body.classList.add('tce-page-active');
    this.loadNavDisplayPreferences();

    // Rebuild navigation sidebar whenever form items change (debounced to avoid rebuilding on every keystroke).
    this.navItemsSub = this.items.valueChanges.pipe(debounceTime(150)).subscribe(() => {
      this.rebuildEditorNavItems();
    });

    // Track user edits. Some widgets (notably rich text editors) can emit valueChanges
    // during initialization; gate tracking until the form is fully ready.
    this.templateFormChangesSub = this.templateForm.valueChanges.subscribe(() => {
      if (this.suppressChangeTracking) {
        return;
      }

      if (!this.changeTrackingReady) {
        return;
      }

      this.changeSeq++;
    });

    // React to route ID changes (e.g., Save Draft navigates to a new template ID).
    this.routeParamSub = this.route.paramMap.subscribe((params) => {
      const templateId = params.get('id');
      if (templateId) {
        this.loadTemplate(Number(templateId));
        return;
      }

      // New template state
      this.editingTemplate = null;
      this.lastSavedAt = null;
      this.updateSelectedItemQueryParam(null);

      this.changeTrackingReady = false;
      this.suppressChangeTracking = true;

      this.templateForm.reset();
      this.templateForm.patchValue({
        category: 'inspection',
        description: '',
        max_upload_size_mb: null,
        disable_max_upload_limit: true,
        is_active: true,
        quality_document_id: null
      });

      while (this.items.length) {
        this.items.removeAt(0);
      }

      this.sampleImages = {};

      this.changeSeq = 0;
      this.savedSeq = 0;
      this.templateForm.markAsPristine();
      this.suppressChangeTracking = false;

      this.initializeNavExpansion();

      // Start tracking after the initial setup settles.
      setTimeout(() => {
        this.changeTrackingReady = true;
        this.markSaved();
      }, 0);
    });

    // Keep selected item in URL (?item=INDEX) and restore on refresh/load.
    this.routeQueryParamSub = this.route.queryParamMap.subscribe((params) => {
      this.isViewOnly = params.get('readonly') === '1';

      const raw = params.get('item');
      const parsed = raw !== null ? Number(raw) : NaN;
      const nextRequested = Number.isInteger(parsed) && parsed >= 0 ? parsed : null;

      const isAlreadySelectedInItemPanel =
        nextRequested !== null &&
        this.activePanel === 'item' &&
        this.selectedFormItemIndex === nextRequested;

      if (isAlreadySelectedInItemPanel) {
        this.requestedNavItemIndex = nextRequested;
        this.pendingUrlItemRestore = false;
        return;
      }

      this.requestedNavItemIndex = nextRequested;
      this.pendingUrlItemRestore = nextRequested !== null;

      if (nextRequested === null) {
        return;
      }

      this.scheduleRestoreRequestedNavItemSelection();
    });
  }
  isViewOnly = false;

  isPublishedLocked(): boolean {
    if (this.isViewOnly) return true;
    return !!this.editingTemplate && !this.editingTemplate.is_draft;
  }

  canReorderPublishedTemplateInPlace(): boolean {
    return this.isPublishedLocked();
  }

  startMajorVersionDraft(): void {
    if (this.saving || !this.editingTemplate || this.editingTemplate.is_draft || this.isViewOnly) {
      return;
    }

    this.saving = true;

    this.configService.createParentVersion(this.editingTemplate.id).subscribe({
      next: (response: any) => {
        this.saving = false;

        if (response?.success === false) {
          // If a draft already exists, navigate to it instead of blocking
          const existingDraftId = Number(response?.existing_draft_id || 0);
          if (response?.code === 'DRAFT_ALREADY_EXISTS' && existingDraftId > 0) {
            this.loadTemplate(existingDraftId);
            this.router.navigate(['/inspection-checklist/template-editor', existingDraftId], { replaceUrl: true });
            return;
          }
          alert(response?.error || response?.message || 'Unable to start major version draft.');
          return;
        }

        const newId = Number(response?.template_id || 0);
        if (newId > 0) {
          this.loadTemplate(newId);
          this.router.navigate(['/quality/checklist/template-editor', newId], { replaceUrl: true });
          return;
        }

        alert('Unable to start major version draft.');
      },
      error: (error) => {
        console.error('Error creating major version draft:', error);
        this.saving = false;
      }
    });
  }

  openCopyAsNewParentModal(): void {
    if (!this.editingTemplate || this.saving || this.loading) {
      return;
    }

    const currentName = this.stripVersionSuffixFromName(this.templateForm.get('name')?.value || this.editingTemplate.name || '');
    const suggestedName = currentName ? `${currentName} (Copy)` : 'New Template Copy';

    this.copyAsParentForm.reset({
      name: suggestedName,
      category: 'inspection',
      description: this.templateForm.get('description')?.value || this.editingTemplate.description || '',
      part_number: this.templateForm.get('part_number')?.value || this.editingTemplate.part_number || '',
      product_type: this.templateForm.get('product_type')?.value || this.editingTemplate.product_type || '',
      customer_name: this.templateForm.get('customer_name')?.value || (this.editingTemplate as any)?.customer_name || '',
      is_active: true
    });

    this.copyAsParentForm.markAsPristine();
    this.copyAsParentForm.markAsUntouched();

    this.modalService.open(this.copyAsParentModalRef, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: false
    });
  }

  createCopyAsNewParent(modal: any): void {
    if (!this.editingTemplate || this.copyingAsParent || this.saving) {
      return;
    }

    this.copyAsParentForm.markAllAsTouched();
    if (this.copyAsParentForm.invalid) {
      return;
    }

    this.copyingAsParent = true;

    const templateData = this.buildTemplatePayload();
    const modalValue = this.copyAsParentForm.value;

    templateData.name = this.stripVersionSuffixFromName(String(modalValue.name || '').trim());
    templateData.category = 'inspection';
    templateData.description = modalValue.description || '';
    templateData.part_number = modalValue.part_number || '';
    templateData.product_type = modalValue.product_type || '';
    templateData.customer_name = modalValue.customer_name || '';
    templateData.is_active = !!modalValue.is_active ? 1 : 0;
    templateData.is_draft = 0;  // New standalone templates publish immediately
    templateData.version = '1.0';
    templateData.created_by = this.getCurrentUserIdentifier();

    delete templateData.id;
    delete templateData.source_template_id;

    // Copy structure/content only. Do NOT carry over any media assets.
    // This removes primary sample image, reference images, and sample videos.
    if (Array.isArray(templateData.items)) {
      templateData.items = templateData.items.map((item: any) => {
        const sanitizedItem = { ...item };

        sanitizedItem.sample_image_url = null;
        sanitizedItem.sample_images = [];
        sanitizedItem.sample_videos = [];

        return sanitizedItem;
      });
    }

    this.configService.createTemplate(templateData).subscribe({
      next: (response: any) => {
        this.copyingAsParent = false;

        if (response?.success === false) {
          this.handleTemplateSaveFailureResponse(response, 'template');
          return;
        }

        const newTemplateId = Number(response?.template_id || 0);
        modal.close();

        if (newTemplateId > 0) {
          this.router.navigate(['/quality/checklist/template-editor', newTemplateId], { replaceUrl: true });
          this.loadTemplate(newTemplateId);
          return;
        }

        alert('Template copy created, but no template ID was returned by the server.');
      },
      error: (error) => {
        console.error('Error copying template as new parent:', error);
        this.copyingAsParent = false;
      }
    });
  }

  private hasUnsavedChanges(): boolean {
    return this.changeSeq > this.savedSeq;
  }

  private markSaved(startedSeq?: number): void {
    // Treat all changes up to this point as saved.
    this.savedSeq = Math.max(this.savedSeq, this.changeSeq, startedSeq ?? 0);
    this.hasReorderMutations = false;

    // Reset form dirty/pristine state without incrementing change tracking.
    this.suppressChangeTracking = true;
    this.templateForm.markAsPristine();
    this.suppressChangeTracking = false;

    // Some controls (notably rich text editors) can emit delayed value updates.
    // Re-baseline once on next tick to avoid false "unsaved changes" prompts.
    setTimeout(() => {
      this.savedSeq = Math.max(this.savedSeq, this.changeSeq);
      this.suppressChangeTracking = true;
      this.templateForm.markAsPristine();
      this.suppressChangeTracking = false;
    }, 0);
  }

  canDeactivate(): boolean {
    if (this.saving) {
      return window.confirm('A save is currently in progress. Leave this page anyway?');
    }
    if (!this.hasUnsavedChanges()) {
      return true;
    }
    return window.confirm('You have unsaved changes. Leave this page without saving?');
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: BeforeUnloadEvent): void {
    // Browser will show a generic warning message.
    if (this.saving || this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  ngAfterViewInit(): void {
    this.refreshActiveItemTracking();
    this.setupSidebarNavScrollListener();
    // Ensure initial highlight is correct
    this.checkActiveItem();
    // In large templates, initial DOM paint can lag behind data load.
    // Retry URL-based restore after the first view is initialized.
    this.scheduleRestoreRequestedNavItemSelection();
    setTimeout(() => this.updateSidebarStickyAncestors(), 0);
  }

  createTemplateForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      category: ['inspection', Validators.required],
      description: [''],
      // Optional override (MB) for maximum upload size when editing this template
      max_upload_size_mb: [null],
      // When true, disable max upload size checks for this template (use with caution)
      disable_max_upload_limit: [true],
      part_number: [''],
      product_type: [''],
      customer_part_number: [''],
      customer_name: [''],
      revision: [''],
      original_filename: [''],
      review_date: [''],
      revision_number: [''],
      revision_details: [''],
      revised_by: [''],
      is_active: [true],
      quality_document_id: [null], // Add quality document field
      items: this.fb.array([])
    });
  }

  /**
   * Return effective maximum upload size in bytes.
   * If a per-template override (max_upload_size_mb) is set, use that (MB -> bytes).
   * Otherwise use sensible defaults per file type.
   */
  getMaxUploadBytes(fileType: 'image' | 'video'): number {
    // If the template explicitly disables the upload limit, return a very large value
    const disabled = !!this.templateForm.get('disable_max_upload_limit')?.value;
    if (disabled) {
      return Number.MAX_SAFE_INTEGER; // Effectively disable client-side size checks
    }

    const overrideMb = Number(this.templateForm.get('max_upload_size_mb')?.value || 0);
    if (overrideMb && overrideMb > 0) {
      return overrideMb * 1024 * 1024;
    }

    // Defaults
    if (fileType === 'video') return 50 * 1024 * 1024; // 50MB
    return 5 * 1024 * 1024; // 5MB for images
  }

  get items(): FormArray {
    return this.templateForm.get('items') as FormArray;
  }

  readonly trackByIndex = (index: number): number => index;
  private toBoolFlag(value: unknown): boolean {
    return value === true || value === 1 || value === '1';
  }

  private normalizeTemplateFlags<T extends Record<string, any>>(template: T): T & { is_active: boolean; is_draft: boolean } {
    return {
      ...template,
      is_active: this.toBoolFlag(template?.['is_active']),
      is_draft: this.toBoolFlag(template?.['is_draft'])
    };
  }

  getItemFormGroup(index: number): FormGroup | null {
    if (index < 0 || index >= this.items.length) {
      return null;
    }
    return this.items.at(index) as FormGroup;
  }

  loadTemplate(id: number): void {
    this.loading = true;
    this.configService.getTemplateIncludingInactive(id).subscribe({
      next: (template) => {
        if (!template) {
          console.error('Template not found');
          alert('Template not found. Redirecting to template manager.');
          this.navigateToTemplateManager(id);
          this.loading = false;
          return;
        }

        // Normalize backend values (often 0/1 or '0'/'1') to real booleans.
        // Important: string '0' is truthy in JS/Angular templates and will incorrectly display as Active.
        const normalizedTemplate: any = this.normalizeTemplateFlags(template as any);

        this.editingTemplate = normalizedTemplate as ChecklistTemplate;
        this.draftParentVersion = null;
        this.lastSavedAt = null;
        this.hasReorderMutations = false;
        this.changeTrackingReady = false;
        this.suppressChangeTracking = true;
        this.populateForm(this.editingTemplate);
        // Loaded state should not count as “unsaved”.
        this.changeSeq = 0;
        this.savedSeq = 0;
        this.templateForm.markAsPristine();
        this.suppressChangeTracking = false;

        // Allow any late widget initialization to settle, then baseline.
        setTimeout(() => {
          this.changeTrackingReady = true;
          this.markSaved();
        }, 0);

        // Expand all parent items by default in navigation
        this.initializeNavExpansion();
        this.rebuildEditorNavItems();
        this.loading = false;

        this.scheduleRestoreRequestedNavItemSelection();

        this.loadDraftParentVersion(this.editingTemplate);
      },
      error: (error) => {
        console.error('Error loading template:', error);
        this.loading = false;
        alert('Error loading template: ' + (error.message || 'Unknown error'));
        this.navigateToTemplateManager(id);
      }
    });
  }

  private loadDraftParentVersion(currentTemplate: ChecklistTemplate): void {
    this.draftParentVersion = null;

    if (!currentTemplate?.is_draft) {
      return;
    }

    const parentId = Number((currentTemplate as any)?.parent_template_id || 0);
    if (parentId <= 0) {
      return;
    }

    this.configService.getTemplateIncludingInactive(parentId).subscribe({
      next: (parentTemplate) => {
        // Ignore stale responses if user navigated away.
        if (!this.editingTemplate || Number(this.editingTemplate.id || 0) !== Number(currentTemplate.id || 0)) {
          return;
        }

        const parentVersion = String(parentTemplate?.version || '').trim();
        this.draftParentVersion = parentVersion ? parentVersion : null;
      },
      error: () => {
        // Non-blocking hint only.
      }
    });
  }

  populateForm(template: ChecklistTemplate): void {
    if (!template) {
      console.error('populateForm called with null template');
      return;
    }

    this.templateForm.patchValue({
      name: this.stripVersionSuffixFromName(template.name),
      category: 'inspection',
      description: template.description,
      max_upload_size_mb: (template as any).max_upload_size_mb || null,
      disable_max_upload_limit: (template as any).disable_max_upload_limit || false,
      part_number: template.part_number,
      customer_part_number: template.customer_part_number,
      customer_name: (template as any).customer_name ?? '',
      revision: template.revision,
      original_filename: template.original_filename,
      review_date: template.review_date,
      revision_number: template.revision_number,
      revision_details: template.revision_details,
      revised_by: template.revised_by,
      product_type: template.product_type,
      is_active: template.is_active,
      quality_document_id: template.quality_document_metadata?.document_id || null
    });

    // Clear existing items and sample media
    while (this.items.length) {
      this.items.removeAt(0);
    }
    this.sampleImages = {};
    this.sampleVideos = {};

    // Recursively flatten nested items structure to flat list
    const flattenedItems = this.flattenNestedItems(template.items || []);

    // Add template items and their sample images
    if (flattenedItems.length > 0) {
      flattenedItems.forEach((item, index) => {
        this.items.push(this.createItemFormGroup(item));

        // Always initialize videos from backend data, even when no sample image exists.
        if (item.sample_videos && Array.isArray(item.sample_videos) && item.sample_videos.length > 0) {
          this.sampleVideos[index] = item.sample_videos;
        }

        // Load sample images - handle both array format and single URL
        if (item.sample_images && Array.isArray(item.sample_images) && item.sample_images.length > 0) {
          // Array format: Load all images (primary + references)
          const loadedImages: SampleImage[] = item.sample_images.map((img: any, imgIndex: number) => ({
            id: `loaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${imgIndex}`,
            url: img.url,
            label: img.label || (img.is_primary ? 'Sample Image' : `Reference ${imgIndex}`),
            description: img.description || '',
            type: img.type || 'photo',
            image_type: img.image_type || (img.is_primary ? 'sample' : 'reference'),
            is_primary: img.is_primary || false,
            order_index: img.order_index || imgIndex,
            status: 'loaded' as const
          }));

          this.sampleImages[index] = loadedImages;

          // Update the form control with all images
          const itemFormGroup = this.items.at(index) as FormGroup;
          if (itemFormGroup) {
            this.patchLoadedItemMedia(itemFormGroup, item, loadedImages);
          }

        } else if (item.sample_image_url) {
          // Single URL format: Just the primary image
          this.sampleImages[index] = {
            id: `loaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: item.sample_image_url,
            label: 'Sample Image',
            description: '',
            type: 'photo',
            image_type: 'sample',
            is_primary: true,
            order_index: 0,
            status: 'loaded' as const
          };

          // Update the form control with the loaded sample image URL
          const itemFormGroup = this.items.at(index) as FormGroup;
          if (itemFormGroup) {
            this.patchLoadedItemMedia(itemFormGroup, item, [this.sampleImages[index] as SampleImage]);
          }

        }
      });
    }

    // Recalculate order indices to ensure correct outline numbering display
    this.recalculateOrderIndices();

    // Reinitialize navigation + tracking after loading items
    this.expandedItems.clear();
    this.initializeNavExpansion();
    this.updateNavSearchSets();

    this.rebuildEditorNavItems();
    this.cdr.detectChanges();
    this.scheduleActiveItemTrackingRefresh();
  }

  /**
   * Recursively flatten nested items structure to flat array
   * Converts children arrays to flat list with level/parent_id preserved
   * @param items Nested items array (may contain children arrays)
   * @param level Current nesting level (0 for root)
   * @param parentId Parent item's database ID
   * @returns Flat array of items in display order
   */
  private flattenNestedItems(items: any[], level: number = 0, parentId: number | null = null): any[] {
    const result: any[] = [];

    items.forEach(item => {
      // Add current item with level/parent_id metadata
      const flatItem = {
        ...item,
        level: level,
        parent_id: parentId
      };

      // Remove children array from the item itself (we'll flatten it)
      const children = flatItem.children;
      delete flatItem.children;

      result.push(flatItem);

      // Recursively flatten children
      if (children && Array.isArray(children) && children.length > 0) {
        const flattenedChildren = this.flattenNestedItems(children, level + 1, item.id);
        result.push(...flattenedChildren);
      }
    });

    return result;
  }

  private getItemSubmissionType(item: any): string {
    return String(item?.submission_type || 'photo');
  }

  private getItemMaxVideoDuration(item: any): number {
    return Number(item?.photo_requirements?.max_video_duration_seconds || item?.video_requirements?.max_duration_seconds || 30);
  }

  private getItemSubmissionTimeSeconds(item: any): number | null {
    return item?.submission_time_seconds || null;
  }

  private getItemSampleVideos(item: any): any[] {
    return Array.isArray(item?.sample_videos) ? item.sample_videos : [];
  }

  private buildPhotoRequirementsValue(
    item: any,
    options: { defaultMinPhotos: number | null; defaultMaxPhotos: number | null; defaultPictureRequired: boolean }
  ): {
    angle: string;
    distance: string;
    lighting: string;
    focus: string;
    min_photos: number | null;
    max_photos: number | null;
    picture_required: boolean;
    max_video_duration_seconds: number;
  } {
    return {
      angle: item?.photo_requirements?.angle || '',
      distance: item?.photo_requirements?.distance || '',
      lighting: item?.photo_requirements?.lighting || '',
      focus: item?.photo_requirements?.focus || '',
      min_photos: item?.photo_requirements?.min_photos ?? options.defaultMinPhotos,
      max_photos: item?.photo_requirements?.max_photos ?? options.defaultMaxPhotos,
      picture_required: item?.photo_requirements?.picture_required !== undefined
        ? Boolean(item.photo_requirements.picture_required)
        : options.defaultPictureRequired,
      max_video_duration_seconds: this.getItemMaxVideoDuration(item)
    };
  }

  private patchLoadedItemMedia(itemFormGroup: FormGroup, item: any, sampleImages: SampleImage[]): void {
    itemFormGroup.patchValue({
      sample_image_url: item.sample_image_url || sampleImages.find(img => img.is_primary)?.url || sampleImages[0]?.url || null,
      sample_images: sampleImages,
      sample_videos: this.getItemSampleVideos(item),
      photo_requirements: {
        ...(itemFormGroup.get('photo_requirements')?.value || {}),
        submission_type: item?.photo_requirements?.submission_type || 'photo',
        max_video_duration_seconds: this.getItemMaxVideoDuration(item)
      },
      submission_time_seconds: this.getItemSubmissionTimeSeconds(item)
    });
  }

  createItemFormGroup(item?: ChecklistItem): FormGroup {
    return this.fb.group({
      id: [item?.id || null], // Include ID for change detection
      title: [item?.title || '', Validators.required],
      description: [item?.description || ''],
      is_required: [item?.is_required !== undefined ? item.is_required : true],
      needs_media_upload: [item?.needs_media_upload !== undefined ? !!item.needs_media_upload : false],
      order_index: [item?.order_index || this.items.length + 1],
      // TOP-LEVEL: submission_type is a separate ENUM column in database (photo, video, either)
      submission_type: [this.getItemSubmissionType(item)],
      links: this.buildLinksFormArray((item as any)?.links || []),
      photo_requirements: this.fb.group(this.buildPhotoRequirementsValue(item, {
        defaultMinPhotos: null,
        defaultMaxPhotos: null,
        defaultPictureRequired: true
      })),
      // TOP-LEVEL: per-item submission time limit (in seconds). Stored in video_requirements JSON. Null or 0 = no limit
      submission_time_seconds: [this.getItemSubmissionTimeSeconds(item)],
      sample_image_url: [item?.sample_image_url || item?.sample_images?.[0]?.url || null], // Use sample_image_url or first sample_images URL
      sample_images: [item?.sample_images || null], // NEW: Array of all sample/reference images
      sample_videos: [this.getItemSampleVideos(item)], // NEW: Array of sample videos (init as empty array)
      level: [item?.level || 0], // 0 = parent, 1 = child
      parent_id: [item?.parent_id || null] // Reference to parent item
    });
  }

  /**
   * Helper method to add an item to the form with its sample images
   * Used during PDF import to handle both parent and child items
   */
  private addItemToForm(item: any, formIndex: number, parentId?: number): void {
    const itemGroup = this.createItemFormGroup();

    // Determine sample image URL
    let sampleImageUrl: string | null = null;
    let hasImages = false;

    // Check if item has sample_images array (from PDF/Word import)
    if (item.sample_images && Array.isArray(item.sample_images) && item.sample_images.length > 0) {
      hasImages = true;
      // Use the first (or primary) image
      const primaryImage = item.sample_images.find((img: any) => img.is_primary) || item.sample_images[0];
      sampleImageUrl = primaryImage.url;

      // Store in sampleImages dictionary for UI display
      this.sampleImages[formIndex] = {
        id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: primaryImage.url,
        label: primaryImage.label || 'Sample Image',
        description: primaryImage.description || '',
        type: primaryImage.type || 'photo',
        is_primary: true,
        order_index: 0,
        status: 'loaded'
      };

      // Trigger change detection
      this.cdr.detectChanges();
    }

    itemGroup.patchValue({
      title: item.title,
      description: item.description || '',
      order_index: item.order_index,
      is_required: item.is_required !== undefined ? item.is_required : true,
      needs_media_upload: item.needs_media_upload !== undefined ? !!item.needs_media_upload : false,
      submission_type: this.getItemSubmissionType(item), // TOP-LEVEL: Separate ENUM column
      sample_image_url: sampleImageUrl,
      level: item.level || 0,
      parent_id: parentId || item.parent_id || null,
      photo_requirements: this.buildPhotoRequirementsValue(item, {
        defaultMinPhotos: 1,
        defaultMaxPhotos: 5,
        defaultPictureRequired: hasImages
      }),
      submission_time_seconds: this.getItemSubmissionTimeSeconds(item),
      sample_videos: (item as any)?.sample_videos || null
    });

    if (Array.isArray(item.links)) {
      itemGroup.setControl('links', this.buildLinksFormArray(item.links));
    }

    this.items.push(itemGroup);
  }

  private createLinkFormGroup(link?: ItemLink): FormGroup {
    return this.fb.group({
      title: [link?.title || '', Validators.required],
      url: [link?.url || '', Validators.required],
      description: [link?.description || '']
    });
  }

  private buildLinksFormArray(links?: ItemLink[] | null): FormArray {
    const linkItems = Array.isArray(links) ? links : [];
    return this.fb.array(linkItems.map(link => this.createLinkFormGroup({ ...link })));
  }

  getLinksFormArray(itemIndex: number): FormArray {
    const item = this.items.at(itemIndex) as FormGroup | undefined;
    const links = item?.get('links');
    return (links as FormArray) || this.fb.array([]);
  }

  addLink(itemIndex: number): void {
    this.getLinksFormArray(itemIndex).push(this.createLinkFormGroup());
    this.templateForm.markAsDirty();
  }

  removeLink(itemIndex: number, linkIndex: number): void {
    const links = this.getLinksFormArray(itemIndex);
    if (linkIndex >= 0 && linkIndex < links.length) {
      links.removeAt(linkIndex);
      this.templateForm.markAsDirty();
    }
  }

  openLinksModal(itemIndex: number): void {
    this.currentLinksItemIndex = itemIndex;
    this.modalService.open(this.linksModalTemplate, { size: 'lg', centered: true });
  }

  addItem(): void {
    const newIndex = this.items.length;
    this.items.push(this.createItemFormGroup());
    this.recalculateOrderIndices();
    this.updateNavSearchSets();
    this.rebuildEditorNavItems();
    this.cdr.detectChanges();
    this.scheduleActiveItemTrackingRefresh();
    setTimeout(() => {
      this.selectItem(newIndex);
      this.scrollToItem(newIndex, { fromNavigation: true });
      this.scrollNavItemIntoViewSoon(newIndex);
    }, 0);
  }

  /**
   * Add a sub-item (child) under a parent item at the next nesting level
   */
  addSubItem(parentIndex: number): void {
    const parentItem = this.items.at(parentIndex);
    const parentLevel = parentItem.get('level')?.value || 0;
    const parentOrderIndex = parentItem.get('order_index')?.value || (parentIndex + 1);
    const parentDbId = parentItem.get('id')?.value; // Use database ID, not order_index

    // New child will be at parent level + 1
    const childLevel = parentLevel + 1;

    // Count existing children at this level for this parent
    let childCount = 0;
    for (let i = parentIndex + 1; i < this.items.length; i++) {
      const item = this.items.at(i);
      const itemLevel = item.get('level')?.value || 0;
      const itemParentId = item.get('parent_id')?.value;

      // Stop when we hit an item at parent level or lower (sibling or uncle)
      if (itemLevel <= parentLevel) break;

      // Count direct children only (same level, same parent)
      if (itemLevel === childLevel && itemParentId === parentDbId) {
        childCount++;
      }
    }

    // Calculate the new sub-item's order_index (e.g., 5.1, 5.1.1, 5.1.1.1)
    const newOrderIndex = parentOrderIndex + ((childCount + 1) * Math.pow(0.1, childLevel));

    // Build outline number for the new item based on parent
    // Parent is 1 → child will be 1.1
    // Parent is 1.1 → child will be 1.1.1
    const parentOutlineNumber = this.getOutlineNumber(parentIndex);
    const newOutlineNumber = `${parentOutlineNumber}.${childCount + 1}`;

    // Create new sub-item with proper form group structure
    const subItem = this.fb.group({
      id: [null], // New item has no ID yet
      title: ['', Validators.required],
      description: [''],
      order_index: [newOrderIndex],
      is_required: [true],
      submission_type: ['photo'],
      links: this.fb.array([]),
      sample_image_url: [null],
      sample_images: [null],
      level: [childLevel],
      parent_id: [parentDbId], // Store database ID, not order_index
      photo_requirements: this.fb.group({
        angle: [''],
        distance: [''],
        lighting: [''],
        focus: [''],
        min_photos: [1],
        max_photos: [5],
        picture_required: [true],
        max_video_duration_seconds: [30]
      }),
      submission_time_seconds: [null],
      sample_videos: []
    });

    // Insert right after the last descendant of this parent (or after parent if no children)
    let insertIndex = parentIndex + 1;
    for (let i = parentIndex + 1; i < this.items.length; i++) {
      const itemLevel = this.items.at(i).get('level')?.value || 0;
      // Stop when we hit an item at parent level or lower
      if (itemLevel <= parentLevel) break;
      insertIndex = i + 1;
    }

    this.items.insert(insertIndex, subItem);

    const shiftOnInsert = <T>(dict: { [itemIndex: number]: T }): { [itemIndex: number]: T } => {
      const updated: { [itemIndex: number]: T } = {};
      Object.keys(dict).forEach((key) => {
        const oldIndex = parseInt(key, 10);
        const newIndex = oldIndex >= insertIndex ? oldIndex + 1 : oldIndex;
        updated[newIndex] = dict[oldIndex];
      });
      return updated;
    };

    // Shift sample media dictionaries so the new sub-item starts clean
    this.sampleImages = shiftOnInsert(this.sampleImages);
    this.sampleVideos = shiftOnInsert(this.sampleVideos);

    // Shift expanded items and active index (index-based state)
    const updatedExpanded = new Set<number>();
    this.expandedItems.forEach((oldIndex) => {
      const newIndex = oldIndex >= insertIndex ? oldIndex + 1 : oldIndex;
      updatedExpanded.add(newIndex);
    });
    this.expandedItems = updatedExpanded;

    if (this.activeNavItemIndex >= insertIndex) {
      this.activeNavItemIndex = this.activeNavItemIndex + 1;
    }

    this.recalculateOrderIndices(); // Auto-calculate order after adding sub-item

    this.rebuildEditorNavItems();
    this.cdr.detectChanges();
    this.updateNavSearchSets();
    setTimeout(() => {
      this.scheduleActiveItemTrackingRefresh(0);
      this.selectItem(insertIndex);
      this.scrollToItem(insertIndex, { fromNavigation: true });
      this.scrollNavItemIntoViewSoon(insertIndex);
    }, 0);
  }

  /**
   * Promote item up one level (decrease nesting)
   */
  promoteItem(index: number): void {
    const item = this.items.at(index);
    const currentLevel = item.get('level')?.value || 0;

    if (currentLevel === 0) return; // Already at top level

    const parentIndex = this.findNearestAncestorIndexByLevel(index, currentLevel - 1);
    const subtreeEnd = this.getSubtreeEndExclusive(index);
    const subtreeLength = subtreeEnd - index;
    const parentSubtreeEnd = parentIndex >= 0 ? this.getSubtreeEndExclusive(parentIndex) : subtreeEnd;

    // Outdent by moving the entire block after the old parent subtree so
    // former siblings stay with the old parent.
    let targetStart = parentSubtreeEnd;
    if (index < targetStart) {
      targetStart -= subtreeLength;
    }

    const oldLength = this.items.length;
    const oldStart = index;
    const oldEnd = subtreeEnd;

    const movedBlock = this.items.controls.splice(index, subtreeLength);

    movedBlock.forEach((control) => {
      const level = Number(control.get('level')?.value || 0);
      control.patchValue({ level: Math.max(0, level - 1) });
    });

    this.items.controls.splice(targetStart, 0, ...movedBlock);
  this.remapIndexedEditorStateAfterMove(oldStart, oldEnd, targetStart, oldLength);

    this.rebuildParentReferencesFromLevels();
    this.hasReorderMutations = true;

    this.recalculateOrderIndices(); // Auto-calculate order

    this.rebuildEditorNavItems();
    this.cdr.detectChanges();
  }

  /**
   * Demote item (nest under previous sibling)
   */
  demoteItem(index: number): void {
    if (index === 0) return; // Can't demote first item

    const newParentIndex = this.findPreviousSortableSiblingIndex(index);
    if (newParentIndex === null) return;

    const currentLevel = Number(this.items.at(index).get('level')?.value || 0);
    const newParentLevel = Number(this.items.at(newParentIndex).get('level')?.value || 0);
    const newLevel = newParentLevel + 1;
    const levelDelta = newLevel - currentLevel;
    if (levelDelta <= 0) return;

    const subtreeEnd = this.getSubtreeEndExclusive(index);
    const subtreeLength = subtreeEnd - index;
    let targetStart = this.getSubtreeEndExclusive(newParentIndex);
    if (index < targetStart) {
      targetStart -= subtreeLength;
    }

    const oldLength = this.items.length;
    const oldStart = index;
    const oldEnd = subtreeEnd;

    const movedBlock = this.items.controls.splice(index, subtreeLength);

    movedBlock.forEach((control) => {
      const level = Number(control.get('level')?.value || 0);
      control.patchValue({ level: level + levelDelta });
    });

    this.items.controls.splice(targetStart, 0, ...movedBlock);
  this.remapIndexedEditorStateAfterMove(oldStart, oldEnd, targetStart, oldLength);

    this.rebuildParentReferencesFromLevels();
    this.hasReorderMutations = true;

    this.recalculateOrderIndices(); // Auto-calculate order

    this.rebuildEditorNavItems();
    this.cdr.detectChanges();
  }

  private remapIndexedEditorStateAfterMove(oldStart: number, oldEnd: number, targetStart: number, oldLength: number): void {
    const movedLength = oldEnd - oldStart;

    const mapOldIndexToNewIndex = (oldIndex: number): number => {
      if (oldIndex >= oldStart && oldIndex < oldEnd) {
        return targetStart + (oldIndex - oldStart);
      }

      if (targetStart < oldStart) {
        if (oldIndex >= targetStart && oldIndex < oldStart) {
          return oldIndex + movedLength;
        }
        return oldIndex;
      }

      if (oldIndex >= oldEnd && oldIndex < targetStart + movedLength) {
        return oldIndex - movedLength;
      }

      return oldIndex;
    };

    const remapIndexedDict = <T>(dict: { [itemIndex: number]: T }): { [itemIndex: number]: T } => {
      const updated: { [itemIndex: number]: T } = {};
      Object.keys(dict).forEach((key) => {
        const oldIndex = parseInt(key, 10);
        if (!Number.isInteger(oldIndex) || oldIndex < 0 || oldIndex >= oldLength) {
          return;
        }

        const newIndex = mapOldIndexToNewIndex(oldIndex);
        updated[newIndex] = dict[oldIndex];
      });
      return updated;
    };

    this.sampleImages = remapIndexedDict(this.sampleImages);
    this.sampleVideos = remapIndexedDict(this.sampleVideos);

    const updatedExpanded = new Set<number>();
    this.expandedItems.forEach((oldIndex) => {
      if (!Number.isInteger(oldIndex) || oldIndex < 0 || oldIndex >= oldLength) {
        return;
      }
      updatedExpanded.add(mapOldIndexToNewIndex(oldIndex));
    });
    this.expandedItems = updatedExpanded;

    if (this.activeNavItemIndex >= 0 && this.activeNavItemIndex < oldLength) {
      this.activeNavItemIndex = mapOldIndexToNewIndex(this.activeNavItemIndex);
    }
  }

  /**
   * Check if item can be demoted (has a previous sibling or parent to nest under)
   */
  canDemote(index: number): boolean {
    return this.findPreviousSortableSiblingIndex(index) !== null;
  }

  /**
   * Recursively promote all descendants by one level
   */
  private promoteDescendants(parentIndex: number, parentOldLevel: number): void {
    const parentOrderIndex = this.items.at(parentIndex).get('order_index')?.value;

    for (let i = parentIndex + 1; i < this.items.length; i++) {
      const item = this.items.at(i);
      const itemLevel = item.get('level')?.value || 0;
      const itemParentId = item.get('parent_id')?.value;

      // Stop when we hit item at parent's old level or lower
      if (itemLevel <= parentOldLevel) break;

      // Promote this descendant
      item.patchValue({ level: itemLevel - 1 });
    }
  }

  /**
   * Recursively demote all descendants
   */
  private demoteDescendants(parentIndex: number, parentOldLevel: number, levelDelta: number): void {
    for (let i = parentIndex + 1; i < this.items.length; i++) {
      const item = this.items.at(i);
      const itemLevel = item.get('level')?.value || 0;

      // Stop when we hit item at parent's old level or lower
      if (itemLevel <= parentOldLevel) break;

      // Demote this descendant
      item.patchValue({ level: itemLevel + levelDelta });
    }
  }

  /**
   * Get label for nesting level (Sub-item, Sub-sub-item, etc.)
   */
  getLevelLabel(level: number): string {
    if (!level || level === 0) return 'Item';
    if (level === 1) return 'Sub-item';
    if (level === 2) return 'Sub-sub-item';

    // For deeper levels, use numeric representation
    const prefix = 'Sub-'.repeat(level);
    return `${prefix}item`;
  }

  removeItem(index: number): void {
    const item = this.items.at(index);
    const itemLevel = item.get('level')?.value || 0;

    // Collect all descendants (children, grandchildren, etc.)
    const itemsToRemove: number[] = [index];

    for (let i = index + 1; i < this.items.length; i++) {
      const checkItem = this.items.at(i);
      const checkLevel = checkItem.get('level')?.value || 0;

      // Stop when we hit an item at same or lower level (sibling or uncle)
      if (checkLevel <= itemLevel) break;

      // This is a descendant - mark for removal
      itemsToRemove.push(i);
    }

    const removedSorted = [...itemsToRemove].sort((a, b) => a - b);
    const removedSet = new Set<number>(itemsToRemove);
    const oldImages = { ...this.sampleImages };
    const oldVideos = { ...this.sampleVideos };

    // Remove from bottom to top to maintain indices
    for (let i = itemsToRemove.length - 1; i >= 0; i--) {
      const removeIndex = itemsToRemove[i];
      this.items.removeAt(removeIndex);
    }

    const shiftByRemovedBefore = (oldIndex: number): number => {
      let shift = 0;
      for (const r of removedSorted) {
        if (r < oldIndex) shift++;
      }
      return shift;
    };

    // Rebuild sample media dictionaries with updated indices
    this.sampleImages = {};
    Object.keys(oldImages).forEach(key => {
      const oldIndex = parseInt(key, 10);
      if (removedSet.has(oldIndex)) return;
      const newIndex = oldIndex - shiftByRemovedBefore(oldIndex);
      this.sampleImages[newIndex] = oldImages[oldIndex];
    });

    this.sampleVideos = {};
    Object.keys(oldVideos).forEach(key => {
      const oldIndex = parseInt(key, 10);
      if (removedSet.has(oldIndex)) return;
      const newIndex = oldIndex - shiftByRemovedBefore(oldIndex);
      this.sampleVideos[newIndex] = oldVideos[oldIndex];
    });

    // Shift expanded items and active index
    const updatedExpanded = new Set<number>();
    this.expandedItems.forEach((oldIndex) => {
      if (removedSet.has(oldIndex)) return;
      const newIndex = oldIndex - shiftByRemovedBefore(oldIndex);
      updatedExpanded.add(newIndex);
    });
    this.expandedItems = updatedExpanded;

    if (this.activeNavItemIndex >= 0) {
      if (removedSet.has(this.activeNavItemIndex)) {
        this.activeNavItemIndex = -1;
      } else {
        this.activeNavItemIndex = this.activeNavItemIndex - shiftByRemovedBefore(this.activeNavItemIndex);
      }
    }

    this.recalculateOrderIndices();
    this.updateNavSearchSets();

    this.rebuildEditorNavItems();
    this.cdr.detectChanges();
    this.scheduleActiveItemTrackingRefresh();
  }

  /**
   * Handle drop in navigation (needs to map visible indices to actual indices)
   */
  dropNavItem(event: { orderedIndices: number[] } | { sourceIndex: number; targetIndex: number; dropPosition: 'before' | 'inside' | 'after' }): void {

    if (this.isPublishedLocked() && !this.canReorderPublishedTemplateInPlace()) {
            return;
    }

    const orderedIndices = (event as any)?.orderedIndices;
    if (Array.isArray(orderedIndices) && orderedIndices.length === this.items.length) {
            this.applyAbsoluteOrder(orderedIndices);
      return;
    }

    const intentDrop = event as any;
    if (
      Number.isInteger(intentDrop?.sourceIndex)
      && Number.isInteger(intentDrop?.targetIndex)
      && (intentDrop?.dropPosition === 'before' || intentDrop?.dropPosition === 'inside' || intentDrop?.dropPosition === 'after')
    ) {
      const sourceIndex = Number(intentDrop.sourceIndex);
      const targetIndex = Number(intentDrop.targetIndex);
      const dropPosition = intentDrop.dropPosition as 'before' | 'inside' | 'after';

      if (sourceIndex < 0 || sourceIndex >= this.items.length || targetIndex < 0 || targetIndex >= this.items.length) {
                return;
      }

      const currentIndexForPerformDrop = dropPosition === 'before'
        ? targetIndex
        : dropPosition === 'after'
          ? this.getSubtreeEndExclusive(targetIndex)
          : targetIndex;

            this.performDrop(sourceIndex, currentIndexForPerformDrop, { useAnchorIndex: true, dropPosition, targetIndex });
      return;
    }
  }

  private applyAbsoluteOrder(orderedIndices: number[]): void {
    const oldLength = this.items.length;
    const oldControls = [...this.items.controls];

    const seen = new Set<number>();
    for (const idx of orderedIndices) {
      if (!Number.isInteger(idx) || idx < 0 || idx >= oldLength || seen.has(idx)) {
        return;
      }
      seen.add(idx);
    }

    const undoSnapshot: ReorderUndoState = {
      controls: [...this.items.controls],
      sampleImages: { ...this.sampleImages },
      sampleVideos: { ...this.sampleVideos },
      expandedItems: new Set(this.expandedItems),
      activeNavItemIndex: this.activeNavItemIndex
    };

    const reorderedControls = orderedIndices.map((idx) => oldControls[idx]).filter(Boolean);
    if (reorderedControls.length !== oldLength) {
      return;
    }

    const oldToNew = new Map<number, number>();
    orderedIndices.forEach((oldIdx, newIdx) => oldToNew.set(oldIdx, newIdx));

    const remapIndexedDict = <T>(dict: { [itemIndex: number]: T }): { [itemIndex: number]: T } => {
      const updated: { [itemIndex: number]: T } = {};
      Object.keys(dict).forEach((key) => {
        const oldIndex = parseInt(key, 10);
        if (Number.isNaN(oldIndex) || oldIndex < 0 || oldIndex >= oldLength) {
          return;
        }
        const newIndex = oldToNew.get(oldIndex);
        if (newIndex === undefined) {
          return;
        }
        updated[newIndex] = dict[oldIndex];
      });
      return updated;
    };

    this.items.controls.splice(0, this.items.controls.length, ...reorderedControls);
    this.sampleImages = remapIndexedDict(this.sampleImages);
    this.sampleVideos = remapIndexedDict(this.sampleVideos);

    const updatedExpanded = new Set<number>();
    this.expandedItems.forEach((oldIndex) => {
      const newIndex = oldToNew.get(oldIndex);
      if (newIndex !== undefined) {
        updatedExpanded.add(newIndex);
      }
    });
    this.expandedItems = updatedExpanded;

    if (this.activeNavItemIndex >= 0 && this.activeNavItemIndex < oldLength) {
      const mappedActive = oldToNew.get(this.activeNavItemIndex);
      this.activeNavItemIndex = mappedActive ?? this.activeNavItemIndex;
    }

    this.rebuildParentReferencesFromLevels();
    this.recalculateOrderIndices();
    this.updateNavSearchSets();

    this.lastReorderUndoState = undoSnapshot;
    this.showReorderFeedback('items', 0);

    // Rebuild navigation items to reflect new order
    this.rebuildEditorNavItems();

    this.cdr.detectChanges();
    this.scheduleActiveItemTrackingRefresh();
  }

  /**
   * Get array of actual indices for currently visible items in navigation
   */
  getVisibleItemIndices(): number[] {
    const visibleIndices: number[] = [];
    this.items.controls.forEach((item, i) => {
      if (this.isNavItemVisible(i)) {
        visibleIndices.push(i);
      }
    });
    return visibleIndices;
  }

  /**
   * Perform the actual drop operation (shared by main form and navigation)
   */
  private performDrop(previousIndex: number, currentIndex: number, options?: { useAnchorIndex?: boolean; dropPosition?: 'before' | 'inside' | 'after'; targetIndex?: number }): void {
        const placement = this.calculateDropPlacement(previousIndex, currentIndex, options);
        if (!placement) {
            return;
    }

    if (placement.isNoOp) {
            return;
    }

    const subtreeEnd = placement.subtreeEnd;
    const subtreeLength = placement.subtreeLength;
    let targetStart = placement.targetStart;
    const targetInsideMovedSubtree = targetStart >= previousIndex && targetStart < subtreeEnd;
    let levelAdjustment = 0;

    const movedItemControl = this.items.at(previousIndex) as FormGroup;
    const movedItemTitle = movedItemControl?.get('title')?.value || 'Untitled';
    const movedLevel = Number(movedItemControl?.get('level')?.value || 0);
    const originalParentAnchor = movedLevel > 0
      ? this.findNearestAncestorIndexByLevel(previousIndex, movedLevel - 1)
      : -1;

        const explicitDropPosition = options?.dropPosition;
    const explicitInsideDrop = explicitDropPosition === 'inside';
    const hasExplicitIntent = !!explicitDropPosition && Number.isInteger(options?.targetIndex);
    const explicitTargetIndex = hasExplicitIntent ? Number(options?.targetIndex) : -1;
    const isNavDrivenDrop = options?.useAnchorIndex === true;

    if (hasExplicitIntent && explicitTargetIndex >= 0 && explicitTargetIndex < this.items.length) {
      const anchorLevel = Number(this.items.at(explicitTargetIndex)?.get('level')?.value || 0);
      const anchorInsideMovedSubtree = explicitTargetIndex >= previousIndex && explicitTargetIndex < subtreeEnd;

      if (explicitInsideDrop && !anchorInsideMovedSubtree) {
        const anchorSubtreeEnd = this.getSubtreeEndExclusive(explicitTargetIndex);
        let nestedTargetStart = anchorSubtreeEnd;
        if (previousIndex < anchorSubtreeEnd) {
          nestedTargetStart = anchorSubtreeEnd - subtreeLength;
        }

        const maxStart = this.items.length - subtreeLength;
        targetStart = Math.max(0, Math.min(nestedTargetStart, maxStart));
        levelAdjustment = (anchorLevel + 1) - movedLevel;
      } else if (!explicitInsideDrop) {
        // before/after: align moved block to the target row's level
        levelAdjustment = anchorLevel - movedLevel;
      }

          }

    // If dropping inside a top-level folder row, treat it as
    // "move into folder" (append at end of that folder's subtree).
    // For pointer-intent drops, this only happens for explicit "inside".
    // For legacy drop path, keep previous behavior for non-folder drags.
    if (currentIndex >= 0 && currentIndex < this.items.length) {
      const anchorLevel = Number(this.items.at(currentIndex)?.get('level')?.value || 0);
      const anchorInsideMovedSubtree = currentIndex >= previousIndex && currentIndex < subtreeEnd;

      const shouldNestIntoFolder = explicitInsideDrop;
      if (shouldNestIntoFolder && anchorLevel === 0 && !anchorInsideMovedSubtree && currentIndex !== previousIndex) {
        const anchorSubtreeEnd = this.getSubtreeEndExclusive(currentIndex);
        let nestedTargetStart = anchorSubtreeEnd;
        if (previousIndex < anchorSubtreeEnd) {
          nestedTargetStart = anchorSubtreeEnd - subtreeLength;
        }

        const maxStart = this.items.length - subtreeLength;
        targetStart = Math.max(0, Math.min(nestedTargetStart, maxStart));

        const targetLevel = anchorLevel + 1;
        levelAdjustment = targetLevel - movedLevel;
              }
    }

    // Drag reorder should not implicitly create invalid hierarchy. When we are
    // in explicit drop-into-group mode (levelAdjustment !== 0), re-parenting is
    // intentional and validated by level normalization later.
    if (movedLevel === 0 && !hasExplicitIntent) {
      const targetLevel = targetStart < this.items.length
        ? Number(this.items.at(targetStart)?.get('level')?.value || 0)
        : 0;

            // If the provisional target lies inside the moved subtree's original range,
      // do not re-anchor using current tree rows. Re-anchoring there can snap the
      // item back to its source when dragging down then back up.
      if (targetLevel > 0 && !targetInsideMovedSubtree && levelAdjustment === 0) {
        // If hovering over a child row, treat this as dropping relative to that
        // top-level section (folder), but keep the move at top-level only.
        const topLevelAnchor = this.findNearestAncestorOrSelfByLevel(targetStart, 0);
                if (topLevelAnchor >= 0) {
          // Detect drag direction from calculated target position (before/after folder)
          const movingToBeforeFolder = targetStart <= topLevelAnchor;
                    const desiredOriginalInsertIndex = movingToBeforeFolder
            ? topLevelAnchor
            : this.getSubtreeEndExclusive(topLevelAnchor);
                    targetStart = desiredOriginalInsertIndex;
          if (previousIndex < desiredOriginalInsertIndex) {
            targetStart = desiredOriginalInsertIndex - subtreeLength;
          }

          const maxStart = this.items.length - subtreeLength;
          targetStart = Math.max(0, Math.min(targetStart, maxStart));
                  } else {
                    this.showReorderNotice('Top-level items can only be reordered with other top-level items.');
          return;
        }
      }
    }

    if (movedLevel > 0 && levelAdjustment === 0 && !hasExplicitIntent && !isNavDrivenDrop) {
      const targetParentAnchor = this.findNearestAncestorIndexByLevel(targetStart, movedLevel - 1);
      const targetLevel = targetStart < this.items.length
        ? Number(this.items.at(targetStart)?.get('level')?.value || 0)
        : movedLevel;

            if (targetLevel > movedLevel || targetParentAnchor !== originalParentAnchor) {
                this.showReorderNotice('Reorder stays within the same group. Use Promote/Demote to change hierarchy.');
        return;
      }
    }

        const undoSnapshot: ReorderUndoState = {
      controls: [...this.items.controls],
      sampleImages: { ...this.sampleImages },
      sampleVideos: { ...this.sampleVideos },
      expandedItems: new Set(this.expandedItems),
      activeNavItemIndex: this.activeNavItemIndex
    };

    const oldLength = this.items.length;
    const oldStart = previousIndex;
    const oldEnd = subtreeEnd;

    const movedBlock = this.items.controls.splice(oldStart, subtreeLength);

    if (levelAdjustment !== 0) {
      movedBlock.forEach((control) => {
        const currentLevel = Number(control.get('level')?.value || 0);
        const nextLevel = Math.max(0, currentLevel + levelAdjustment);
        control.get('level')?.setValue(nextLevel);
      });
    }

    this.items.controls.splice(targetStart, 0, ...movedBlock);

    const mapOldIndexToNewIndex = (oldIndex: number): number => {
      if (oldIndex >= oldStart && oldIndex < oldEnd) {
        return targetStart + (oldIndex - oldStart);
      }

      if (targetStart < oldStart) {
        if (oldIndex >= targetStart && oldIndex < oldStart) {
          return oldIndex + subtreeLength;
        }
      } else {
        if (oldIndex >= oldEnd && oldIndex < targetStart + subtreeLength) {
          return oldIndex - subtreeLength;
        }
      }

      return oldIndex;
    };

    const remapIndexedDict = <T>(dict: { [itemIndex: number]: T }): { [itemIndex: number]: T } => {
      const updated: { [itemIndex: number]: T } = {};
      Object.keys(dict).forEach((key) => {
        const oldIndex = parseInt(key, 10);
        if (Number.isNaN(oldIndex) || oldIndex < 0 || oldIndex >= oldLength) {
          return;
        }
        const newIndex = mapOldIndexToNewIndex(oldIndex);
        updated[newIndex] = dict[oldIndex];
      });
      return updated;
    };

    this.sampleImages = remapIndexedDict(this.sampleImages);
    this.sampleVideos = remapIndexedDict(this.sampleVideos);

    const updatedExpanded = new Set<number>();
    this.expandedItems.forEach((oldIndex) => {
      if (oldIndex < 0 || oldIndex >= oldLength) {
        return;
      }
      updatedExpanded.add(mapOldIndexToNewIndex(oldIndex));
    });
    this.expandedItems = updatedExpanded;

    if (this.activeNavItemIndex >= 0 && this.activeNavItemIndex < oldLength) {
      this.activeNavItemIndex = mapOldIndexToNewIndex(this.activeNavItemIndex);
    }

    // Rebuild parent references from the current sequence so stale parent_id
    // values do not override reorder intent on save/reload.
    this.rebuildParentReferencesFromLevels();
    this.hasReorderMutations = true;

    // Recalculate order_index for all items to maintain proper sequence
    this.recalculateOrderIndices();
    this.updateNavSearchSets();

    this.lastReorderUndoState = undoSnapshot;
    this.showReorderFeedback(movedItemTitle, targetStart);

    // Rebuild navigation items to reflect new order
    this.rebuildEditorNavItems();

    // Trigger change detection
    this.cdr.detectChanges();
    this.scheduleActiveItemTrackingRefresh();
  }

  private findNearestAncestorIndexByLevel(startIndex: number, targetLevel: number): number {
    for (let i = startIndex - 1; i >= 0; i--) {
      const level = Number(this.items.at(i)?.get('level')?.value || 0);
      if (level === targetLevel) {
        return i;
      }
    }
    return -1;
  }

  private findNearestAncestorOrSelfByLevel(startIndex: number, targetLevel: number): number {
    if (startIndex >= 0 && startIndex < this.items.length) {
      const selfLevel = Number(this.items.at(startIndex)?.get('level')?.value || 0);
      if (selfLevel === targetLevel) {
        return startIndex;
      }
    }

    for (let i = Math.min(startIndex, this.items.length - 1); i >= 0; i--) {
      const level = Number(this.items.at(i)?.get('level')?.value || 0);
      if (level === targetLevel) {
        return i;
      }
    }

    return -1;
  }

  undoLastReorder(): void {
    if (!this.lastReorderUndoState) {
      return;
    }

    const snapshot = this.lastReorderUndoState;
    this.items.controls.splice(0, this.items.controls.length, ...snapshot.controls);
    this.sampleImages = { ...snapshot.sampleImages };
    this.sampleVideos = { ...snapshot.sampleVideos };
    this.expandedItems = new Set(snapshot.expandedItems);
    this.activeNavItemIndex = snapshot.activeNavItemIndex;

    this.recalculateOrderIndices();
    this.updateNavSearchSets();
    this.clearReorderFeedback();
    this.lastReorderUndoState = null;

    // Rebuild navigation items to reflect restored order
    this.rebuildEditorNavItems();

    this.cdr.detectChanges();
    this.scheduleActiveItemTrackingRefresh();
  }

  clearReorderFeedback(): void {
    this.reorderFeedbackMessage = '';
    if (this.reorderFeedbackTimeout) {
      clearTimeout(this.reorderFeedbackTimeout);
      this.reorderFeedbackTimeout = null;
    }
  }

  shouldShowTemplateInfoEntry(): boolean {
    return this.activePanel !== 'template-info';
  }

  shouldShowStickyNavParent(): boolean {
    return this.enableStickyNavParent && this.getStickyNavParentIndex() !== null;
  }

  getStickyNavParentIndex(): number | null {
    if (!this.enableStickyNavParent) {
      return null;
    }

    const baseIndex = this.selectedFormItemIndex !== null
      ? this.selectedFormItemIndex
      : (this.activeNavItemIndex >= 0 ? this.activeNavItemIndex : null);

    if (baseIndex === null) {
      return null;
    }

    const parentIndex = this.computeStickyParentIndex(baseIndex);
    if (parentIndex === null || !this.isNavItemVisible(parentIndex)) {
      return null;
    }

    return parentIndex;
  }

  private showReorderFeedback(movedTitle: string, targetStart: number): void {
    const destinationOutline = this.getOutlineNumber(targetStart);
    this.reorderFeedbackMessage = `Moved "${movedTitle}" to ${destinationOutline}.`;

    if (this.reorderFeedbackTimeout) {
      clearTimeout(this.reorderFeedbackTimeout);
    }

    this.reorderFeedbackTimeout = setTimeout(() => {
      this.reorderFeedbackMessage = '';
      this.reorderFeedbackTimeout = null;
    }, 8000);
  }

  private showReorderNotice(message: string): void {
    this.reorderFeedbackMessage = message;

    if (this.reorderFeedbackTimeout) {
      clearTimeout(this.reorderFeedbackTimeout);
    }

    this.reorderFeedbackTimeout = setTimeout(() => {
      this.reorderFeedbackMessage = '';
      this.reorderFeedbackTimeout = null;
    }, 6000);
  }

  onItemKeydown(event: KeyboardEvent, index: number): void {
    if (this.isPublishedLocked() || index < 0 || index >= this.items.length) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target && this.shouldIgnoreReorderShortcutTarget(target)) {
      return;
    }

    if (event.altKey && event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveItemUp(index);
      return;
    }

    if (event.altKey && event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveItemDown(index);
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      if (event.shiftKey) {
        this.promoteItem(index);
      } else if (this.canDemote(index)) {
        this.demoteItem(index);
      }
    }
  }

  private shouldIgnoreReorderShortcutTarget(target: HTMLElement): boolean {
    return !!target.closest('input, textarea, select, button, a, [contenteditable="true"], .ql-editor, .ql-toolbar');
  }

  private calculateDropPlacement(previousIndex: number, currentIndex: number, options?: { useAnchorIndex?: boolean }): {
    subtreeEnd: number;
    subtreeLength: number;
    targetStart: number;
    isNoOp: boolean;
  } | null {
    // Allow currentIndex === items.length for "append to end" case
    if (previousIndex < 0 || previousIndex >= this.items.length || currentIndex < 0 || currentIndex > this.items.length) {
      return null;
    }

    const subtreeEnd = this.getSubtreeEndExclusive(previousIndex);
    const subtreeLength = subtreeEnd - previousIndex;

    // Convert target index into subtree insertion index.
    // - Default path expects CDK placeholder index semantics.
    // - Nav path passes an anchor row index in the full array.
    let targetStart = currentIndex;
    if (options?.useAnchorIndex) {
      if (currentIndex > previousIndex) {
        targetStart = currentIndex - subtreeLength;
      }
    } else {
      if (currentIndex > previousIndex) {
        targetStart = currentIndex - subtreeLength + 1;
      }
    }

    const maxStart = this.items.length - subtreeLength;
    targetStart = Math.max(0, Math.min(targetStart, maxStart));

    // A move is a no-op only when the block's insertion start is unchanged.
    // For subtree moves, targetStart can fall within the original subtree range
    // and still represent a real reorder after removal.
    const isNoOp = targetStart === previousIndex;

    return {
      subtreeEnd,
      subtreeLength,
      targetStart,
      isNoOp
    };
  }

  private getSubtreeEndExclusive(startIndex: number): number {
    const startLevel = this.items.at(startIndex).get('level')?.value || 0;
    let end = startIndex + 1;

    while (end < this.items.length) {
      const level = this.items.at(end).get('level')?.value || 0;
      if (level <= startLevel) {
        break;
      }
      end++;
    }

    return end;
  }

  /**
   * Recalculate order_index for all items using outline numbering (1, 1.1, 1.1.1, 1.1.1.1)
   * Industry standard for quality checklists - clear hierarchy, easy to reference
   */
  private recalculateOrderIndices(): void {
    // Track counters by level using current visual sequence.
    // This intentionally does not depend on parent_id to avoid stale references
    // affecting numbering after drag/drop.
    const counterStack: number[] = [0];

    this.items.controls.forEach((control, index) => {
      const level = control.get('level')?.value || 0;

      // Adjust stack size to current level + 1
      while (counterStack.length > level + 1) {
        counterStack.pop();
      }
      while (counterStack.length < level + 1) {
        counterStack.push(0);
      }

      // Increment counter at current level
      counterStack[level]++;

      // Build outline number: 1, 1.01, 1.0101, 1.010101
      // Pad each level to 2 digits so parseFloat works correctly
      let outlineNumber: number;
      if (level === 0) {
        // Root level: 1, 2, 3
        outlineNumber = counterStack[0];
      } else {
        // Build hierarchical number by padding each level to 2 digits
        // Example: [1, 2, 3, 1] at level 3 → "1.020301" → 1.020301
        const root = counterStack[0];
        const subLevels = counterStack.slice(1, level + 1)
          .map(num => num.toString().padStart(2, '0'))
          .join('');
        const fullString = `${root}.${subLevels}`;
        outlineNumber = parseFloat(fullString);
      }

      control.get('order_index')?.setValue(outlineNumber);
    });
  }

  /**
   * Recompute parent_id from current item order + level nesting.
   * This keeps hierarchy metadata aligned with drag/drop sequence.
   */
  private rebuildParentReferencesFromLevels(): void {
    const findNearestAncestorIndex = (startIndex: number, targetLevel: number): number => {
      for (let i = startIndex - 1; i >= 0; i--) {
        const level = this.items.at(i)?.get('level')?.value || 0;
        if (level === targetLevel) {
          return i;
        }
      }
      return -1;
    };

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i);
      let level = Number(item.get('level')?.value || 0);
      if (!Number.isInteger(level) || level < 0) {
        level = 0;
      }

      // Prevent impossible hierarchy at the top of the list.
      if (i === 0 && level > 0) {
        level = 0;
      }

      // Remove gaps such as level 2 without a level 1 ancestor.
      while (level > 0) {
        const ancestorIndex = findNearestAncestorIndex(i, level - 1);
        if (ancestorIndex >= 0) {
          break;
        }
        level--;
      }

      if (item.get('level')?.value !== level) {
        item.get('level')?.setValue(level);
      }

      if (level === 0) {
        item.get('parent_id')?.setValue(null);
        continue;
      }

      const parentIndex = findNearestAncestorIndex(i, level - 1);
      const parentId = parentIndex >= 0 ? (this.items.at(parentIndex).get('id')?.value ?? null) : null;
      item.get('parent_id')?.setValue(parentId);
    }
  }

  /**
   * Promote a child item to become a parent item
   */
  promoteToParent(index: number): void {
    const item = this.items.at(index);
    const currentLevel = item.get('level')?.value;

    if (currentLevel !== 1) {
      return; // Only promote child items
    }

    // Change to parent
    item.get('level')?.setValue(0);
    item.get('parent_id')?.setValue(null);

    // Recalculate all order indices
    this.recalculateOrderIndices();
  }

  onQualityDocumentSelected(document: QualityDocumentSelection | null): void {
    this.selectedQualityDocument = document;
    this.templateForm.get('quality_document_id')?.setValue(document?.documentId || null);
  }

  getSampleImage(itemIndex: number): SampleImage | null {
    const sampleImage = this.sampleImages[itemIndex] || null;

    // If it's an array, return the primary or first image for backward compatibility
    if (Array.isArray(sampleImage)) {
      const primary = sampleImage.find(img => img.is_primary);
      const firstImage = primary || sampleImage[0] || null;

      // Convert relative URLs to absolute URLs (but skip data URLs)
      if (firstImage && firstImage.url && !firstImage.url.startsWith('data:')) {
        firstImage.url = this.getAbsoluteImageUrl(firstImage.url);
      }

      return firstImage;
    }

    // Single image - convert relative URLs to absolute URLs (but skip data URLs)
    if (sampleImage && sampleImage.url && !sampleImage.url.startsWith('data:')) {
      sampleImage.url = this.getAbsoluteImageUrl(sampleImage.url);
    }

    return sampleImage;
  }

  /**
   * Get a sanitized image URL that's safe to use in [src] binding
   * Angular blocks data URLs by default for security, so we need to bypass that
   */
  getSafeImageUrl(itemIndex: number): SafeUrl | string | null {
    const sampleImage = this.getSampleImage(itemIndex);
    if (!sampleImage?.url) {
      return null;
    }

    // For data URLs, sanitize them to bypass Angular security
    if (sampleImage.url.startsWith('data:')) {
      return this.sanitizer.bypassSecurityTrustUrl(sampleImage.url);
    }

    // For regular URLs, return as-is
    return sampleImage.url;
  }

  hasSampleImage(itemIndex: number): boolean {
    return this.sampleImages[itemIndex] != null;
  }

  /**
   * Convert relative image URLs to absolute URLs
   * If the URL is already absolute (starts with http/https), return as-is
   * Otherwise, prepend the base URL
   */
  private getAbsoluteImageUrl(url: string): string {
    if (!url) return url;

    // If already absolute, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If relative, prepend base URL
    const baseUrl = 'https://dashboard.eye-fi.com';
    // Remove leading slash if present to avoid double slashes
    const cleanUrl = url.startsWith('/') ? url : '/' + url;

    return baseUrl + cleanUrl;
  }

  /**
   * Calculate the next version number for a template
   * Examples: "1.0" -> "1.1", "2.5" -> "2.6", "3.9" -> "3.10"
   */
  getNextVersion(currentVersion: string | number | null | undefined): string {
    if (!currentVersion) return '1.0';

    // Convert to string if it's a number
    const versionString = String(currentVersion);

    const parts = versionString.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;

    // Increment minor version
    return `${major}.${minor + 1}`;
  }

  getNextSubVersionDisplay(currentVersion: string | number | null | undefined): string {
    return this.getNextVersion(currentVersion);
  }

  /**
   * Get display number for item (e.g., "14" for parent, "14.1" for first child)
   */
  /**
   * Get outline number for display (1, 1.1, 1.1.1, 1.1.1.1)
   * Formats the order_index as proper outline numbering
   */
  getOutlineNumber(itemIndex: number): string {
    const item = this.items.at(itemIndex);
    const orderIndex = item.get('order_index')?.value;
    const level = item.get('level')?.value ?? 0;
    const title = item.get('title')?.value;

    if (!orderIndex) return '1';

    // Convert float to outline format: 1.020301 → "1.2.3.1"
    const parts = orderIndex.toString().split('.');

    if (parts.length === 1) {
      // Whole number: 1, 2, 3
      return parts[0];
    }

    // Has decimal part: 1.020301 → "1.2.3.1"
    const wholePart = parts[0];
    const decimalPart = parts[1] || '';

    // Split decimal into pairs: "020301" → ["02", "03", "01"] → [2, 3, 1]
    const components = [wholePart];
    for (let i = 0; i < decimalPart.length; i += 2) {
      const pair = decimalPart.substring(i, i + 2);
      const num = parseInt(pair, 10);
      components.push(num.toString());
    }

    const result = components.join('.');
    return result;
  }

  openSampleImageUpload(itemIndex: number): void {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    fileInput.onchange = async (event: any) => {
      const file = event.target.files[0];

      if (file && file.type.startsWith('image/')) {
        try {
          await this.uploadSampleImage(itemIndex, file);
        } catch (error) {
          console.error('Upload failed:', error);
        }
      } else {
        alert('Please select an image file (JPG, PNG, GIF, WebP)');
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  private async uploadSampleImage(itemIndex: number, file: File): Promise<void> {
    try {
      // Set loading state
      this.uploadingImage = true;

      // Validate file size against template override or default (image)
      const maxSize = this.getMaxUploadBytes('image');
      if (file.size > maxSize) {
        alert('File size too large. Maximum size is ' + Math.round(maxSize / (1024 * 1024)) + 'MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        alert('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed');
        return;
      }

      // Create temp ID for upload
      const tempId = `sample_image_${itemIndex}_${Date.now()}`;

      // Upload the image to the server
      const response = await this.photoUploadService.uploadTemporaryImage(file, tempId);

      if (response && response.success && response.url) {
        const newImage: SampleImage = {
          id: `uploaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: response.url,
          label: 'Sample Image',
          description: '',
          type: 'photo',
          is_primary: false,
          order_index: 0,
          status: 'loaded'
        };

        // Set the single image for this item
        this.sampleImages[itemIndex] = newImage;

        // Update the form control with the sample image
        const itemFormGroup = this.items.at(itemIndex) as FormGroup;
        if (itemFormGroup) {
          const sampleImageControl = itemFormGroup.get('sample_image_url');
          if (sampleImageControl) {
            sampleImageControl.setValue(newImage.url);
          }
        }

        // Force change detection to update the UI
        this.cdr.detectChanges();

      } else {
        const errorMsg = response?.error || 'Upload failed - no URL returned';
        throw new Error(errorMsg);
      }

    } catch (error: any) {
      console.error('Sample image upload failed:', error);

      // More detailed error handling
      let errorMessage = 'Failed to upload image. Please try again.';

      if (error.error) {
        errorMessage = error.error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      console.error('Detailed error:', {
        error: error,
        message: errorMessage,
        stack: error.stack
      });

      alert('Upload Error: ' + errorMessage);
    } finally {
      this.uploadingImage = false;
    }
  }

  /**
   * Convert a data URL (from Word import) to an uploaded file
   * @param itemIndex - The item index in the form array
   * @param dataUrl - The base64 data URL to convert
   */
  private async convertDataUrlToUpload(itemIndex: number, dataUrl: string): Promise<void> {
    try {
      // Convert data URL to Blob
      const blob = this.dataUrlToBlob(dataUrl);

      // Determine file extension from MIME type
      const mimeType = dataUrl.split(';')[0].split(':')[1];
      const extension = mimeType.split('/')[1];
      const filename = `imported-image-${Date.now()}-${itemIndex}.${extension}`;

      // Convert Blob to File
      const file = new File([blob], filename, { type: mimeType });

      // Upload using the existing upload function
      await this.uploadSampleImage(itemIndex, file);
    } catch (error) {
      console.error('Failed to convert/upload data URL:', error);
      throw error;
    }
  }

  /**
   * Convert a data URL string to a Blob object
   * @param dataUrl - The data URL to convert
   * @returns Blob object
   */
  private dataUrlToBlob(dataUrl: string): Blob {
    try {
      // Split the data URL
      const parts = dataUrl.split(',');
      if (parts.length !== 2) {
        throw new Error(`Invalid data URL format - expected 2 parts, got ${parts.length}`);
      }

      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const base64 = parts[1];

      if (!base64 || base64.length < 100) {
        throw new Error(`Data URL base64 part is too short: ${base64?.length} chars`);
      }

      // Decode base64
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Blob([bytes], { type: mime });
    } catch (error) {
      console.error('❌ Failed to convert data URL to Blob:', error);
      console.error('Data URL preview:', dataUrl.substring(0, 200));
      throw error;
    }
  }

  previewSampleImage(itemIndex: number): void {
    const primaryImage = this.getPrimarySampleImage(itemIndex);
    if (primaryImage?.url) {
      this.openSampleImagesViewer(itemIndex, 0);
    }
  }

  removeSampleImage(itemIndex: number): void {
    // Remove the sample image for this item
    this.sampleImages[itemIndex] = null;

    // Update the form control 
    const itemFormGroup = this.items.at(itemIndex) as FormGroup;
    if (itemFormGroup) {
      const sampleImageControl = itemFormGroup.get('sample_image_url');
      if (sampleImageControl) {
        sampleImageControl.setValue(null);
      }
    }
  }

  onSampleImageError(itemIndex: number): void {
    // Handle image load error
    const sampleImage = this.getSampleImage(itemIndex);
    console.error(`Failed to load image for item ${itemIndex + 1}:`, sampleImage?.url);

    // If this is a data URL, try to upload it
    if (sampleImage?.url?.startsWith('data:')) {
      console.warn('Image is still a data URL - attempting to upload...');
      this.convertDataUrlToUpload(itemIndex, sampleImage.url).catch(err => {
        console.error('Failed to upload image:', err);
      });
    }
  }

  onSampleImageLoad(itemIndex: number): void {
    // Image loaded successfully
  }

  // ============================================
  // Primary Sample Image Methods
  // ============================================

  hasPrimarySampleImage(itemIndex: number): boolean {
    const images = this.sampleImages[itemIndex];
    if (!Array.isArray(images)) {
      return !!images; // Legacy single image
    }
    return images.some(img => img.is_primary && img.image_type === 'sample');
  }

  getPrimarySampleImage(itemIndex: number): SampleImage | null {
    const images = this.sampleImages[itemIndex];
    if (!Array.isArray(images)) {
      return images || null; // Legacy single image
    }
    return images.find(img => img.is_primary && img.image_type === 'sample') || null;
  }

  getPrimarySampleImageUrl(itemIndex: number): SafeUrl | string | null {
    const primaryImage = this.getPrimarySampleImage(itemIndex);
    if (!primaryImage?.url) return null;

    if (primaryImage.url.startsWith('data:')) {
      return this.sanitizer.bypassSecurityTrustUrl(primaryImage.url);
    }
    return this.getAbsoluteImageUrl(primaryImage.url);
  }

  openPrimarySampleImageUpload(itemIndex: number): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    fileInput.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file && file.type.startsWith('image/')) {
        try {
          await this.uploadPrimarySampleImage(itemIndex, file);
        } catch (error) {
          console.error('Upload failed:', error);
        }
      } else {
        alert('Please select an image file (JPG, PNG, GIF, WebP)');
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  async uploadPrimarySampleImage(itemIndex: number, file: File): Promise<void> {
    this.uploadingImage = true;

    try {
      const response = await this.photoUploadService.uploadTemporaryImage(file, `item-${itemIndex}-primary`);

      if (response.success && response.url) {
        const newPrimaryImage: SampleImage = {
          url: response.url,
          label: 'Primary Sample Image',
          description: 'This is what users should replicate',
          type: 'photo',
          image_type: 'sample',
          is_primary: true,
          order_index: 0,
          status: 'loaded'
        };

        // Update sample images array
        let images: SampleImage | SampleImage[] | null = this.sampleImages[itemIndex];
        let imageArray: SampleImage[] = [];

        if (!images) {
          imageArray = [];
        } else if (Array.isArray(images)) {
          imageArray = images;
        } else {
          imageArray = [images];
        }

        // Remove old primary sample if exists
        imageArray = imageArray.filter(img => !(img.is_primary && img.image_type === 'sample'));

        // Add new primary sample at the start
        imageArray.unshift(newPrimaryImage);

        this.sampleImages[itemIndex] = imageArray;

        // Update form control
        const item = this.items.at(itemIndex);
        item.patchValue({
          sample_image_url: response.url,
          sample_images: imageArray
        });

        // Mark form as dirty to detect changes
        item.markAsDirty();
        this.templateForm.markAsDirty();
      }
    } catch (error) {
      console.error('Error uploading primary sample image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      this.uploadingImage = false;
    }
  }

  removePrimarySampleImage(itemIndex: number): void {
    let images: SampleImage | SampleImage[] | null = this.sampleImages[itemIndex];
    let imageArray: SampleImage[] = [];

    if (!images) {
      this.sampleImages[itemIndex] = null;
      return;
    }

    if (Array.isArray(images)) {
      // Remove primary sample
      imageArray = images.filter(img => !(img.is_primary && img.image_type === 'sample'));
      this.sampleImages[itemIndex] = imageArray.length > 0 ? imageArray : null;
    } else {
      this.sampleImages[itemIndex] = null;
    }

    // Update form
    const item = this.items.at(itemIndex);
    const remainingImages = this.sampleImages[itemIndex];
    item.patchValue({
      sample_image_url: '',
      sample_images: remainingImages
    });
  }

  // ============================================
  // Reference Images Methods
  // ============================================

  getReferenceImages(itemIndex: number): SampleImage[] {
    const images = this.sampleImages[itemIndex];
    if (!Array.isArray(images)) {
      return [];
    }
    // Filter to show only reference images (not primary sample images)
    // Reference images should have is_primary=false AND image_type='reference'
    return images.filter(img => !img.is_primary && img.image_type !== 'sample');
  }

  getReferenceImageCount(itemIndex: number): number {
    return this.getReferenceImages(itemIndex).length;
  }

  getReferenceImageUrl(refImage: SampleImage): SafeUrl | string {
    if (!refImage?.url) return '';
    
    if (refImage.url.startsWith('data:')) {
      return this.sanitizer.bypassSecurityTrustUrl(refImage.url);
    }
    return this.getAbsoluteImageUrl(refImage.url);
  }

  getTotalSampleImagesCount(itemIndex: number): number {
    const primaryCount = this.hasPrimarySampleImage(itemIndex) ? 1 : 0;
    const referenceCount = this.getReferenceImageCount(itemIndex);
    return primaryCount + referenceCount;
  }

  getCarouselImages(itemIndex: number): CarouselImageItem[] {
    const images: CarouselImageItem[] = [];

    const primaryUrl = this.getPrimarySampleImageUrl(itemIndex);
    if (primaryUrl) {
      images.push({
        id: `primary-${itemIndex}`,
        url: primaryUrl,
        isPrimary: true,
        refIndex: null
      });
    }

    const refs = this.getReferenceImages(itemIndex);
    refs.forEach((refImage, index) => {
      const refUrl = this.getReferenceImageUrl(refImage);
      if (!refUrl) {
        return;
      }

      images.push({
        id: `ref-${itemIndex}-${index}`,
        url: refUrl,
        isPrimary: false,
        refIndex: index
      });
    });

    return images;
  }

  getActiveCarouselSlideId(itemIndex: number): string {
    const images = this.getCarouselImages(itemIndex);
    if (!images.length) {
      return '';
    }

    const current = this.carouselActiveSlideByItem[itemIndex];
    if (current && images.some(img => img.id === current)) {
      return current;
    }

    const defaultId = images[0].id;
    this.carouselActiveSlideByItem[itemIndex] = defaultId;
    return defaultId;
  }

  setActiveCarouselSlideId(itemIndex: number, slideId: string): void {
    this.carouselActiveSlideByItem[itemIndex] = slideId;
  }

  isCarouselSlideActive(itemIndex: number, slideId: string): boolean {
    return this.getActiveCarouselSlideId(itemIndex) === slideId;
  }

  onCarouselSlide(itemIndex: number, event: any): void {
    const slideId = event?.current;
    if (!slideId) {
      return;
    }

    this.carouselActiveSlideByItem[itemIndex] = slideId;
  }

  previewActiveCarouselImage(itemIndex: number): void {
    const images = this.getCarouselImages(itemIndex);
    if (!images.length) {
      return;
    }

    const activeId = this.getActiveCarouselSlideId(itemIndex);
    const activeImage = images.find(img => img.id === activeId) || images[0];

    if (activeImage.isPrimary) {
      this.previewSampleImage(itemIndex);
      return;
    }

    if (activeImage.refIndex !== null) {
      this.previewReferenceImage(itemIndex, activeImage.refIndex);
    }
  }

  trackByCarouselImageId(_index: number, image: CarouselImageItem): string {
    return image.id;
  }

  /**
   * Helper method to check if value is an array (for template usage)
   */
  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  /**
   * Get sample images as array for preview
   */
  getSampleImagesArray(itemIndex: number): SampleImage[] {
    const images = this.sampleImages[itemIndex];
    if (!images) return [];
    return Array.isArray(images) ? images : [images];
  }

  /**
   * Get sample videos as array for preview
   */
  getSampleVideosArray(itemIndex: number): SampleVideo[] {
    const videos = this.sampleVideos[itemIndex];
    if (!videos) return [];
    return Array.isArray(videos) ? videos : [videos];
  }

  /**
   * Open image in full-screen preview modal
   */
  openImagePreview(imageUrl: string): void {
    this.openSharedFileViewer([
      {
        url: imageUrl,
        fileName: 'Image Preview'
      }
    ], 0);
  }

  previewNavPrimaryImage(itemIndex: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const primary = this.getPrimarySampleImage(itemIndex);
    if (!primary?.url) {
      return;
    }

    const url = primary.url.startsWith('data:') ? primary.url : this.getAbsoluteImageUrl(primary.url);
    this.openImagePreview(url);
  }

  previewNavSampleVideo(itemIndex: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const url = this.getPrimarySampleVideoUrl(itemIndex);
    if (!url) {
      return;
    }

    this.openSharedFileViewer([
      {
        url,
        fileName: 'Sample Video'
      }
    ], 0);
  }

  /**
   * Scroll to specific item in preview modal
   */
  scrollToPreviewItem(itemIndex: number): void {
    const element = document.getElementById(`preview-item-${itemIndex}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add brief highlight effect
      element.classList.add('bg-primary', 'bg-opacity-10');
      setTimeout(() => {
        element.classList.remove('bg-primary', 'bg-opacity-10');
      }, 1500);
    }
  }

  /**
   * Scroll to an item in the edit view (main form)
   */
  scrollToItem(itemIndex: number, options?: { fromNavigation?: boolean }): void {
    const fromNavigation = options?.fromNavigation === true;

    // Set selected item if focused edit mode is ON
    if (this.focusedEditMode) {
      this.selectedFormItemIndex = itemIndex;
    }

    this.beginProgrammaticScrollLock();

    if (itemIndex !== this.activeNavItemIndex) {
      this.activeNavItemIndex = itemIndex;
      this.updateSelectedItemQueryParam(itemIndex);
      this.updateStickyParentFromActive(itemIndex);
      this.expandParentsOfItem(itemIndex);
      this.cdr.detectChanges();
    }

    const element = document.getElementById(`edit-item-${itemIndex}`);
    if (element) {
      if (fromNavigation) {
        this.scrollElementToCenterImmediately(element);
      } else {
        element.scrollIntoView({
          behavior: 'smooth',
          block: this.focusedEditMode ? 'center' : 'nearest'
        });
      }
      // Add brief highlight effect
      element.classList.add('border-success', 'border-3');
      const originalBorderClass = element.className;
      setTimeout(() => {
        element.classList.remove('border-success', 'border-3');
      }, 1500);
    }
  }

  onNavItemSelected(itemIndex: number): void {
    this.updateSelectedItemQueryParam(itemIndex);
    this.scrollToItem(itemIndex, { fromNavigation: true });
  }

  selectItem(index: number): void {
    if (this.activePanel === 'item' && this.selectedFormItemIndex === index && !this.selectingItem) {
      this.updateStickyParentFromActive(index);
      this.scheduleSelectedItemQueryParamUpdate(index);
      this.scheduleSidebarStickyAncestorsUpdate();
      return;
    }

    this.updateStickyParentFromActive(index);

    this.activePanel = 'item';
    this.selectingItem = false;

    // Force destroy+recreate of the item panel so child components (e.g. rich text editor)
    // re-initialize with the new form group values. Split across two tasks to avoid
    // forced synchronous reflow violations in the click handler.
    this.selectedFormItemIndex = null;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.selectedFormItemIndex = index;
      this.scheduleSelectedItemQueryParamUpdate(index);
      this.scheduleSidebarStickyAncestorsUpdate();
      this.cdr.detectChanges();
    }, 0);
  }

  private scheduleSelectedItemQueryParamUpdate(itemIndex: number | null): void {
    if (this.pendingSelectedItemQueryParamTimeout) {
      clearTimeout(this.pendingSelectedItemQueryParamTimeout);
      this.pendingSelectedItemQueryParamTimeout = null;
    }

    this.pendingSelectedItemQueryParamTimeout = setTimeout(() => {
      this.pendingSelectedItemQueryParamTimeout = null;
      this.updateSelectedItemQueryParam(itemIndex);
    }, 90);
  }

  private scheduleSidebarStickyAncestorsUpdate(): void {
    if (this.pendingStickyAncestorsRaf) {
      return;
    }

    this.pendingStickyAncestorsRaf = true;
    requestAnimationFrame(() => {
      this.pendingStickyAncestorsRaf = false;
      this.updateSidebarStickyAncestors();
    });
  }

  updateSelectedItemQueryParam(itemIndex: number | null): void {
    const currentRaw = this.route.snapshot.queryParamMap.get('item');
    const currentValue = currentRaw !== null ? Number(currentRaw) : NaN;
    const nextValue = itemIndex;

    if ((nextValue === null && currentRaw === null) || (nextValue !== null && Number.isInteger(currentValue) && currentValue === nextValue)) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { item: nextValue },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private restoreRequestedNavItemSelection(): void {
    if (this.requestedNavItemIndex === null) {
      return;
    }

    const index = this.requestedNavItemIndex;
    if (index < 0 || index >= this.items.length) {
      this.pendingUrlItemRestore = false;
      return;
    }

    if (this.activePanel === 'item' && this.selectedFormItemIndex === index) {
      this.pendingUrlItemRestore = false;
      this.scrollNavItemIntoViewSoon(index);
      return;
    }

    this.pendingUrlItemRestore = false;
    this.selectItem(index);
    this.scrollToItem(index, { fromNavigation: true });
    this.expandParentsOfItem(index);
    this.cdr.detectChanges();
    this.scrollNavItemIntoViewSoon(index);
  }

  private scheduleRestoreRequestedNavItemSelection(): void {
    if (this.restoreNavSelectionTimeout) {
      clearTimeout(this.restoreNavSelectionTimeout);
      this.restoreNavSelectionTimeout = null;
    }

    if (this.requestedNavItemIndex === null || this.loading) {
      return;
    }

    const index = this.requestedNavItemIndex;
    if (index < 0 || index >= this.items.length) {
      this.pendingUrlItemRestore = false;
      return;
    }

    // Root-cause fix: restore should be data-driven, not gated on edit-item DOM availability.
    // In focused panel mode the target DOM may not exist until selection happens,
    // so waiting for visibility can deadlock the restore path.
    this.restoreRequestedNavItemSelection();
  }

  private syncTrackedItemToQueryParam(itemIndex: number | null): void {
    if (this.pendingUrlItemRestore) {
      return;
    }

    this.updateSelectedItemQueryParam(itemIndex);
  }

  private scrollElementToCenterImmediately(element: HTMLElement): void {
    const scrollContainer = this.findNearestScrollContainer(element);
    const topOffset = this.getNavigationJumpTopOffset();

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const nextTop = scrollContainer.scrollTop + (elementRect.top - containerRect.top) - topOffset;
      this.withForcedInstantScroll(scrollContainer, () => {
        scrollContainer.scrollTop = Math.max(0, nextTop);
      });
      return;
    }

    const docScroller = document.scrollingElement || document.documentElement;
    const elementRect = element.getBoundingClientRect();
    const nextTop = (window.scrollY || docScroller.scrollTop || 0) + elementRect.top - topOffset;
    this.withForcedInstantWindowScroll(() => {
      window.scrollTo(0, Math.max(0, nextTop));
    });
  }

  private getNavigationJumpTopOffset(): number {
    // Keep the destination card header visible below fixed/sticky top chrome.
    const basePadding = 12;
    const fixedTopCandidates = document.querySelectorAll<HTMLElement>('header, .navbar, .topbar, .app-header');

    let maxFixedTopHeight = 0;
    fixedTopCandidates.forEach((el) => {
      const style = window.getComputedStyle(el);
      const isFixedOrSticky = style.position === 'fixed' || style.position === 'sticky';
      const anchoredToTop = (style.top || '0px') === '0px';
      if (!isFixedOrSticky || !anchoredToTop) {
        return;
      }

      const rect = el.getBoundingClientRect();
      if (rect.height > maxFixedTopHeight) {
        maxFixedTopHeight = rect.height;
      }
    });

    return maxFixedTopHeight + basePadding;
  }

  private findNearestScrollContainer(start: HTMLElement): HTMLElement | null {
    let node: HTMLElement | null = start.parentElement;

    while (node) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight;
      if (canScroll) {
        return node;
      }
      node = node.parentElement;
    }

    return null;
  }

  private withForcedInstantScroll(container: HTMLElement, action: () => void): void {
    const previousBehavior = container.style.scrollBehavior;
    container.style.scrollBehavior = 'auto';

    try {
      action();
    } finally {
      requestAnimationFrame(() => {
        container.style.scrollBehavior = previousBehavior;
      });
    }
  }

  private withForcedInstantWindowScroll(action: () => void): void {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBehavior = html.style.scrollBehavior;
    const prevBodyBehavior = body.style.scrollBehavior;

    html.style.scrollBehavior = 'auto';
    body.style.scrollBehavior = 'auto';

    try {
      action();
    } finally {
      requestAnimationFrame(() => {
        html.style.scrollBehavior = prevHtmlBehavior;
        body.style.scrollBehavior = prevBodyBehavior;
      });
    }
  }

  /**
   * Scroll to the first invalid field and highlight it
   */
  scrollToFirstInvalidField(): void {
    // Check template-level fields first (name, category, description)
    const templateLevelFields = ['name', 'category', 'description'];
    for (const fieldName of templateLevelFields) {
      const control = this.templateForm.get(fieldName);
      if (control && control.invalid) {
        const element = document.querySelector(`[formControlName="${fieldName}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
    }

    // Check items for missing sample media requirements
    const missingSampleImageIndex = this.getFirstMissingSampleImageIndex();
    const missingSampleVideoIndex = this.getFirstMissingSampleVideoIndex();
    const missingEitherMediaIndex = this.getFirstMissingEitherMediaIndex();
    const missingSampleIndex =
      missingSampleImageIndex ??
      missingSampleVideoIndex ??
      missingEitherMediaIndex;

    if (missingSampleIndex !== null) {
      this.scrollToItem(missingSampleIndex);
      return;
    }

    // Check items for invalid title/description fields
    const itemsArray = this.items;
    for (let i = 0; i < itemsArray.length; i++) {
      const itemControl = itemsArray.at(i);
      const titleControl = itemControl.get('title');
      if (titleControl && titleControl.invalid) {
        // Scroll to the item
        this.scrollToItem(i);
        return;
      }
      const descriptionControl = itemControl.get('description');
      if (descriptionControl && descriptionControl.invalid) {
        this.scrollToItem(i);
        return;
      }
    }
  }

  private getFirstMissingSampleImageIndex(): number | null {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i);
      const submissionType = item.get('submission_type')?.value;
      const pictureRequired = item.get('photo_requirements')?.value?.picture_required;

      if (
        submissionType === 'photo' &&
        pictureRequired &&
        !this.hasPrimarySampleImage(i) &&
        this.getReferenceImageCount(i) === 0
      ) {
        return i;
      }
    }
    return null;
  }

  private getFirstMissingSampleVideoIndex(): number | null {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i);
      const submissionType = item.get('submission_type')?.value;

      if (submissionType === 'video' && !this.hasSampleVideo(i)) {
        return i;
      }
    }
    return null;
  }

  private getFirstMissingEitherMediaIndex(): number | null {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i);
      const submissionType = item.get('submission_type')?.value;

      if (
        submissionType === 'either' &&
        !this.hasSampleVideo(i) &&
        !this.hasPrimarySampleImage(i) &&
        this.getReferenceImageCount(i) === 0
      ) {
        return i;
      }
    }
    return null;
  }

  /**
   * Check if a form item should be visible based on view mode and selection
   */
  isFormItemVisible(itemIndex: number): boolean {
    const item = this.items.at(itemIndex);
    if (!item) return false;

    // If focused edit mode is OFF, show all items (just scroll to selected)
    if (!this.focusedEditMode) {
      const level = item.get('level')?.value || 0;

      // Only apply view mode filter
      if (this.navViewMode === 'groups' && level !== 0) {
        return false; // Only show groups (level 0)
      }
      if (this.navViewMode === 'items' && level === 0) {
        return false; // Only show items (level > 0)
      }

      return true; // Show all in 'all' mode
    }

    // Focused edit mode is ON - show only selected item and its descendants
    // If a specific item is selected, show it plus all its descendants
    if (this.selectedFormItemIndex !== null) {
      // Show the selected item itself
      if (itemIndex === this.selectedFormItemIndex) return true;

      // Show if this item is a descendant of the selected item
      return this.isDescendantOf(itemIndex, this.selectedFormItemIndex);
    }

    const level = item.get('level')?.value || 0;

    // Apply view mode filter
    if (this.navViewMode === 'groups' && level !== 0) {
      return false; // Only show groups (level 0)
    }
    if (this.navViewMode === 'items' && level === 0) {
      return false; // Only show items (level > 0)
    }

    return true; // Show all in 'all' mode
  }

  isNavItemInvalid(itemIndex: number): boolean {
    const item = this.items.at(itemIndex) as FormGroup | undefined;
    if (!item) return false;

    const touched = item.touched || this.templateForm.touched;
    const invalidControls = item.invalid;
    const isActive = !!item.get('is_required')?.value;

    const submissionType = item.get('submission_type')?.value;
    const requiresPhoto = submissionType === 'photo';
    const requiresVideo = submissionType === 'video';
    const allowsEither = submissionType === 'either';

    const missingSampleImage = (requiresPhoto || allowsEither)
      && item.get('photo_requirements')?.value?.picture_required
      && !this.hasPrimarySampleImage(itemIndex)
      && this.getReferenceImageCount(itemIndex) === 0;

    const missingSampleVideo = (requiresVideo || allowsEither)
      && !this.hasSampleVideo(itemIndex)
      && (!allowsEither || (!this.hasPrimarySampleImage(itemIndex) && this.getReferenceImageCount(itemIndex) === 0));

    const missingSample = missingSampleImage || missingSampleVideo;

    if (isActive) {
      return invalidControls || missingSample;
    }

    return touched && (invalidControls || missingSample);
  }

  onShowNavMediaContextChange(value: boolean): void {
    this.showNavMediaContext = value;

    try {
      localStorage.setItem(this.navMediaPreferenceStorageKey, String(value));
    } catch {
      // Ignore storage failures and keep the in-memory preference.
    }
  }

  private loadNavDisplayPreferences(): void {
    try {
      const storedValue = localStorage.getItem(this.navMediaPreferenceStorageKey);
      if (storedValue === null) {
        this.showNavMediaContext = false;
        return;
      }

      this.showNavMediaContext = storedValue === 'true';
    } catch {
      this.showNavMediaContext = false;
    }
  }

  shouldShowNavItemStatus(itemIndex: number): boolean {
    const item = this.items.at(itemIndex) as FormGroup | undefined;
    if (!item) {
      return false;
    }

    if (this.isNavItemInvalid(itemIndex)) {
      return true;
    }

    const title = String(item.get('title')?.value ?? '').trim();
    return title.length > 0;
  }

  getNavItemStatusTitle(itemIndex: number): string {
    return this.isNavItemInvalid(itemIndex)
      ? 'Required fields or required sample setup missing'
      : 'Item setup looks good';
  }

  handleNavAction(event: { action: string; index: number }): void {
    if (this.isPublishedLocked() && !this.canExecuteLockedNavAction(event.action)) {
      return;
    }

    switch (event.action) {
      case 'edit':
        this.editItemOnly(event.index);
        break;
      case 'addAbove':
        this.addItemAbove(event.index);
        break;
      case 'addBelow':
        this.addItemBelow(event.index);
        break;
      case 'duplicate':
        void this.duplicateItem(event.index);
        break;
      case 'moveUp':
        this.moveItemUp(event.index);
        break;
      case 'moveDown':
        this.moveItemDown(event.index);
        break;
      case 'promote':
        this.promoteItem(event.index);
        break;
      case 'promoteToTop':
        this.promoteItemToTopLevel(event.index);
        break;
      case 'demote':
        this.demoteItem(event.index);
        break;
      case 'moveUnder':
        void this.openMoveUnderPicker(event.index);
        break;
      case 'delete':
        this.deleteItemFromNav(event.index);
        break;
      default:
        break;
    }
  }

  private canExecuteLockedNavAction(action: string): boolean {
    return action === 'moveUp'
      || action === 'moveDown'
      || action === 'promote'
      || action === 'promoteToTop'
      || action === 'demote'
      || action === 'moveUnder';
  }

  private promoteItemToTopLevel(index: number): void {
    const control = this.items.at(index) as FormGroup;
    if (!control) {
      return;
    }

    let safety = 0;
    while (safety < 20) {
      const currentLevel = Number(control.get('level')?.value || 0);
      if (currentLevel <= 0) {
        break;
      }

      const currentIndex = this.items.controls.indexOf(control);
      if (currentIndex < 0) {
        break;
      }

      this.promoteItem(currentIndex);
      safety++;
    }
  }

  rebuildEditorNavItems(): void {
        this.editorNavItems = this.items.controls.map((control, index) => {
      const item = control as FormGroup;
      const id = this.getStableNavItemId(item);
      const primaryImageUrl = this.hasPrimarySampleImage(index) ? this.getPrimarySampleImageUrl(index) : null;
      const sampleVideoUrl = this.hasSampleVideo(index) ? this.getPrimarySampleVideoUrl(index) : null;
      const rawTitle = String(item.get('title')?.value ?? '');
      const title = rawTitle.trim() || 'Untitled';
      const description = item.get('description')?.value || '';
      const searchText = `${title} ${description}`.trim();

      return {
        id,
        title,
        level: item.get('level')?.value || 0,
        orderIndex: item.get('order_index')?.value ?? index,
        submissionType: item.get('submission_type')?.value || 'photo',
        isRequired: !!item.get('is_required')?.value,
        requiresPhoto: !!item.get('photo_requirements')?.value?.picture_required,
        hasPrimarySampleImage: this.hasPrimarySampleImage(index),
        hasSampleVideo: this.hasSampleVideo(index),
        primaryImageUrl,
        sampleVideoUrl,
        isInvalid: this.isNavItemInvalid(index),
        searchText
      };
    });
  }

  private getStableNavItemId(item: FormGroup): number {
    const rawId = item.get('id')?.value;
    const parsedId = Number(rawId);
    if (Number.isFinite(parsedId) && parsedId > 0) {
      return parsedId;
    }

    const existing = this.tempNavIds.get(item);
    if (existing) {
      return existing;
    }

    const generated = this.nextTempNavId++;
    this.tempNavIds.set(item, generated);
    return generated;
  }

  private async openMoveUnderPicker(sourceIndex: number): Promise<void> {
    const candidates = this.getMoveUnderCandidates(sourceIndex);
    if (!candidates.length) {
      await Swal.fire({
        icon: 'info',
        title: 'No valid parent targets',
        text: 'This item cannot be moved under another parent from its current position.'
      });
      return;
    }

    const inputOptions: Record<string, string> = {};
    candidates.forEach((candidate) => {
      inputOptions[String(candidate.index)] = candidate.label;
    });

    const result = await Swal.fire({
      title: 'Move Under...',
      input: 'select',
      inputOptions,
      inputPlaceholder: 'Select target parent',
      showCancelButton: true,
      confirmButtonText: 'Move',
      inputValidator: (value) => {
        if (value === undefined || value === null || value === '') {
          return 'Select a target parent';
        }
        return undefined;
      }
    });

    if (!result.isConfirmed) {
      return;
    }

    const targetIndex = Number(result.value);
    if (!Number.isInteger(targetIndex)) {
      return;
    }

    this.moveItemUnderTarget(sourceIndex, targetIndex);
  }

  private getMoveUnderCandidates(sourceIndex: number): Array<{ index: number; label: string }> {
    if (sourceIndex < 0 || sourceIndex >= this.items.length) {
      return [];
    }

    const subtreeEnd = this.getSubtreeEndExclusive(sourceIndex);
    const candidates: Array<{ index: number; label: string }> = [];

    for (let i = 0; i < this.items.length; i++) {
      if (i >= sourceIndex && i < subtreeEnd) {
        continue;
      }

      const label = `${this.getOutlineNumber(i)} ${this.getItemTitle(i)}`;
      candidates.push({ index: i, label });
    }

    return candidates;
  }

  private moveItemUnderTarget(sourceIndex: number, targetIndex: number): void {
    if (sourceIndex < 0 || sourceIndex >= this.items.length) return;
    if (targetIndex < 0 || targetIndex >= this.items.length) return;

    const subtreeEnd = this.getSubtreeEndExclusive(sourceIndex);
    if (targetIndex >= sourceIndex && targetIndex < subtreeEnd) {
      return;
    }

    this.performDrop(sourceIndex, targetIndex, {
      useAnchorIndex: true,
      dropPosition: 'inside',
      targetIndex
    });
  }

  /**
   * Clear filters and show all form items
   */
  showAllFormItems(): void {
    this.selectedFormItemIndex = null;
    this.navViewMode = 'all';
    this.cdr.detectChanges();
  }

  /**
   * Check if an item is a descendant (child at any level) of a parent item
   */
  private isDescendantOf(itemIndex: number, parentIndex: number): boolean {
    if (itemIndex <= parentIndex) return false;

    const parentLevel = this.items.at(parentIndex)?.get('level')?.value || 0;
    const itemLevel = this.items.at(itemIndex)?.get('level')?.value || 0;

    // Item must have a deeper level to be a descendant
    if (itemLevel <= parentLevel) return false;

    // Check if this item is within the parent's range
    // Start from the item and walk backwards to find if parent is an ancestor
    for (let i = itemIndex - 1; i > parentIndex; i--) {
      const checkLevel = this.items.at(i)?.get('level')?.value || 0;
      // If we hit an item at the same or shallower level as parent, we've left the parent's tree
      if (checkLevel <= parentLevel) return false;
    }

    return true;
  }

  /**
   * Edit only the selected item from navigation dropdown
   */
  editItemOnly(itemIndex: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedFormItemIndex = itemIndex;
    this.scrollToItem(itemIndex);
  }

  /**
   * Get count of required items
   */
  getRequiredItemsCount(): number {
    return this.items.controls.filter(item => item.get('is_required')?.value).length;
  }

  getItemsPendingReviewCount(): number {
    let pending = 0;

    for (let i = 0; i < this.items.length; i++) {
      if (this.isNavItemInvalid(i)) {
        pending++;
      }
    }

    return pending;
  }

  getItemsReviewedCount(): number {
    return Math.max(0, this.items.length - this.getItemsPendingReviewCount());
  }

  /**
   * Get count of photo items
   */
  getPhotoItemsCount(): number {
    return this.items.controls.filter(item =>
      item.get('submission_type')?.value === 'photo' ||
      item.get('submission_type')?.value === 'either'
    ).length;
  }

  /**
   * Get count of video items
   */
  getVideoItemsCount(): number {
    return this.items.controls.filter(item =>
      item.get('submission_type')?.value === 'video' ||
      item.get('submission_type')?.value === 'either'
    ).length;
  }

  /**
   * Get count of items with sample media
   */
  getItemsWithMediaCount(): number {
    let count = 0;
    this.items.controls.forEach((item, i) => {
      const hasImages = this.getSampleImagesArray(i).length > 0;
      const hasVideos = this.getSampleVideosArray(i).length > 0;
      if (hasImages || hasVideos) count++;
    });
    return count;
  }

  /**
   * Toggle expansion state of a parent item in navigation
   */
  toggleNavExpansion(itemIndex: number, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent scrollToItem from firing
    }

    if (this.expandedItems.has(itemIndex)) {
      this.expandedItems.delete(itemIndex);
    } else {
      this.expandedItems.add(itemIndex);
    }

    setTimeout(() => this.updateSidebarStickyAncestors(), 0);
  }

  /**
   * Check if an item should be visible in the navigation tree
   */
  isNavItemVisible(itemIndex: number): boolean {
    const item = this.items.at(itemIndex);
    if (!item) return false;

    const level = item.get('level')?.value || 0;

    // Apply view mode filter first
    if (this.navViewMode === 'groups' && level !== 0) {
      // In groups mode, only show level 0 items (groups/parents)
      return false;
    }
    if (this.navViewMode === 'items' && level === 0) {
      // In items mode, only show non-group items (level > 0)
      return false;
    }

    // Then apply search filter if active
    if (this.isNavSearchActive()) {
      return this.navSearchVisibleIndices.has(itemIndex);
    }

    // Root items are always visible (if not filtered by view mode)
    if (level === 0) return true;

    // Find parent item and check if it's expanded
    for (let i = itemIndex - 1; i >= 0; i--) {
      const potentialParent = this.items.at(i);
      const parentLevel = potentialParent?.get('level')?.value || 0;

      // Found the direct parent
      if (parentLevel === level - 1) {
        return this.expandedItems.has(i) && this.isNavItemVisible(i);
      }
    }

    return false;
  }

  isNavSearchActive(): boolean {
    return this.normalizeNavSearchTerm(this.navSearchTerm).length > 0;
  }

  onSidebarNavKeydown = (event: KeyboardEvent): void => {
    const key = event.key;
    const isDirectionalKey = key === 'Home' || key === 'End';
    if (!isDirectionalKey) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const tagName = (target?.tagName || '').toLowerCase();
    const isTextInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
    const isButton = tagName === 'button';
    const isEditable = !!target?.closest('.ql-editor,[contenteditable="true"]');
    if (isTextInput || isButton || isEditable) {
      return;
    }

    const visibleIndices = this.getVisibleNavItemIndices();
    if (!visibleIndices.length) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const currentIndex = this.getCurrentKeyboardNavIndex(visibleIndices);
    let nextIndex = currentIndex;

    if (key === 'Home') {
      nextIndex = visibleIndices[0];
    } else if (key === 'End') {
      nextIndex = visibleIndices[visibleIndices.length - 1];
    }

    if (nextIndex === null || nextIndex < 0) {
      return;
    }

    this.selectItem(nextIndex);

    // Keep keyboard-driven selection visible in the nav pane.
    setTimeout(() => {
      document.getElementById(`nav-item-${nextIndex}`)?.scrollIntoView({ block: 'nearest' });
    }, 0);
  }

  private getVisibleNavItemIndices(): number[] {
    const visibleIndices: number[] = [];

    for (let i = 0; i < this.items.length; i++) {
      if (this.isNavItemVisible(i)) {
        visibleIndices.push(i);
      }
    }

    return visibleIndices;
  }

  private getCurrentKeyboardNavIndex(visibleIndices: number[]): number | null {
    if (this.selectedFormItemIndex !== null && visibleIndices.includes(this.selectedFormItemIndex)) {
      return this.selectedFormItemIndex;
    }

    if (this.activeNavItemIndex >= 0 && visibleIndices.includes(this.activeNavItemIndex)) {
      return this.activeNavItemIndex;
    }

    return null;
  }

  isNavItemMatch(itemIndex: number): boolean {
    return this.isNavSearchActive() && this.navSearchMatchedIndices.has(itemIndex);
  }

  onNavSearchTermChanged(): void {
    const normalized = this.normalizeNavSearchTerm(this.navSearchTerm);

    // Search started
    if (!this.lastNormalizedSearchTerm && normalized) {
      this.savedExpandedItemsBeforeSearch = new Set(this.expandedItems);
    }

    // Search cleared
    if (this.lastNormalizedSearchTerm && !normalized) {
      if (this.savedExpandedItemsBeforeSearch) {
        this.expandedItems = new Set(this.savedExpandedItemsBeforeSearch);
      }
      this.savedExpandedItemsBeforeSearch = null;
    }

    this.lastNormalizedSearchTerm = normalized;
    this.updateNavSearchSets();

    // Auto-expand parents of matches for context
    if (normalized) {
      this.navSearchMatchedIndices.forEach((i) => this.expandParentsOfItem(i));
    }

    this.cdr.detectChanges();
    setTimeout(() => this.updateSidebarStickyAncestors(), 0);
  }

  onSidebarNavScroll(): void {
    if (this.sidebarStickyRafPending) {
      return;
    }

    this.sidebarStickyRafPending = true;
    requestAnimationFrame(() => {
      this.sidebarStickyRafPending = false;

      const now = performance.now();
      if (now - this.lastSidebarStickyUpdateAt < this.sidebarStickyThrottleMs) {
        return;
      }

      this.lastSidebarStickyUpdateAt = now;
      this.updateSidebarStickyAncestors();
    });
  }

  private setupSidebarNavScrollListener(attempt: number = 0): void {
    if (this.sidebarNavScrollHandler) {
      return;
    }

    const container = this.sidebarNavListRef?.nativeElement;
    if (!container) {
      if (attempt < 10) {
        setTimeout(() => this.setupSidebarNavScrollListener(attempt + 1), 60);
      }
      return;
    }

    this.sidebarNavScrollHandler = () => {
      this.onSidebarNavScroll();
    };

    this.ngZone.runOutsideAngular(() => {
      container.addEventListener('scroll', this.sidebarNavScrollHandler as EventListener, { passive: true });
    });
  }

  private teardownSidebarNavScrollListener(): void {
    const container = this.sidebarNavListRef?.nativeElement;
    if (container && this.sidebarNavScrollHandler) {
      container.removeEventListener('scroll', this.sidebarNavScrollHandler as EventListener);
    }
    this.sidebarNavScrollHandler = null;
  }

  onStickyNavAncestorSelected(index: number): void {
    this.selectItem(index);
    setTimeout(() => this.scrollNavItemIntoView(index), 0);
  }

  private updateSidebarStickyAncestors(): void {
    if (!this.enableStickyNavParent || !this.items.length) {
      this.lastTopVisibleSidebarNavIndex = null;
      this.setStickyNavAncestors([]);
      return;
    }

    const topVisibleIndex = this.getTopVisibleSidebarNavIndex();
    if (topVisibleIndex === null) {
      this.lastTopVisibleSidebarNavIndex = null;
      this.setStickyNavAncestors([]);
      return;
    }

    // Avoid expensive ancestor recompute while scrolling unless the top visible row changed.
    if (topVisibleIndex === this.lastTopVisibleSidebarNavIndex) {
      return;
    }

    this.lastTopVisibleSidebarNavIndex = topVisibleIndex;
    this.setStickyNavAncestors(this.getVisibleAncestorChain(topVisibleIndex));
  }

  private setStickyNavAncestors(next: number[]): void {
    const signature = next.join(',');
    if (signature === this.lastStickyAncestorSignature) {
      return;
    }

    const applyUpdate = () => {
      this.lastStickyAncestorSignature = signature;
      this.stickyNavAncestorIndices = next;
    };

    if (NgZone.isInAngularZone()) {
      applyUpdate();
      return;
    }

    this.ngZone.run(applyUpdate);
  }

  private getTopVisibleSidebarNavIndex(): number | null {
    const container = this.sidebarNavListRef?.nativeElement;
    if (!container) {
      return null;
    }

    const containerRect = container.getBoundingClientRect();
    if (containerRect.height <= 0 || containerRect.width <= 0) {
      return null;
    }

    const stickyContainer = container.querySelector<HTMLElement>('.tce-nav-sticky-parent');
    const stickyBottom = stickyContainer ? stickyContainer.getBoundingClientRect().bottom : containerRect.top;
    const probeStartY = Math.max(containerRect.top + 6, stickyBottom + 4);

    // Fast path: probe a few points below sticky context near the left area.
    const probeX = Math.min(containerRect.right - 8, Math.max(containerRect.left + 16, containerRect.left + containerRect.width * 0.35));
    const probeOffsets = [0, 20, 40, 60];
    for (const offset of probeOffsets) {
      const probeY = probeStartY + offset;
      if (probeY >= containerRect.bottom) {
        break;
      }

      const hit = document.elementFromPoint(probeX, probeY) as HTMLElement | null;
      const navItem = hit?.closest('.tce-nav-item[id^="nav-item-"]') as HTMLElement | null;
      const parsed = navItem ? this.parseNavItemIndexFromId(navItem.id) : null;
      if (parsed !== null) {
        return parsed;
      }
    }

    // Fallback: scan rows when probe path misses (e.g., overlays or sticky row overlap).
    const items = Array.from(container.querySelectorAll<HTMLElement>('.tce-nav-item[id^="nav-item-"]'));
    if (!items.length) {
      return null;
    }

    const visibleTop = containerRect.top + 4;

    for (const item of items) {
      const rect = item.getBoundingClientRect();
      if (rect.bottom <= visibleTop) {
        continue;
      }

      const parsed = this.parseNavItemIndexFromId(item.id);
      if (parsed !== null) {
        return parsed;
      }
    }

    return null;
  }

  private parseNavItemIndexFromId(id: string): number | null {
    const parsed = Number((id || '').replace('nav-item-', ''));
    return Number.isInteger(parsed) ? parsed : null;
  }

  private getVisibleAncestorChain(targetIndex: number): number[] {
    const targetLevel = Number(this.items.at(targetIndex)?.get('level')?.value || 0);
    if (targetLevel <= 0) {
      return [];
    }

    const ancestors: number[] = [];
    let expectedParentLevel = targetLevel - 1;

    // Walk backward and capture direct parent chain only (O(n) without recursive visibility checks).
    for (let index = targetIndex - 1; index >= 0 && expectedParentLevel >= 0; index--) {
      const level = Number(this.items.at(index)?.get('level')?.value || 0);
      if (level === expectedParentLevel) {
        ancestors.unshift(index);
        expectedParentLevel -= 1;
      }
    }

    return ancestors;
  }

  private scrollNavItemIntoView(index: number): void {
    document.getElementById(`nav-item-${index}`)?.scrollIntoView({ block: 'nearest' });
  }

  private scrollNavItemIntoViewSoon(index: number, attempt: number = 0): void {
    const navItem = document.getElementById(`nav-item-${index}`);
    if (navItem) {
      navItem.scrollIntoView({ block: 'nearest' });
      return;
    }

    const maxAttempts = 8;
    if (attempt >= maxAttempts) {
      return;
    }

    setTimeout(() => this.scrollNavItemIntoViewSoon(index, attempt + 1), 60);
  }

  clearNavSearch(): void {
    this.navSearchTerm = '';
    this.onNavSearchTermChanged();
  }

  /**
   * Set the navigation view mode
   */
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

    // Find matches
    this.items.controls.forEach((ctrl, i) => {
      const title = ((ctrl.get('title')?.value ?? '') + '').toLowerCase();
      const desc = ((ctrl.get('description')?.value ?? '') + '').toLowerCase();
      if (title.includes(normalized) || desc.includes(normalized)) {
        this.navSearchMatchedIndices.add(i);
      }
    });

    this.navSearchMatchCount = this.navSearchMatchedIndices.size;

    // Visible = matches + ancestors + descendants of a match
    this.navSearchMatchedIndices.forEach((matchIndex) => {
      this.navSearchVisibleIndices.add(matchIndex);
      this.addNavAncestors(matchIndex);
      this.addNavDescendants(matchIndex);
    });
  }

  private addNavAncestors(itemIndex: number): void {
    let currentLevel = this.items.at(itemIndex)?.get('level')?.value || 0;
    for (let i = itemIndex - 1; i >= 0 && currentLevel > 0; i--) {
      const level = this.items.at(i)?.get('level')?.value || 0;
      if (level === currentLevel - 1) {
        this.navSearchVisibleIndices.add(i);
        currentLevel = level;
      }
    }
  }

  private addNavDescendants(itemIndex: number): void {
    const level = this.items.at(itemIndex)?.get('level')?.value || 0;
    for (let i = itemIndex + 1; i < this.items.length; i++) {
      const nextLevel = this.items.at(i)?.get('level')?.value || 0;
      if (nextLevel <= level) break;
      this.navSearchVisibleIndices.add(i);
    }
  }

  /**
   * Check if item has children (is a parent)
   */
  hasChildren(itemIndex: number): boolean {
    const currentLevel = this.items.at(itemIndex)?.get('level')?.value || 0;

    // Check if the next item has a higher level (is a child)
    if (itemIndex + 1 < this.items.length) {
      const nextLevel = this.items.at(itemIndex + 1)?.get('level')?.value || 0;
      return nextLevel > currentLevel;
    }

    return false;
  }

  /**
   * Initialize navigation tree - expand all parent items by default
   */
  initializeNavExpansion(): void {
    this.items.controls.forEach((item, i) => {
      if (this.hasChildren(i)) {
        this.expandedItems.add(i);
      }
    });
  }

  /**
   * Expand all parent items in navigation
   */
  expandAllNav(): void {
    this.items.controls.forEach((item, i) => {
      if (this.hasChildren(i)) {
        this.expandedItems.add(i);
      }
    });
  }

  /**
   * Collapse all parent items in navigation
   */
  collapseAllNav(): void {
    this.expandedItems.clear();
  }

  /**
   * Setup scroll listener to track which item is currently in view
   */
  setupScrollListener(): void {
    if (this.boundScrollHandler) {
      return;
    }

    this.boundScrollHandler = () => {
      if (this.scheduledFallbackCheck) return;
      this.scheduledFallbackCheck = true;
      requestAnimationFrame(() => {
        this.scheduledFallbackCheck = false;
        this.ngZone.run(() => this.checkActiveItem());
      });
    };

    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.boundScrollHandler!, { passive: true });
    });
  }

  private teardownScrollListener(): void {
    if (this.boundScrollHandler) {
      window.removeEventListener('scroll', this.boundScrollHandler);
      this.boundScrollHandler = null;
    }
  }

  private setupIntersectionObserver(): void {
    this.teardownIntersectionObserver();

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      this.setupScrollListener();
      return;
    }

    this.visibleItemEntries.clear();

    this.ngZone.runOutsideAngular(() => {
      this.activeItemObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const el = entry.target as HTMLElement;
            const match = /^edit-item-(\d+)$/.exec(el.id || '');
            if (!match) continue;
            const index = parseInt(match[1], 10);

            if (entry.isIntersecting) {
              this.visibleItemEntries.set(index, entry);
            } else {
              this.visibleItemEntries.delete(index);
            }
          }

          if (this.isProgrammaticScrollLocked()) {
            return;
          }

          const nextActive = this.pickBestActiveIndexFromVisibleEntries();
          if (nextActive !== -1 && nextActive !== this.activeNavItemIndex) {
            this.ngZone.run(() => {
              this.activeNavItemIndex = nextActive;
              this.syncTrackedItemToQueryParam(nextActive);
              this.updateStickyParentFromActive(nextActive);
              this.expandParentsOfItem(nextActive);
              this.cdr.detectChanges();
            });
          }
        },
        {
          root: null,
          rootMargin: '-120px 0px -65% 0px',
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
        }
      );

      for (let i = 0; i < this.items.length; i++) {
        const el = document.getElementById(`edit-item-${i}`);
        if (el) {
          this.activeItemObserver!.observe(el);
        }
      }
    });
  }

  private teardownIntersectionObserver(): void {
    if (this.activeItemObserver) {
      this.activeItemObserver.disconnect();
      this.activeItemObserver = null;
    }
    this.visibleItemEntries.clear();
  }

  private pickBestActiveIndexFromVisibleEntries(): number {
    if (this.visibleItemEntries.size === 0) return -1;

    const targetTop = 120;
    let bestIndex = -1;
    let bestDistance = Infinity;

    for (const [index, entry] of this.visibleItemEntries.entries()) {
      const distance = Math.abs(entry.boundingClientRect.top - targetTop);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    return bestIndex;
  }

  private updateStickyParentFromActive(activeIndex: number): void {
    this.stickyParentIndex = this.computeStickyParentIndex(activeIndex);
  }

  private computeStickyParentIndex(activeIndex: number): number | null {
    if (activeIndex < 0 || activeIndex >= this.items.length) {
      return null;
    }

    const activeLevel = this.items.at(activeIndex)?.get('level')?.value ?? 0;
    if (!activeLevel || activeLevel <= 0) {
      return null;
    }

    // Find the nearest root (level 0) ancestor above this item
    for (let i = activeIndex - 1; i >= 0; i--) {
      const level = this.items.at(i)?.get('level')?.value ?? 0;
      if (level === 0) {
        return this.hasChildren(i) ? i : null;
      }
    }

    return null;
  }

  getItemTitle(index: number): string {
    const value = this.items.at(index)?.get('title')?.value;
    return (value ?? '').toString() || 'Untitled';
  }

  getChildCount(parentIndex: number): number {
    if (parentIndex < 0 || parentIndex >= this.items.length) return 0;
    const parentLevel = this.items.at(parentIndex)?.get('level')?.value ?? 0;
    if (parentLevel !== 0) return 0;

    let count = 0;
    for (let i = parentIndex + 1; i < this.items.length; i++) {
      const level = this.items.at(i)?.get('level')?.value ?? 0;
      if (level <= parentLevel) break;
      count++;
    }
    return count;
  }

  refreshActiveItemTracking(): void {
    // Ensure we don't have both observer and scroll listener running
    this.teardownScrollListener();
    this.setupIntersectionObserver();
  }

  private scheduleActiveItemTrackingRefresh(delayMs: number = 80): void {
    if (this.activeTrackingRefreshTimeout) {
      clearTimeout(this.activeTrackingRefreshTimeout);
    }

    this.activeTrackingRefreshTimeout = setTimeout(() => {
      this.activeTrackingRefreshTimeout = null;
      this.refreshActiveItemTracking();
    }, delayMs);
  }

  private beginProgrammaticScrollLock(durationMs: number = this.programmaticScrollLockMs): void {
    this.suppressObserverUpdatesUntil = Date.now() + durationMs;
  }

  private isProgrammaticScrollLocked(): boolean {
    return Date.now() < this.suppressObserverUpdatesUntil;
  }

  /**
   * Check which item is currently in the viewport
   */
  checkActiveItem(): void {
    if (this.isProgrammaticScrollLocked()) {
      return;
    }

    const viewportMiddle = window.innerHeight / 2;
    let closestItem = -1;
    let closestDistance = Infinity;

    // Find the item closest to the middle of the viewport
    this.items.controls.forEach((item, i) => {
      const element = document.getElementById(`edit-item-${i}`);
      if (element) {
        const rect = element.getBoundingClientRect();
        const elementMiddle = rect.top + rect.height / 2;
        const distance = Math.abs(elementMiddle - viewportMiddle);

        if (distance < closestDistance && rect.top < viewportMiddle && rect.bottom > 0) {
          closestDistance = distance;
          closestItem = i;
        }
      }
    });

    if (closestItem !== this.activeNavItemIndex) {
      this.activeNavItemIndex = closestItem;
      this.syncTrackedItemToQueryParam(closestItem >= 0 ? closestItem : null);
      this.updateStickyParentFromActive(closestItem);

      // Auto-expand parent folders to show active item
      if (closestItem >= 0) {
        this.expandParentsOfItem(closestItem);
      }

      this.cdr.detectChanges();
    }
  }

  /**
   * Scroll the navigation sidebar to show the active item
   */
  scrollNavToActiveItem(itemIndex: number): void {
    // Wait for DOM to update after expansion
    setTimeout(() => {
      const navElement = document.getElementById(`nav-item-${itemIndex}`);
      const navContainer = document.querySelector('.list-group-flush');

      if (navElement && navContainer) {
        const containerRect = navContainer.getBoundingClientRect();
        const elementRect = navElement.getBoundingClientRect();

        // Check if element is outside the visible area of the container
        const isAboveView = elementRect.top < containerRect.top;
        const isBelowView = elementRect.bottom > containerRect.bottom;

        if (isAboveView || isBelowView) {
          // Scroll the navigation container to center the active item
          const scrollTop = navElement.offsetTop - navContainer.clientHeight / 2 + navElement.clientHeight / 2;
          navContainer.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      }
    }, 150); // Delay to allow expansion animation
  }

  /**
   * Expand all parent folders of a given item
   */
  expandParentsOfItem(itemIndex: number): void {
    const level = this.items.at(itemIndex)?.get('level')?.value || 0;

    if (level === 0) return; // Root item, no parents

    // Find all parent items going backward
    for (let i = itemIndex - 1; i >= 0; i--) {
      const parentLevel = this.items.at(i)?.get('level')?.value || 0;

      // If this is a parent level, expand it
      if (parentLevel < level && this.hasChildren(i)) {
        this.expandedItems.add(i);
      }

      // Stop when we reach a root item
      if (parentLevel === 0) break;
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('tce-page-active');

    this.teardownIntersectionObserver();
    this.teardownScrollListener();
    this.teardownSidebarNavScrollListener();

    this.routeParamSub?.unsubscribe();
    this.routeQueryParamSub?.unsubscribe();
    this.templateFormChangesSub?.unsubscribe();
    this.navItemsSub?.unsubscribe();

    if (this.scrollCheckTimeout) {
      clearTimeout(this.scrollCheckTimeout);
    }

    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    if (this.activeTrackingRefreshTimeout) {
      clearTimeout(this.activeTrackingRefreshTimeout);
      this.activeTrackingRefreshTimeout = null;
    }

    if (this.restoreNavSelectionTimeout) {
      clearTimeout(this.restoreNavSelectionTimeout);
      this.restoreNavSelectionTimeout = null;
    }

    if (this.pendingSelectedItemQueryParamTimeout) {
      clearTimeout(this.pendingSelectedItemQueryParamTimeout);
      this.pendingSelectedItemQueryParamTimeout = null;
    }
  }

  openSampleImagesModal(itemIndex: number): void {
    // Store the current item index for the modal
    this.currentModalItemIndex = itemIndex;
    this.currentModalSubmissionType = (this.items.at(itemIndex)?.get('submission_type')?.value || 'photo') as 'photo' | 'video' | 'audio' | 'either' | 'none';

    if (this.currentModalSubmissionType === 'none') {
      this.items.at(itemIndex)?.get('photo_requirements.picture_required')?.setValue(false);
    }

    // Open modal - the modal content will use openPrimarySampleImageUpload and openReferenceImageUpload
    this.modalService.open(this.sampleImagesModalTemplate, { size: 'lg', backdrop: 'static' });
  }

  isCurrentModalNoMedia(): boolean {
    return this.currentModalSubmissionType === 'none';
  }

  openSampleVideoModal(itemIndex: number): void {
    // Store the current item index for the modal
    this.currentModalItemIndex = itemIndex;

    // Open modal - the modal content will use openSampleVideoUpload
    this.modalService.open(this.sampleVideoModalTemplate, { size: 'lg', backdrop: 'static' });
  }

  openReferenceImageUpload(itemIndex: number): void {
    if (this.getReferenceImageCount(itemIndex) >= 5) {
      alert('Maximum of 5 reference images allowed');
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    fileInput.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file && file.type.startsWith('image/')) {
        try {
          await this.uploadReferenceImage(itemIndex, file);
        } catch (error) {
          console.error('Upload failed:', error);
        }
      } else {
        alert('Please select an image file');
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  async uploadReferenceImage(itemIndex: number, file: File): Promise<void> {
    if (this.getReferenceImageCount(itemIndex) >= 5) {
      alert('Maximum of 5 reference images allowed');
      return;
    }

    this.uploadingImage = true;

    try {
      const response = await this.photoUploadService.uploadTemporaryImage(file, `item-${itemIndex}-ref-${Date.now()}`);

      if (response.success && response.url) {
        const newReferenceImage: SampleImage = {
          url: response.url,
          label: `Reference ${this.getReferenceImageCount(itemIndex) + 1}`,
          description: '',
          type: 'photo',
          image_type: 'reference',
          is_primary: false,
          order_index: this.getReferenceImageCount(itemIndex) + 1,
          status: 'loaded'
        };

        // Update sample images array
        let images: SampleImage | SampleImage[] | null = this.sampleImages[itemIndex];
        let imageArray: SampleImage[] = [];

        if (!images) {
          imageArray = [];
        } else if (Array.isArray(images)) {
          imageArray = images;
        } else {
          // Legacy single image - ensure it's marked as primary sample before converting to array
          const legacyImage = images;
          legacyImage.is_primary = true;
          legacyImage.image_type = 'sample';
          imageArray = [legacyImage];
        }

        imageArray.push(newReferenceImage);
        this.sampleImages[itemIndex] = imageArray;

        // Update form control
        const item = this.items.at(itemIndex);
        item.patchValue({
          sample_images: imageArray
        });

        // Mark form as dirty to detect changes
        item.markAsDirty();
        this.templateForm.markAsDirty();
      }
    } catch (error) {
      console.error('Error uploading reference image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      this.uploadingImage = false;
    }
  }

  removeReferenceImage(itemIndex: number, refImageIndex: number): void {
    let images: SampleImage | SampleImage[] | null = this.sampleImages[itemIndex];
    if (!Array.isArray(images)) return;

    const refImages = this.getReferenceImages(itemIndex);
    const imageToRemove = refImages[refImageIndex];

    // Remove the specific reference image
    const filteredImages: SampleImage[] = images.filter((img: SampleImage) => img !== imageToRemove);

    this.sampleImages[itemIndex] = filteredImages.length > 0 ? filteredImages : null;

    // Update form
    const item = this.items.at(itemIndex);
    item.patchValue({
      sample_images: this.sampleImages[itemIndex]
    });

    // Mark form as dirty to detect changes
    item.markAsDirty();
    this.templateForm.markAsDirty();
  }

  previewReferenceImage(itemIndex: number, refImageIndex: number): void {
    const refImages = this.getReferenceImages(itemIndex);
    const image = refImages[refImageIndex];
    if (image?.url) {
      const startIndex = this.hasPrimarySampleImage(itemIndex) ? refImageIndex + 1 : refImageIndex;
      this.openSampleImagesViewer(itemIndex, startIndex);
    }
  }

  // =====================
  // Sample Video Methods
  // =====================

  openSampleVideoUpload(itemIndex: number): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/*';
    fileInput.style.display = 'none';

    fileInput.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file && file.type.startsWith('video/')) {
        try {
          await this.uploadSampleVideo(itemIndex, file);
        } catch (error) {
          console.error('Video upload failed:', error);
        }
      } else {
        alert('Please select a video file (mp4, webm, mov)');
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  async uploadSampleVideo(itemIndex: number, file: File): Promise<void> {
    this.uploadingVideo = true;

    try {
      // Validate allowed duration vs item config
      const item = this.items.at(itemIndex);
      const maxDuration = item?.get('photo_requirements')?.get('max_video_duration_seconds')?.value || 30;

      // Check duration by loading metadata
      const url = URL.createObjectURL(file);
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.src = url;

      const duration: number = await new Promise((resolve, reject) => {
        videoEl.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve(videoEl.duration || 0);
        };
        videoEl.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to read video metadata'));
        };
      });

      if (maxDuration && duration > maxDuration) {
        alert(`Video duration is ${Math.round(duration)}s which exceeds the allowed ${maxDuration}s`);
        return;
      }

      const tempId = `sample_video_${itemIndex}_${Date.now()}`;
      // Validate file size against template override or default (video)
      const maxSize = this.getMaxUploadBytes('video');
      // if (file.size > maxSize) {
      //   alert('Video file size too large. Maximum size is ' + Math.round(maxSize / (1024 * 1024)) + 'MB');
      //   return;
      // }

      const response = await this.photoUploadService.uploadTemporaryImage(file, tempId);

      if (response && response.success && response.url) {
        const newVideo: SampleVideo = {
          id: `uploaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: response.url,
          label: 'Sample Video',
          description: '',
          type: 'video',
          is_primary: true,
          order_index: 0,
          status: 'loaded'
        };

        this.sampleVideos[itemIndex] = newVideo;

        // Update the form control
        const itemFormGroup = this.items.at(itemIndex) as FormGroup;
        if (itemFormGroup) {
          itemFormGroup.patchValue({
            sample_videos: [newVideo]
          });
        }
      } else {
        const err = response?.error || 'Upload failed';
        throw new Error(err);
      }
    } catch (error: any) {
      console.error('Sample video upload error:', error);
      alert('Failed to upload video: ' + (error?.message || error));
    } finally {
      this.uploadingVideo = false;
    }
  }

  previewSampleVideo(itemIndex: number): void {
    const video = this.sampleVideos[itemIndex];
    let url: string | null = null;
    if (Array.isArray(video)) {
      url = video[0]?.url || null;
    } else if (video) {
      url = video.url;
    }

    if (url) {
      this.openSharedFileViewer([
        {
          url,
          fileName: 'Sample Video'
        }
      ], 0);
    }
  }

  private openSampleImagesViewer(itemIndex: number, startIndex: number): void {
    const viewerItems: Array<{ url: string; fileName: string }> = [];

    const primary = this.getPrimarySampleImage(itemIndex);
    if (primary?.url) {
      const primaryUrl = primary.url.startsWith('data:') ? primary.url : this.getAbsoluteImageUrl(primary.url);
      viewerItems.push({
        url: primaryUrl,
        fileName: primary.label || 'Primary Sample Image'
      });
    }

    const references = this.getReferenceImages(itemIndex);
    for (const refImage of references) {
      if (!refImage?.url) {
        continue;
      }
      const refUrl = refImage.url.startsWith('data:') ? refImage.url : this.getAbsoluteImageUrl(refImage.url);
      viewerItems.push({
        url: refUrl,
        fileName: refImage.label || 'Reference Image'
      });
    }

    if (viewerItems.length === 0) {
      return;
    }

    this.openSharedFileViewer(viewerItems, Math.max(0, Math.min(startIndex, viewerItems.length - 1)), undefined, true);
  }

  private openSharedFileViewer(
    items: Array<{ id?: string | number; url?: string; fileName?: string }>,
    initialIndex = 0,
    resolveById?: (id: string | number) => Promise<{ url: string; fileName?: string } | null>,
    enableNavigation = false
  ): void {
    if (!items.length) {
      return;
    }

    const modalRef = this.modalService.open(FileViewerModalComponent, {
      size: 'xl',
      centered: true,
      backdrop: true,
      keyboard: true,
    });

    const safeIndex = Math.max(0, Math.min(initialIndex, items.length - 1));
    modalRef.componentInstance.items = items;
    modalRef.componentInstance.initialIndex = safeIndex;
    modalRef.componentInstance.enableNavigation = enableNavigation;
    modalRef.componentInstance.url = items[safeIndex]?.url || '';
    modalRef.componentInstance.fileName = items[safeIndex]?.fileName || 'Attachment';
    if (resolveById) {
      modalRef.componentInstance.resolveById = resolveById;
    }
  }

  hasSampleVideo(itemIndex: number): boolean {
    const v = this.sampleVideos[itemIndex];
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    return !!v.url;
  }

  getPrimarySampleVideo(itemIndex: number): SampleVideo | null {
    const v = this.sampleVideos[itemIndex];
    if (!v) return null;
    if (Array.isArray(v)) return v.find(x => x.is_primary) || v[0] || null;
    return v as SampleVideo;
  }

  getPrimarySampleVideoUrl(itemIndex: number): string | null {
    const primary = this.getPrimarySampleVideo(itemIndex);
    if (!primary?.url) return null;
    if (primary.url.startsWith('data:')) {
      return primary.url;
    }
    return this.getAbsoluteImageUrl(primary.url);
  }

  removeSampleVideo(itemIndex: number): void {
    this.sampleVideos[itemIndex] = null;
    const item = this.items.at(itemIndex);
    if (item) {
      item.patchValue({ sample_videos: null });
      item.markAsDirty();
      this.templateForm.markAsDirty();
    }
  }

  saveTemplate(): void {
    const templateData = this.buildTemplatePayload();

    if (this.editingTemplate && !this.editingTemplate.is_draft) {
      const changes = this.detectTemplateChanges(this.editingTemplate, templateData);

      if (!changes?.has_changes) {
        alert('No changes to save.');
        return;
      }

      const allowPublishedReorderSave = this.hasReorderMutations || this.isReorderOnlyChangeSet(changes);

      if (!allowPublishedReorderSave) {
        this.saving = false;
        alert('Published templates can only be saved in place for item sorting changes. Start a draft for content edits.');
        return;
      }

      this.proceedWithSave(templateData, false, changes, 'Reordered checklist items');
      return;
    }

    // --- Publish validation ---
    this.templateForm.markAllAsTouched();
    this.items.controls.forEach(item => item.markAllAsTouched());

    const errors: string[] = [];

    // Template-level: name required
    if (this.templateForm.get('name')?.invalid) {
      errors.push('Template name is required.');
    }

    // Item-level validation
    let firstInvalidItemIndex: number | null = null;
    this.items.controls.forEach((item, i) => {
      const outline = this.getOutlineNumber(i);
      if (item.get('title')?.invalid) {
        errors.push(`Item ${outline}: Title is required.`);
        if (firstInvalidItemIndex === null) firstInvalidItemIndex = i;
      }
    });

    // Media validation
    const missingSampleImageIndex = this.getFirstMissingSampleImageIndex();
    const missingSampleVideoIndex = this.getFirstMissingSampleVideoIndex();
    const missingEitherMediaIndex = this.getFirstMissingEitherMediaIndex();
    const missingSampleIndex = missingSampleImageIndex ?? missingSampleVideoIndex ?? missingEitherMediaIndex;
    if (missingSampleIndex !== null) {
      const outline = this.getOutlineNumber(missingSampleIndex);
      const type = missingSampleImageIndex !== null ? 'photo' : missingSampleVideoIndex !== null ? 'video' : 'photo or video';
      errors.push(`Item ${outline}: A sample ${type} is required.`);
      if (firstInvalidItemIndex === null) firstInvalidItemIndex = missingSampleIndex;
    }

    if (errors.length > 0) {
      this.publishValidationErrors = errors;
      // Navigate to first invalid item so user sees it highlighted
      if (firstInvalidItemIndex !== null) {
        this.selectItem(firstInvalidItemIndex);
      } else {
        this.activePanel = 'template-info';
      }
      return;
    }

    this.publishValidationErrors = [];

    this.saving = true;

    // If editing an existing draft, publish in-place (same template ID) instead of creating a new version.
    if (this.editingTemplate?.is_draft) {
      (templateData as any).is_draft = 0;
      (templateData as any).is_active = 1;
      // Preserve the version assigned when the draft was created (e.g. 2.0 for a major version draft).
      // Without this the backend falls back to '1.0' since version is not a form control.
      if (this.editingTemplate.version) {
        (templateData as any).version = this.editingTemplate.version;
      }
      delete (templateData as any).source_template_id;
      this.proceedWithSave(templateData, false);
      return;
    }

    // When editing a template, ask user to describe changes
    if (this.editingTemplate) {
      this.saving = false; // Reset while we show the dialog

      // Show the revision description dialog
      const modalRef = this.modalService.open(RevisionDescriptionDialogComponent, {
        size: 'lg',
        backdrop: 'static',
        keyboard: false
      });

      // Pass data to the modal
      modalRef.componentInstance.templateName = this.editingTemplate.name;
      modalRef.componentInstance.currentVersion = this.editingTemplate.version || '1.0';
      modalRef.componentInstance.nextVersion = this.getNextVersion(this.editingTemplate.version || '1.0');
      // Auto-fill disabled for now

      modalRef.result.then(
        (result) => {
          // Create new version with user's description
          this.proceedWithSave(templateData, true, null, result.revisionDescription, result.notes, result.nextVersion);
        },
        (reason) => {
          // Modal dismissed (cancel)
        }
      );
    } else {
      // New template - no revision needed
      this.proceedWithSave(templateData, false);
    }
  }

  private isReorderOnlyChangeSet(changes: any): boolean {
    if (!changes?.has_changes) {
      return false;
    }

    // Reorder-in-place should be driven by item-level changes only.
    // Template-level metadata can appear as noisy diffs after normalization
    // and should not block a reorder save.

    if ((changes.items_added?.length ?? 0) > 0 || (changes.items_removed?.length ?? 0) > 0) {
      return false;
    }

    const itemChanges = Array.isArray(changes.items_modified) ? changes.items_modified : [];
    if (itemChanges.length === 0) {
      return false;
    }

    const allowedFields = new Set([
      'Position',
      'Hierarchy Level',
      'Parent Item',
      // Backward compatibility: tolerate older/alternate labels from compare pipelines.
      'Parent ID',
      'Parent'
    ]);

    return itemChanges.every((item: any) => {
      const changesForItem = Array.isArray(item?.changes) ? item.changes : [];
      if (changesForItem.length === 0) {
        return false;
      }

      return changesForItem.every((entry: any) => allowedFields.has(String(entry?.field || '')));
    });
  }

  saveDraft(): void {
    if (this.saving) {
      return;
    }

    this.saving = true;

    const startedSeq = this.changeSeq;

    const templateData = this.buildTemplatePayload();
    (templateData as any).is_draft = 1;

    // If starting a draft from a published template, create a NEW row (don't overwrite the
    // published record). Pick the next minor version for the same major line.
    if (this.editingTemplate && !this.editingTemplate.is_draft) {
      const groupId = Number((this.editingTemplate as any)?.template_group_id || this.editingTemplate.id || 0);
      const major = Number(String(this.editingTemplate.version || '1.0').split('.')[0] || 1);

      // Carry group membership and source link into the new draft row.
      (templateData as any).template_group_id = groupId;
      (templateData as any).source_template_id = this.editingTemplate.id;

      this.configService.getTemplatesIncludingInactive().subscribe({
        next: (templates: any[]) => {
          const nextVersion = this.computeNextMinorForMajorLine(templates || [], groupId, major);
          (templateData as any).version = nextVersion;

          // CREATE a new draft row — never mutate the published template.
          const saveRequest = this.configService.createTemplate(templateData);
          this.subscribeToDraftSave(saveRequest, startedSeq, templateData);
        },
        error: (error) => {
          console.error('Error loading templates for version calculation:', error);
          // Fall back to current version + 1
          (templateData as any).version = this.getNextVersion(this.editingTemplate!.version || '1.0');

          const saveRequest = this.configService.createTemplate(templateData);
          this.subscribeToDraftSave(saveRequest, startedSeq, templateData);
        }
      });
      return;
    }

    // Preserve the version already assigned to this draft (e.g. 2.0 for a major version draft).
    if (this.editingTemplate?.version && !(templateData as any).version) {
      (templateData as any).version = this.editingTemplate.version;
    }

    const saveRequest = this.editingTemplate
      ? this.configService.updateTemplate(this.editingTemplate.id, templateData)
      : this.configService.createTemplate(templateData);

    this.subscribeToDraftSave(saveRequest, startedSeq, templateData);
  }

  private subscribeToDraftSave(saveRequest: any, startedSeq: number, templateData?: any): void {
    saveRequest.subscribe({
      next: (response: any) => {
        if (response?.success === false) {
          // Root fix: if backend reports existing draft, persist current edits there immediately.
          const existingDraftId = Number(response?.existing_draft_id || 0);
          if (response?.code === 'DRAFT_ALREADY_EXISTS' && existingDraftId > 0 && templateData) {
            const retryPayload = { ...templateData, is_draft: 1 };
            const retryRequest = this.configService.updateTemplate(existingDraftId, retryPayload);
            this.subscribeToDraftSave(retryRequest, startedSeq, retryPayload);
            return;
          }

          this.saving = false;
          this.handleTemplateSaveFailureResponse(response, 'draft');
          return;
        }

        this.saving = false;
        this.lastSavedAt = new Date();

        // Clear unsaved-change prompts after a confirmed successful save.
        // Note: this treats any edits made during the request as “saved” from the UX perspective.
        this.markSaved(startedSeq);

        // Backend may create/switch to a draft template. Apply returned template data first
        // and align URL to the returned template_id so refresh loads the same saved draft.
        const responseTemplateId = Number(response?.template_id || 0);
        const currentTemplateId = Number(this.editingTemplate?.id || 0);

        if (response?.template) {
          const rawTemplate: any = { ...response.template };
          if (responseTemplateId > 0) {
            rawTemplate.id = responseTemplateId;
          }

          const normalizedTemplate: any = this.normalizeTemplateFlags(rawTemplate);

          this.editingTemplate = normalizedTemplate as ChecklistTemplate;
          this.populateForm(this.editingTemplate);
          this.updateComponentWithSavedTemplate(normalizedTemplate);
        } else if (responseTemplateId > 0) {
          // Fallback when backend does not include template payload.
          this.loadTemplate(responseTemplateId);
        }

        if (responseTemplateId > 0 && responseTemplateId !== currentTemplateId) {
          this.router.navigate(['/quality/checklist/template-editor', responseTemplateId], { replaceUrl: true });
        }

        // updateComponentWithSavedTemplate may patch values; re-baseline again.
        this.markSaved(startedSeq);

        // (navigation handled above)
      },
      error: (error) => {
        console.error('Error saving draft:', error);
        this.saving = false;
      }
    });
  }

  private computeNextMinorForMajorLine(templates: any[], templateGroupId: number, major: number): string {
    const safeMajor = Number.isFinite(major) && major > 0 ? major : 1;
    const safeGroup = Number.isFinite(templateGroupId) && templateGroupId > 0 ? templateGroupId : 0;

    let maxMinor = 0;

    for (const t of templates) {
      if (!t) {
        continue;
      }

      const groupId = Number(t.template_group_id || 0);
      if (safeGroup > 0 && groupId !== safeGroup) {
        continue;
      }

      // Only consider published templates when choosing the next minor.
      const isDraft = this.toBoolFlag(t.is_draft);
      if (isDraft) {
        continue;
      }

      const isDeleted = this.toBoolFlag(t.is_deleted);
      if (isDeleted) {
        continue;
      }

      const versionStr = String(t.version || '');
      const parts = versionStr.split('.');
      const maj = Number(parts[0] || 0);
      const min = Number(parts[1] || 0);
      if (maj !== safeMajor) {
        continue;
      }

      if (Number.isFinite(min) && min > maxMinor) {
        maxMinor = min;
      }
    }

    return `${safeMajor}.${maxMinor + 1}`;
  }

  async discardCurrentDraft(): Promise<void> {
    if (this.saving || !this.editingTemplate?.is_draft) {
      return;
    }

    const draftName = this.editingTemplate.name || 'this draft';
    const confirmed = confirm(
      `Discard draft "${draftName}"? This will permanently remove the draft and all unsaved draft changes.`
    );

    if (!confirmed) {
      return;
    }

    this.saving = true;

    try {
      const response = await firstValueFrom(this.configService.discardDraft(this.editingTemplate.id));
      this.saving = false;

      if (response?.success) {
        this.navigateToTemplateManager(this.editingTemplate.id);
        return;
      }

      const backendError = response?.error || response?.message || 'Unable to discard draft.';
      if (response?.instance_count && response.instance_count > 0) {
        alert(`${backendError} This draft has ${response.instance_count} instance(s).`);
        return;
      }

      alert(backendError);
    } catch (error: any) {
      console.error('Error discarding current draft:', error);
      this.saving = false;
      alert(error?.error?.error || error?.message || 'An error occurred while discarding the draft.');
    }
  }

  private buildTemplatePayload(): any {
    const templateData = this.templateForm.value;

    // Always snapshot items from the live FormArray control order (not from
    // templateForm.value cache) so drag reorder persists correctly.
    this.rebuildParentReferencesFromLevels();
    this.recalculateOrderIndices();
    const orderedItems = this.items.controls.map((control) => ({
      ...((control as FormGroup).getRawValue())
    }));

    // DEBUG: Log sample_images from form before save
    //
        templateData.items.forEach((item: any, index: number) => {
      if (item.sample_images && Array.isArray(item.sample_images)) {
              } else {
              }
    });

    // Ensure is_active is a proper boolean (convert from checkbox value if needed)
    if (typeof templateData.is_active !== 'boolean') {
      templateData.is_active = !!templateData.is_active;
    }

    templateData.category = 'inspection';

    // Note: Quality document relationship is handled separately from template creation
    // Remove the form control field since it's not part of the database schema
    delete templateData.quality_document_id;

    // Clean up sample_images array for backend
    templateData.items = orderedItems.map((item: any, index: number) => {
      // Ensure photo_requirements is properly formatted (includes submission_type, etc.)
      if (item.photo_requirements) {
        // Ensure submission_type is present
        if (!item.photo_requirements.submission_type) {
          item.photo_requirements.submission_type = 'photo'; // Default to 'photo'
        }
      }

      // Backend ONE-PASS algorithm automatically determines parent_id from:
      // 1. Sequential order of items in the array
      // 2. The 'level' field
      // No need to send parent_order_index or parent_id - backend calculates it!

      // Ensure sample_images array is properly formatted for the backend
      if (item.sample_images && Array.isArray(item.sample_images)) {
        // Clean up UI-specific fields that shouldn't be sent to backend
        item.sample_images = item.sample_images.map((img: SampleImage) => ({
          url: img.url,
          label: img.label || '',
          description: img.description || '',
          type: img.type || 'photo',
          image_type: img.image_type || 'sample',
          is_primary: img.is_primary || false,
          order_index: img.order_index || 0
        }));
      }
      // Ensure sample_videos array is properly formatted for the backend
      if (item.sample_videos && Array.isArray(item.sample_videos)) {
        item.sample_videos = item.sample_videos.map((v: SampleVideo) => ({
          url: v.url,
          label: v.label || '',
          description: v.description || '',
          type: v.type || 'video',
          is_primary: v.is_primary || false,
          order_index: v.order_index || 0,
          duration_seconds: v.duration_seconds || null
        }));
      }

      if (item.links && Array.isArray(item.links)) {
        item.links = item.links
          .map((link: ItemLink) => ({
            title: (link.title || '').trim(),
            url: (link.url || '').trim(),
            description: (link.description || '').trim()
          }))
          .filter((link: ItemLink) => link.title || link.url || link.description);
      } else {
        item.links = [];
      }

      // Return item with level for ONE-PASS parent_id calculation
      // Backend uses sequential processing + level to determine parent_id automatically
      // Do not send local parent_id values; stale IDs can override intended order.
      const { parent_id, ...sanitizedItem } = item;
      return {
        ...sanitizedItem
        // parent_order_index removed - no longer needed with ONE-PASS algorithm
      };
    });

    return templateData;
  }

  private detectTemplateChanges(originalTemplate: any, newData: any): any {
    const changes: any = {
      has_changes: false,
      field_changes: [],
      items_added: [],
      items_removed: [],
      items_modified: []
    };

    // Compare metadata fields
    const fieldsToCheck = [
      { key: 'name', label: 'Template Name' },
      { key: 'description', label: 'Description' },
      { key: 'part_number', label: 'Part Number' },
      { key: 'product_type', label: 'Product Type' },
      { key: 'category', label: 'Category' },
      { key: 'is_active', label: 'Active Status' },
      { key: 'max_upload_size_mb', label: 'Max Upload Size' },
      { key: 'disable_max_upload_limit', label: 'Disable Upload Limit' }
    ];

    for (const field of fieldsToCheck) {
      const oldValue = originalTemplate[field.key];
      const newValue = newData[field.key];

      const normalizedOld = this.normalizeTemplateFieldValue(field.key, oldValue);
      const normalizedNew = this.normalizeTemplateFieldValue(field.key, newValue);

      if (normalizedOld !== normalizedNew) {
        changes.has_changes = true;
        changes.field_changes.push({
          field: field.label,
          old_value: normalizedOld,
          new_value: normalizedNew
        });
      }
    }

    // Compare items using a SIMPLE approach:
    // 1. Items from DB have 'id' - use that as the key
    // 2. Match old and new by ID
    // 3. If old item's ID not found in new items = REMOVED
    // 4. Compare only items with matching IDs for changes
    const oldItemsRaw = originalTemplate.items || [];
    const oldItems = Array.isArray(oldItemsRaw) && oldItemsRaw.some((item: any) => Array.isArray(item?.children) && item.children.length > 0)
      ? this.flattenNestedItems(oldItemsRaw)
      : oldItemsRaw;
    const newItems = newData.items || [];

    // Build a map of NEW items by their ID (from form's hidden id field)
    const newItemsById = new Map<number, any>();
    const newItemsWithoutId: any[] = [];
    newItems.forEach((item: any) => {
      if (item.id) {
        newItemsById.set(item.id, item);
      } else {
        newItemsWithoutId.push(item);
      }
    });

    // Check each OLD item
    oldItems.forEach((oldItem: any) => {
      if (!oldItem.id) {
        return; // Skip items without IDs
      }

      const newItem = newItemsById.get(oldItem.id);

      if (!newItem) {
        // Old item not found in new items = DELETED
        changes.has_changes = true;
        changes.items_removed.push({
          title: oldItem.title,
          order_index: oldItem.order_index
        });
      } else {
        // Item exists in both - check for modifications
        const itemChanges = this.compareItems(oldItem, newItem);
        if (itemChanges.length > 0) {
          changes.has_changes = true;
          changes.items_modified.push({
            title: newItem.title,
            order_index: newItem.order_index,
            changes: itemChanges
          });
        }

        // Remove from map so we can detect additions later
        newItemsById.delete(oldItem.id);
      }
    });

    // Any items left in newItemsById are NEW
    const addedItems: any[] = [];
    newItemsById.forEach((newItem) => addedItems.push(newItem));
    if (newItemsWithoutId.length > 0) {
      addedItems.push(...newItemsWithoutId);
    }

    if (addedItems.length > 0) {
      changes.has_changes = true;
      addedItems.forEach((newItem) => {
        changes.items_added.push({
          title: newItem.title,
          order_index: newItem.order_index
        });
      });
    }

    return changes;
  }

  private generateItemKey(item: any): string {
    // Use title + order_index as unique key
    return `${item.title}_${item.order_index}`;
  }

  private buildRevisionSummary(changes: any): string {
    if (!changes?.has_changes) {
      return '';
    }

    const lines: string[] = [];

    if (changes.field_changes?.length) {
      const fields = changes.field_changes.map((c: any) => c.field).join(', ');
      lines.push(`Template fields updated: ${fields}`);
    }

    if (changes.items_added?.length) {
      const titles = changes.items_added.map((i: any) => i.title || 'Untitled').join(', ');
      lines.push(`Items added: ${titles}`);
    }

    if (changes.items_removed?.length) {
      const titles = changes.items_removed.map((i: any) => i.title || 'Untitled').join(', ');
      lines.push(`Items removed: ${titles}`);
    }

    if (changes.items_modified?.length) {
      const combined = new Map<string, Set<string>>();
      changes.items_modified.forEach((item: any) => {
        const key = `${item.title || 'Untitled'}|${item.order_index ?? ''}`;
        const fields = (item.changes || []).map((c: any) => c.field).filter(Boolean);
        if (!combined.has(key)) {
          combined.set(key, new Set<string>());
        }
        const set = combined.get(key)!;
        fields.forEach((f: string) => set.add(f));
      });

      combined.forEach((fields, key) => {
        const [title, orderIndex] = key.split('|');
        const fieldList = Array.from(fields).join(', ');
        if (fieldList) {
          const suffix = orderIndex ? ` (#${orderIndex})` : '';
          lines.push(`Item "${title}"${suffix}: ${fieldList}`);
        }
      });
    }

    return lines.join('\n');
  }

  private compareItems(oldItem: any, newItem: any): any[] {
    const itemChanges = [];
    // Compare fields that represent content or order changes
    const fieldsToCheck = [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'is_required', label: 'Active' },
      { key: 'sample_image_url', label: 'Sample Image' },
      { key: 'sample_images', label: 'Sample & Reference Images' }, // Track all images (primary + references)
      { key: 'sample_videos', label: 'Sample Videos' },
      { key: 'links', label: 'Links' },
      { key: 'photo_requirements', label: 'Photo Requirements' },
      { key: 'submission_type', label: 'Submission Type' },
      { key: 'submission_time_seconds', label: 'Submission Time Limit' },
      { key: 'order_index', label: 'Position' },        // Track reordering
      { key: 'level', label: 'Hierarchy Level' },       // Track parent/child changes
      { key: 'parent_id', label: 'Parent Item' }        // Track hierarchy changes
    ];

    for (const field of fieldsToCheck) {
      const oldValue = oldItem[field.key];
      const newValue = newItem[field.key];

      // Skip if both are empty
      if (this.isEmptyValue(oldValue) && this.isEmptyValue(newValue)) {
        continue;
      }

      // Special handling for sample_images array - normalize before comparing
      if (field.key === 'sample_images') {
        const normalizedOld = this.normalizeSampleImages(oldValue);
        const normalizedNew = this.normalizeSampleImages(newValue);

        const oldJson = this.sortedStringify(normalizedOld);
        const newJson = this.sortedStringify(normalizedNew);

        if (oldJson !== newJson) {
          itemChanges.push({
            field: field.label,
            old_value: normalizedOld,
            new_value: normalizedNew
          });
        }
      } else if (field.key === 'sample_videos') {
        const normalizedOld = this.normalizeSampleVideos(oldValue);
        const normalizedNew = this.normalizeSampleVideos(newValue);

        const oldJson = this.sortedStringify(normalizedOld);
        const newJson = this.sortedStringify(normalizedNew);

        if (oldJson !== newJson) {
          itemChanges.push({
            field: field.label,
            old_value: normalizedOld,
            new_value: normalizedNew
          });
        }
      } else if (field.key === 'links') {
        const normalizedOld = this.normalizeLinks(oldValue);
        const normalizedNew = this.normalizeLinks(newValue);

        const oldJson = this.sortedStringify(normalizedOld);
        const newJson = this.sortedStringify(normalizedNew);

        if (oldJson !== newJson) {
          itemChanges.push({
            field: field.label,
            old_value: normalizedOld,
            new_value: normalizedNew
          });
        }
      } else if (field.key === 'photo_requirements') {
        const normalizedOld = this.normalizePhotoRequirements(oldValue);
        const normalizedNew = this.normalizePhotoRequirements(newValue);

        const oldJson = this.sortedStringify(normalizedOld);
        const newJson = this.sortedStringify(normalizedNew);

        if (oldJson !== newJson) {
          itemChanges.push({
            field: field.label,
            old_value: normalizedOld,
            new_value: normalizedNew
          });
        }
      }
      // For objects (like photo_requirements), use normalized comparison
      else if (typeof oldValue === 'object' && oldValue !== null && typeof newValue === 'object' && newValue !== null) {
        const oldJson = this.sortedStringify(this.normalizeValue(oldValue));
        const newJson = this.sortedStringify(this.normalizeValue(newValue));

        if (oldJson !== newJson) {
          itemChanges.push({
            field: field.label,
            old_value: oldValue,
            new_value: newValue
          });
        }
      }
      // For primitives (strings, numbers, booleans)
      else if (typeof oldValue === 'number' || typeof newValue === 'number') {
        const oldNum = oldValue === null || oldValue === undefined ? null : Number(oldValue);
        const newNum = newValue === null || newValue === undefined ? null : Number(newValue);
        if (oldNum !== newNum) {
          itemChanges.push({
            field: field.label,
            old_value: oldValue,
            new_value: newValue
          });
        }
      }
      else if (oldValue !== newValue) {
        itemChanges.push({
          field: field.label,
          old_value: oldValue,
          new_value: newValue
        });
      }
    }

    return itemChanges;
  }

  /**
   * Normalize sample images for comparison by keeping only relevant fields
   * Removes UI-specific fields like 'id', 'status' that don't affect actual data
   */
  private normalizeSampleImages(images: any): any {
    if (!images || !Array.isArray(images)) {
      return null;
    }

    // Keep only the essential fields for comparison
    return images
      .map(img => ({
      url: img.url,
      label: img.label || '',
      description: img.description || '',
      type: img.type || 'photo',
      image_type: img.image_type || 'sample',
      is_primary: !!img.is_primary,
      order_index: img.order_index || 0
      }))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  private normalizeSampleVideos(videos: any): any {
    if (!videos || !Array.isArray(videos)) {
      return null;
    }

    return videos
      .map(vid => ({
        url: vid.url,
        label: vid.label || '',
        description: vid.description || '',
        type: vid.type || 'video',
        is_primary: !!vid.is_primary,
        order_index: vid.order_index || 0,
        duration_seconds: vid.duration_seconds ?? null
      }))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  private normalizeLinks(links: any): any {
    if (!links || !Array.isArray(links)) {
      return null;
    }

    return links
      .map(link => ({
        title: (link.title || '').trim(),
        url: (link.url || '').trim(),
        description: (link.description || '').trim()
      }))
      .sort((a, b) => {
        const aKey = `${a.title}|${a.url}|${a.description}`.toLowerCase();
        const bKey = `${b.title}|${b.url}|${b.description}`.toLowerCase();
        return aKey.localeCompare(bKey);
      });
  }

  private normalizeTemplateFieldValue(key: string, value: any): any {
    if (key === 'is_active' || key === 'disable_max_upload_limit') {
      return !!value;
    }

    if (key === 'max_upload_size_mb') {
      if (value === null || value === undefined || value === '') return null;
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }

    return value === undefined ? null : value;
  }

  private normalizePhotoRequirements(req: any): any {
    if (!req || typeof req !== 'object') {
      return {
        angle: '',
        distance: '',
        lighting: '',
        focus: '',
        min_photos: null,
        max_photos: null,
        picture_required: true,
        max_video_duration_seconds: 30
      };
    }

    const normalized = {
      angle: (req.angle || '').trim(),
      distance: (req.distance || '').trim(),
      lighting: (req.lighting || '').trim(),
      focus: (req.focus || '').trim(),
      min_photos: req.min_photos === null || req.min_photos === undefined || req.min_photos === '' ? null : Number(req.min_photos),
      max_photos: req.max_photos === null || req.max_photos === undefined || req.max_photos === '' ? null : Number(req.max_photos),
      picture_required: req.picture_required === undefined ? true : !!req.picture_required,
      max_video_duration_seconds: req.max_video_duration_seconds === undefined || req.max_video_duration_seconds === null || req.max_video_duration_seconds === ''
        ? 30
        : Number(req.max_video_duration_seconds)
    };

    if (Number.isNaN(normalized.min_photos as any)) normalized.min_photos = null;
    if (Number.isNaN(normalized.max_photos as any)) normalized.max_photos = null;
    if (Number.isNaN(normalized.max_video_duration_seconds as any)) normalized.max_video_duration_seconds = 30;

    return normalized;
  }

  private isEmptyValue(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'object') {
      if (Array.isArray(value)) return value.length === 0;
      return Object.keys(value).length === 0;
    }
    if (typeof value === 'string') return value.trim() === '';
    return false;
  }

  private normalizeValue(value: any): any {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object' && Object.keys(value).length === 0) return null;
    return value;
  }

  private sortedStringify(obj: any): string {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return JSON.stringify(obj.map(item => this.sortedStringify(item)));

    // Sort object keys alphabetically before stringifying
    const sortedObj: any = {};
    Object.keys(obj).sort().forEach(key => {
      sortedObj[key] = obj[key];
    });
    return JSON.stringify(sortedObj);
  }

  private proceedWithSave(templateData: any, createVersion: boolean, changes?: any, revisionDescription?: string, versionNotes?: string, versionOverride?: string): void {
    this.saving = true;

    // Never store version markers inside the template title; version is tracked separately.
    if (templateData && typeof templateData.name === 'string') {
      templateData.name = this.stripVersionSuffixFromName(templateData.name);
    }

    if (!templateData.created_by) {
      templateData.created_by = this.getCurrentUserIdentifier();
    }

    const startedSeq = this.changeSeq;

    // "Save" creates/updates a PUBLISHED template unless explicitly marked as draft.
    if (!createVersion) {
      (templateData as any).is_draft = (templateData as any).is_draft === 1 ? 1 : 0;
    }
    if ((templateData as any).is_draft === undefined || (templateData as any).is_draft === null) {
      (templateData as any).is_draft = 0;
    }

    if (!createVersion) {
      delete (templateData as any).source_template_id;
    }

    // When creating a new version
    if (createVersion && this.editingTemplate) {
      // Increment the version for the new template
      const currentVersion = this.editingTemplate.version || '1.0';
      const newVersion = versionOverride?.trim() || this.getNextVersion(currentVersion);
      templateData.version = newVersion;

      // IMPORTANT: Pass the source template ID to maintain parent/group relationships
      templateData.source_template_id = this.editingTemplate.id;

      // Add version notes if provided
      if (versionNotes) {
        templateData.version_notes = versionNotes;
      }
    } else if (this.editingTemplate) {
      // Updating current version - use updateTemplate instead
      templateData.id = this.editingTemplate.id;
    }

    // Choose the appropriate API call
    const saveRequest = (createVersion || !this.editingTemplate)
      ? this.configService.createTemplate(templateData)
      : this.configService.updateTemplate(this.editingTemplate.id, templateData);

    // DEBUG: Simplified logging
    const subItemCount = templateData.items?.filter((i: any) => i.level === 1).length || 0;
        // Add timeout wrapper
    const timeoutId = setTimeout(() => {
      console.error('Save operation timed out after 30 seconds');
      this.saving = false;
      alert('Save operation timed out. Please try again.');
    }, 30000);

    saveRequest.subscribe({
      next: (response: any) => {
        clearTimeout(timeoutId);

        if (response?.success === false) {
          this.saving = false;
          this.handleTemplateSaveFailureResponse(response, 'template');
          return;
        }

                // Clear publish validation errors on successful save
        this.publishValidationErrors = [];

        // Clear unsaved-change prompts after a confirmed successful save.
        this.savedSeq = Math.max(this.savedSeq, this.changeSeq, startedSeq);

        // Get the template ID (either from response or existing template)
        const templateId = response.template_id || this.editingTemplate?.id;

        if (!templateId) {
          console.error('No template ID available');
          this.saving = false;
          alert('Error: Template ID not available');
          return;
        }

        // Update component data with returned template (includes permanent image URLs)
        if (response.template) {
                    this.updateComponentWithSavedTemplate(response.template);
        } else {
          console.warn('⚠️ Backend did not return template data in response');
        }

        // After saving template, integrate with document control system
        if (createVersion && this.editingTemplate && revisionDescription) {
          // Editing existing template - create new revision if it has a document
          if (this.editingTemplate.quality_document_metadata?.document_id) {
            this.createRevision(
              this.editingTemplate.quality_document_metadata.document_id,
              templateId,
              revisionDescription,
              null, // No automatic change detection
              versionNotes
            );
          } else {
            // First time creating document for existing template
            this.createDocument(templateId, templateData.name, revisionDescription, templateData);
          }
        } else if (!this.editingTemplate) {
          // New template - create document
          this.createDocument(templateId, templateData.name, 'Initial revision', templateData);
        } else if (!createVersion && this.editingTemplate?.is_draft) {
          this.saving = false;
          alert('Draft published successfully!');
          this.navigateToTemplateManager(templateId);
        } else {
          // Direct update without revision tracking (shouldn't happen with current flow)
          this.saving = false;
          alert('Template updated successfully!');
          this.navigateToTemplateManager(templateId);
        }
      },
      error: (error) => {
        clearTimeout(timeoutId);
        this.saving = false;
      }
    });
  }

  private handleTemplateSaveFailureResponse(response: any, context: 'draft' | 'template'): void {
    const responseCode = response?.code || '';
    const existingDraftId = Number(response?.existing_draft_id || 0);

    if (responseCode === 'DRAFT_ALREADY_EXISTS' && existingDraftId > 0) {
      alert('A working draft already exists. Opening the existing draft now.');
      this.router.navigate(['/quality/checklist/template-editor', existingDraftId], { replaceUrl: true });
      this.loadTemplate(existingDraftId);
      return;
    }

    if (responseCode === 'UNSAFE_ITEM_ID_MUTATION_BLOCKED') {
      const count = Number(response?.instance_count || 0);
      const suffix = count > 0 ? ` (${count} instance${count === 1 ? '' : 's'} detected).` : '.';
      const createSubVersion = confirm(
        'Save blocked to protect existing checklist progress. This reorder cannot be applied safely in-place' +
        suffix +
        ' Create a new sub-version draft now?'
      );
      if (createSubVersion) {
        this.saveDraft();
      }
      return;
    }

    const fallback = context === 'draft' ? 'Unable to save draft.' : 'Unable to save template.';
    const message = response?.error || response?.message || fallback;
    alert(message);
  }

  /**
   * Create a new checklist document (first time)
   */
  private createDocument(templateId: number, title: string, revisionDescription: string, templateData: any): void {
    const documentData = {
      prefix: 'QA-CHK',
      title: title,
      description: templateData.description || '',
      department: 'QA' as const,
      category: 'inspection',
      template_id: templateId,
      created_by: this.getCurrentUserIdentifier(),
      revision_description: revisionDescription
    };

    this.configService.createChecklistDocument(documentData).subscribe({
      next: (result) => {
                this.saving = false;
        alert(`✓ Document created: ${result.document_number}, Rev ${result.revision_number}\n\n${result.message}`);
        this.navigateToTemplateManager(templateId);
      },
      error: (error) => {
        console.error('Error creating document:', error);
        this.saving = false;
      }
    });
  }

  /**
   * Create a new revision for existing document
   */
  private createRevision(documentId: number, templateId: number, revisionDescription: string, changes: any, notes?: string): void {
    // Calculate change counts (use 0 if no changes provided)
    const items_added = changes?.items_added?.length || 0;
    const items_removed = changes?.items_removed?.length || 0;
    const items_modified = changes?.items_modified?.length || 0;

    const revisionData = {
      document_id: documentId,
      template_id: templateId,
      revision_description: revisionDescription,
      changes_summary: changes ? this.generateChangesSummary(changes) : revisionDescription,
      items_added: items_added,
      items_removed: items_removed,
      items_modified: items_modified,
      changes_detail: changes || {}, // Full change object as JSON (empty if no automatic detection)
      created_by: this.getCurrentUserIdentifier()
    };

    if (notes) {
      (revisionData as any).notes = notes;
    }

    this.configService.createChecklistRevision(revisionData).subscribe({
      next: (result) => {
                this.saving = false;
        alert(`✓ Revision created: ${result.document_number}, Rev ${result.revision_number}\n\n${result.message}`);
        this.navigateToTemplateManager(templateId);
      },
      error: (error) => {
        console.error('Error creating revision:', error);
        this.saving = false;
      }
    });
  }

  /**
   * Generate a human-readable changes summary
   */
  private generateChangesSummary(changes: any): string {
    if (!changes) {
      return 'Template updated';
    }

    const parts = [];

    if (changes.field_changes?.length) {
      parts.push(`${changes.field_changes.length} field change(s)`);
    }
    if (changes.items_added?.length) {
      parts.push(`${changes.items_added.length} item(s) added`);
    }
    if (changes.items_removed?.length) {
      parts.push(`${changes.items_removed.length} item(s) removed`);
    }
    if (changes.items_modified?.length) {
      parts.push(`${changes.items_modified.length} item(s) modified`);
    }

    return parts.join(', ') || 'No significant changes';
  }

  cancel(): void {
    this.navigateToTemplateManager(this.editingTemplate?.id);
  }

  private navigateToTemplateManager(focusId?: number | null): void {
    const safeFocusId = Number(focusId || this.editingTemplate?.id || 0);
    if (safeFocusId > 0) {
      this.router.navigate(['/inspection-checklist/template-manager'], {
        queryParams: { focusId: safeFocusId }
      });
      return;
    }

    this.router.navigate(['/inspection-checklist/template-manager']);
  }

  // Import functionality
  openImportModal(): void {
    this.importError = null;
    this.importing = false;
    this.importManualName = '';
    this.importManualItemCount = 5;
    this.modalService.open(this.importModalRef, { size: 'lg', backdrop: 'static' });
  }

  /**
   * Open preview modal to show condensed read-only view of entire checklist
   */
  openPreviewModal(): void {
    this.modalService.open(this.previewModalRef, { fullscreen: true, scrollable: true, backdrop: 'static' });
  }

  async onImportFileSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;

    this.importing = true;
    this.importError = null;

    try {
      let parsedTemplate;

      if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
                parsedTemplate = await this.wordParser.parseWordToTemplate(file);
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
                parsedTemplate = await this.pdfParser.parsePdfToTemplate(file);
      } else if (file.name.toLowerCase().endsWith('.csv')) {
                parsedTemplate = await this.pdfParser.parseCsvToTemplate(file);
      } else {
        throw new Error('Unsupported file format. Please upload a Word (.docx), PDF, or CSV file.');
      }

      // Populate the form with parsed data
      this.populateFormFromImport(parsedTemplate);

      // Close modal
      this.modalService.dismissAll();

      // Automatically save the imported template as a draft (with small delay to ensure form is populated)
      setTimeout(() => {
        this.saveImportedTemplate();
      }, 100);

      alert(`Successfully imported and saved ${parsedTemplate.items.length} items from ${file.name}`);
    } catch (error: any) {
      console.error('Import error:', error);
      this.importError = error.message || 'Failed to import file. Please check the format and try again.';
    } finally {
      this.importing = false;
      // Clear file input
      event.target.value = '';
    }
  }

  processManualImport(): void {
    if (!this.importManualName || !this.importManualItemCount) {
      return;
    }

    const parsedTemplate = this.pdfParser.createManualTemplate({
      name: this.importManualName,
      itemCount: this.importManualItemCount,
      category: 'inspection'
    });

    this.populateFormFromImport(parsedTemplate);

    // Automatically save the manually created template as a draft (with small delay to ensure form is populated)
    setTimeout(() => {
      this.saveImportedTemplate();
    }, 100);

    alert(`Successfully created template with ${parsedTemplate.items.length} items`);
  }

  /**
   * Automatically save imported template as a draft to the server
   * Uploads any data URL images to the server first
   */
  private async saveImportedTemplate(): Promise<void> {
    if (this.templateForm.invalid) {
      return;
    }

            // First, upload any data URL images to the server
    const uploadPromises: Promise<void>[] = [];

    this.items.controls.forEach((control, index) => {
      const itemFormGroup = control as FormGroup;
      const sampleImageUrl = itemFormGroup.get('sample_image_url')?.value;

      // Check if this is a data URL (from Word import)
      if (sampleImageUrl && sampleImageUrl.startsWith('data:')) {
                uploadPromises.push(this.convertDataUrlToUpload(index, sampleImageUrl));
      }
    });

    // Wait for all uploads to complete
    if (uploadPromises.length > 0) {
            try {
        await Promise.all(uploadPromises);
              } catch (error) {
        console.error('❌ Some images failed to upload:', error);
        alert('Some images could not be uploaded. The template will be saved without those images.');
      }
    }

    const templateData = this.templateForm.value;

    // Check for potentially truncated data URLs; summarize once to avoid console spam.
    const suspiciousDataUrlCount = templateData.items.reduce((count: number, item: any) => {
      const sampleImageUrl = item?.sample_image_url;
      if (sampleImageUrl && sampleImageUrl.startsWith('data:') && sampleImageUrl.length < 1000) {
        return count + 1;
      }
      return count;
    }, 0);

    if (suspiciousDataUrlCount > 0) {
      console.warn(`Detected ${suspiciousDataUrlCount} potentially truncated data URL image(s) during import auto-save.`);
    }

    // Save to server
    if (!templateData.created_by) {
      templateData.created_by = this.getCurrentUserIdentifier();
    }
    this.configService.createTemplate(templateData).subscribe({
      next: (response) => {
                // Update the URL to reflect that we're now editing an existing template
        if (response && response.template_id) {
                    // Reload the template from the server to get the full data
          this.loadTemplate(response.template_id);

          // Update the URL without reloading the page
          this.router.navigate(['/quality/checklist/template-editor', response.template_id], { replaceUrl: true });
        }
      },
      error: (error) => {
        console.error('✗ Failed to auto-save imported template:', error);
        // Don't show error alert here since the user can still manually save
        // Just log the error for debugging
      }
    });
  }

  private getCurrentUserIdentifier(): string {
    const currentUser = this.authenticationService.currentUserValue;
    if (currentUser?.id !== null && currentUser?.id !== undefined) {
      return String(currentUser.id);
    }
    if (currentUser?.full_name) {
      return String(currentUser.full_name);
    }
    if (currentUser?.username) {
      return String(currentUser.username);
    }
    return 'system';
  }

  /**
   * Update component data with saved template from backend (includes permanent URLs)
   */
  private updateComponentWithSavedTemplate(template: any): void {
    if (!template.items || !Array.isArray(template.items)) {
      return;
    }

    // Flatten items if needed
    const flattenedItems = this.flattenNestedItems(template.items || []);

    // Update sampleImages with permanent URLs from backend
    flattenedItems.forEach((item: any, index: number) => {
      if (item.sample_images && Array.isArray(item.sample_images) && item.sample_images.length > 0) {
        const updatedImages: SampleImage[] = item.sample_images.map((img: any, imgIndex: number) => ({
          id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${imgIndex}`,
          url: img.url, // This now has permanent URL (no /temp/)
          label: img.label || (img.is_primary ? 'Sample Image' : `Reference ${imgIndex}`),
          description: img.description || '',
          type: img.type || 'photo',
          image_type: img.image_type || (img.is_primary ? 'sample' : 'reference'),
          is_primary: img.is_primary || false,
          order_index: img.order_index || imgIndex,
          status: 'loaded' as const
        }));

        this.sampleImages[index] = updatedImages;

        // Update form control with permanent URLs
        const itemFormGroup = this.items.at(index) as FormGroup;
        if (itemFormGroup) {
          itemFormGroup.patchValue({
            sample_image_url: item.sample_image_url || updatedImages.find(img => img.is_primary)?.url || updatedImages[0]?.url,
            sample_images: updatedImages
          }, { emitEvent: false });
        }
      }
    });

      }

  /**
   * Schedule an auto-save after user stops editing (debounced)
   */
  private scheduleAutoSave(): void {
    // Auto-save intentionally disabled; manual "Save Draft" is the source of truth.
    return;
    // Clear any existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Schedule new auto-save after 3 seconds of inactivity
    this.autoSaveTimeout = setTimeout(() => {
      this.performAutoSave();
    }, 3000);
  }

  /**
   * Perform auto-save of current template state
   */
  private performAutoSave(): void {
    // Auto-save intentionally disabled; manual "Save Draft" is the source of truth.
    return;
    if (!this.editingTemplate || this.templateForm.invalid || this.saving) {
      return;
    }

        const startedSeq = this.changeSeq;

    const templateData = this.templateForm.value;

    // Remove quality_document_id as it's not part of the database schema
    delete templateData.quality_document_id;

    // Always autosave as draft to avoid modifying published templates with active instances.
    (templateData as any).is_draft = 1;
// Update existing template
    this.configService.updateTemplate(this.editingTemplate.id, templateData).subscribe({
      next: (response) => {
        this.lastSavedAt = new Date();
                // Auto-save should also clear unsaved-change prompts.
        this.savedSeq = Math.max(this.savedSeq, this.changeSeq, startedSeq);

        // Backend may have created a new draft template; switch editor to that draft.
        const newId = (response as any)?.template_id;
        if (newId && newId !== this.editingTemplate?.id) {
          this.loadTemplate(newId);
          this.router.navigate(['/quality/checklist/template-editor', newId], { replaceUrl: true });
        }
      },
      error: (error) => {
        console.error('✗ Auto-save failed:', error);
        // Silently fail - user can still manually save
      }
    });
  }

  /**
   * Navigation dropdown actions
   */
  private shiftExpandedItemsOnInsert(insertIndex: number): void {
    const updated = new Set<number>();
    this.expandedItems.forEach(i => {
      updated.add(i >= insertIndex ? i + 1 : i);
    });
    this.expandedItems = updated;
  }

  private shiftIndexedDictionaryOnInsert<T>(dict: { [itemIndex: number]: T }, insertIndex: number): { [itemIndex: number]: T } {
    const updated: { [itemIndex: number]: T } = {};
    Object.keys(dict).forEach(key => {
      const oldIndex = parseInt(key, 10);
      const newIndex = oldIndex >= insertIndex ? oldIndex + 1 : oldIndex;
      updated[newIndex] = dict[oldIndex];
    });
    return updated;
  }

  private shiftMediaOnInsert(insertIndex: number): void {
    this.sampleImages = this.shiftIndexedDictionaryOnInsert(this.sampleImages, insertIndex);
    this.sampleVideos = this.shiftIndexedDictionaryOnInsert(this.sampleVideos, insertIndex);
  }

  addItemAbove(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const currentItem = this.items.at(index);
    const currentLevel = currentItem.get('level')?.value || 0;
    const parentId = currentItem.get('parent_id')?.value ?? null;
    const submissionType = currentItem.get('submission_type')?.value || 'photo';

    // Use the same FormGroup shape as regular items (includes submission_type, sample_images, etc.)
    const newItem = this.createItemFormGroup({
      title: 'New Item',
      level: currentLevel,
      parent_id: parentId,
      submission_type: submissionType,
      order_index: 0
    } as any);

    // Shift any index-based state before insert so we don't “move” expansion/media to the wrong row
    this.shiftExpandedItemsOnInsert(index);
    this.shiftMediaOnInsert(index);
    this.items.insert(index, newItem);

    this.recalculateOrderIndices();

    this.rebuildEditorNavItems();
    this.cdr.detectChanges();
    this.updateNavSearchSets();
    this.scheduleActiveItemTrackingRefresh();
  }

  addItemBelow(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const currentItem = this.items.at(index);
    const currentLevel = currentItem.get('level')?.value || 0;
    const parentId = currentItem.get('parent_id')?.value ?? null;
    const submissionType = currentItem.get('submission_type')?.value || 'photo';
    const insertIndex = index + 1;

    // Use the same FormGroup shape as regular items (includes submission_type, sample_images, etc.)
    const newItem = this.createItemFormGroup({
      title: 'New Item',
      level: currentLevel,
      parent_id: parentId,
      submission_type: submissionType,
      order_index: 0
    } as any);

    this.shiftExpandedItemsOnInsert(insertIndex);
    this.shiftMediaOnInsert(insertIndex);
    this.items.insert(insertIndex, newItem);

    this.recalculateOrderIndices();

    this.rebuildEditorNavItems();
    this.cdr.detectChanges();
    this.updateNavSearchSets();
    this.scheduleActiveItemTrackingRefresh();
  }

  async duplicateItem(index: number, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    const currentItem = this.items.at(index).value;
    const insertIndex = index + 1;

    // Create duplicate with same properties but new ID using the canonical item FormGroup shape
    const duplicateItem = this.createItemFormGroup({
      ...(currentItem as any),
      id: null,
      title: `${currentItem.title || 'Untitled'} (Copy)`,
      order_index: 0
    } as any);

    this.shiftExpandedItemsOnInsert(insertIndex);
    this.shiftMediaOnInsert(insertIndex);
    this.items.insert(insertIndex, duplicateItem);

    await this.duplicateSampleMedia(index, insertIndex, duplicateItem);

    this.recalculateOrderIndices();

    this.rebuildEditorNavItems();
    this.cdr.detectChanges();
    this.updateNavSearchSets();
    this.scheduleActiveItemTrackingRefresh();
  }

  private async duplicateSampleMedia(sourceIndex: number, targetIndex: number, targetItem: FormGroup): Promise<void> {
    await Promise.all([
      this.duplicateSampleImages(sourceIndex, targetIndex, targetItem),
      this.duplicateSampleVideos(sourceIndex, targetIndex, targetItem)
    ]);
  }

  private async duplicateSampleImages(sourceIndex: number, targetIndex: number, targetItem: FormGroup): Promise<void> {
    const sourceImages = this.sampleImages[sourceIndex];
    if (!sourceImages) {
      return;
    }

    const imagesArray = Array.isArray(sourceImages) ? sourceImages : [sourceImages];
    const duplicated: SampleImage[] = [];

    for (const img of imagesArray) {
      const newUrl = await this.duplicateMediaUrl(img.url, 'image');
      duplicated.push({
        ...img,
        id: `dup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: newUrl
      });
    }

    this.sampleImages[targetIndex] = Array.isArray(sourceImages) ? duplicated : duplicated[0];

    const primaryUrl = duplicated.find(img => img.is_primary && img.image_type === 'sample')?.url || duplicated[0]?.url || null;
    targetItem.patchValue({
      sample_images: duplicated,
      sample_image_url: primaryUrl
    });
  }

  private async duplicateSampleVideos(sourceIndex: number, targetIndex: number, targetItem: FormGroup): Promise<void> {
    const sourceVideos = this.sampleVideos[sourceIndex];
    if (!sourceVideos) {
      return;
    }

    const videosArray = Array.isArray(sourceVideos) ? sourceVideos : [sourceVideos];
    const duplicated: SampleVideo[] = [];

    for (const vid of videosArray) {
      const newUrl = await this.duplicateMediaUrl(vid.url, 'video');
      duplicated.push({
        ...vid,
        id: `dup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: newUrl
      });
    }

    this.sampleVideos[targetIndex] = Array.isArray(sourceVideos) ? duplicated : duplicated[0];
    targetItem.patchValue({
      sample_videos: duplicated
    });
  }

  private async duplicateMediaUrl(url: string, type: 'image' | 'video'): Promise<string> {
    if (!url) {
      return url;
    }

    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.status}`);
      }

      const blob = await response.blob();
      const extension = blob.type?.includes('/') ? blob.type.split('/')[1] : (type === 'video' ? 'mp4' : 'jpg');
      const fileName = `duplicate-${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${extension}`;
      const file = new File([blob], fileName, { type: blob.type || (type === 'video' ? 'video/mp4' : 'image/jpeg') });

      const tempId = `${type}_duplicate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const upload = await this.photoUploadService.uploadTemporaryImage(file, tempId);
      if (upload?.success && upload?.url) {
        return upload.url;
      }
    } catch (error) {
      console.warn('Failed to duplicate media, falling back to original URL', error);
    }

    return url;
  }

  moveItemUp(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (index === 0) return; // Can't move first item up

    const previousSiblingIndex = this.findPreviousSortableSiblingIndex(index);
    if (previousSiblingIndex === null) {
      return;
    }

    // Sort within the same sibling group only; hierarchy changes use promote/demote.
    this.performDrop(index, previousSiblingIndex, { useAnchorIndex: true });
  }

  moveItemDown(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (index >= this.items.length - 1) return; // Can't move last item down

    const nextSiblingIndex = this.findNextSortableSiblingIndex(index);
    if (nextSiblingIndex === null) {
      return;
    }

    const nextSiblingSubtreeEnd = this.getSubtreeEndExclusive(nextSiblingIndex);
    // Insert after the next sibling block to perform a true "move down" sort.
    this.performDrop(index, nextSiblingSubtreeEnd, { useAnchorIndex: true });
  }

  private findPreviousSortableSiblingIndex(index: number): number | null {
    const currentLevel = Number(this.items.at(index)?.get('level')?.value || 0);
    const currentParentAnchor = currentLevel > 0
      ? this.findNearestAncestorIndexByLevel(index, currentLevel - 1)
      : -1;

    for (let i = index - 1; i >= 0; i--) {
      const level = Number(this.items.at(i)?.get('level')?.value || 0);

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
    const currentLevel = Number(this.items.at(index)?.get('level')?.value || 0);
    const currentParentAnchor = currentLevel > 0
      ? this.findNearestAncestorIndexByLevel(index, currentLevel - 1)
      : -1;

    for (let i = this.getSubtreeEndExclusive(index); i < this.items.length; i++) {
      const level = Number(this.items.at(i)?.get('level')?.value || 0);

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

  deleteItemFromNav(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const item = this.items.at(index);
    const itemTitle = item.get('title')?.value || 'this item';

    if (confirm(`Are you sure you want to delete "${itemTitle}" and all its sub-items?`)) {
      this.removeItem(index);
    }
  }

  /**
   * Returns top-level group items (level=0) that are valid move-into targets for the given index.
   * Excludes the item itself and any items inside its own subtree.
   */
  getAvailableParentGroups(index: number): { index: number; label: string }[] {
    const subtreeEnd = this.getSubtreeEndExclusive(index);
    const result: { index: number; label: string }[] = [];
    this.items.controls.forEach((ctrl, i) => {
      const level = Number(ctrl.get('level')?.value || 0);
      // Only top-level items can be group targets, skip items in the moved subtree
      if (level !== 0) return;
      if (i >= index && i < subtreeEnd) return; // inside moved subtree
      const outline = this.getOutlineNumber(i);
      const title = ctrl.get('title')?.value || 'Untitled';
      result.push({ index: i, label: `${outline} ${title}` });
    });
    return result;
  }

  trackByParentGroupIndex(_idx: number, grp: { index: number; label: string }): number {
    return grp.index;
  }

  /**
   * Move item at `sourceIndex` as the last child of the group at `targetGroupIndex`.
   */
  moveItemIntoGroup(sourceIndex: number, targetGroupIndex: number): void {
    this.performDrop(sourceIndex, targetGroupIndex, {
      useAnchorIndex: true,
      dropPosition: 'inside',
      targetIndex: targetGroupIndex
    });
  }

  canMoveItemUnder(sourceIndex: number): boolean {
    return this.getMoveUnderCandidates(sourceIndex).length > 0;
  }

  moveItemUnderFromDropdown(sourceIndex: number): void {
    void this.openMoveUnderPicker(sourceIndex);
  }

  private populateFormFromImport(parsedTemplate: any): void {
                // Log the structure of items array
    if (parsedTemplate.items && Array.isArray(parsedTemplate.items)) {
      const parentCount = parsedTemplate.items.filter((i: any) => i.level === 0).length;
      const childCount = parsedTemplate.items.filter((i: any) => i.level === 1).length;
            parsedTemplate.items.forEach((item: any, idx: number) => {
        if (item.level === 1) {
                  }
      });
    }

    // Clear existing items and sample images
    while (this.items.length > 0) {
      this.items.removeAt(0);
    }
    this.sampleImages = {};
        // Populate basic info
    this.templateForm.patchValue({
      name: parsedTemplate.name || 'Imported Template',
      category: 'inspection',
      description: parsedTemplate.description || '',
      part_number: parsedTemplate.part_number || '',
      product_type: parsedTemplate.product_type || '',
      customer_part_number: parsedTemplate.customer_part_number || '',
      customer_name: parsedTemplate.customer_name || '',
      revision: parsedTemplate.revision || '',
      original_filename: parsedTemplate.original_filename || '',
      is_active: true
    });

            // Add all items (already flattened by parser - no need to process children)
    if (parsedTemplate.items && Array.isArray(parsedTemplate.items)) {
            parsedTemplate.items.forEach((item: any, index: number) => {
        const levelLabel = item.level === 1 ? ` (sub-item, parent_id: ${item.parent_id})` : '';
                this.addItemToForm(item, index);
      });
    } else {
      console.warn('⚠️ No items array found in parsedTemplate!');
    }

    // Rebuild navigation items after import
    this.rebuildEditorNavItems();

    // Trigger change detection to update UI
    this.cdr.detectChanges();
  }
}


