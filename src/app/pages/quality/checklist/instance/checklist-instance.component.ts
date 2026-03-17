import { Component, OnInit, ChangeDetectorRef, AfterViewInit, OnDestroy, ElementRef, TemplateRef, ViewChild, ViewChildren, QueryList, HostListener, Renderer2, Inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { NgbDropdownModule, NgbModal, NgbModalModule, NgbModalRef, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { PhotoChecklistConfigService, ChecklistInstance, ChecklistTemplate, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { GlobalComponent } from '@app/global-component';
import { AuthenticationService } from '@app/core/services/auth.service';
import { WebsocketService } from '@app/core/services/websocket.service';
import { ChecklistNavigationComponent } from '@app/shared/components/checklist-navigation/checklist-navigation.component';
import { ChecklistNavItem } from '@app/shared/models/checklist-navigation.model';
import { filter, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { ShareReportModalComponent } from './components/share-report/share-report-modal.component';

// Import services
import { ChecklistStateService, ChecklistItemProgress } from './services/checklist-state.service';
import { PhotoValidationService } from './services/photo-validation.service';
import { PhotoOperationsService } from './services/photo-operations.service';
import { ItemIdExtractorService } from './services/item-id-extractor.service';
import { InstanceItemMatcherService } from './services/instance-item-matcher.service';
import { PdfExportService } from './services/pdf-export.service';

@Component({
  selector: 'app-checklist-instance',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    NgbDropdownModule,
    NgbModalModule,
    ChecklistNavigationComponent,
    ShareReportModalComponent
  ],
  templateUrl: './checklist-instance.component.html',
  styleUrls: [
    './checklist-instance.component.scss',
    './checklist-instance-tablet.styles.scss'
  ]
})
export class ChecklistInstanceComponent implements OnInit, AfterViewInit, OnDestroy {
  instance: ChecklistInstance | null = null;
  template: ChecklistTemplate | null = null;
  loading = true;
  saving = false;
  instanceId: number = 0;

  // Start-from-template (fullscreen modal) state
  showTemplatePickerModal = false;
  availableTemplates: ChecklistTemplate[] = [];
  loadingTemplates = false;
  selectedTemplateId: number | null = null;
  selectedTemplatePreview: ChecklistTemplate | null = null;
  loadingTemplatePreview = false;
  startingTemplateId: number | null = null;

  startFromTemplateWorkOrder = '';
  startFromTemplateSerialNumber = '';
  startFromTemplatePartNumber = '';

  // Photo upload
  selectedFiles: { [itemId: number]: FileList } = {};
  uploadProgress: { [itemId: number]: number } = {};

  // UI state
  isReviewMode = false;
  largeView = false;
  currentStep = 1;

  // Optional media UI toggles (tablet-friendly)
  showOptionalPhotoCapture: { [itemId: number]: boolean } = {};

  // Instructions overflow hint (scrolling container; show hint when content is clipped)
  instructionsHasMore: { [itemId: string]: boolean } = {};

  @ViewChildren('instructionsScroll')
  private instructionsScrollEls!: QueryList<ElementRef<HTMLElement>>;

  @ViewChild('swipeArea')
  private swipeAreaEl?: ElementRef<HTMLElement>;

  private removeSwipeListeners: Array<() => void> = [];
  private swipeStartX: number | null = null;
  private swipeStartY: number | null = null;
  private swipeStartTime: number | null = null;

  swipeNavCue: 'next' | 'prev' | null = null;
  private swipeNavCueTimeout: any = null;

  private lastSwipeNavAtMs = 0;

  swipeSlideDirection: 'next' | 'prev' | null = null;
  swipeSlidePhase: 'out' | 'in' | null = null;
  private swipeSlideTimeouts: any[] = [];

  private instructionsResizeObserver: ResizeObserver | null = null;

  showOptionalPhotoFor(itemId: number): void {
    this.showOptionalPhotoCapture[itemId] = true;
  }

  hideOptionalPhotoFor(itemId: number): void {
    this.showOptionalPhotoCapture[itemId] = false;
  }

  onInstructionsScroll(event: Event, itemId: number | string): void {
    const el = event.target as HTMLElement | null;
    if (!el) return;

    const hasOverflow = el.scrollHeight > el.clientHeight + 1;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    const hideAfterPx = 12;
    const nearTop = el.scrollTop <= hideAfterPx;
    this.instructionsHasMore[String(itemId)] = hasOverflow && nearTop && !atBottom;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateInstructionsOverflowHints();
  }

  openItemNotes(progress: ChecklistItemProgress): void {
    const itemId = progress?.item?.id;
    if (itemId === undefined || itemId === null) return;

    this.activeNotesItemId = itemId;
    this.activeNotesText = progress?.notes || '';

    if (!this.itemNotesModalRef) return;
    try {
      this.itemNotesModal = this.modalService.open(this.itemNotesModalRef, {
        centered: true,
        size: 'md',
        backdrop: true,
        keyboard: true
      });

      this.itemNotesModal.result.finally(() => {
        this.itemNotesModal = undefined;
        this.activeNotesItemId = null;
        this.activeNotesText = '';
      });
    } catch {
      // ignore
    }
  }

  onActiveNotesTextChange(value: string): void {
    const itemId = this.activeNotesItemId;
    if (!itemId) return;

    this.activeNotesText = value;

    // Submitted instances are read-only
    if (!this.ensureCanModify(false)) {
      return;
    }

    this.stateService.updateNotes(itemId, value);
    this.onNotesChange(itemId);
  }

  closeItemNotes(): void {
    try {
      this.itemNotesModal?.close('close');
    } catch {
      // ignore
    }
  }

  private attachInstructionsObservers(): void {
    if (!this.instructionsResizeObserver) {
      this.instructionsResizeObserver = new ResizeObserver(() => {
        this.updateInstructionsOverflowHints();
      });
    }

    for (const ref of this.instructionsScrollEls?.toArray?.() || []) {
      const el = ref?.nativeElement;
      if (el) {
        this.instructionsResizeObserver.observe(el);
      }
    }
  }

  private detachInstructionsObservers(): void {
    try {
      this.instructionsResizeObserver?.disconnect();
    } catch {
      // ignore
    }
  }

  private updateInstructionsOverflowHints(): void {
    if (!this.instructionsScrollEls) return;

    let changed = false;
    for (const ref of this.instructionsScrollEls.toArray()) {
      const el = ref?.nativeElement;
      if (!el) continue;

      const itemId = el.getAttribute('data-item-id');
      if (!itemId) continue;
      const key = String(itemId);

      const hasOverflow = el.scrollHeight > el.clientHeight + 1;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
      const hideAfterPx = 12;
      const nearTop = el.scrollTop <= hideAfterPx;
      const next = hasOverflow && nearTop && !atBottom;
      if (this.instructionsHasMore[key] !== next) {
        this.instructionsHasMore[key] = next;
        changed = true;
      }
    }

    if (changed) {
      this.cdr.detectChanges();
    }
  }

  // Photo validation errors
  photoValidationErrors: { [itemId: number]: string } = {};

  // Comparison mode state
  isCompareMode: { [itemId: string | number]: boolean } = {};
  comparisonPhotoIndex: { [itemId: string | number]: number } = {};
  
  // Alias for template binding compatibility
  get currentComparisonIndex() {
    return this.comparisonPhotoIndex;
  }

  /**
   * Auto-advance helper: jump to the next incomplete item ("open")
   * Used when users are working through only open items.
   */
  nextOpenItem(): void {
    const currentIndex = this.getActiveNavIndex();
    if (currentIndex < 0) {
      return;
    }

    let nextIndex = -1;
    for (let i = currentIndex + 1; i < this.itemProgress.length; i++) {
      if (!this.itemProgress[i]?.completed) {
        nextIndex = i;
        break;
      }
    }

    if (nextIndex === -1) {
      return;
    }

    this.startNavTransition();
    this.selectedItemIndex = nextIndex;

    const rootIndex = this.findRootParentIndex(nextIndex);
    const rootProgress = rootIndex >= 0 ? this.itemProgress[rootIndex] : this.itemProgress[nextIndex];
    const step = this.getItemNumber(rootProgress);
    if (step > 0) {
      this.currentStep = step;
    }

    this.updateUrlWithCurrentStep();
    this.cdr.detectChanges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Notes auto-save functionality
  private notesAutoSaveTimeout: any = null;
  notesSaving = false;
  notesLastSaved: Date | null = null;

  // Websocket sync (minimal real-time)
  private wsSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  private wsSubscription?: Subscription;
  private wsRefreshTimeout: any = null;

  // Standalone/tablet mode styling hook
  private readonly standaloneBodyClass = 'standalone-checklist-instance';
  isStandaloneMode = false;

  // Image preview / lightbox
  showImagePreview = false;  // kept for legacy compat
  previewImageUrl: string = '';

  // Lightbox state
  lightboxUrl: string | null = null;
  lightboxType: 'image' | 'video' = 'image';
  lightboxItem: ChecklistItemProgress | null = null;
  lightboxPhotoSource: string | null = null;
  lightboxIndex = 0;
  lightboxTotal = 0;
  private lightboxMedia: { url: string; type: 'image' | 'video'; progress: ChecklistItemProgress | null; source: string | null }[] = [];

  // Per-item notes (space-saving modal)
  @ViewChild('itemNotesModal') itemNotesModalRef?: TemplateRef<any>;
  private itemNotesModal?: NgbModalRef;
  activeNotesItemId: number | string | null = null;
  activeNotesText = '';

  // Share report modal
  showShareModal = false;

  openShareModal(): void {
    if (!this.instance) return;
    this.showShareModal = true;
  }

  closeShareModal(): void {
    this.showShareModal = false;
  }

  // Full checklist overview modal
  showFullChecklistModal = false;

  // In-app camera capture (reliable)
  cameraCaptureItemId: number | string | null = null;
  private cameraStream: MediaStream | null = null;
  private cameraVideoTrack: MediaStreamTrack | null = null;
  cameraTorchSupported = false;
  cameraTorchEnabled = false;
  cameraZoomSupported = false;
  cameraZoomMin = 1;
  cameraZoomMax = 1;
  cameraZoomStep = 0.1;
  cameraZoom = 1;
  private cameraStarting = false;

  // When true, the “Take Photo” button opens the in-app camera modal (getUserMedia).
  // When false, it falls back to the system/tablet camera (native capture).
  enableInAppPhotoCapture = false;

  @ViewChild('cameraVideo') cameraVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('cameraCaptureModal') cameraCaptureModalRef?: TemplateRef<any>;
  private cameraModal?: NgbModalRef;

  // In-app video capture (test path)
  videoCaptureItemId: number | string | null = null;
  @ViewChild('videoCaptureModal') videoCaptureModalRef?: TemplateRef<any>;
  @ViewChild('videoPreview') videoPreviewRef?: ElementRef<HTMLVideoElement>;
  private videoModal?: NgbModalRef;
  private videoRecorder: MediaRecorder | null = null;
  private videoChunks: Blob[] = [];
  isVideoRecording = false;
  videoRecordingSeconds = 0;
  videoMaxDurationSeconds = 0;
  private videoRecordingInterval: any = null;

  // Auto-advance after photo capture
  autoAdvanceAfterPhoto = false;

  // Navigation filter (shared with nav component)
  navShowOnlyOpenItems = false;

  // User's open checklists for offcanvas
  userOpenChecklists: ChecklistInstance[] = [];
  userOpenChecklistGroups: Array<{ workOrder: string; instances: ChecklistInstance[]; newestUpdatedAtMs: number }> = [];
  userOpenChecklistTotalCount = 0;
  userOpenChecklistSearch = '';
  userOpenChecklistStatusFilter: 'open' | 'all' | 'completed' = 'open';
  userOpenChecklistShowCurrentUserOnly = true; // Filter to show current user's checklists by default
  loadingChecklists = false;

  // Tablet/PWA orientation guard (iOS can't truly lock; we block portrait with an overlay)
  isPwaStandalone = false;
  isPortraitOrientation = false;
  private orientationMql?: MediaQueryList;
  private orientationMqlListener?: (e: MediaQueryListEvent) => void;

  get visibleUserOpenChecklistTotalCount(): number {
    return this.filteredUserOpenChecklistGroups.reduce((sum, g) => sum + (g.instances?.length || 0), 0);
  }

  get filteredUserOpenChecklistGroups(): Array<{ workOrder: string; instances: ChecklistInstance[]; newestUpdatedAtMs: number }> {
    const q = (this.userOpenChecklistSearch || '').trim().toLowerCase();
    const statusFilter = this.userOpenChecklistStatusFilter;

    const statusMatches = (inst: ChecklistInstance) => {
      const status = String(inst.status || '').toLowerCase();
      if (statusFilter === 'all') {
        return status !== 'submitted';
      }
      if (statusFilter === 'completed') {
        return status === 'completed';
      }
      // open
      return status !== 'completed' && status !== 'submitted';
    };

    const matches = (inst: ChecklistInstance, workOrder: string) => {
      const hay = [
        workOrder,
        inst.template_name,
        inst.operator_name,
        inst.work_order_number,
        inst.serial_number,
        inst.part_number,
        inst.status
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    };

    const filtered = this.userOpenChecklistGroups
      .map(g => {
        const instances = (g.instances || []).filter(i => {
          // Filter by current user if enabled
          if (this.userOpenChecklistShowCurrentUserOnly && this.currentUserId) {
            if (i.operator_id?.toString() !== this.currentUserId.toString()) return false;
          }
          if (!statusMatches(i)) return false;
          if (!q) return true;
          return matches(i, g.workOrder);
        });
        if (!instances.length) return null;
        const newestUpdatedAtMs = instances.length ? new Date(instances[0].updated_at || 0).getTime() || 0 : 0;
        return { workOrder: g.workOrder, instances, newestUpdatedAtMs };
      })
      .filter(Boolean) as Array<{ workOrder: string; instances: ChecklistInstance[]; newestUpdatedAtMs: number }>;

    // Keep group ordering newest->oldest
    return filtered.sort((a, b) => b.newestUpdatedAtMs - a.newestUpdatedAtMs);
  }

  // Permission check
  canModifyChecklist = false;
  currentUserId: number | null = null;
  currentUserName?: string;

  // Configuration values
  maxPhotoSizeMB = 10;
  maxVideoSizeMB = 50; // Default to 50MB for videos

  // Navigation sidebar state
  hideInspectionNavigation = false;
  showInspectionNavMediaContext = false;
  expandedNavItems: Set<number | string> = new Set();
  selectedItemIndex: number | null = null;
  private pendingSelectedIndex: number | null = null;
  isNavTransitioning = false;
  private navTransitionTimeout: any = null;
  private lastVisibleItems: ChecklistItemProgress[] = [];

  // Cached nav items to avoid recreating arrays on every CD cycle
  executionNavItems: ChecklistNavItem[] = [];
  private itemProgressSubscription?: Subscription;

  // Expose state service property for template
  get itemProgress(): ChecklistItemProgress[] {
    return this.stateService.getItemProgress();
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private photoChecklistService: PhotoChecklistConfigService,
    private cdr: ChangeDetectorRef,
    private stateService: ChecklistStateService,
    private photoValidation: PhotoValidationService,
    private photoOps: PhotoOperationsService,
    private idExtractor: ItemIdExtractorService,
    private instanceMatcher: InstanceItemMatcherService,
    private offcanvasService: NgbOffcanvas,
    private authService: AuthenticationService,
    private websocketService: WebsocketService,
    private modalService: NgbModal,
    private renderer: Renderer2,
    private pdfExportService: PdfExportService,
    private ngZone: NgZone,
    @Inject(DOCUMENT) private document: Document
  ) {
    // Get current user ID and name
    const currentUser = this.authService.currentUserValue;
    this.currentUserId = currentUser?.id || null;
    this.currentUserName = this.getUserDisplayName(currentUser);
  }

  private ensureChecklistWebsocket(): void {
    try {
      if (!this.websocketService.getWebSocket()) {
        this.websocketService.connect();
      }

      const ws = this.websocketService.getWebSocket();
      if (!ws) return;

      // Only subscribe once
      if (this.wsSubscription) return;

      this.wsSubscription = ws.pipe(
        filter((message: any) => message && message.type === 'CHECKLIST_INSTANCE_UPDATED')
      ).subscribe({
        next: (message: any) => {
          const data = message?.data;
          const instanceId = Number(data?.instanceId);
          if (!instanceId || instanceId !== this.instanceId) return;

          // Ignore our own browser session messages
          if (data?.sessionId && data.sessionId === this.wsSessionId) return;

          // Debounce refreshes
          if (this.wsRefreshTimeout) {
            clearTimeout(this.wsRefreshTimeout);
          }

          this.wsRefreshTimeout = setTimeout(() => {
            this.refreshInstanceSilently();
          }, 500);
        },
        error: (err) => console.error('Checklist websocket subscription error:', err)
      });
    } catch (e) {
      console.warn('Websocket not available for checklist sync:', e);
    }
  }

  private broadcastChecklistUpdate(action: string, details?: any): void {
    try {
      if (!this.websocketService.getWebSocket()) {
        this.websocketService.connect();
      }

      this.websocketService.next({
        type: 'CHECKLIST_INSTANCE_UPDATED',
        data: {
          instanceId: this.instanceId,
          action,
          details,
          userId: this.currentUserId,
          userName: this.currentUserName,
          sessionId: this.wsSessionId,
          ts: new Date().toISOString()
        }
      });
    } catch (e) {
      // best-effort
      console.warn('Failed to broadcast checklist update:', e);
    }
  }

  private refreshInstanceSilently(): void {
    if (!this.instanceId) return;

    this.photoChecklistService.getInstance(this.instanceId).subscribe({
      next: (instance) => {
        if (!instance) return;
        this.instance = instance;

        // Keep current template; just rebuild progress against the updated instance
        if (this.template) {
          this.initializeProgress();
        } else if (instance.template_id) {
          this.loadTemplate();
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error refreshing instance silently:', error);
      }
    });
  }

  private getUserDisplayName(user: any): string | undefined {
    if (!user) return undefined;

    const fullName = String(user.full_name || user.fullName || '').trim();
    if (fullName) return fullName;

    const first = String(user.first_name || user.firstName || '').trim();
    const last = String(user.last_name || user.lastName || '').trim();
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;

    const username = String(user.username || '').trim();
    if (username) return username;

    const email = String(user.email || '').trim();
    if (email) return email;

    return undefined;
  }

  async startCameraCapture(itemId: number | string): Promise<void> {
    if (!this.ensureCanModify(true)) return;
    if (this.cameraStarting) return;
    this.cameraStarting = true;

    try {
      this.cameraCaptureItemId = itemId;

      if (this.cameraModal) {
        try {
          this.cameraModal.dismiss();
        } catch {
          // ignore
        }
        this.cameraModal = undefined;
      }

      if (this.cameraCaptureModalRef) {
        this.cameraModal = this.modalService.open(this.cameraCaptureModalRef, {
          fullscreen: true,
          windowClass: 'in-app-capture-modal',
          backdrop: true,
          keyboard: true
        });

        this.cameraModal.result.finally(() => {
          this.cameraCaptureItemId = null;
          this.stopCameraStream();
          this.cameraModal = undefined;
        });
      }

      // Stop any existing stream
      this.stopCameraStream();

      // iOS Safari (and most browsers) require a secure context (HTTPS) for getUserMedia
      if (!window.isSecureContext) {
        alert('In-app camera capture requires HTTPS (secure context). Use the upload/capture button instead, or open this site over https.');
        this.closeCameraCapture();
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Camera is not supported on this device/browser (getUserMedia unavailable).');
        this.closeCameraCapture();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },          // 1080p photos
          height: { ideal: 1440 },
          aspectRatio: { ideal: 4 / 3 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false
      });

      this.cameraStream = stream;
      this.cameraVideoTrack = (stream.getVideoTracks && stream.getVideoTracks()[0]) ? stream.getVideoTracks()[0] : null;
      void this.optimizeCameraTrackForFocusAndQuality('photo');
      this.detectCameraTorchSupport();
      this.detectCameraZoomSupport();

      // Attach to video element after it renders
      setTimeout(() => {
        const video = this.cameraVideoRef?.nativeElement;
        if (!video || !this.cameraStream) return;
        try {
          (video as any).srcObject = this.cameraStream;
          video.play().catch(() => {
            // some browsers require user gesture; capture button will still work once playback starts
          });
        } catch (e) {
          console.error('Failed to attach camera stream to video element', e);
        }
      }, 0);
    } catch (error) {
      console.error('Error starting camera:', error);
      alert('Unable to access the camera. Please check permissions and try again.');
      this.closeCameraCapture();
    } finally {
      this.cameraStarting = false;
    }
  }

  takePhoto(itemId: number | string, fileInput?: HTMLInputElement): void {
    if (!this.ensureCanModify(true)) return;

    // Prefer the in-app camera modal when enabled and available.
    if (this.enableInAppPhotoCapture && window.isSecureContext && navigator.mediaDevices?.getUserMedia) {
      void this.startCameraCapture(itemId);
      return;
    }

    if (fileInput) {
      // Force native capture for photos (tablet/system camera)
      fileInput.setAttribute('capture', 'environment');
      fileInput.click();
      return;
    }

    alert('Unable to open camera capture. Use “Add Photo” to select a file, or enable the in-app camera in Settings (requires HTTPS + camera support).');
  }

  onEnableInAppPhotoCaptureChange(enabled: boolean): void {
    if (!enabled) return;

    if (!window.isSecureContext) {
      alert('In-app photo capture requires HTTPS (secure context).');
      this.enableInAppPhotoCapture = false;
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      alert('In-app photo capture is not supported in this browser/device.');
      this.enableInAppPhotoCapture = false;
    }
  }

  toggleCameraTorch(): void {
    if (!this.cameraTorchSupported) return;
    void this.setCameraTorch(!this.cameraTorchEnabled);
  }

  changeCameraZoom(delta: number): void {
    if (!this.cameraZoomSupported) return;
    const next = this.clampNumber((this.cameraZoom || 1) + delta, this.cameraZoomMin, this.cameraZoomMax);
    void this.setCameraZoom(next);
  }

  onCameraZoomChange(value: any): void {
    if (!this.cameraZoomSupported) return;
    const n = Number(value);
    if (isNaN(n)) return;
    void this.setCameraZoom(this.clampNumber(n, this.cameraZoomMin, this.cameraZoomMax));
  }

  private detectCameraTorchSupport(): void {
    this.cameraTorchSupported = false;
    this.cameraTorchEnabled = false;

    try {
      const track: any = this.cameraVideoTrack as any;
      const caps: any = track?.getCapabilities?.() || {};
      this.cameraTorchSupported = !!caps.torch;
    } catch {
      this.cameraTorchSupported = false;
    }
  }

  private detectCameraZoomSupport(): void {
    this.cameraZoomSupported = false;
    this.cameraZoomMin = 1;
    this.cameraZoomMax = 1;
    this.cameraZoomStep = 0.1;
    this.cameraZoom = 1;

    try {
      const track: any = this.cameraVideoTrack as any;
      const caps: any = track?.getCapabilities?.() || {};
      if (!caps || caps.zoom === undefined || caps.zoom === null) {
        return;
      }

      const z = caps.zoom;
      const min = Number(z.min);
      const max = Number(z.max);
      const step = Number(z.step);

      if (!isNaN(min)) this.cameraZoomMin = min;
      if (!isNaN(max)) this.cameraZoomMax = max;
      if (!isNaN(step) && step > 0) this.cameraZoomStep = step;

      this.cameraZoomSupported = this.cameraZoomMax > this.cameraZoomMin;

      const settings: any = track?.getSettings?.() || {};
      const current = Number(settings.zoom);
      if (!isNaN(current)) {
        this.cameraZoom = this.clampNumber(current, this.cameraZoomMin, this.cameraZoomMax);
      } else {
        this.cameraZoom = this.cameraZoomMin;
      }
    } catch {
      this.cameraZoomSupported = false;
    }
  }

  private async setCameraZoom(value: number): Promise<void> {
    if (!this.cameraVideoTrack) return;

    try {
      const track: any = this.cameraVideoTrack as any;
      if (!track?.applyConstraints) return;
      await track.applyConstraints({ advanced: [{ zoom: value }] });
      this.cameraZoom = value;
    } catch {
      // Some browsers report caps but reject constraints; treat as unsupported.
      this.cameraZoomSupported = false;
    }
  }

  private clampNumber(value: number, min: number, max: number): number {
    const v = Number(value);
    const lo = Number(min);
    const hi = Number(max);
    if (isNaN(v) || isNaN(lo) || isNaN(hi)) return value;
    return Math.min(hi, Math.max(lo, v));
  }

  private async setCameraTorch(enabled: boolean): Promise<void> {
    if (!this.cameraVideoTrack) return;

    try {
      const track: any = this.cameraVideoTrack as any;
      if (!track?.applyConstraints) return;

      // Spec uses advanced constraints for torch.
      await track.applyConstraints({ advanced: [{ torch: enabled }] });
      this.cameraTorchEnabled = enabled;
    } catch {
      // Unsupported on iOS/Safari and some browsers.
      this.cameraTorchEnabled = false;
      this.cameraTorchSupported = false;
    }
  }

  private async optimizeCameraTrackForFocusAndQuality(mode: 'photo' | 'video' = 'photo'): Promise<void> {
    if (!this.cameraVideoTrack) return;

    try {
      const track: any = this.cameraVideoTrack as any;
      if (!track?.applyConstraints) return;

      // For video recording, DO NOT apply any constraints - they cause blackouts
      // during recording. Just let the native stream flow.
      if (mode === 'video') {
        return;
      }

      // For photos, apply minimal focus optimization only
      const caps: any = track.getCapabilities?.() || {};
      const advanced: any[] = [];

      if (caps.focusMode && Array.isArray(caps.focusMode)) {
        // For photos, prefer single-shot focus
        if (caps.focusMode.includes('single-shot')) {
          advanced.push({ focusMode: 'single-shot' });
        } else if (caps.focusMode.includes('fixed')) {
          advanced.push({ focusMode: 'fixed' });
        }
      }

      // Only apply advanced constraints for photos
      if (advanced.length > 0) {
        try {
          await track.applyConstraints({ advanced });
        } catch {
          // If focus constraints fail, just continue without them
        }
      }
    } catch {
      // Ignore if browser rejects camera constraints
    }
  }

  async startVideoCapture(itemId: number | string): Promise<void> {
    if (!this.ensureCanModify(true)) return;

    try {
      this.videoCaptureItemId = itemId;

      if (!window.isSecureContext) {
        alert('In-app video capture requires HTTPS (secure context).');
        this.closeVideoCapture();
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Video capture is not supported on this device/browser.');
        this.closeVideoCapture();
        return;
      }

      this.stopVideoRecording();
      this.stopCameraStream();

      // Optimize video constraints for tablets - request realistic resolution
      // Tablets often have lower resolution cameras; request 1080p ideal, fallback to 720p
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },     // 1080p ideal, 720p minimum
          height: { ideal: 1080, min: 720 },
          aspectRatio: { ideal: 16 / 9 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false
      });

      this.cameraStream = stream;
      this.cameraVideoTrack = (stream.getVideoTracks && stream.getVideoTracks()[0]) ? stream.getVideoTracks()[0] : null;
      void this.optimizeCameraTrackForFocusAndQuality('video');

      if (this.videoCaptureModalRef) {
        this.videoModal = this.modalService.open(this.videoCaptureModalRef, {
          fullscreen: true,
          windowClass: 'in-app-capture-modal',
          backdrop: true,
          keyboard: true
        });

        this.videoModal.result.finally(() => {
          this.stopVideoRecording();
          this.videoCaptureItemId = null;
          this.stopCameraStream();
          this.videoModal = undefined;
        });
      }

      setTimeout(() => {
        const video = this.videoPreviewRef?.nativeElement;
        if (!video || !this.cameraStream) return;
        try {
          (video as any).srcObject = this.cameraStream;
          video.play().catch(() => {});
        } catch (e) {
          console.error('Failed to attach video stream', e);
        }
      }, 0);
    } catch (error) {
      console.error('Error starting in-app video capture:', error);
      alert('Unable to start in-app video capture. Please check camera permissions and try again.');
      this.closeVideoCapture();
    }
  }

  startVideoRecording(): void {
    if (!this.cameraStream || this.isVideoRecording || !this.videoCaptureItemId) return;

    try {
      const mimeType = this.getPreferredVideoMimeType();
      this.videoChunks = [];
      
      // Use high-quality video bitrate for tablets
      const videoBitrate = this.getOptimalVideoBitrate();
      
      // Create MediaRecorder without timeslice to prevent stream interruption
      this.videoRecorder = mimeType
        ? new MediaRecorder(this.cameraStream, {
            mimeType,
            videoBitsPerSecond: videoBitrate,
            audioBitsPerSecond: 128_000
          })
        : new MediaRecorder(this.cameraStream);

      this.videoRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.videoChunks.push(event.data);
        }
      };

      this.videoRecorder.onstop = () => {
        this.finalizeVideoRecording();
      };

      // Handle MediaRecorder errors
      this.videoRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        alert('Recording error: ' + event.error);
        this.stopVideoRecording();
      };

      // Start recording without timeslice to maintain continuous stream
      this.videoRecorder.start();
      this.isVideoRecording = true;

      // Start elapsed timer and read max duration from item config
      this.videoRecordingSeconds = 0;
      const itemProgress = this.stateService.findItemProgress(this.videoCaptureItemId!);
      this.videoMaxDurationSeconds = (itemProgress?.item as any)?.video_requirements?.max_duration_seconds || 0;

      // Run interval OUTSIDE Angular's zone so it doesn't trigger change detection every second.
      // Only re-enter the zone when we actually need to update the UI or stop recording.
      this.ngZone.runOutsideAngular(() => {
        this.videoRecordingInterval = setInterval(() => {
          this.ngZone.run(() => {
            this.videoRecordingSeconds++;
            // Auto-stop at limit — video is kept, not discarded
            if (this.videoMaxDurationSeconds > 0 && this.videoRecordingSeconds >= this.videoMaxDurationSeconds) {
              this.stopVideoRecording();
            } else {
              this.cdr.detectChanges();
            }
          });
        }, 1000);
      });

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Unable to start video recording:', error);
      alert('Unable to start recording. Try again or use Add from Library.');
    }
  }

  stopVideoRecording(): void {
    this.clearVideoRecordingTimer();
    if (!this.videoRecorder) {
      this.isVideoRecording = false;
      return;
    }

    if (this.videoRecorder.state === 'recording') {
      this.videoRecorder.stop();
    } else {
      this.videoRecorder = null;
      this.isVideoRecording = false;
    }
  }

  private clearVideoRecordingTimer(): void {
    if (this.videoRecordingInterval) {
      clearInterval(this.videoRecordingInterval);
      this.videoRecordingInterval = null;
    }
  }

  formatVideoTime(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  private finalizeVideoRecording(): void {
    try {
      const itemId = this.videoCaptureItemId;
      if (!itemId || this.videoChunks.length === 0) {
        this.videoRecorder = null;
        this.videoChunks = [];
        this.isVideoRecording = false;
        return;
      }

      const mimeType = this.videoRecorder?.mimeType || 'video/webm';
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(this.videoChunks, { type: mimeType });
      const file = new File([blob], `camera_video_${this.instanceId}_${Date.now()}.${ext}`, { type: mimeType });

      this.uploadSingleFile(itemId, file, 'in-app');
      Swal.fire({
        title: 'Saving video...',
        text: 'Please wait while your video is uploaded.',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
      });
      this.closeVideoCapture();
    } catch (error) {
      console.error('Error finalizing video recording:', error);
      alert('Failed to save recorded video. Please try again.');
    } finally {
      this.clearVideoRecordingTimer();
      this.videoRecordingSeconds = 0;
      this.videoMaxDurationSeconds = 0;
      this.videoRecorder = null;
      this.videoChunks = [];
      this.isVideoRecording = false;
      this.cdr.detectChanges();
    }
  }

  closeVideoCapture(): void {
    try {
      this.videoModal?.close();
    } catch {
      // ignore
    }
  }

  private getPreferredVideoMimeType(): string | null {
    const mediaRecorderAny: any = MediaRecorder as any;
    if (!mediaRecorderAny?.isTypeSupported) {
      return null;
    }

    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];

    for (const type of candidates) {
      if (mediaRecorderAny.isTypeSupported(type)) {
        return type;
      }
    }

    return null;
  }

  /**
   * Determine optimal video bitrate based on device capabilities
   * Higher bitrates improve video quality significantly on tablets
   */
  private getOptimalVideoBitrate(): number {
    // Check if device has effective type (connection quality)
    const connection = (navigator as any).connection;
    if (connection && connection.effectiveType) {
      switch (connection.effectiveType) {
        case '4g':
          return 20_000_000; // 20 Mbps for excellent quality on good connections
        case '3g':
          return 12_000_000; // 12 Mbps for medium connections
        case '2g':
        case 'slow-2g':
          return 6_000_000; // 6 Mbps for poor connections
        default:
          return 20_000_000;
      }
    }
    // Default to high quality
    return 20_000_000;
  }

  async captureCameraPhoto(): Promise<void> {
    if (!this.ensureCanModify(true)) return;
    if (!this.cameraCaptureItemId) return;

    const video = this.cameraVideoRef?.nativeElement;
    if (!video) return;

    // Prefer ImageCapture.takePhoto() which uses the full sensor resolution rather
    // than a downscaled video frame. Fall back to canvas if unavailable.
    let blob: Blob | null = null;
    try {
      if (this.cameraVideoTrack && (window as any).ImageCapture) {
        const ic = new (window as any).ImageCapture(this.cameraVideoTrack);
        blob = await ic.takePhoto({ imageHeight: 3072, imageWidth: 4096 }) as Blob;
      }
    } catch {
      blob = null; // fall through to canvas
    }

    if (!blob) {
      const width  = video.videoWidth  || 1280;
      const height = video.videoHeight || 720;
      // Account for device pixel ratio to prevent blurriness on high-DPI displays (tablets)
      const dpr = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.width  = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Scale context to match device pixel ratio
      ctx.scale(dpr, dpr);
      ctx.drawImage(video, 0, 0, width, height);
      blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', 0.95)
      );
    }

    if (!blob) {
      alert('Failed to capture photo. Please try again.');
      return;
    }

    const filename = `camera_${this.instanceId}_${Date.now()}.jpg`;
    const file = new File([blob], filename, { type: 'image/jpeg' });

    // Upload directly as a camera-captured photo
    this.uploadSingleFile(this.cameraCaptureItemId, file, 'in-app');

    // Close camera after capture
    this.closeCameraCapture();
  }

  closeCameraCapture(): void {
    try {
      this.cameraModal?.close();
    } catch {
      // ignore
    }
    // cleanup handled by modal result.finally
  }

  private stopCameraStream(): void {
    try {
      // Turn off torch before stopping tracks (best-effort)
      if (this.cameraTorchEnabled) {
        try { void this.setCameraTorch(false); } catch { /* ignore */ }
      }

      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach(t => t.stop());
      }
    } catch {
      // ignore
    }
    this.cameraStream = null;
    this.cameraVideoTrack = null;
    this.cameraTorchSupported = false;
    this.cameraTorchEnabled = false;
    this.cameraZoomSupported = false;
    this.cameraZoomMin = 1;
    this.cameraZoomMax = 1;
    this.cameraZoomStep = 0.1;
    this.cameraZoom = 1;
  }

  private stampLastModified(itemId: number | string, action: 'media' | 'verification' | 'notes' = 'media'): void {
    const progress = this.stateService.findItemProgress(itemId);
    if (!progress) return;

    const now = new Date();
    const patch: any = {
      lastModifiedAt: now,
      lastModifiedByUserId: this.currentUserId || undefined,
      lastModifiedByName: this.currentUserName || undefined
    };

    // If an action causes the item to become incomplete, clear completion attribution
    if (!progress.completed && action === 'media') {
      patch.completedByUserId = undefined;
      patch.completedByName = undefined;
    }

    this.stateService.updateItemProgress(itemId, patch);
  }

  getPhotoSourceLabel(progress: ChecklistItemProgress, photoUrl: string): string | null {
    if (!progress || !photoUrl) return null;
    const source = progress.photoMeta?.[photoUrl]?.source;
    return this.toSourceLabel(source);
  }

  getVideoSourceLabel(progress: ChecklistItemProgress, videoUrl: string): string | null {
    if (!progress || !videoUrl) return null;
    const source = progress.videoMeta?.[videoUrl]?.source;
    return this.toSourceLabel(source);
  }

  getAudioSourceLabel(progress: ChecklistItemProgress, audioUrl: string): string | null {
    if (!progress || !audioUrl) return null;
    const source = progress.videoMeta?.[audioUrl]?.source;
    return this.toSourceLabel(source);
  }

  private getMediaAddedAction(file: File | undefined): 'photo_added' | 'video_added' | 'audio_added' {
    if (!file || typeof file.type !== 'string') {
      return 'photo_added';
    }

    const mimeType = file.type.toLowerCase();
    if (mimeType.startsWith('audio/')) {
      return 'audio_added';
    }
    if (mimeType.startsWith('video/')) {
      return 'video_added';
    }
    return 'photo_added';
  }

  private toSourceLabel(source?: 'in-app' | 'system' | 'library'): string | null {
    if (source === 'in-app') return 'In-App';
    if (source === 'system') return 'System';
    if (source === 'library') return 'Library';
    return null;
  }

  getCameraCaptureTitle(): string {
    if (!this.cameraCaptureItemId) return 'Take Photo';
    const progress = this.stateService.findItemProgress(this.cameraCaptureItemId);
    const title = progress?.item?.title ? String(progress.item.title).trim() : '';
    return title || 'Take Photo';
  }

  getCameraCaptureDescription(): string {
    if (!this.cameraCaptureItemId) return '';
    const progress = this.stateService.findItemProgress(this.cameraCaptureItemId);
    const raw = progress?.item?.description ? String(progress.item.description) : '';
    return this.toPlainText(raw);
  }

  getVideoCaptureTitle(): string {
    if (!this.videoCaptureItemId) return 'In-App Video Capture';
    const progress = this.stateService.findItemProgress(this.videoCaptureItemId);
    const title = progress?.item?.title ? String(progress.item.title).trim() : '';
    return title || 'In-App Video Capture';
  }

  getVideoCaptureDescription(): string {
    if (!this.videoCaptureItemId) return '';
    const progress = this.stateService.findItemProgress(this.videoCaptureItemId);
    const raw = progress?.item?.description ? String(progress.item.description) : '';
    return this.toPlainText(raw);
  }

  private toPlainText(value: string): string {
    const text = (value || '')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text;
  }

  ngOnInit(): void {
    // Load configuration values
    this.loadConfig();

    // Add a scoped body class for standalone route so we can override styles for tablet UX
    this.isStandaloneMode = this.router.url?.includes('/standalone/checklist/instance');
    if (this.isStandaloneMode) {
      this.renderer.addClass(this.document.body, this.standaloneBodyClass);
    }

    // Minimal real-time sync
    this.ensureChecklistWebsocket();

    // Landscape guard for tablet PWA
    this.initOrientationGuard();

    // Keep cached nav items in sync with progress changes
    this.itemProgressSubscription = this.stateService.itemProgress$.subscribe(() => {
      this.executionNavItems = this.buildExecutionNavItems();
      this.cdr.detectChanges();
    });
    
    this.route.queryParams.subscribe(params => {
      const idParam = params['id'];
      const stepParam = params['step'];
      const itemParam = params['item'];

      // Instance-only toggle: hide the left checklist navigation when embedding/launching with this flag
      const hideNavParam = params['hideNav'] ?? params['hide_nav'] ?? params['hideNavigation'] ?? params['hide_navigation'];
      this.hideInspectionNavigation = this.toBooleanQueryParam(hideNavParam);

      // Instance-only toggle: show media indicators/thumbnails in navigation when explicitly requested
      const showNavMediaParam = params['showNavMedia'] ?? params['show_nav_media'] ?? params['showMediaContext'];
      this.showInspectionNavMediaContext = this.toBooleanQueryParam(showNavMediaParam);
      
      if (idParam) {
        const newInstanceId = +idParam;

        if (newInstanceId && !isNaN(newInstanceId) && newInstanceId > 0) {
          const isSameInstance = this.instanceId === newInstanceId;
          const hasInstanceLoaded = !!this.instance && !!this.template;

          // Reset state when switching to a different checklist
          if (!isSameInstance) {
            this.closeLightbox();
            this.instanceId = newInstanceId;
            this.instance = null;
            this.template = null;
            this.loading = true;
          }

          // Update instance ID
          this.instanceId = newInstanceId;

          // Restore step if provided
          if (stepParam && !isNaN(+stepParam)) {
            this.currentStep = +stepParam;
          }

          if (itemParam !== undefined && itemParam !== null && !isNaN(+itemParam)) {
            this.pendingSelectedIndex = +itemParam;
          } else {
            this.pendingSelectedIndex = null;
          }

          if (!isSameInstance || !hasInstanceLoaded) {
            this.loadInstance();
          } else {
            this.applySelectionFromQuery();
            this.cdr.detectChanges();
          }
        } else {
          this.loading = false;
          alert('Invalid checklist instance ID. Please check the URL.');
        }
      } else {
        this.loading = false;
        alert('No checklist instance ID provided. Please check the URL.');
      }
    });
  }

  private toBooleanQueryParam(value: any): boolean {
    if (typeof value === 'boolean') return value;
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
  }

  ngAfterViewInit(): void {
    // Initialize carousels after view is rendered
    setTimeout(() => {
      this.initializeCarousels();
    }, 500);

    // Instructions overflow hint (after header renders)
    setTimeout(() => {
      this.attachInstructionsObservers();
      this.updateInstructionsOverflowHints();
    }, 0);

    // Tablet swipe navigation (left/right)
    setTimeout(() => this.attachSwipeListeners(), 0);

    try {
      this.instructionsScrollEls?.changes?.subscribe(() => {
        setTimeout(() => {
          this.attachInstructionsObservers();
          this.updateInstructionsOverflowHints();
        }, 0);
      });
    } catch {
      // ignore
    }
  }

  ngOnDestroy(): void {
    this.detachInstructionsObservers();
    this.detachSwipeListeners();

    this.stopCameraStream();

    // Remove standalone styling hook
    try {
      this.renderer.removeClass(this.document.body, this.standaloneBodyClass);
    } catch {
      // ignore
    }

    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = undefined;
    }
    if (this.wsRefreshTimeout) {
      clearTimeout(this.wsRefreshTimeout);
      this.wsRefreshTimeout = null;
    }

    if (this.itemProgressSubscription) {
      this.itemProgressSubscription.unsubscribe();
      this.itemProgressSubscription = undefined;
    }
    // Clear any pending auto-save timeout
    if (this.notesAutoSaveTimeout) {
      clearTimeout(this.notesAutoSaveTimeout);
      this.notesAutoSaveTimeout = null;
    }

    if (this.navTransitionTimeout) {
      clearTimeout(this.navTransitionTimeout);
      this.navTransitionTimeout = null;
    }

    this.destroyOrientationGuard();

    for (const t of this.swipeSlideTimeouts) {
      try { clearTimeout(t); } catch { /* ignore */ }
    }
    this.swipeSlideTimeouts = [];
    if (this.swipeNavCueTimeout) {
      try { clearTimeout(this.swipeNavCueTimeout); } catch { /* ignore */ }
      this.swipeNavCueTimeout = null;
    }
    
    // Save notes immediately before component destruction
    this.saveNotesImmediately();
  }

  get showLandscapeOverlay(): boolean {
    // Only enforce on standalone/PWA contexts to avoid breaking normal desktop/browser usage.
    return !!this.isPwaStandalone && !!this.isPortraitOrientation;
  }

  requestLandscape(): void {
    void this.tryLockLandscape();
  }

  private initOrientationGuard(): void {
    this.isPwaStandalone = this.detectStandaloneDisplayMode();

    try {
      this.orientationMql = window.matchMedia('(orientation: portrait)');
      this.isPortraitOrientation = !!this.orientationMql.matches;

      this.orientationMqlListener = (e: MediaQueryListEvent) => {
        this.isPortraitOrientation = !!e.matches;
        if (this.isPortraitOrientation) {
          void this.tryLockLandscape();
        }
        this.cdr.detectChanges();
      };

      if (this.orientationMql.addEventListener) {
        this.orientationMql.addEventListener('change', this.orientationMqlListener);
      } else {
        // Safari < 14
        (this.orientationMql as any).addListener(this.orientationMqlListener);
      }
    } catch {
      // ignore
    }

    // Best-effort lock immediately (may require a user gesture on some platforms)
    void this.tryLockLandscape();
  }

  private destroyOrientationGuard(): void {
    try {
      if (this.orientationMql && this.orientationMqlListener) {
        if (this.orientationMql.removeEventListener) {
          this.orientationMql.removeEventListener('change', this.orientationMqlListener);
        } else {
          (this.orientationMql as any).removeListener(this.orientationMqlListener);
        }
      }
    } catch {
      // ignore
    }
    this.orientationMql = undefined;
    this.orientationMqlListener = undefined;
  }

  private detectStandaloneDisplayMode(): boolean {
    try {
      const navAny: any = navigator as any;
      return (
        !!window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
      ) || navAny?.standalone === true;
    } catch {
      return false;
    }
  }

  private async tryLockLandscape(): Promise<void> {
    try {
      if (!this.isPwaStandalone) return;
      const screenAny: any = window.screen as any;
      const orientation = screenAny?.orientation;
      if (!orientation?.lock) return;
      await orientation.lock('landscape');
    } catch {
      // iOS/Safari and some browsers will reject/ignore
    }
  }

  private attachSwipeListeners(): void {
    this.detachSwipeListeners();

    const el = this.swipeAreaEl?.nativeElement;
    if (!el) return;

    const onTouchStart = (ev: TouchEvent) => {
      if (!ev.touches || ev.touches.length !== 1) {
        this.swipeStartX = null;
        this.swipeStartY = null;
        this.swipeStartTime = null;
        return;
      }

      if (!this.isSwipeAllowedTarget(ev.target)) {
        this.swipeStartX = null;
        this.swipeStartY = null;
        this.swipeStartTime = null;
        return;
      }

      this.swipeStartX = ev.touches[0].clientX;
      this.swipeStartY = ev.touches[0].clientY;
      this.swipeStartTime = Date.now();
    };

    const onTouchEnd = (ev: TouchEvent) => {
      if (this.swipeStartX === null || this.swipeStartY === null || this.swipeStartTime === null) {
        return;
      }

      const changed = ev.changedTouches;
      if (!changed || changed.length !== 1) {
        return;
      }

      const dx = changed[0].clientX - this.swipeStartX;
      const dy = changed[0].clientY - this.swipeStartY;
      const dt = Date.now() - this.swipeStartTime;

      // Reset early
      this.swipeStartX = null;
      this.swipeStartY = null;
      this.swipeStartTime = null;

      // Thresholds tuned for tablet: require deliberate horizontal swipe.
      const minDistanceX = 80;
      const maxDistanceY = 50;
      const maxDurationMs = 900;

      if (dt > maxDurationMs) return;
      if (Math.abs(dx) < minDistanceX) return;
      if (Math.abs(dy) > maxDistanceY) return;

      if (dx < 0) {
        // Swipe left => next
        this.triggerSwipeNavigation('next');
      } else {
        // Swipe right => previous
        this.triggerSwipeNavigation('prev');
      }
    };

    this.removeSwipeListeners.push(this.renderer.listen(el, 'touchstart', onTouchStart));
    this.removeSwipeListeners.push(this.renderer.listen(el, 'touchend', onTouchEnd));
  }

  private detachSwipeListeners(): void {
    for (const dispose of this.removeSwipeListeners) {
      try {
        dispose();
      } catch {
        // ignore
      }
    }
    this.removeSwipeListeners = [];
  }

  private isSwipeAllowedTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el || typeof (el as any).closest !== 'function') return true;

    // Don't swipe when interacting with controls/media.
    if (el.closest('button, a, input, textarea, select, label, video, audio')) return false;

    // Don't swipe inside nested scroll areas (instructions box).
    if (el.closest('.task-instructions-scroll')) return false;

    // Avoid swipe when a modal/offcanvas is open (touch should belong to overlay content).
    if (el.closest('.modal, .offcanvas')) return false;

    return true;
  }

  private triggerSwipeNavigation(direction: 'next' | 'prev'): void {
    // Avoid overlapping swipe transitions (common source of flicker/glitch)
    const now = Date.now();
    if (this.swipeSlidePhase || this.isNavTransitioning) return;
    if (now - this.lastSwipeNavAtMs < 300) return;
    this.lastSwipeNavAtMs = now;

    // Respect boundaries
    if (direction === 'next' && this.isLastItem()) return;
    if (direction === 'prev' && this.isFirstItem()) return;

    // Clear any pending swipe timers from prior gestures
    for (const t of this.swipeSlideTimeouts) {
      try { clearTimeout(t); } catch { /* ignore */ }
    }
    this.swipeSlideTimeouts = [];
    if (this.swipeNavCueTimeout) {
      try { clearTimeout(this.swipeNavCueTimeout); } catch { /* ignore */ }
      this.swipeNavCueTimeout = null;
    }

    // Show animated cue immediately
    this.swipeNavCue = direction;
    this.cdr.detectChanges();

    // Slide out, then navigate, then slide in
    this.swipeSlideDirection = direction;
    this.swipeSlidePhase = 'out';
    this.cdr.detectChanges();

    this.swipeSlideTimeouts.push(setTimeout(() => {
      if (direction === 'next') {
        this.nextItem();
      } else {
        this.previousItem();
      }

      // Let Angular render the new content, then animate it in
      this.swipeSlidePhase = 'in';
      this.cdr.detectChanges();

      this.swipeSlideTimeouts.push(setTimeout(() => {
        this.swipeSlidePhase = null;
        this.swipeSlideDirection = null;
        this.cdr.detectChanges();
      }, 220));
    }, 120));

    // Clear cue after animation
    this.swipeNavCueTimeout = setTimeout(() => {
      this.swipeNavCue = null;
      this.cdr.detectChanges();
    }, 420);
  }

  private initializeCarousels(): void {
    try {
      const carousels = document.querySelectorAll('.carousel');
      
      carousels.forEach((carousel) => {
        // Set up slide change event listeners
        carousel.addEventListener('slide.bs.carousel', (event: any) => {
          const slideIndex = event.to;
          const carouselId = carousel.id;
          const itemId = carouselId.replace('photoCarousel-', '');
          this.updateThumbnailHighlight(itemId, slideIndex);
        });
        
        carousel.addEventListener('slid.bs.carousel', (event: any) => {
          const slideIndex = event.to;
          const carouselId = carousel.id;
          const itemId = carouselId.replace('photoCarousel-', '');
          this.updateThumbnailHighlight(itemId, slideIndex);
        });
      });
      
    } catch (error) {
      console.error('Error initializing carousels:', error);
    }
  }

  /**
   * Check if current user has permission to modify this checklist
   * UPDATED: Allow collaborative editing - anyone can help complete the checklist
   */
  private checkPermission(instance: ChecklistInstance): boolean {
    // Allow anyone to edit - we'll track who makes each change instead
    return true;
  }

  loadConfig(): void {
    this.photoChecklistService.getConfig().subscribe({
      next: (config) => {
        // Load max file sizes from config
        const configArray = Array.isArray(config) ? config : [];
        
        const photoSizeConfig = configArray.find((c: any) => c.config_key === 'max_photo_size_mb');
        if (photoSizeConfig) {
          this.maxPhotoSizeMB = parseFloat(photoSizeConfig.config_value) || 10;
        }
        
        const videoSizeConfig = configArray.find((c: any) => c.config_key === 'max_video_size_mb');
        if (videoSizeConfig) {
          this.maxVideoSizeMB = parseFloat(videoSizeConfig.config_value) || 50;
        }

      },
      error: (error) => {
        console.error('Error loading config:', error);
        // Use defaults if config loading fails
      }
    });
  }

  loadInstance(): void {
    this.loading = true;
    this.photoChecklistService.getInstance(this.instanceId).subscribe({
      next: (instance) => {
        if (!instance) {
          this.loading = false;
          alert(`Error: Checklist instance #${this.instanceId} not found. It may have been deleted.`);
          this.router.navigate(['/quality/checklist/list']);
          return;
        }

        // Check if current user has permission to VIEW this checklist
        const canViewChecklist = this.checkPermission(instance);
        if (!canViewChecklist) {
          this.loading = false;
          alert(`Access Denied: This checklist belongs to ${instance.operator_name}. You can only modify your own checklists.`);
          this.router.navigate(['/quality/checklist/execution']);
          return;
        }

        // Submitted checklists are read-only
        this.canModifyChecklist = canViewChecklist && instance.status !== 'submitted';
        
        if (!instance.template_id) {
          this.loading = false;
          alert('Error: Checklist instance has no associated template.');
          return;
        }
        
        this.instance = instance;
        this.loadTemplate();
      },
      error: (error) => {
        console.error('Error loading instance:', error);
        this.loading = false;
        alert(`Error loading checklist instance #${this.instanceId}. It may have been deleted or you don't have permission to access it.`);
        this.router.navigate(['/quality/checklist/list']);
      }
    });
  }

  private ensureCanModify(interactive = true): boolean {
    if (this.instance?.status === 'submitted') {
      if (interactive) {
        alert('This checklist is submitted and read-only. No changes can be made.');
      }
      return false;
    }
    if (!this.canModifyChecklist) {
      if (interactive) {
        alert('This checklist is read-only.');
      }
      return false;
    }
    return true;
  }

  loadTemplate(): void {
    if (!this.instance) {
      console.error('Cannot load template: instance is null');
      return;
    }
    
    this.photoChecklistService.getTemplateIncludingInactive(this.instance.template_id).subscribe({
      next: (template) => {
        if (!template) {
          this.loading = false;
          alert('Error: Template not found. Please try again.');
          return;
        }
        
        this.template = template;
        this.initializeProgress();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading template:', error);
        this.loading = false;
        alert('Error loading template. Please try again.');
      }
    });
  }

  /**
   * Flatten hierarchical items structure (with nested children) into a flat array
   * OR sort flat array with sub-items placed after their parents
   */
  private flattenItems(items: ChecklistItem[]): ChecklistItem[] {
    // Check if items are already flat (no children property)
    const hasChildren = items.some(item => (item as any).children && Array.isArray((item as any).children));
    
    if (!hasChildren) {
      // Items are already flat - just sort them properly
      // Separate parents and sub-items
      const parents = items.filter(item => item.level === 0 || !item.level);
      const subItems = items.filter(item => item.level === 1);
      
      // Build ordered array: parent followed by its sub-items
      const sorted: ChecklistItem[] = [];
      parents.forEach(parent => {
        sorted.push(parent);
        // Find and add all sub-items that belong to this parent
        const children = subItems.filter(sub => sub.parent_id === parent.id);
        sorted.push(...children);
      });
      
      return sorted;
    }
    
    // Hierarchical flattening logic with proper level assignment
    const flattened: ChecklistItem[] = [];
    
    const flatten = (item: ChecklistItem, level: number = 0, parentId?: number) => {
      // Set the level and parent_id for this item
      const flatItem = { ...item, level, parent_id: parentId };
      
      // Add the current item
      flattened.push(flatItem);
      
      // If item has children, recursively flatten them
      if ((item as any).children && Array.isArray((item as any).children)) {
        (item as any).children.forEach((child: ChecklistItem) => {
          flatten(child, level + 1, item.id);
        });
      }
    };
    
    items.forEach(item => flatten(item, 0));
    return flattened;
  }

  initializeProgress(): void {
    if (!this.template?.items) {
      return;
    }
    
    // Set instance ID in state service
    this.stateService.setInstanceId(this.instanceId);
    
    // Load completion status from localStorage
    const completionMap = this.stateService.loadFromLocalStorage();

    // Load completion status from DB (authoritative for collaboration)
    const dbCompletionMap = new Map<string, any>();
    try {
      const raw = (this.instance as any)?.item_completion;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        parsed.forEach((entry: any) => {
          if (entry && entry.itemId !== undefined && entry.itemId !== null) {
            dbCompletionMap.set(String(entry.itemId), entry);
          }
        });
      }
    } catch (e) {
      // ignore bad JSON
    }
    
    // Flatten items to include sub-items from children arrays
    const flattenedItems = this.flattenItems(this.template.items);
    
    const itemProgress: ChecklistItemProgress[] = flattenedItems.map((item, index) => {
      // Validate item ID
      if (!item.id || item.id === null || item.id === undefined) {
        console.error(`Item ${index} has invalid ID:`, item.id);
        item.id = index + 1;
      }
      
      // Find instance item using matcher service
      const instanceItem = this.instanceMatcher.findInstanceItem(
        this.instance?.items, 
        item.id
      );
      
      // Create compound unique ID
      const baseItemId = item.id;
      const itemId = this.idExtractor.createCompoundId(this.instanceId, baseItemId);
      
      // Store the base item ID
      (item as any).baseItemId = baseItemId;
      
      // Extract photos from instance item
      const existingPhotos = this.instanceMatcher.extractPhotos(instanceItem);
      
      // Extract videos from instance item (NEW)
      const existingVideos = instanceItem?.videos?.map((v: any) => v.file_url || v.url || v) || [];
      
      // Get completion status from instance item
      const { isCompleted, completedAt } = this.instanceMatcher.getCompletionStatus(instanceItem);
      
      // Use localStorage data as fallback
      const localData = completionMap.get(String(itemId));
      const dbData = dbCompletionMap.get(String(itemId));
      let completed = isCompleted;
      let completionDate = completedAt;
      let notes = '';
      let completedByUserId: number | undefined = undefined;
      let completedByName: string | undefined = undefined;
      let photoMeta: Record<string, { source?: 'in-app' | 'system' | 'library' }> | undefined = undefined;
      let videoMeta: Record<string, { source?: 'in-app' | 'system' | 'library' }> | undefined = undefined;

      // DB completion overrides local-only (and can mark complete without photos)
      if (dbData) {
        completed = completed || !!dbData.completed;
        if (dbData.completedAt) {
          completionDate = new Date(dbData.completedAt);
        }
        notes = dbData.notes || notes;
        completedByUserId = dbData.completedByUserId;
        completedByName = dbData.completedByName;
        photoMeta = dbData.photoMeta;
        videoMeta = dbData.videoMeta;

        if (completedByName && String(completedByName).trim() === 'Unknown User') {
          completedByName = undefined;
        }
      }
      
      if (localData && !isCompleted && !dbData) {
        completed = localData.completed;
        if (localData.completedAt) {
          completionDate = new Date(localData.completedAt);
        }
        notes = localData.notes || '';

        // Hydrate attribution fields if present
        completedByUserId = localData.completedByUserId;
        completedByName = localData.completedByName;

        photoMeta = (localData as any).photoMeta;
        videoMeta = (localData as any).videoMeta;

        // Hydrate last-modified attribution if present
        // (only used locally today)
        const localModifiedAt = (localData as any).lastModifiedAt;
        const lastModifiedAt = localModifiedAt ? new Date(localModifiedAt) : undefined;
        const lastModifiedByUserId = (localData as any).lastModifiedByUserId;
        const lastModifiedByName = (localData as any).lastModifiedByName;

        // Back-compat: don't display the old placeholder
        if (completedByName && completedByName.trim() === 'Unknown User') {
          completedByName = undefined;
        }
        
        // Attach hydrated last-modified values onto the localData object for return mapping below
        (localData as any)._hydratedLastModifiedAt = lastModifiedAt;
        (localData as any)._hydratedLastModifiedByUserId = lastModifiedByUserId;
        (localData as any)._hydratedLastModifiedByName = lastModifiedByName;
      }
      
      const submissionType = item.submission_type || 'photo';
      const hasMedia = existingPhotos.length > 0 || existingVideos.length > 0;

      // Check if item should be completed based on media meeting requirements
      if (!completed && hasMedia && submissionType !== 'none') {
        if (this.photoValidation.areSubmissionRequirementsMet(existingPhotos.length, existingVideos.length, item)) {
          completed = true;
          completionDate = completionDate || new Date();
        }
      }
      
      return {
        item: {
          ...item,
          id: itemId,
          baseItemId: baseItemId,
          original_position: index
        } as ChecklistItem & { id: string; original_position: number; baseItemId: number },
        completed,
        photos: existingPhotos,
        photoMeta,
        videos: existingVideos, // Use extracted videos
        videoMeta,
        notes,
        completedAt: completionDate,
        completedByUserId,
        completedByName,
        lastModifiedAt: (localData as any)?._hydratedLastModifiedAt,
        lastModifiedByUserId: (localData as any)?._hydratedLastModifiedByUserId,
        lastModifiedByName: (localData as any)?._hydratedLastModifiedByName
      };
    });
    
    this.stateService.setItemProgress(itemProgress);
    
    // Update parent completion based on sub-items
    this.updateParentCompletion();

    if (!this.applySelectionFromQuery()) {
      // Navigate to first incomplete item if no step param was provided
      this.navigateToFirstIncompleteItem();
    }
  }

  /**
   * Navigate to the first incomplete item (only if step param not in URL)
   */
  private navigateToFirstIncompleteItem(): void {
    // Only auto-navigate if step was not explicitly provided in URL
    const stepParam = this.route.snapshot.queryParams['step'];
    const itemParam = this.route.snapshot.queryParams['item'];
    if (stepParam) {
      return;
    }
    if (itemParam) {
      return;
    }
    
    // Find first incomplete parent item (level 0)
    const firstIncompleteIndex = this.itemProgress.findIndex(p => 
      !p.completed && (p.item.level === 0 || !p.item.level)
    );
    
    if (firstIncompleteIndex !== -1) {
      this.currentStep = firstIncompleteIndex + 1; // Steps are 1-indexed
      this.updateUrlWithCurrentStep();
    }
  }

  onFileSelectedAndUpload(event: any, itemId: number | string): void {
    if (!this.ensureCanModify(true)) {
      try { event?.target && (event.target.value = ''); } catch { /* ignore */ }
      return;
    }
    // Validate itemId
    if (!this.idExtractor.isValidItemId(itemId)) {
      console.error('Invalid itemId:', itemId);
      alert('Error: Invalid item ID. Please reload the page.');
      return;
    }
    
    const input = event?.target as HTMLInputElement | null;
    const files = input?.files;
    if (!files || files.length === 0) return;
    const captureSource = this.getCaptureSourceFromInput(input);

    const firstFile = files[0] as File | undefined;
    const isMediaSelection = this.isVideoOrAudioFile(firstFile);

    // Validate instance ID
    if (!this.idExtractor.isValidInstanceId(this.instanceId)) {
      console.error('Invalid instance ID:', this.instanceId);
      alert('Error: Instance ID is not available. Please reload the page.');
      return;
    }

    // Validate photo count limits
    const progress = this.stateService.findItemProgress(itemId);
    if (progress) {
      if (!isMediaSelection) {
        const validation = this.photoValidation.validateFileSelection(
          files, 
          progress.photos.length, 
          progress.item
        );
        
        if (!validation.valid) {
          alert(validation.error);
          event.target.value = '';
          return;
        }
      } else {
        // Video/audio are tracked separately from photos; do not apply photo count limits.
        if (files.length > 1) {
          alert('Please select a single media file.');
          event.target.value = '';
          return;
        }
      }
    }
    
    // Store files and upload
    const numericKey = this.idExtractor.toNumericKey(itemId);
    this.selectedFiles[numericKey] = files;
    this.uploadPhotos(itemId, captureSource);
  }

  uploadPhotos(itemId: number | string, captureSource: 'in-app' | 'system' | 'library' = 'library'): void {
    if (!this.ensureCanModify(true)) return;
    const itemIdKey = this.idExtractor.toNumericKey(itemId);
    const files = this.selectedFiles[itemIdKey];
    if (!files || files.length === 0) return;

    // Validate instance and item IDs
    if (!this.idExtractor.isValidInstanceId(this.instanceId)) {
      alert('Error: Invalid instance ID. Please reload the page.');
      return;
    }

    const progressItem = this.stateService.findItemProgress(itemId);
    if (!progressItem) {
      alert('Error: Item not found. Please reload the page.');
      return;
    }

    // Get database item ID for API calls
    const dbItemId = this.idExtractor.extractBaseItemId(
      progressItem.item.id,
      (progressItem.item as any).baseItemId
    );

    const firstFile = files[0] as File | undefined;
    const isMediaSelection = this.isVideoOrAudioFile(firstFile);
    const isAudioSelection = !!firstFile && typeof firstFile.type === 'string' && firstFile.type.toLowerCase().startsWith('audio/');
    if (isMediaSelection) {
      if (files.length > 1) {
        alert('Please select a single media file.');
      }

      this.uploadProgress[itemIdKey] = 0;
      this.photoOps.uploadPhoto(this.instanceId, dbItemId, firstFile!, {
        captureSource: captureSource === 'library' ? 'library' : 'camera',
        userId: this.currentUserId || undefined
      }).subscribe({
        next: (response) => {
          this.stateService.addVideo(itemId, response.file_url, this.currentUserId || undefined, this.currentUserName, captureSource);
          delete this.uploadProgress[itemIdKey];
          delete this.selectedFiles[itemIdKey];
          this.cdr.detectChanges();
          this.saveProgress();
          this.broadcastChecklistUpdate(this.getMediaAddedAction(firstFile), { itemId });
        },
        error: (error) => {
          const mediaLabel = isAudioSelection ? 'audio' : 'video';
          console.error(`Error uploading ${mediaLabel}:`, error);
          delete this.uploadProgress[itemIdKey];
          const errorMessage = error.error?.error || error.message || 'Upload failed';
          alert(`Error uploading ${mediaLabel}: ${errorMessage}`);
        }
      });

      return;
    }

    // Pre-upload validation
    if (progressItem) {
      const validation = this.photoValidation.validateFileSelection(
        files,
        progressItem.photos.length,
        progressItem.item
      );
      
      if (!validation.valid) {
        alert(validation.error);
        delete this.selectedFiles[itemIdKey];
        return;
      }
    }

    this.uploadProgress[itemIdKey] = 0;
    const totalFiles = files.length;
    let uploadedCount = 0;

    const uploadNextFile = (index: number) => {
      if (index >= totalFiles) {
        delete this.uploadProgress[itemIdKey];
        delete this.selectedFiles[itemIdKey];
        this.saveProgress();
        return;
      }

      // Check limits before each upload
      const currentItem = this.stateService.findItemProgress(itemId);
      if (currentItem && !this.photoValidation.canAddMorePhotos(currentItem.photos.length, currentItem.item)) {
        delete this.uploadProgress[itemIdKey];
        delete this.selectedFiles[itemIdKey];
        alert('Maximum photos reached. Some files were not uploaded.');
        return;
      }

      const file = files[index];
      
      this.photoOps.uploadPhoto(this.instanceId, dbItemId, file, {
        captureSource: captureSource === 'library' ? 'library' : 'camera',
        userId: this.currentUserId || undefined
      }).subscribe({
        next: (response) => {
          this.stateService.addPhoto(itemId, response.file_url, this.currentUserId || undefined, this.currentUserName, captureSource);
          
          uploadedCount++;
          this.uploadProgress[itemIdKey] = Math.round((uploadedCount / totalFiles) * 100);
          
          this.cdr.detectChanges();
          setTimeout(() => this.initializeCarousels(), 100);
          
          // Check if all files uploaded, then trigger auto-advance
          if (uploadedCount === totalFiles) {
            this.handlePhotoUploadComplete(itemId);
          }
          
          uploadNextFile(index + 1);
        },
        error: (error) => {
          console.error(`Error uploading photo ${index + 1}:`, error);
          delete this.uploadProgress[itemIdKey];
          
          const errorMessage = error.error?.error || error.message || 'Upload failed';
          alert(`Error uploading photos: ${errorMessage}`);
        }
      });
    };

    uploadNextFile(0);
  }

  /**
   * Update parent item completion based on sub-items
   * If all sub-items of a parent are complete, mark parent as complete
   */
  private updateParentCompletion(): void {
    const allProgress = this.itemProgress;
    
    // Find all parent items
    const parents = allProgress.filter(p => p.item.level === 0 || !p.item.level);
    
    parents.forEach(parent => {
      if ((parent.item as ChecklistItem).is_required !== false) {
        return;
      }
      // Find all sub-items for this parent
      const subItems = allProgress.filter(sub => 
        sub.item.level === 1 && 
        (sub.item.parent_id === parent.item.id || sub.item.parent_id === (parent.item as any).baseItemId)
      );
      
      // If parent has sub-items, check if all are complete
      if (subItems.length > 0) {
        const allSubItemsComplete = subItems.every(sub => sub.completed);
        
        // Update parent completion status
        if (allSubItemsComplete && !parent.completed) {
          // Find the last sub-item completed to attribute the parent completion
          const lastCompletedSub = subItems
            .filter(s => s.completed && s.completedAt)
            .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))[0];
          
            this.stateService.updateItemProgress(parent.item.id, {
              completed: true,
              completedAt: new Date(),
              completedByUserId: lastCompletedSub?.completedByUserId || this.currentUserId || undefined,
              completedByName: lastCompletedSub?.completedByName || this.currentUserName || undefined
            });
        } else if (!allSubItemsComplete && parent.completed) {
          // If any sub-item is incomplete, mark parent as incomplete
          this.stateService.updateItemProgress(parent.item.id, {
            completed: false,
            completedAt: undefined,
            completedByUserId: undefined,
            completedByName: undefined
          });
        }
      }
    });
  }

  saveProgress(): void {
    if (!this.instanceId) {
      console.error('Cannot save progress: Instance ID is not available');
      return;
    }

    // Update parent completion before saving
    this.updateParentCompletion();

    this.saving = true;
    
    const progress = this.stateService.getCompletionPercentage();
    const completionData = this.stateService.getCompletionDataForApi();
    
    const updatedData = {
      status: progress === 100 ? 'completed' as ChecklistInstance['status'] : 'in_progress' as ChecklistInstance['status'],
      progress_percentage: progress,
      updated_at: new Date().toISOString(),
      item_completion: completionData
    };

    this.photoChecklistService.updateInstance(this.instanceId, updatedData).subscribe({
      next: (response) => {
        this.saving = false;
        this.notesLastSaved = new Date();
        
        // Update local instance progress percentage immediately
        if (this.instance) {
          this.instance.progress_percentage = progress;
        }
        
        // Trigger change detection to update UI
        this.cdr.detectChanges();

        // Minimal real-time sync: notify other viewers
        this.broadcastChecklistUpdate('progress_saved');
      },
      error: (error) => {
        console.error('Error saving progress:', error);
        this.saving = false;
        alert('Error saving progress. Please try again.');
      }
    });
  }

  submitChecklist(): void {
    if (!this.stateService.areAllRequiredItemsCompleted()) {
      const status = this.stateService.getRequiredCompletionStatus();
      alert(`Please complete all required items. ${status.completed}/${status.total} required items completed.`);
      return;
    }

    if (confirm('Are you sure you want to submit this checklist? This action cannot be undone.')) {
      this.saving = true;
      this.saveProgress();
      
      this.photoChecklistService.updateInstanceStatus(this.instanceId, 'submitted').subscribe({
        next: (response) => {
          this.saving = false;
          alert('Checklist submitted successfully!');
          this.router.navigate(['/quality/checklist']);
        },
        error: (error) => {
          this.saving = false;
          console.error('Error submitting checklist:', error);
          alert('Error submitting checklist. Please try again.');
        }
      });
    }
  }

  /**
   * Download checklist as PDF report
   */
  downloadAsPDF(): void {
    if (!this.instanceId) {
      alert('No checklist instance to download.');
      return;
    }

    this.saving = true;

    // Fetch PDF data from backend
    this.photoChecklistService.downloadInstancePDF(this.instanceId).subscribe({
      next: async (data: any) => {
        try {
          // Generate PDF filename
          const templateName = this.template?.name || 'Checklist';
          const timestamp = new Date().toISOString().split('T')[0];
          const filename = `${templateName}_${this.instance?.work_order_number || 'Report'}_${timestamp}.pdf`;

          // Generate PDF using the export service
          await this.pdfExportService.generateChecklistPDF(data, filename);
          this.saving = false;
        } catch (error) {
          console.error('Error generating PDF:', error);
          this.saving = false;
          alert('Error generating PDF. Please try again.');
        }
      },
      error: (error) => {
        console.error('Error downloading PDF data:', error);
        this.saving = false;
        alert('Error downloading checklist. Please try again.');
      }
    });
  }

  getCompletionPercentage(): number {
    return this.stateService.getCompletionPercentage();
  }

  goToItemAndExitReview(itemIndex: number): void {
    this.goToItem(itemIndex);
    this.isReviewMode = false;
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  getCurrentItemsToShow(): ChecklistItemProgress[] {
    if (this.isReviewMode) {
      return this.itemProgress;
    }

    if (this.selectedItemIndex !== null) {
      const selected = this.itemProgress[this.selectedItemIndex];
      if (selected) {
        this.lastVisibleItems = [selected];
        return this.lastVisibleItems;
      }
      return this.lastVisibleItems;
    }
    const activeIndex = this.getActiveNavIndex();
    const currentItem = activeIndex >= 0 ? this.itemProgress[activeIndex] : undefined;
    if (currentItem) {
      this.lastVisibleItems = [currentItem];
      return this.lastVisibleItems;
    }
    return this.lastVisibleItems;
  }

  goBack(): void {
    this.router.navigate(['/quality/checklist/execution']);
  }

  deleteInspection(offcanvas?: any): void {
    if (!this.instanceId || this.instanceId <= 0) {
      return;
    }
    if (!this.instance) {
      return;
    }

    if (this.instance.status === 'completed' || this.instance.status === 'submitted') {
      alert('This inspection cannot be deleted because it is already completed/submitted.');
      return;
    }

    const ok = confirm('Delete this inspection? This will remove uploaded media and cannot be undone.');
    if (!ok) {
      return;
    }

    try {
      offcanvas?.dismiss?.();
    } catch {
      // ignore
    }

    this.saving = true;
    this.photoChecklistService.deleteInstance(this.instanceId).subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.success) {
          this.goBack();
        } else {
          alert(res?.error || 'Failed to delete inspection.');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete inspection error:', err);
        this.saving = false;
        alert('Failed to delete inspection.');
        this.cdr.detectChanges();
      }
    });
  }

  toggleItemCompletion(itemId: number | string): void {
    if (!this.ensureCanModify(true)) return;
    const itemProgress = this.stateService.findItemProgress(itemId);
    
    if (itemProgress) {
      // Check if submission requirements are met based on submission_type before marking as complete
      if (!itemProgress.completed) {
        const validation = this.photoValidation.canCompleteItem(
          itemProgress.photos.length,
          itemProgress.item,
          itemProgress.videos?.length || 0  // Pass video count for submission_type validation
        );
        
        if (!validation.valid) {
          alert(validation.error);
          return;
        }
      }

      this.stateService.toggleItemCompletion(itemId, this.currentUserId || undefined, this.currentUserName);
      this.saveProgress();
    }
  }

  markAsVerified(): void {
    if (!this.ensureCanModify(true)) return;
    // Get current progress item based on active cursor (parent or selected sub-item)
    const activeIndex = this.getActiveNavIndex();
    const progress = activeIndex >= 0 ? this.itemProgress[activeIndex] : undefined;
    if (!progress) return;

    // Mark as completed without requiring photos (for optional photo items)
    this.stateService.updateItemProgress(progress.item.id, {
      completed: true,
      completedAt: new Date(),
      notes: progress.notes || 'Verified without photos'
    });
    this.saveProgress();
    
    // Auto-advance to next step if available
    if (!this.isLastItem()) {
      setTimeout(() => this.nextItem(), 300);
    }
  }

  toggleVerification(progress?: ChecklistItemProgress): void {
    if (!this.ensureCanModify(true)) return;
    const activeIndex = this.getActiveNavIndex();
    const target = progress || (activeIndex >= 0 ? this.itemProgress[activeIndex] : undefined);
    if (!target) return;

    if (target.completed) {
      // Unmark verification - reset to incomplete
      this.stateService.updateItemProgress(target.item.id, {
        completed: false,
        completedAt: undefined,
        completedByUserId: undefined,
        completedByName: undefined,
        notes: target.notes || ''
      });
      this.stampLastModified(target.item.id, 'verification');
    } else {
      // Mark as completed without requiring photos - track who completed it
      this.stateService.updateItemProgress(target.item.id, {
        completed: true,
        completedAt: new Date(),
        completedByUserId: this.currentUserId || undefined,
        completedByName: this.currentUserName || undefined,
        notes: target.notes || 'Verified without photos'
      });
      this.stampLastModified(target.item.id, 'verification');
      
      // Auto-advance to next step if available
      if (!this.isLastItem()) {
        setTimeout(() => this.nextOpenItem(), 300);
      }
    }
    
    this.saveProgress();
  }

  removePhoto(itemId: number | string, photoIndex: number): void {
    if (!this.ensureCanModify(true)) return;
    if (!confirm('Are you sure you want to remove this photo?')) return;

    const result = this.photoOps.deletePhotoByIndex(
      itemId, 
      photoIndex, 
      this.instance?.items || []
    );

    if (result) {
      result.subscribe({
        next: () => {
          this.stampLastModified(itemId, 'media');
          // Recalculate progress after photo deletion
          this.saveProgress();
          this.broadcastChecklistUpdate('photo_deleted', { itemId });
          this.cdr.detectChanges();
          setTimeout(() => this.initializeCarousels(), 100);
        },
        error: (error) => {
          console.error('Error deleting photo:', error);
          alert('Error deleting photo. Please try again.');
        }
      });
    } else {
      // UI-only removal (no backend ID found) - still recalculate progress
      this.stampLastModified(itemId, 'media');
      this.saveProgress();
      this.cdr.detectChanges();
    }
  }

  removeAllPhotos(itemId: number | string): void {
    if (!this.ensureCanModify(true)) return;
    if (!confirm('Are you sure you want to remove all photos for this item?')) return;

    const result = this.photoOps.deleteAllPhotos(
      itemId,
      this.instance?.items || []
    );

    if (result) {
      result.subscribe({
        next: () => {
          this.stampLastModified(itemId, 'media');
          // Recalculate progress after removing all photos
          this.saveProgress();
          this.broadcastChecklistUpdate('photos_cleared', { itemId });
          this.cdr.detectChanges();
          this.loadInstance();
        },
        error: (error) => {
          console.error('Error deleting photos:', error);
          alert('Error deleting photos. Please try again.');
        }
      });
    } else {
      // UI-only removal - still recalculate progress
      this.stampLastModified(itemId, 'media');
      this.saveProgress();
      this.cdr.detectChanges();
    }
  }

  deletePhoto(photoUrl: string, itemId: number | string): void {
    if (!this.ensureCanModify(true)) return;
    if (!confirm('Are you sure you want to remove this media?')) return;

    const attemptDelete = (instanceItems: any[], didRefresh: boolean) => {
      const result = this.photoOps.deletePhotoByUrl(
        photoUrl,
        itemId,
        instanceItems
      );

      if (result) {
        result.subscribe({
          next: () => {
            this.stampLastModified(itemId, 'media');
            this.saveProgress();
            this.broadcastChecklistUpdate('media_deleted', { itemId });
            this.cdr.detectChanges();
            setTimeout(() => this.initializeCarousels(), 100);
          },
          error: () => {
            alert('Error deleting media. Please try again.');
          }
        });
        return;
      }

      // If we couldn't find a backend ID (common right after upload because instanceItems is stale), refresh once and retry.
      if (!didRefresh && this.idExtractor.isValidInstanceId(this.instanceId)) {
        this.photoChecklistService.getInstance(this.instanceId).subscribe({
          next: (fresh) => {
            this.instance = fresh as any;
            this.cdr.detectChanges();
            attemptDelete((fresh as any)?.items || [], true);
          },
          error: () => {
            // fallback: UI-only removal already handled by service; still recompute
            this.stampLastModified(itemId, 'media');
            this.saveProgress();
            this.cdr.detectChanges();
          }
        });
        return;
      }

      // UI-only removal path
      this.stampLastModified(itemId, 'media');
      this.saveProgress();
      this.cdr.detectChanges();
    };

    attemptDelete(this.instance?.items || [], false);
  }

  previewImage(imageUrl: string): void {
    if (!imageUrl) return;
    // Build global media list and find this URL
    this._buildGlobalLightboxMedia();
    const idx = this.lightboxMedia.findIndex(f => f.url === imageUrl || f.url === this.getPhotoUrl(imageUrl));
    this.lightboxIndex = idx >= 0 ? idx : 0;
    if (idx < 0) {
      // Not found in progress (e.g. sample image) — single-frame
      this.lightboxMedia = [{ url: imageUrl, type: 'image', progress: null, source: null }];
      this.lightboxIndex = 0;
    }
    this.lightboxTotal = this.lightboxMedia.length;
    this._applyLightboxFrame();
  }

  openLightboxForProgress(progress: ChecklistItemProgress, index: number, kind: 'photo' | 'video' = 'photo'): void {
    this._buildGlobalLightboxMedia();
    // Find the position of this item+index in the global list
    let searchIdx = 0;
    let offset = 0;
    for (const p of this.itemProgress) {
      if (p === progress) {
        searchIdx = kind === 'photo' ? offset + index : offset + (p.photos?.length ?? 0) + index;
        break;
      }
      offset += (p.photos?.length ?? 0) + (p.videos?.length ?? 0);
    }
    this.lightboxIndex = searchIdx;
    this.lightboxTotal = this.lightboxMedia.length;
    this._applyLightboxFrame();
  }

  private _buildGlobalLightboxMedia(): void {
    const media: { url: string; type: 'image' | 'video'; progress: ChecklistItemProgress | null; source: string | null }[] = [];
    for (const p of this.itemProgress) {
      for (const photo of (p.photos || [])) {
        const url = this.getPhotoUrl(photo);
        const source = p.photoMeta?.[photo]?.source ?? null;
        media.push({ url, type: 'image', progress: p, source });
      }
      for (const video of (p.videos || [])) {
        const url = this.getPhotoUrl(video);
        media.push({ url, type: 'video', progress: p, source: null });
      }
    }
    this.lightboxMedia = media;
  }

  private _applyLightboxFrame(): void {
    const frame = this.lightboxMedia[this.lightboxIndex];
    if (!frame) return;
    this.lightboxUrl         = frame.url;
    this.lightboxType        = frame.type;
    this.lightboxItem        = frame.progress;
    this.lightboxPhotoSource = frame.source;
  }

  lightboxPrev(): void {
    if (this.lightboxTotal <= 1) return;
    this.lightboxIndex = (this.lightboxIndex - 1 + this.lightboxTotal) % this.lightboxTotal;
    this._applyLightboxFrame();
  }

  lightboxNext(): void {
    if (this.lightboxTotal <= 1) return;
    this.lightboxIndex = (this.lightboxIndex + 1) % this.lightboxTotal;
    this._applyLightboxFrame();
  }

  @HostListener('document:keydown', ['$event'])
  onLightboxKeydown(e: KeyboardEvent): void {
    if (!this.lightboxUrl) return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); this.lightboxPrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); this.lightboxNext(); }
    if (e.key === 'Escape')     { this.closeLightbox(); }
  }

  closeLightbox(): void {
    this.lightboxUrl  = null;
    this.lightboxItem = null;
    this.lightboxMedia = [];
    this.lightboxIndex = 0;
    this.lightboxTotal = 0;
  }

  closeImagePreview(): void {
    this.showImagePreview = false;
    this.previewImageUrl = '';
    this.closeLightbox();
  }

  openImageInNewTab(): void {
    const url = this.lightboxUrl || this.previewImageUrl;
    if (url) window.open(url, '_blank');
  }

  goToCarouselSlide(itemId: number | string, slideIndex: number): void {
    try {
      const carouselId = `photoCarousel-${itemId}`;
      const carouselElement = document.getElementById(carouselId);
      
      if (carouselElement) {
        // Try different approaches to control the carousel
        
        // Method 1: Direct Bootstrap API
        if ((window as any).bootstrap?.Carousel) {
          const carousel = (window as any).bootstrap.Carousel.getOrCreateInstance(carouselElement);
          carousel.to(slideIndex);
        }
        // Method 2: jQuery if available
        else if ((window as any).$ && (window as any).$().carousel) {
          (window as any).$(`#${carouselId}`).carousel(slideIndex);
        }
        // Method 3: Manual slide activation
        else {
          this.activateCarouselSlide(carouselElement, slideIndex);
        }
        
        // Update thumbnail highlighting
        this.updateThumbnailHighlight(itemId, slideIndex);
      }
    } catch (error) {
      console.error('Error navigating carousel:', error);
    }
  }

  private activateCarouselSlide(carouselElement: Element, slideIndex: number): void {
    // Remove active class from all slides
    const slides = carouselElement.querySelectorAll('.carousel-item');
    const indicators = carouselElement.querySelectorAll('.carousel-indicators button');
    
    slides.forEach((slide, index) => {
      if (index === slideIndex) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });
    
    indicators.forEach((indicator, index) => {
      if (index === slideIndex) {
        indicator.classList.add('active');
        indicator.setAttribute('aria-current', 'true');
      } else {
        indicator.classList.remove('active');
        indicator.removeAttribute('aria-current');
      }
    });
  }

  private updateThumbnailHighlight(itemId: number | string, activeIndex: number): void {
    try {
      const carouselContainer = document.getElementById(`carousel-${itemId}`);
      if (carouselContainer) {
        const thumbnails = carouselContainer.querySelectorAll('.photo-thumbnail');
        thumbnails.forEach((thumb, index) => {
          const thumbElement = thumb as HTMLElement;
          if (index === activeIndex) {
            thumbElement.style.borderColor = '#007bff';
            thumbElement.style.transform = 'scale(1.1)';
          } else {
            thumbElement.style.borderColor = 'transparent';
            thumbElement.style.transform = 'scale(1)';
          }
        });
      }
    } catch (error) {
      console.error('Error updating thumbnail highlight:', error);
    }
  }

  // Comparison Mode Methods
  toggleCompareMode(itemId: number | string): void {
    // Use the compound ID directly as the key for isCompareMode
    this.isCompareMode[itemId as any] = !this.isCompareMode[itemId as any];
    
    if (this.isCompareMode[itemId as any] && !this.comparisonPhotoIndex[itemId as any]) {
      this.comparisonPhotoIndex[itemId as any] = 0;
    }
  }

  getCurrentComparisonPhoto(itemId: number | string): string {
    const progressItem = this.itemProgress.find(p => String(p.item.id) === String(itemId));
    
    if (!progressItem || !progressItem.photos.length) {
      return '';
    }
    
    const index = this.comparisonPhotoIndex[itemId as any] || 0;
    return progressItem.photos[index] || progressItem.photos[0];
  }

  getCurrentComparisonIndex(itemId: number | string): number {
    return this.comparisonPhotoIndex[itemId as any] || 0;
  }

  nextComparisonPhoto(itemId: number | string): void {
    const progressItem = this.itemProgress.find(p => String(p.item.id) === String(itemId));
    
    if (!progressItem || !progressItem.photos.length) {
      return;
    }
    
    const currentIndex = this.comparisonPhotoIndex[itemId as any] || 0;
    if (currentIndex < progressItem.photos.length - 1) {
      this.comparisonPhotoIndex[itemId as any] = currentIndex + 1;
    }
  }

  previousComparisonPhoto(itemId: number | string): void {
    const currentIndex = this.comparisonPhotoIndex[itemId as any] || 0;
    
    if (currentIndex > 0) {
      this.comparisonPhotoIndex[itemId as any] = currentIndex - 1;
    }
  }

  getTotalItemsCount(): number {
    return this.stateService.getTotalItemsCount();
  }

  /**
   * Get total parent items count for navigation
   */
  getTotalParentItemsCount(): number {
    return this.stateService.getTotalParentItemsCount();
  }

  goToItem(itemNumber: number): void {
    this.startNavTransition();
    this.selectedItemIndex = null;
    this.currentStep = itemNumber;
    this.updateUrlWithCurrentStep();
  }

  nextItem(): void {
    const currentIndex = this.getActiveNavIndex();
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= this.itemProgress.length) {
      return;
    }

    this.startNavTransition();
    this.selectedItemIndex = nextIndex;

    const rootIndex = this.findRootParentIndex(nextIndex);
    const rootProgress = rootIndex >= 0 ? this.itemProgress[rootIndex] : this.itemProgress[nextIndex];
    const step = this.getItemNumber(rootProgress);
    if (step > 0) {
      this.currentStep = step;
    }

    this.updateUrlWithCurrentStep();
    this.cdr.detectChanges();
    setTimeout(() => this.updateInstructionsOverflowHints(), 0);
    setTimeout(() => this.updateInstructionsOverflowHints(), 250);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  previousItem(): void {
    const currentIndex = this.getActiveNavIndex();
    if (currentIndex < 0) {
      return;
    }

    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      return;
    }

    this.startNavTransition();
    this.selectedItemIndex = prevIndex;

    const rootIndex = this.findRootParentIndex(prevIndex);
    const rootProgress = rootIndex >= 0 ? this.itemProgress[rootIndex] : this.itemProgress[prevIndex];
    const step = this.getItemNumber(rootProgress);
    if (step > 0) {
      this.currentStep = step;
    }

    this.updateUrlWithCurrentStep();
    this.cdr.detectChanges();
    setTimeout(() => this.updateInstructionsOverflowHints(), 0);
    setTimeout(() => this.updateInstructionsOverflowHints(), 250);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Missing helper methods for the template
  getCompletedItemsCount(): number {
    return this.stateService.getCompletedItemsCount();
  }

  getCurrentItemIndex(): number {
    return this.currentStep;
  }

  /**
   * Get hierarchical label for an item (e.g., "Item 1", "Sub-item 1.1")
   */
  getItemLabel(progress: ChecklistItemProgress): string {
    const index = this.itemProgress.indexOf(progress);
    
    if (progress.item.level === 1) {
      // Sub-item: find parent and calculate sub-item number
      const parentId = progress.item.parent_id;
      const parentIndex = this.itemProgress.findIndex(p => 
        p.item.id === parentId || p.item.baseItemId === parentId
      );
      
      if (parentIndex !== -1) {
        // Count how many sub-items of this parent came before this one
        let subItemNumber = 1;
        for (let i = parentIndex + 1; i < index; i++) {
          if (this.itemProgress[i].item.level === 1 && 
              (this.itemProgress[i].item.parent_id === parentId)) {
            subItemNumber++;
          }
        }
        return `Sub-item ${parentIndex + 1}.${subItemNumber}`;
      }
      return `Sub-item ${index + 1}`;
    }
    
    // Parent item: count only parent items before this one
    let parentItemNumber = 1;
    for (let i = 0; i < index; i++) {
      if (this.itemProgress[i].item.level === 0 || !this.itemProgress[i].item.level) {
        parentItemNumber++;
      }
    }
    return `Item ${parentItemNumber}`;
  }

  /**
   * Check if item is a parent/root item
   */
  isParentItem(progress: ChecklistItemProgress): boolean {
    return progress.item.level === 0 || !progress.item.level;
  }

  /**
   * Check if item is a sub-item
   */
  isSubItem(progress: ChecklistItemProgress): boolean {
    return progress.item.level === 1;
  }

  isFirstItem(): boolean {
    const currentIndex = this.getActiveNavIndex();
    return currentIndex <= 0;
  }

  isLastItem(): boolean {
    const currentIndex = this.getActiveNavIndex();
    return currentIndex >= this.itemProgress.length - 1;
  }

  getRequiredCompletionStatus(): { completed: number; total: number } {
    return this.stateService.getRequiredCompletionStatus();
  }

  hasPhotoRequirements(photoRequirements: any): boolean {
    return this.photoValidation.hasPhotoRequirements(photoRequirements);
  }

  getPhotoRequirements(photoRequirements: any): any {
    return this.photoValidation.getPhotoRequirements(photoRequirements);
  }

  // ==============================================
  // Delegated Methods - Forward to Services
  // ==============================================

  getMinPhotos(item: ChecklistItem): number {
    return this.photoValidation.getMinPhotos(item);
  }

  getMaxPhotos(item: ChecklistItem): number {
    return this.photoValidation.getMaxPhotos(item);
  }

  isPhotoCountValid(itemId: number | string): boolean {
    const progress = this.stateService.findItemProgress(itemId);
    return progress ? this.photoValidation.isPhotoCountValid(progress.photos.length, progress.item) : false;
  }

  getPhotoCountMessage(itemId: number | string): string {
    const progress = this.stateService.findItemProgress(itemId);
    return progress ? this.photoValidation.getPhotoCountMessage(progress.photos.length, progress.item) : '';
  }

  canAddMorePhotos(itemId: number | string): boolean {
    const progress = this.stateService.findItemProgress(itemId);
    return progress ? this.photoValidation.canAddMorePhotos(progress.photos.length, progress.item) : false;
  }

  arePhotoRequirementsMet(itemId: number | string): boolean {
    const progress = this.stateService.findItemProgress(itemId);
    return progress ? this.photoValidation.arePhotoRequirementsMet(progress.photos.length, progress.item) : false;
  }

  getPhotoStatus(itemId: number | string): 'empty' | 'insufficient' | 'valid' | 'exceeded' {
    const progress = this.stateService.findItemProgress(itemId);
    return progress ? this.photoValidation.getPhotoStatus(progress.photos.length, progress.item) : 'empty';
  }

  hasValidItemId(itemId: any): boolean {
    return this.idExtractor.isValidItemId(itemId);
  }

  getFileArray(itemId: number | string): File[] {
    const numericKey = this.idExtractor.toNumericKey(itemId);
    const files = this.selectedFiles[numericKey];
    return files ? Array.from(files) : [];
  }

  getPhotoUrl(photo: string | any): string {
    return this.photoOps.getPhotoUrl(photo);
  }

  /**
   * Format video duration in seconds to MM:SS format
   */
  formatDuration(seconds: number | null | undefined): string {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ==============================================
  // Notes Auto-Save Methods
  // ==============================================

  /**
   * Handle notes change with auto-save
   */
  onNotesChange(itemId: number | string): void {
    // Clear existing timeout
    if (this.notesAutoSaveTimeout) {
      clearTimeout(this.notesAutoSaveTimeout);
    }
    
    // Set new timeout for auto-save (2 seconds after user stops typing)
    this.notesAutoSaveTimeout = setTimeout(() => {
      this.saveNotesOnly();
    }, 2000);
  }

  /**
   * Save only notes data without triggering full progress save
   */
  private saveNotesOnly(): void {
    // Submitted instances are read-only
    if (!this.ensureCanModify(false)) {
      return;
    }

    if (!this.instanceId) {
      console.error('Cannot save notes: Instance ID is not available');
      return;
    }

    this.notesSaving = true;

    // Save to localStorage via state service
    this.stateService.saveToLocalStorage();

    // Save to DB (so verified-without-photos and notes are shared)
    const completionData = this.stateService.getCompletionDataForApi();
    const progressPct = this.stateService.getCompletionPercentage();
    this.photoChecklistService.updateInstance(this.instanceId, {
      item_completion: completionData,
      progress_percentage: progressPct
    } as any).subscribe({
      next: () => {
        this.broadcastChecklistUpdate('notes_saved');
      },
      error: (error) => {
        console.error('Error saving notes to DB:', error);
      }
    });
    
    // Simulate slight delay for better UX
    setTimeout(() => {
      this.notesSaving = false;
      this.notesLastSaved = new Date();
      this.cdr.detectChanges();
    }, 300);
  }

  /**
   * Force save notes immediately
   */
  saveNotesImmediately(): void {
    if (this.notesAutoSaveTimeout) {
      clearTimeout(this.notesAutoSaveTimeout);
      this.notesAutoSaveTimeout = null;
    }
    
    // Only save if there's an instance ID
    if (this.instanceId) {
      this.saveNotesOnly();
    }
  }

  /**
   * Get the primary sample image URL from the sample_images array
   */
  getPrimarySampleImage(item: ChecklistItem): string {
  // Use sample_image_url field directly (matches backend response)
  return item.sample_image_url || '';
  }

  getReferenceSampleImages(item: ChecklistItem): any[] {
    const sampleImages = Array.isArray(item?.sample_images) ? item.sample_images : [];
    if (!sampleImages.length) {
      return [];
    }

    const submissionType = ((item as any)?.submission_type || '').toString().toLowerCase();
    if (submissionType === 'none') {
      return sampleImages;
    }

    const nonPrimaryImages = sampleImages.filter((image: any) => !image?.is_primary);
    if (nonPrimaryImages.length) {
      return nonPrimaryImages;
    }

    return sampleImages.slice(1);
  }

  getItemBreadcrumbTrail(progress: ChecklistItemProgress): Array<{ orderLabel: string; title: string }> {
    const trail: Array<{ orderLabel: string; title: string }> = [];
    const chain: ChecklistItemProgress[] = [];
    const seen = new Set<string>();

    let currentParent = this.resolveParentProgress(progress);

    while (currentParent && currentParent.item.id !== progress.item.id) {
      const key = String(currentParent.item.id);
      if (seen.has(key)) {
        break;
      }

      seen.add(key);
      chain.unshift(currentParent);

      const nextParent = this.resolveParentProgress(currentParent);
      if (!nextParent || nextParent.item.id === currentParent.item.id) {
        break;
      }

      currentParent = nextParent;
    }

    for (const itemProgress of chain) {
      trail.push({
        orderLabel: this.getItemOrderLabel(itemProgress),
        title: String(itemProgress.item?.title || 'Untitled')
      });
    }

    if ((progress.item.level ?? 0) > 0) {
      trail.push({
        orderLabel: this.getItemOrderLabel(progress),
        title: String(progress.item?.title || 'Untitled')
      });
    }

    return trail;
  }

  private getItemOrderLabel(progress: ChecklistItemProgress): string {
    const explicitOrder = String(progress.item?.order_index ?? '').trim();
    if (explicitOrder) {
      return explicitOrder;
    }

    if ((progress.item.level ?? 0) > 0) {
      return this.getChildItemNumber(progress) || 'Sub-item';
    }

    return String(this.getItemNumber(progress) || 'Item');
  }

  /**
   * Handle file selection from photo section component
   */
  onFileSelected(event: Event, itemId: number | string): void {
    this.onFileSelectedAndUpload(event, itemId);
  }

  private isVideoOrAudioFile(file: File | undefined): boolean {
    if (!file || typeof file.type !== 'string') return false;
    const mimeType = file.type.toLowerCase();
    return mimeType.startsWith('video/') || mimeType.startsWith('audio/');
  }

  private uploadSingleFile(itemId: number | string, file: File, captureSource: 'in-app' | 'system' | 'library'): void {
    if (!this.ensureCanModify(true)) return;
    // Validate instance ID
    if (!this.idExtractor.isValidInstanceId(this.instanceId)) {
      alert('Error: Instance ID is not available. Please reload the page.');
      return;
    }

    const progress = this.stateService.findItemProgress(itemId);
    if (!progress) {
      alert('Error: Item not found. Please reload the page.');
      return;
    }

    const isMedia = this.isVideoOrAudioFile(file);
    const isAudio = !!file && typeof file.type === 'string' && file.type.toLowerCase().startsWith('audio/');

    // Validate photo count limits (for photo submissions)
    if (!isMedia) {
      if (!this.photoValidation.canAddMorePhotos(progress.photos.length, progress.item)) {
        alert('Maximum photos reached.');
        return;
      }
    }

    const dbItemId = this.idExtractor.extractBaseItemId(
      itemId,
      (progress.item as any).baseItemId
    );

    const itemIdKey = this.idExtractor.toNumericKey(itemId);
    this.uploadProgress[itemIdKey] = 0;

    this.photoOps.uploadPhoto(this.instanceId, dbItemId, file, {
      captureSource: captureSource === 'library' ? 'library' : 'camera',
      userId: this.currentUserId || undefined
    }).subscribe({
      next: (response) => {
        if (isMedia) {
          this.stateService.addVideo(itemId, response.file_url, this.currentUserId || undefined, this.currentUserName, captureSource);
        } else {
          this.stateService.addPhoto(
            itemId,
            response.file_url,
            this.currentUserId || undefined,
            this.currentUserName,
            captureSource
          );
        }
        this.uploadProgress[itemIdKey] = 100;
        Swal.close();
        this.cdr.detectChanges();
        setTimeout(() => this.initializeCarousels(), 100);
        this.handlePhotoUploadComplete(itemId);

        // Persist progress + notify other viewers
        this.saveProgress();
        this.broadcastChecklistUpdate(this.getMediaAddedAction(file), { itemId });
      },
      error: (error) => {
        const mediaLabel = isMedia ? (isAudio ? 'audio' : 'video') : 'photo';
        console.error(`Error uploading ${mediaLabel}:`, error);
        Swal.close();
        delete this.uploadProgress[itemIdKey];
        const errorMessage = error.error?.error || error.message || 'Upload failed';
        alert(`Error uploading ${mediaLabel}: ${errorMessage}`);
      }
    });
  }

  /**
   * Open camera directly for photo capture
   */
  recordVideo(fileInput: HTMLInputElement, itemId: number | string): void {
    if (!this.ensureCanModify(true)) return;
    this.openCamera(fileInput, itemId);
  }

  /**
   * Open camera directly for photo capture
   */
  openCamera(fileInput: HTMLInputElement, itemId: number | string): void {
    const accept = String(fileInput?.accept || '').toLowerCase();
    const isVideoInput = accept.includes('video/');

    if (isVideoInput) {
      fileInput.setAttribute('capture', 'environment');
      fileInput.setAttribute('data-capture-source', 'system');
      fileInput.click();
      return;
    }

    fileInput.setAttribute('capture', 'environment');
    fileInput.setAttribute('data-capture-source', 'system');
    fileInput.click();
  }

  /**
   * Open file picker for uploading existing photo
   */
  openFilePicker(fileInput: HTMLInputElement, itemId: number | string): void {
    // Preserve input-level attributes (including capture) and just open picker.
    const source = fileInput.hasAttribute('capture') ? 'system' : 'library';
    fileInput.setAttribute('data-capture-source', source);
    fileInput.click();
  }

  private getCaptureSourceFromInput(input: HTMLInputElement | null): 'in-app' | 'system' | 'library' {
    const raw = String(input?.getAttribute('data-capture-source') || '').trim().toLowerCase();
    if (raw === 'in-app' || raw === 'system' || raw === 'library') {
      return raw;
    }
    return input?.hasAttribute('capture') ? 'system' : 'library';
  }

  /**
   * Handle photo upload completion and auto-advance if enabled
   */
  private handlePhotoUploadComplete(itemId: number | string): void {
    // If auto-advance is enabled, move to next item
    if (this.autoAdvanceAfterPhoto) {
      setTimeout(() => {
        this.nextOpenItem();
      }, 500); // Small delay to show the uploaded photo
    }
  }

  /**
   * Update completion status when photos change
   */
  private updateCompletionStatus(progress: ChecklistItemProgress): void {
    const minPhotos = this.getMinPhotos(progress.item);
    progress.completed = progress.photos.length >= minPhotos;
    
    if (progress.completed && !progress.completedAt) {
      progress.completedAt = new Date();
    } else if (!progress.completed) {
      progress.completedAt = undefined;
    }
  }

  /**
   * Save progress silently without showing loading states
   */
  private saveProgressSilently(): void {
    if (!this.instanceId) return;
    
    const completedItems = this.itemProgress.filter(p => p.completed).length;
    const progress = Math.round((completedItems / this.itemProgress.length) * 100);
    
    const itemCompletionData = this.stateService.getCompletionDataForApi();
    
    localStorage.setItem(`checklist_${this.instanceId}_completion`, JSON.stringify(itemCompletionData));
    
    const updatedData = {
      status: progress === 100 ? 'completed' as ChecklistInstance['status'] : 'in_progress' as ChecklistInstance['status'],
      progress_percentage: progress,
      updated_at: new Date().toISOString(),
      item_completion: itemCompletionData
    };

    // Silent save - no loading states or notifications
    this.photoChecklistService.updateInstance(this.instanceId, updatedData).subscribe({
      next: () => {
        // Silent success
      },
      error: (error) => {
        console.error('Silent save failed:', error);
      }
    });
  }

  /**
   * Navigate to photo mode and go to specific item
   */
  navigateToPhotoMode(itemIndex: number): void {
    this.isReviewMode = false;
    const progress = this.itemProgress[itemIndex];
    if (!progress) {
      return;
    }

    // Use the flattened index so navigation works for sub-items too
    this.selectedItemIndex = itemIndex;

    const rootIndex = this.findRootParentIndex(itemIndex);
    const rootProgress = rootIndex >= 0 ? this.itemProgress[rootIndex] : progress;
    const step = this.getItemNumber(rootProgress);
    if (step > 0) {
      this.currentStep = step;
    }
    this.updateUrlWithCurrentStep();
  }

  /**
   * Update URL with current step for persistence
   */
  private updateUrlWithCurrentStep(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        id: this.instanceId,
        step: this.currentStep,
        item: this.selectedItemIndex !== null ? this.selectedItemIndex : null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  /**
   * Handle sample image loading errors
   */
  onSampleImageError(event: any): void {
    console.warn('Failed to load sample image:', event.target.src);
    event.target.style.display = 'none';
  }

  /**
   * Full checklist modal methods
   */
  openFullChecklistModal(): void {
    this.showFullChecklistModal = true;
  }

  closeFullChecklistModal(): void {
    this.showFullChecklistModal = false;
  }

  navigateToItemFromModal(index: number): void {
    this.closeFullChecklistModal();
    this.navigateToPhotoMode(index);
  }

  /**
   * Open work order information offcanvas
   */
  openWorkOrderInfo(content: any): void {
    this.offcanvasService.open(content, { 
      position: 'end',
      panelClass: 'work-order-offcanvas'
    });
  }

  /**
   * Open offcanvas to show all open checklists for current user
   */
  openUserChecklists(content: any): void {
    this.loadingChecklists = true;
    
    // Fetch all instances (no status filter to get everything)
    this.photoChecklistService.getInstances().subscribe({
      next: (instances) => {
        // Include all non-submitted checklists (yours + other operators), so you can edit/continue collaborative work.
        this.userOpenChecklists = instances.filter(inst => String(inst.status || '').toLowerCase() !== 'submitted');
        
        // Ensure current checklist is in the list (add it if not present)
        if (this.instance && !this.userOpenChecklists.find(inst => inst.id === this.instance!.id)) {
          this.userOpenChecklists.unshift(this.instance);
        }

        // Group by Work Order and sort newest -> oldest
        const dateMs = (d: any) => {
          const t = new Date(d || 0).getTime();
          return isNaN(t) ? 0 : t;
        };

        const groups = new Map<string, ChecklistInstance[]>();
        for (const inst of this.userOpenChecklists) {
          const wo = String(inst.work_order_number || '').trim() || 'No Work Order';
          const arr = groups.get(wo) || [];
          arr.push(inst);
          groups.set(wo, arr);
        }

        this.userOpenChecklistGroups = Array.from(groups.entries()).map(([workOrder, list]) => {
          const sorted = list.slice().sort((a, b) => dateMs(b.updated_at) - dateMs(a.updated_at));
          return {
            workOrder,
            instances: sorted,
            newestUpdatedAtMs: sorted.length ? dateMs(sorted[0].updated_at) : 0
          };
        }).sort((a, b) => b.newestUpdatedAtMs - a.newestUpdatedAtMs);

        this.userOpenChecklistTotalCount = this.userOpenChecklistGroups.reduce((sum, g) => sum + (g.instances?.length || 0), 0);
        
        this.loadingChecklists = false;
        this.cdr.detectChanges();

        // Scroll to currently viewing item
        setTimeout(() => this.scrollToCurrentOpenChecklist(), 0);
        setTimeout(() => this.scrollToCurrentOpenChecklist(), 150);
      },
      error: (error) => {
        console.error('Error loading user checklists:', error);
        // On error, at least show the current checklist
        if (this.instance) {
          this.userOpenChecklists = [this.instance];
          this.userOpenChecklistGroups = [{
            workOrder: String(this.instance.work_order_number || '').trim() || 'No Work Order',
            instances: [this.instance],
            newestUpdatedAtMs: new Date(this.instance.updated_at || 0).getTime() || 0
          }];
          this.userOpenChecklistTotalCount = 1;
        } else {
          this.userOpenChecklists = [];
          this.userOpenChecklistGroups = [];
          this.userOpenChecklistTotalCount = 0;
        }
        this.loadingChecklists = false;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToCurrentOpenChecklist(), 0);
      }
    });
    
    this.offcanvasService.open(content, { 
      position: 'end',
      panelClass: 'user-checklists-offcanvas',
      backdrop: true
    });
  }

  private scrollToCurrentOpenChecklist(): void {
    try {
      const el = document.getElementById('current-open-checklist');
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    } catch {
      // ignore
    }
  }

  /**
   * Open checklist navigation in an offcanvas (used for tablet/portrait layouts)
   */
  openNavigation(content: any): void {
    this.offcanvasService.open(content, {
      position: 'end',
      panelClass: 'navigation-offcanvas'
    });
  }

  /**
   * Open header actions menu (tablet-friendly)
   */
  openHeaderActions(content: any): void {
    this.offcanvasService.open(content, {
      position: 'end',
      panelClass: 'execution-actions-offcanvas'
    });
  }

  openSettings(content: any): void {
    this.offcanvasService.open(content, {
      position: 'end',
      panelClass: 'execution-settings-offcanvas'
    });
  }

  openTemplatePickerModal(): void {
    this.showTemplatePickerModal = true;
    this.loadingTemplates = true;
    this.availableTemplates = [];
    this.selectedTemplateId = null;
    this.selectedTemplatePreview = null;
    this.loadingTemplatePreview = false;
    this.startingTemplateId = null;

    // Start empty by default (user must confirm context)
    this.startFromTemplateWorkOrder = '';
    this.startFromTemplateSerialNumber = '';
    // Keep optional part number convenience
    this.startFromTemplatePartNumber = this.instance?.part_number || '';

    this.photoChecklistService.getTemplates().subscribe({
      next: (templates) => {
        this.availableTemplates = (templates || [])
          .filter(t => !!t?.is_active && !(t as any)?.is_draft && !!(t as any)?.published_at)
          .slice()
          .sort((a, b) =>
          String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' })
        );
        this.loadingTemplates = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.availableTemplates = [];
        this.loadingTemplates = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeTemplatePickerModal(): void {
    this.showTemplatePickerModal = false;
  }

  selectTemplateForPreview(template: ChecklistTemplate): void {
    if (!template?.id) return;
    if (this.selectedTemplateId === template.id && this.selectedTemplatePreview) return;

    this.selectedTemplateId = template.id;
    this.loadingTemplatePreview = true;
    this.selectedTemplatePreview = null;
    this.cdr.detectChanges();

    this.photoChecklistService.getTemplate(template.id).subscribe({
      next: (full) => {
        this.selectedTemplatePreview = full;
        this.loadingTemplatePreview = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading template preview:', error);
        this.selectedTemplatePreview = null;
        this.loadingTemplatePreview = false;
        this.cdr.detectChanges();
      }
    });
  }

  startSelectedTemplateInstance(): void {
    const templateId = this.selectedTemplateId;
    if (!templateId) {
      alert('Select a template first.');
      return;
    }

    const workOrder = (this.startFromTemplateWorkOrder || '').trim();
    const serialNumber = (this.startFromTemplateSerialNumber || '').trim();
    const partNumber = (this.startFromTemplatePartNumber || '').trim();

    if (!workOrder || !serialNumber) {
      alert('Work Order Number and Serial Number are required.');
      return;
    }

    this.startingTemplateId = templateId;
    this.cdr.detectChanges();

    this.photoChecklistService.createInstanceFromTemplate(
      templateId,
      workOrder,
      partNumber,
      serialNumber,
      { id: this.currentUserId || undefined, name: this.currentUserName }
    ).subscribe({
      next: (result) => {
        this.startingTemplateId = null;
        this.cdr.detectChanges();

        if (result?.success && result.instance_id) {
          this.closeTemplatePickerModal();
          this.switchToChecklist(result.instance_id);
        } else {
          alert('Failed to start checklist from template.');
        }
      },
      error: (error) => {
        console.error('Error starting checklist from template:', error);
        this.startingTemplateId = null;
        alert('Failed to start checklist from template.');
        this.cdr.detectChanges();
      }
    });
  }

  openActionFromOffcanvas(offcanvas: any, action: 'navigation' | 'myChecklists' | 'workOrderInfo' | 'fullView' | 'settings', content?: any): void {
    try {
      offcanvas?.dismiss();
    } catch {
      // ignore
    }

    setTimeout(() => {
      switch (action) {
        case 'navigation':
          this.openNavigation(content);
          break;
        case 'myChecklists':
          this.openUserChecklists(content);
          break;
        case 'workOrderInfo':
          this.openWorkOrderInfo(content);
          break;
        case 'fullView':
          this.openFullChecklistModal();
          break;
        case 'settings':
          this.openSettings(content);
          break;
      }
    }, 0);
  }

  /**
   * Navigate to a different checklist instance
   */
  switchToChecklist(instanceId: number): void {
    this.offcanvasService.dismiss();

    const isStandalone = this.router.url?.includes('/standalone/checklist/instance');
    const targetRoute = isStandalone ? '/standalone/checklist/instance' : '/quality/checklist/instance';
    
    // Navigate without step param so it auto-navigates to first incomplete item
    this.router.navigate([targetRoute], { 
      queryParams: { id: instanceId }
      // NOTE: No step param - this triggers auto-navigation to first incomplete item
    }).catch(err => {
      console.error('Navigation error:', err);
    });
  }

  /**
   * Get progress badge class for checklist item
   */
  getProgressBadgeClass(percentage: number): string {
    if (percentage >= 100) return 'bg-success';
    if (percentage >= 50) return 'bg-warning';
    return 'bg-secondary';
  }

  /**
   * Format value based on item type
   */
  formatValue(notes: string): string {
    return notes || '-';
  }

  formatLinkUrl(url: string | null | undefined): string {
    const value = (url || '').trim();
    if (!value) {
      return '';
    }
    if (/^https?:\/\//i.test(value)) {
      return value;
    }
    return `https://${value}`;
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(progress: ChecklistItemProgress): string {
    if (progress.completed) return 'bg-success';
    return 'bg-secondary';
  }

  /**
   * Get status text
   */
  getStatusText(progress: ChecklistItemProgress): string {
    if (progress.completed) return 'Completed';
    return 'Pending';
  }

  buildExecutionNavItems(): ChecklistNavItem[] {
    return this.itemProgress.map((progress, index) => {
      const item = progress.item as ChecklistItem;
      const sampleImages = Array.isArray(item.sample_images) ? item.sample_images : [];
      const sampleVideos = Array.isArray(item.sample_videos) ? item.sample_videos : [];
      const primaryImage = sampleImages.find(img => img.is_primary) ?? null;
      const primaryVideo = sampleVideos.find(vid => vid.is_primary ?? true) ?? null;
      const searchText = `${item.title || ''} ${item.description || ''}`.trim();
      const descendants = this.getDescendantProgress(index);
      const isParent = descendants.length > 0;
      const isRequired = (item as ChecklistItem).is_required !== false;
      const requiredDescendants = descendants.filter(child => (child.item as ChecklistItem).is_required !== false);
      const totalRequired = (isRequired ? 1 : 0) + requiredDescendants.length;
      const progressTotal = isParent && totalRequired > 0 ? totalRequired : undefined;
      const progressCompleted = isParent && totalRequired > 0
        ? (isRequired && progress.completed ? 1 : 0) + requiredDescendants.filter(child => child.completed).length
        : undefined;
      const progressPercent = progressTotal && progressTotal > 0 ? Math.round((progressCompleted || 0) / progressTotal * 100) : undefined;
      const latestPhotoUrl = progress.photos && progress.photos.length > 0 ? progress.photos[progress.photos.length - 1] : null;

      return {
        id: index,
        title: item.title || 'Untitled',
        level: item.level ?? 0,
        orderIndex: index,
        submissionType: (item as any).submission_type ?? 'photo',
        isRequired: !!(item as any).is_required,
        requiresPhoto: item.photo_requirements?.picture_required ?? false,
        hasPrimarySampleImage: !!item.sample_image_url || sampleImages.some(img => img.is_primary),
        hasSampleVideo: sampleVideos.length > 0,
        primaryImageUrl: item.sample_image_url || primaryImage?.url || null,
        sampleVideoUrl: primaryVideo?.url || null,
        isInvalid: false,
        searchText,
        isComplete: progress.completed,
        progressCompleted,
        progressTotal,
        progressPercent,
        photoCount: progress.photos?.length || 0,
        videoCount: progress.videos?.length || 0,
        isParent,
        latestPhotoUrl
      };
    });
  }

  getNavSummary(): { completed: number; total: number; percent: number } {
    const requiredItems = this.itemProgress.filter(item => (item.item as ChecklistItem).is_required !== false);
    const total = requiredItems.length;
    const completed = requiredItems.filter(item => item.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  }

  onNavUserPhotoRequested(event: { url: string }): void {
    if (event?.url) {
      this.previewImage(event.url);
    }
  }

  private getDescendantProgress(parentIndex: number): ChecklistItemProgress[] {
    const descendants: ChecklistItemProgress[] = [];
    const parentLevel = this.itemProgress[parentIndex]?.item.level ?? 0;

    for (let i = parentIndex + 1; i < this.itemProgress.length; i++) {
      const level = this.itemProgress[i]?.item.level ?? 0;
      if (level <= parentLevel) {
        break;
      }
      descendants.push(this.itemProgress[i]);
    }

    return descendants;
  }

  getActiveNavIndex(): number {
    if (this.selectedItemIndex !== null) {
      return this.selectedItemIndex;
    }

    let parentCount = 0;
    for (let i = 0; i < this.itemProgress.length; i++) {
      const level = this.itemProgress[i].item.level ?? 0;
      if (level === 0) {
        parentCount++;
        if (parentCount === this.currentStep) {
          return i;
        }
      }
    }
    return -1;
  }

  onExecutionNavSelected(event: { itemId: number; index: number }): void {
    if (this.isReviewMode) {
      return;
    }

    const progress = this.itemProgress[event.index];
    if (!progress) {
      return;
    }

    const level = progress.item.level ?? 0;
    this.startNavTransition();
    this.selectedItemIndex = event.index;
    if (level > 0) {
      const rootIndex = this.findRootParentIndex(event.index);
      const rootProgress = rootIndex >= 0 ? this.itemProgress[rootIndex] : this.resolveParentProgress(progress);
      const step = rootProgress ? this.getItemNumber(rootProgress) : 0;
      if (step > 0) {
        this.currentStep = step;
        this.updateUrlWithCurrentStep();
        this.cdr.detectChanges();
        setTimeout(() => this.updateInstructionsOverflowHints(), 0);
        setTimeout(() => this.updateInstructionsOverflowHints(), 250);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    this.currentStep = this.getItemNumber(progress);
    this.updateUrlWithCurrentStep();
    this.cdr.detectChanges();
    setTimeout(() => this.updateInstructionsOverflowHints(), 0);
    setTimeout(() => this.updateInstructionsOverflowHints(), 250);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private findRootParentIndex(startIndex: number): number {
    for (let i = startIndex; i >= 0; i--) {
      const level = this.itemProgress[i]?.item.level ?? 0;
      if (level === 0) {
        return i;
      }
    }
    return -1;
  }

  private applySelectionFromQuery(): boolean {
    if (this.pendingSelectedIndex === null || this.pendingSelectedIndex === undefined) {
      return false;
    }

    const selected = this.itemProgress[this.pendingSelectedIndex];
    if (!selected) {
      this.pendingSelectedIndex = null;
      return false;
    }

    this.selectedItemIndex = this.pendingSelectedIndex;
    this.pendingSelectedIndex = null;

    const rootIndex = this.findRootParentIndex(this.selectedItemIndex);
    const rootProgress = rootIndex >= 0 ? this.itemProgress[rootIndex] : this.resolveParentProgress(selected);
    const step = rootProgress ? this.getItemNumber(rootProgress) : 0;
    if (step > 0) {
      this.currentStep = step;
    }

    this.isNavTransitioning = false;

    return true;
  }

  private startNavTransition(): void {
    this.isNavTransitioning = true;
    if (this.navTransitionTimeout) {
      clearTimeout(this.navTransitionTimeout);
    }
    this.navTransitionTimeout = setTimeout(() => {
      this.isNavTransitioning = false;
      this.cdr.detectChanges();
    }, 200);
  }

  private resolveParentProgress(progress: ChecklistItemProgress): ChecklistItemProgress | null {
    if ((progress.item.level ?? 0) === 0) {
      return progress;
    }

    const parentId = progress.item.parent_id;
    if (parentId === undefined || parentId === null) {
      return null;
    }

    return this.itemProgress.find(p =>
      p.item.order_index === parentId ||
      (p.item as any).baseItemId === parentId ||
      p.item.id === parentId
    ) || null;
  }

  /**
   * Jump to a specific item in the checklist
   */
  jumpToItem(step: number, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    
    // Don't allow jumping in review mode
    if (this.isReviewMode) {
      return;
    }
    
    this.selectedItemIndex = null;
    this.currentStep = step;
    this.updateUrlWithCurrentStep();
    this.cdr.detectChanges();
    
    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Get item number for navigation (parent items only)
   */
  getItemNumber(progress: ChecklistItemProgress): number {
    let count = 0;
    for (const p of this.itemProgress) {
      if (!p.item.level || p.item.level === 0) {
        count++;
        if (p.item.id === progress.item.id) {
          return count;
        }
      }
    }
    return 0;
  }

  /**
   * Get child item number for navigation (e.g., "1.1", "1.2")
   */
  getChildItemNumber(progress: ChecklistItemProgress): string {
    if (!progress.item.parent_id) return '';
    
    // Find parent item
    const parentProgress = this.itemProgress.find(p => 
      p.item.order_index === progress.item.parent_id
    );
    
    if (!parentProgress) return '';
    
    const parentNum = this.getItemNumber(parentProgress);
    
    // Count child items before this one with same parent
    let childCount = 0;
    for (const p of this.itemProgress) {
      if (p.item.level === 1 && p.item.parent_id === progress.item.parent_id) {
        childCount++;
        if (p.item.id === progress.item.id) {
          return `${parentNum}.${childCount}`;
        }
      }
    }
    
    return '';
  }

  /**
   * Toggle navigation item expansion
   */
  toggleNavItem(itemId: number | string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (this.expandedNavItems.has(itemId)) {
      this.expandedNavItems.delete(itemId);
    } else {
      this.expandedNavItems.add(itemId);
    }
  }

  /**
   * Check if navigation item is expanded
   */
  isNavItemExpanded(itemId: number | string): boolean {
    return this.expandedNavItems.has(itemId);
  }

  /**
   * Get child items for a parent in navigation
   */
  getNavChildItems(parentProgress: ChecklistItemProgress): ChecklistItemProgress[] {
    const parentOrderIndex = parentProgress.item.order_index;
    return this.itemProgress.filter(p => 
      p.item.level === 1 && p.item.parent_id === parentOrderIndex
    );
  }

  /**
   * Check if item has children
   */
  hasNavChildren(progress: ChecklistItemProgress): boolean {
    return this.getNavChildItems(progress).length > 0;
  }

  /**
   * Check if navigation item should be visible (handles parent expansion)
   */
  isNavItemVisible(itemIndex: number): boolean {
    const progress = this.itemProgress[itemIndex];
    if (!progress) return false;

    const level = progress.item.level || 0;

    // Root items (level 0) are always visible
    if (level === 0) return true;

    // Find parent item and check if it's expanded
    for (let i = itemIndex - 1; i >= 0; i--) {
      const potentialParent = this.itemProgress[i];
      const parentLevel = potentialParent?.item.level || 0;

      // Found the direct parent (level is 1 less)
      if (parentLevel === level - 1) {
        return this.isNavItemExpanded(potentialParent.item.id) && this.isNavItemVisible(i);
      }
    }

    return false;
  }
}