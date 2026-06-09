import { CommonModule } from "@angular/common";
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommentsService } from "@app/core/api/comments/comments.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { UserService } from "@app/core/api/field-service/user.service";
import { NgbDropdownModule } from "@ng-bootstrap/ng-bootstrap";
import { Lightbox } from "ngx-lightbox";
import { QuillModule, QuillModules } from "ngx-quill";
import "quill-mention";
import { stripHtml } from "src/assets/js/util";

// Additional imports for drag-to-scroll functionality
@Component({
  selector: "app-comment-offcanvas",
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule, NgbDropdownModule],
  template: `
    <div
      class="comment-offcanvas"
      [class.open]="isOpen"
      [class.resizing]="isResizing"
      [style.width.px]="panelWidth"
      aria-label="Comments panel"
    >
      <div
        class="offcanvas-resize-handle"
        (pointerdown)="onResizeHandlePointerDown($event)"
        aria-hidden="true"
      ></div>

      <div class="comment-offcanvas-header">
        <div>
          <h5 class="mb-0">{{ title }}</h5>
          <small class="text-muted" *ngIf="orderNum">SO Line: {{ orderNum }}</small>
        </div>

        <div class="d-flex align-items-center gap-2">
          <div ngbDropdown>
            <button class="btn btn-sm btn-outline-secondary" ngbDropdownToggle type="button" title="Comment view settings">
              <i class="mdi mdi-cog-outline"></i>
            </button>
            <div ngbDropdownMenu>
              <h6 class="dropdown-header">Comment View</h6>
              <button ngbDropdownItem type="button" (click)="onSelectCommentViewMode('offcanvas')">
                <i class="mdi mdi-dock-right me-2"></i>
                Offcanvas
                <span class="ms-2 text-success" *ngIf="commentViewMode === 'offcanvas'">Active</span>
              </button>
              <button ngbDropdownItem type="button" (click)="onSelectCommentViewMode('modal')">
                <i class="mdi mdi-window-maximize me-2"></i>
                Modal
                <span class="ms-2 text-success" *ngIf="commentViewMode === 'modal'">Active</span>
              </button>
            </div>
          </div>

          <button type="button" class="btn-close" aria-label="Close" (click)="close()"></button>
        </div>
      </div>

      <div class="comment-offcanvas-body">
        <div class="comment-thread" #commentThread (scroll)="onThreadScroll()">
          <div *ngIf="loading" class="text-center text-muted py-3">Loading comments...</div>

          <div *ngIf="!loading && comments.length === 0" class="text-muted small">No comments yet.</div>

          <div class="comment-list" *ngIf="!loading && comments.length > 0" (click)="onCommentMediaClick($event)">
            <div class="comment-item" *ngFor="let c of comments">
              <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
                <strong>{{ c.userName || c.created_by_name || 'User' }}</strong>
                <small class="text-muted">{{ c.createdDate | date:'short' }}</small>
              </div>
              <div class="comment-text" [innerHTML]="c.comments"></div>
            </div>
          </div>
        </div>

        <div class="comment-composer">
          <label class="form-label mb-2">Add Comment</label>
          <quill-editor
            [(ngModel)]="newComment"
            [modules]="quillConfig"
            placeholder="Enter comments here.."
            class="comment-editor"
            (onEditorCreated)="onComposerEditorCreated($event)"
          ></quill-editor>

          <div class="d-flex justify-content-end">
            <button class="btn btn-primary btn-sm" [disabled]="saving || isEditorContentEmpty()" (click)="save()">
              {{ saving ? 'Saving...' : 'Save Comment' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="media-preview-backdrop" *ngIf="isVideoPreviewOpen" (click)="closeVideoPreview()">
      <div class="media-preview-dialog" role="dialog" aria-modal="true" aria-label="Video preview" (click)="$event.stopPropagation()">
        <div class="media-preview-header">
          <h6 class="mb-0">Video Preview</h6>
          <button type="button" class="btn-close" aria-label="Close" (click)="closeVideoPreview()"></button>
        </div>

        <div class="media-preview-body">
          <video
            *ngIf="currentVideoPreviewSrc"
            class="media-preview-video"
            [src]="currentVideoPreviewSrc"
            controls
            autoplay
          ></video>
        </div>

        <div class="media-preview-footer" *ngIf="videoPreviewItems.length > 1">
          <button type="button" class="btn btn-outline-secondary btn-sm" (click)="showPreviousVideo()">Previous</button>
          <small class="text-muted">{{ videoPreviewIndex + 1 }} / {{ videoPreviewItems.length }}</small>
          <button type="button" class="btn btn-outline-secondary btn-sm" (click)="showNextVideo()">Next</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .comment-offcanvas {
      position: fixed;
      top: 0;
      right: 0;
      width: 420px;
      max-width: 100vw;
      height: 100vh;
      background: var(--bs-body-bg, #fff);
      color: var(--bs-body-color, #212529);
      border-left: 1px solid var(--bs-border-color, #dee2e6);
      box-shadow: -8px 0 24px rgba(0, 0, 0, 0.15);
      z-index: 1060;
      transition: transform 0.25s ease;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
    }

    .comment-offcanvas.open {
      transform: translateX(0);
    }

    .comment-offcanvas.resizing {
      transition: none;
      user-select: none;
    }

    .offcanvas-resize-handle {
      position: absolute;
      left: 0;
      top: 0;
      width: 12px;
      height: 100%;
      transform: translateX(-50%);
      cursor: ew-resize;
      z-index: 2;
      touch-action: none;
    }

    .offcanvas-resize-handle::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 0;
      width: 2px;
      height: 100%;
      transform: translateX(-50%);
      background: transparent;
      transition: background-color 0.2s ease;
    }

    .comment-offcanvas:hover .offcanvas-resize-handle::before,
    .comment-offcanvas.resizing .offcanvas-resize-handle::before {
      background: var(--bs-border-color, #dee2e6);
    }

    .comment-offcanvas-header {
      padding: 0.9rem 1rem;
      border-bottom: 1px solid var(--bs-border-color, #dee2e6);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .comment-offcanvas-body {
      padding: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .comment-thread {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 1rem;
      -webkit-overflow-scrolling: touch;
    }

    .comment-composer {
      position: sticky;
      bottom: 0;
      border-top: 1px solid var(--bs-border-color, #dee2e6);
      background: var(--bs-body-bg, #fff);
      padding: 0.85rem 1rem 1rem;
    }

    .comment-editor {
      display: block;
      margin-bottom: 0.5rem;
      max-width: 100%;
      overflow: hidden;
      min-width: 0;
    }

    :host ::ng-deep .comment-editor .ql-toolbar.ql-snow {
      display: block;
      overflow-x: scroll;
      overflow-y: hidden;
      white-space: nowrap;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
      touch-action: pan-x;
      overscroll-behavior-x: contain;
      cursor: grab;
    }

    :host ::ng-deep .comment-editor .ql-toolbar.ql-snow.is-dragging-toolbar {
      cursor: grabbing;
      user-select: none;
    }

    :host ::ng-deep .comment-editor .ql-toolbar.ql-snow.is-dragging-toolbar * {
      pointer-events: none;
    }

    :host ::ng-deep .comment-editor .ql-toolbar .ql-formats {
      float: none !important;
      display: inline-block;
      white-space: nowrap;
      margin-right: 0.25rem;
    }

    :host ::ng-deep .comment-editor .ql-toolbar .ql-picker {
      display: inline-block;
      vertical-align: middle;
    }

    :host ::ng-deep .comment-editor .ql-container {
      min-height: 140px;
      max-height: 220px;
      overflow-y: auto;
    }

    .comment-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .comment-item {
      border: 1px solid var(--bs-border-color, #dee2e6);
      border-radius: 0.5rem;
      padding: 0.6rem 0.7rem;
      background: var(--bs-tertiary-bg, #f8f9fa);
    }

    .comment-text {
      font-size: 0.9rem;
      word-break: break-word;
      overflow-wrap: anywhere;
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    :host ::ng-deep .comment-text img,
    :host ::ng-deep .comment-text video,
    :host ::ng-deep .comment-text iframe,
    :host ::ng-deep .comment-text canvas,
    :host ::ng-deep .comment-text svg {
      max-width: 100% !important;
      height: auto !important;
      display: block;
    }

    :host ::ng-deep .comment-text img {
      cursor: zoom-in;
    }

    :host ::ng-deep .comment-text video {
      cursor: pointer;
    }

    :host ::ng-deep .comment-text table {
      display: block;
      max-width: 100%;
      width: max-content;
      overflow-x: auto;
      border-collapse: collapse;
    }

    :host ::ng-deep .comment-text pre,
    :host ::ng-deep .comment-text code {
      max-width: 100%;
      white-space: pre-wrap;
      word-break: break-word;
    }

    @media (max-width: 991.98px) {
      .comment-offcanvas {
        width: 100vw !important;
      }

      .offcanvas-resize-handle {
        display: none;
      }
    }

    .media-preview-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      z-index: 1080;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .media-preview-dialog {
      width: min(900px, 100%);
      max-height: 90vh;
      background: var(--bs-body-bg, #fff);
      color: var(--bs-body-color, #212529);
      border: 1px solid var(--bs-border-color, #dee2e6);
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .media-preview-header,
    .media-preview-footer {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--bs-border-color, #dee2e6);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .media-preview-footer {
      border-bottom: 0;
      border-top: 1px solid var(--bs-border-color, #dee2e6);
    }

    .media-preview-body {
      padding: 0.75rem;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bs-tertiary-bg, #f8f9fa);
    }

    .media-preview-video {
      max-width: 100%;
      max-height: calc(90vh - 160px);
      width: 100%;
      border-radius: 0.5rem;
      background: #000;
    }
  `],
})
export class CommentOffcanvasComponent implements OnChanges, OnDestroy {
  private static readonly PANEL_WIDTH_STORAGE_KEY = "shipping.commentOffcanvas.width";

  @Input() isOpen = false;
  @Input() orderNum: string | null = null;
  @Input() type = "Sales Order";
  @Input() title = "Comments";
  @Input() commentViewMode: "offcanvas" | "modal" = "offcanvas";

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();
  @Output() panelWidthChange = new EventEmitter<number>();
  @Output() commentViewModeChange = new EventEmitter<"offcanvas" | "modal">();

  comments: any[] = [];
  @ViewChild("commentThread") private commentThread?: ElementRef<HTMLDivElement>;
  private readonly mentionedRecipients = new Set<string>();

  loading = false;
  saving = false;
  newComment = "";
  quillConfig: QuillModules = {};
  listUsers: any[] = [];
  isVideoPreviewOpen = false;
  videoPreviewItems: string[] = [];
  videoPreviewIndex = 0;
  private toolbarCleanup: Array<() => void> = [];
  private resizeCleanup: Array<() => void> = [];
  panelWidth = 420;
  isResizing = false;

  constructor(
    private commentsService: CommentsService,
    private authenticationService: AuthenticationService,
    private userService: UserService,
    private lightbox: Lightbox
  ) {
    this.restorePanelWidth();

    this.quillConfig = {
      toolbar: {
        container: [
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ indent: "-1" }, { indent: "+1" }],
          [{ header: [1, 2, 3, false] }],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          ["link", "image", "video"],
        ],
      },
      mention: {
        minChars: 0,
        positioningStrategy: "fixed",
        defaultMenuOrientation: "bottom",
        allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
        mentionDenotationChars: ["@"],
        source: async (searchTerm: string, renderList: (matches: any[]) => void) => {
          const matchedPeople = this.suggestPeople(searchTerm);
          renderList(matchedPeople);
        },
        onSelect: (item: any, insertItem: (entry: any) => void) => {
          insertItem(item);
          const recipientEmail = String(item?.id || "").trim();
          if (recipientEmail) {
            this.mentionedRecipients.add(recipientEmail);
          }
        },
      },
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    const becameOpen = !!changes["isOpen"]?.currentValue;
    const orderChanged = !!changes["orderNum"];

    if (this.isOpen && this.orderNum && (becameOpen || orderChanged)) {
      this.panelWidth = this.clampPanelWidth(this.panelWidth);
      this.panelWidthChange.emit(this.panelWidth);
      this.ensureUsersLoaded();
      this.loadComments({ forceScrollToBottom: true });
    }
  }

  async loadComments(options?: { forceScrollToBottom?: boolean }): Promise<void> {
    if (!this.orderNum) {
      this.comments = [];
      return;
    }

    const forceScrollToBottom = !!options?.forceScrollToBottom;
    const shouldKeepBottom = this.isThreadNearBottom();

    this.loading = true;
    try {
      const results = await this.commentsService.find({
        orderNum: this.orderNum,
        type: this.type,
        active: 1,
      });
      this.comments = Array.isArray(results) ? results : [];
    } catch {
      this.comments = [];
    } finally {
      this.loading = false;
      if (forceScrollToBottom || shouldKeepBottom) {
        this.queueScrollToBottom();
      }
    }
  }

  async save(): Promise<void> {
    const text = this.newComment;
    if (this.isEditorContentEmpty() || !this.orderNum) {
      return;
    }

    const userInfo = this.authenticationService.currentUserValue;
    const now = new Date();
    this.saving = true;
    const mentionEmails = this.extractMentionEmails(text || "");
    const em = Array.from(new Set([...(this.extractEmails(text || "") || []), ...mentionEmails, ...this.mentionedRecipients]));

    const payload = {
      insert: 1,
      locationPath: window.location.href.split("?")[0],
      pageName: location.pathname,
      comments: text,
      emailToSendFromMention: em,
      emailCallBackUrl: `${window.location.href.split("?")[0]}?comment=${this.orderNum}`,
      created_by_name: userInfo?.full_name,
      createdDate: now,
      comments_html: stripHtml(text),
      type: this.type,
      orderNum: this.orderNum,
      userId: userInfo?.id,
      userName: userInfo?.full_name,
      pid: null,
    };

    try {
      await this.commentsService.createComment(payload);
      this.newComment = "";
      this.mentionedRecipients.clear();
      this.saved.emit({
        ...payload,
        bg_class_name: "bg-success",
        color_class_name: "text-success",
      });
      await this.loadComments({ forceScrollToBottom: true });
    } finally {
      this.saving = false;
    }
  }

  close(): void {
    this.closed.emit();
  }

  get currentVideoPreviewSrc(): string | null {
    return this.videoPreviewItems[this.videoPreviewIndex] || null;
  }

  onCommentMediaClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const clickedImage = target.closest("img") as HTMLImageElement | null;
    const clickedVideo = target.closest("video") as HTMLVideoElement | null;

    if (!clickedImage && !clickedVideo) {
      return;
    }

    const commentItem = (clickedImage || clickedVideo)?.closest(".comment-item");
    if (!commentItem) {
      return;
    }

    if (clickedImage) {
      const images = Array.from(commentItem.querySelectorAll(".comment-text img"))
        .map((img) => img.getAttribute("src") || "")
        .filter((src) => !!src);

      if (!images.length) {
        return;
      }

      const clickedSrc = clickedImage.getAttribute("src") || "";
      const startIndex = Math.max(0, images.indexOf(clickedSrc));
      const album = images.map((src) => ({ src, thumb: src }));
      event.preventDefault();
      event.stopPropagation();
      this.lightbox.open(album, startIndex, {});
      return;
    }

    if (!clickedVideo) {
      return;
    }

    const videos = Array.from(commentItem.querySelectorAll(".comment-text video"))
      .map((video) => video as HTMLVideoElement)
      .map((video) => this.extractVideoSource(video))
      .filter((src): src is string => !!src);

    if (!videos.length) {
      return;
    }

    const clickedSrc = this.extractVideoSource(clickedVideo) || "";
    const startIndex = Math.max(0, videos.indexOf(clickedSrc));

    event.preventDefault();
    event.stopPropagation();
    this.videoPreviewItems = videos;
    this.videoPreviewIndex = startIndex;
    this.isVideoPreviewOpen = true;
  }

  closeVideoPreview(): void {
    this.isVideoPreviewOpen = false;
    this.videoPreviewItems = [];
    this.videoPreviewIndex = 0;
  }

  showPreviousVideo(): void {
    if (!this.videoPreviewItems.length) {
      return;
    }
    this.videoPreviewIndex = (this.videoPreviewIndex - 1 + this.videoPreviewItems.length) % this.videoPreviewItems.length;
  }

  showNextVideo(): void {
    if (!this.videoPreviewItems.length) {
      return;
    }
    this.videoPreviewIndex = (this.videoPreviewIndex + 1) % this.videoPreviewItems.length;
  }

  private extractVideoSource(video: HTMLVideoElement): string | null {
    const directSrc = video.getAttribute("src") || video.currentSrc;
    if (directSrc) {
      return directSrc;
    }

    const firstSource = video.querySelector("source");
    return firstSource?.getAttribute("src") || null;
  }

  private queueScrollToBottom(): void {
    setTimeout(() => this.scrollThreadToBottom(), 0);
  }

  onThreadScroll(): void {
    // Intentionally no-op for now; near-bottom is measured just before refresh.
  }

  onSelectCommentViewMode(mode: "offcanvas" | "modal"): void {
    if (mode === this.commentViewMode) {
      return;
    }

    this.commentViewModeChange.emit(mode);
  }

  ngOnDestroy(): void {
    this.cleanupToolbarHandlers();
    this.cleanupResizeHandlers();
  }

  onComposerEditorCreated(editor: any): void {
    const toolbar = editor?.getModule?.("toolbar")?.container as HTMLElement | undefined;
    if (!toolbar) {
      return;
    }

    this.enableToolbarDragScroll(toolbar);
  }

  onResizeHandlePointerDown(event: PointerEvent): void {
    if (!this.isOpen || event.button !== 0 || window.innerWidth <= 991) {
      return;
    }

    event.preventDefault();

    const startX = event.clientX;
    const startWidth = this.panelWidth;
    this.isResizing = true;

    const onPointerMove = (moveEvent: PointerEvent): void => {
      const deltaX = moveEvent.clientX - startX;
      const targetWidth = startWidth - deltaX;
      this.panelWidth = this.clampPanelWidth(targetWidth);
      this.persistPanelWidth(this.panelWidth);
      this.panelWidthChange.emit(this.panelWidth);
    };

    const stopResize = (): void => {
      this.isResizing = false;
      this.cleanupResizeHandlers();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize, { once: true });
    window.addEventListener("pointercancel", stopResize, { once: true });

    this.resizeCleanup.push(() => window.removeEventListener("pointermove", onPointerMove));
    this.resizeCleanup.push(() => window.removeEventListener("pointerup", stopResize));
    this.resizeCleanup.push(() => window.removeEventListener("pointercancel", stopResize));
  }

  private enableToolbarDragScroll(toolbar: HTMLElement): void {
    this.cleanupToolbarHandlers();

    let isDragging = false;
    let hasDragged = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onMouseDown = (event: MouseEvent): void => {
      if (event.button !== 0) {
        return;
      }
      isDragging = true;
      hasDragged = false;
      startX = event.clientX;
      startScrollLeft = toolbar.scrollLeft;
      toolbar.classList.add("is-dragging-toolbar");
    };

    const onMouseMove = (event: MouseEvent): void => {
      if (!isDragging) {
        return;
      }
      const deltaX = event.clientX - startX;
      if (Math.abs(deltaX) > 2) {
        hasDragged = true;
      }
      toolbar.scrollLeft = startScrollLeft - deltaX;
      event.preventDefault();
    };

    const stopDragging = (): void => {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      toolbar.classList.remove("is-dragging-toolbar");
    };

    const onWheel = (event: WheelEvent): void => {
      const canScrollHorizontally = toolbar.scrollWidth > toolbar.clientWidth;
      if (!canScrollHorizontally) {
        return;
      }

      const horizontalDelta = Math.abs(event.deltaX) > 0 ? event.deltaX : event.deltaY;
      if (horizontalDelta === 0) {
        return;
      }

      toolbar.scrollLeft += horizontalDelta;
      event.preventDefault();
    };

    const onClickCapture = (event: MouseEvent): void => {
      if (!hasDragged) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      hasDragged = false;
    };

    toolbar.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopDragging);
    toolbar.addEventListener("mouseleave", stopDragging);
    toolbar.addEventListener("wheel", onWheel, { passive: false });
    toolbar.addEventListener("click", onClickCapture, true);

    this.toolbarCleanup.push(() => toolbar.removeEventListener("mousedown", onMouseDown));
    this.toolbarCleanup.push(() => window.removeEventListener("mousemove", onMouseMove));
    this.toolbarCleanup.push(() => window.removeEventListener("mouseup", stopDragging));
    this.toolbarCleanup.push(() => toolbar.removeEventListener("mouseleave", stopDragging));
    this.toolbarCleanup.push(() => toolbar.removeEventListener("wheel", onWheel));
    this.toolbarCleanup.push(() => toolbar.removeEventListener("click", onClickCapture, true));
  }

  private cleanupToolbarHandlers(): void {
    for (const dispose of this.toolbarCleanup) {
      dispose();
    }
    this.toolbarCleanup = [];
  }

  private clampPanelWidth(value: number): number {
    const minWidth = 360;
    const maxWidth = Math.max(minWidth, Math.min(920, window.innerWidth - 24));
    return Math.min(maxWidth, Math.max(minWidth, Math.round(value)));
  }

  private restorePanelWidth(): void {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(CommentOffcanvasComponent.PANEL_WIDTH_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return;
    }

    this.panelWidth = this.clampPanelWidth(parsed);
  }

  private persistPanelWidth(width: number): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CommentOffcanvasComponent.PANEL_WIDTH_STORAGE_KEY, String(Math.round(width)));
  }

  private cleanupResizeHandlers(): void {
    for (const dispose of this.resizeCleanup) {
      dispose();
    }
    this.resizeCleanup = [];
  }

  private isThreadNearBottom(thresholdPx = 96): boolean {
    const thread = this.commentThread?.nativeElement;
    if (!thread) {
      return true;
    }

    const distanceToBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    return distanceToBottom <= thresholdPx;
  }

  private scrollThreadToBottom(): void {
    const thread = this.commentThread?.nativeElement;
    if (!thread) {
      return;
    }
    thread.scrollTop = thread.scrollHeight;
  }

  private async ensureUsersLoaded(): Promise<void> {
    if (this.listUsers.length > 0) {
      return;
    }

    try {
      const users = await this.userService.find({
        active: 1,
        access: 1,
        openPosition: 0,
        orgChartPlaceHolder: 0,
      });

      this.listUsers = (users || []).map((u: any) => ({
        ...u,
        value: `${u.first || ""} ${u.last || ""}`.trim(),
        id: u.email,
      }));
    } catch {
      this.listUsers = [];
    }
  }

  private suggestPeople(searchTerm: string): any[] {
    const q = String(searchTerm || "").toLowerCase();
    return this.listUsers.filter((person) => person?.value?.toLowerCase()?.includes(q));
  }

  private extractEmails(text: string): string[] {
    return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi) || [];
  }

  private extractMentionEmails(html: string): string[] {
    if (!html) {
      return [];
    }

    const container = document.createElement("div");
    container.innerHTML = html;
    return Array.from(container.querySelectorAll(".mention[data-id]"))
      .map((node) => node.getAttribute("data-id")?.trim() || "")
      .filter(Boolean);
  }

  isEditorContentEmpty(): boolean {
    const plain = stripHtml(this.newComment || "").replace(/\s|&nbsp;/g, "");
    return !plain;
  }
}
