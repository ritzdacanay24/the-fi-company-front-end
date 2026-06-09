import { CommonModule } from "@angular/common";
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommentsService } from "@app/core/api/comments/comments.service";
import { AuthenticationService } from "@app/core/services/auth.service";
import { UserService } from "@app/core/api/field-service/user.service";
import { NgbDropdownModule } from "@ng-bootstrap/ng-bootstrap";
import { Lightbox } from "ngx-lightbox";
import { QuillModule, QuillModules } from "ngx-quill";
import { firstValueFrom } from "rxjs";
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
          <div class="d-flex align-items-center gap-2 mt-1" *ngIf="draftBadgeLabel">
            <span class="badge draft-badge" [ngClass]="draftBadgeClass">{{ draftBadgeLabel }}</span>
            <small class="draft-status" *ngIf="draftStatusAt">{{ draftStatusAt | date:'shortTime' }}</small>
          </div>
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
                <div class="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                  <img
                    class="comment-avatar"
                    [src]="getCommentUserImage(c)"
                    alt="User avatar"
                    (error)="onCommentAvatarError($event)"
                  />
                  <strong class="comment-author">{{ c.userName || c.created_by_name || 'User' }}</strong>
                </div>
                <div class="d-flex align-items-center gap-2">
                  <span class="badge private-badge" *ngIf="isPrivateCommentRow(c)">Private</span>
                  <small class="text-muted">{{ c.createdDate | date:'short' }}</small>
                  <button
                    *ngIf="currentUserId && +c.userId === currentUserId"
                    type="button"
                    class="btn-delete-comment"
                    title="Delete comment"
                    (click)="deleteComment(c, $event)"
                  >
                    <i class="mdi mdi-trash-can-outline"></i>
                  </button>
                </div>
              </div>
              <div class="comment-text" [innerHTML]="c.comments"></div>
            </div>
          </div>
        </div>

        <div class="comment-composer">
          <div class="draft-inline-banner" *ngIf="showDiscardDraftAction">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span class="badge draft-badge" [ngClass]="draftBadgeClass || 'badge-restored'">
                {{ draftBadgeLabel || 'Draft in progress' }}
              </span>
              <small class="draft-status" *ngIf="draftStatusAt">{{ draftStatusAt | date:'shortTime' }}</small>
            </div>

            <button
              type="button"
              class="btn btn-link btn-sm p-0 text-decoration-none"
              [disabled]="saving || loading"
              (click)="discardDraft()"
            >
              Discard draft
            </button>
          </div>

          <label class="form-label mb-2">Add Comment</label>
          <quill-editor
            [(ngModel)]="newComment"
            (ngModelChange)="onDraftInputChanged()"
            [modules]="quillConfig"
            placeholder="Enter comments here.."
            class="comment-editor"
            (onEditorCreated)="onComposerEditorCreated($event)"
          ></quill-editor>

          <div class="form-check mb-2">
            <input
              id="offcanvas-private-comment"
              type="checkbox"
              class="form-check-input"
              [(ngModel)]="isPrivateComment"
            />
            <label class="form-check-label" for="offcanvas-private-comment">
              Private message (only you can see this)
            </label>
          </div>

          <div class="d-flex justify-content-end">
            <button class="btn btn-primary btn-sm" [disabled]="saving || isEditorContentEmpty()" (click)="save()">
              {{ saving ? 'Saving...' : 'Save Comment' }}
            </button>
          </div>
        </div>
      </div>

      <div class="draft-toast" *ngIf="showDraftToast">{{ draftToastText }}</div>
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
      --comment-panel-bg: var(--bs-body-bg, #fff);
      --comment-panel-text: var(--bs-body-color, #212529);
      --comment-panel-border: var(--bs-border-color, #dee2e6);
      --comment-panel-muted: var(--bs-secondary-color, #6c757d);
      --comment-card-bg: var(--bs-tertiary-bg, #f8f9fa);
      --comment-toolbar-bg: var(--bs-body-bg, #fff);
      --comment-editor-bg: var(--bs-body-bg, #fff);

      position: fixed;
      top: 0;
      right: 0;
      width: 420px;
      max-width: 100vw;
      height: 100vh;
      background: var(--comment-panel-bg);
      color: var(--comment-panel-text);
      border-left: 1px solid var(--comment-panel-border);
      box-shadow: -8px 0 24px rgba(0, 0, 0, 0.15);
      z-index: 1045;
      transition: transform 0.25s ease;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
    }

    :host-context([data-bs-theme="dark"]) .comment-offcanvas,
    :host-context(.theme-dark) .comment-offcanvas {
      --comment-panel-bg: #1f2633;
      --comment-panel-text: #e9edf5;
      --comment-panel-border: #394458;
      --comment-panel-muted: #aeb8c9;
      --comment-card-bg: #273043;
      --comment-toolbar-bg: #222a3a;
      --comment-editor-bg: #1f2633;
    }

    :host-context([data-bs-theme="light"]) .comment-offcanvas,
    :host-context(.theme-light) .comment-offcanvas {
      --comment-panel-bg: var(--bs-body-bg, #fff);
      --comment-panel-text: var(--bs-body-color, #212529);
      --comment-panel-border: var(--bs-border-color, #dee2e6);
      --comment-panel-muted: var(--bs-secondary-color, #6c757d);
      --comment-card-bg: var(--bs-tertiary-bg, #f8f9fa);
      --comment-toolbar-bg: var(--bs-body-bg, #fff);
      --comment-editor-bg: var(--bs-body-bg, #fff);
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
      border-bottom: 1px solid var(--comment-panel-border);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .comment-offcanvas-header .text-muted {
      color: var(--comment-panel-muted) !important;
    }

    .draft-status {
      font-size: 0.75rem;
      line-height: 1.2;
      color: var(--comment-panel-muted);
    }

    .draft-badge {
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    .draft-badge.badge-dirty {
      background: var(--bs-warning-bg-subtle, #fff3cd);
      color: var(--bs-warning-text-emphasis, #664d03);
      border: 1px solid var(--bs-warning-border-subtle, #ffecb5);
    }

    .draft-badge.badge-saving {
      background: var(--bs-info-bg-subtle, #cff4fc);
      color: var(--bs-info-text-emphasis, #055160);
      border: 1px solid var(--bs-info-border-subtle, #b6effb);
    }

    .draft-badge.badge-saved,
    .draft-badge.badge-restored {
      background: var(--bs-success-bg-subtle, #d1e7dd);
      color: var(--bs-success-text-emphasis, #0f5132);
      border: 1px solid var(--bs-success-border-subtle, #badbcc);
    }

    .draft-toast {
      position: absolute;
      right: 0.85rem;
      bottom: 0.85rem;
      z-index: 2;
      background: var(--bs-success-bg-subtle, #d1e7dd);
      color: var(--bs-success-text-emphasis, #0f5132);
      border: 1px solid var(--bs-success-border-subtle, #badbcc);
      border-radius: 0.45rem;
      padding: 0.35rem 0.55rem;
      font-size: 0.78rem;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
    }

    .private-badge {
      background: var(--bs-warning-bg-subtle, #fff3cd);
      color: var(--bs-warning-text-emphasis, #664d03);
      border: 1px solid var(--bs-warning-border-subtle, #ffecb5);
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.01em;
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
      border-top: 1px solid var(--comment-panel-border);
      background: var(--comment-panel-bg);
      padding: 0.85rem 1rem 1rem;
    }

    .draft-inline-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.45rem;
      padding: 0.4rem 0.55rem;
      border: 1px solid var(--comment-panel-border);
      border-radius: 0.45rem;
      background: var(--comment-card-bg);
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
      border-color: var(--comment-panel-border);
      background: var(--comment-toolbar-bg);
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

    :host ::ng-deep .comment-editor .ql-toolbar.ql-snow .ql-stroke {
      stroke: var(--comment-panel-text);
    }

    :host ::ng-deep .comment-editor .ql-toolbar.ql-snow .ql-fill {
      fill: var(--comment-panel-text);
    }

    :host ::ng-deep .comment-editor .ql-toolbar.ql-snow .ql-picker,
    :host ::ng-deep .comment-editor .ql-toolbar.ql-snow .ql-picker-label,
    :host ::ng-deep .comment-editor .ql-toolbar.ql-snow button {
      color: var(--comment-panel-text);
    }

    :host ::ng-deep .comment-editor .ql-container {
      border-color: var(--comment-panel-border);
      background: var(--comment-editor-bg);
      min-height: 140px;
      height: 180px;
      max-height: 220px;
      overflow: hidden;
    }

    :host ::ng-deep .comment-editor .ql-editor {
      color: var(--comment-panel-text);
      height: 100%;
      max-height: 100%;
      overflow-y: auto;
      box-sizing: border-box;
      white-space: pre-wrap;
      word-break: break-word;
    }

    :host ::ng-deep .comment-editor .ql-editor.ql-blank::before {
      color: var(--comment-panel-muted);
      font-style: italic;
    }

    .comment-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .comment-item {
      border: 1px solid var(--comment-panel-border);
      border-radius: 0.5rem;
      padding: 0.6rem 0.7rem;
      background: var(--comment-card-bg);
      position: relative;
    }

    .btn-delete-comment {
      display: none;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      padding: 0.1rem 0.25rem;
      cursor: pointer;
      color: var(--bs-danger, #dc3545);
      opacity: 0.7;
      line-height: 1;
      border-radius: 0.3rem;
      transition: opacity 0.15s ease;
    }

    .btn-delete-comment:hover {
      opacity: 1;
      background: var(--bs-danger-bg-subtle, #f8d7da);
    }

    .comment-item:hover .btn-delete-comment {
      display: inline-flex;
    }

    .comment-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid var(--comment-panel-border);
      flex: 0 0 auto;
      background: var(--comment-panel-bg);
    }

    .comment-author {
      min-width: 0;
      word-break: break-word;
    }

    .comment-text {
      font-size: 0.9rem;
      color: var(--comment-panel-text);
      word-break: break-word;
      overflow-wrap: anywhere;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
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
      background: var(--comment-panel-bg);
      color: var(--comment-panel-text);
      border: 1px solid var(--comment-panel-border);
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .media-preview-header,
    .media-preview-footer {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--comment-panel-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .media-preview-footer {
      border-bottom: 0;
      border-top: 1px solid var(--comment-panel-border);
    }

    .media-preview-body {
      padding: 0.75rem;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--comment-card-bg);
    }

    :host ::ng-deep .comment-offcanvas .dropdown-menu {
      background: var(--comment-panel-bg);
      border-color: var(--comment-panel-border);
      color: var(--comment-panel-text);
    }

    :host ::ng-deep .comment-offcanvas .dropdown-item,
    :host ::ng-deep .comment-offcanvas .dropdown-header {
      color: var(--comment-panel-text);
    }

    :host ::ng-deep .comment-offcanvas .dropdown-item:hover,
    :host ::ng-deep .comment-offcanvas .dropdown-item:focus {
      background: var(--comment-card-bg);
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
  private static readonly COMMENT_DRAFT_ACTIVE_VALUE = 2;
  private static readonly COMMENT_PRIVATE_ACTIVE_VALUE = 3;

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
  currentUserId: number | null = null;
  newComment = "";
  isPrivateComment = false;
  quillConfig: QuillModules = {};
  listUsers: any[] = [];
  isVideoPreviewOpen = false;
  videoPreviewItems: string[] = [];
  videoPreviewIndex = 0;
  draftStatusText: "dirty" | "saving" | "saved" | "restored" | "" = "";
  draftStatusAt: Date | null = null;
  showDiscardDraftAction = false;
  showDraftToast = false;
  draftToastText = "Draft auto-saved";
  private draftToastTimer: ReturnType<typeof setTimeout> | null = null;
  private toolbarCleanup: Array<() => void> = [];
  private resizeCleanup: Array<() => void> = [];
  private currentOrderContext: string | null = null;
  private skipPersistDraftForOrder: string | null = null;
  private previousBodyOverflow: string | null = null;
  private bodyScrollLocked = false;
  panelWidth = 420;
  isResizing = false;

  discardDraft = async (): Promise<void> => {
    const orderNum = String(this.orderNum || this.currentOrderContext || "").trim();
    if (!orderNum) {
      return;
    }

    if (!window.confirm("Discard this draft?")) {
      return;
    }

    await this.clearDraftForOrder(orderNum);
    this.newComment = "";
    this.draftStatusText = "";
    this.draftStatusAt = null;
    this.hideDraftToast();
    this.mentionedRecipients.clear();
    this.isPrivateComment = false;
    this.skipPersistDraftForOrder = orderNum;
    this.updateDiscardDraftActionState();
  };

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
    if (this.isOpen) {
      this.lockBodyScroll();
    } else {
      this.unlockBodyScroll();
    }

    const becameOpen = !!changes["isOpen"]?.currentValue;
    const orderChanged = !!changes["orderNum"];

    const previousOrder = String(changes["orderNum"]?.previousValue || "").trim();
    const nextOrder = String(this.orderNum || "").trim();

    if (this.isOpen && orderChanged && previousOrder && previousOrder !== nextOrder) {
      void this.persistDraftForOrder(previousOrder);
    }

    if (this.isOpen && this.orderNum && (becameOpen || orderChanged)) {
      // Show loading state immediately while comments are being fetched.
      this.loading = true;
      this.comments = [];
      this.currentUserId = this.getCurrentUserId();
      this.updateDiscardDraftActionState();
      this.panelWidth = this.clampPanelWidth(this.panelWidth);
      this.panelWidthChange.emit(this.panelWidth);
      this.currentOrderContext = String(this.orderNum);
      this.skipPersistDraftForOrder = null;
      this.isPrivateComment = false;
      this.ensureUsersLoaded();
      this.loadComments({ forceScrollToBottom: true });
    }
  }

  isPrivateCommentRow = (row: any): boolean => {
    return Number(row?.active) === CommentOffcanvasComponent.COMMENT_PRIVATE_ACTIVE_VALUE;
  };

  isOwnComment = (row: any): boolean => {
    return !!this.currentUserId && Number(row?.userId) === this.currentUserId;
  };

  deleteComment = async (row: any, event: MouseEvent): Promise<void> => {
    event.stopPropagation();

    if (!row?.id) {
      return;
    }

    if (!window.confirm("Delete this comment?")) {
      return;
    }

    try {
      await firstValueFrom(this.commentsService.deleteComment({ id: row.id, active: 0 }));
      await this.loadComments();
    } catch {
      // silently ignore
    }
  };

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

      if (this.orderNum) {
        await this.restoreDraftForOrder(this.orderNum);
      }
    } catch {
      this.comments = [];
      this.newComment = "";
    } finally {
      this.loading = false;
      this.updateDiscardDraftActionState();
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
      active: this.isPrivateComment
        ? CommentOffcanvasComponent.COMMENT_PRIVATE_ACTIVE_VALUE
        : 1,
    };

    try {
      await this.clearDraftForOrder(this.orderNum);

      await this.commentsService.createComment(payload);
      this.newComment = "";
      this.isPrivateComment = false;
      this.draftStatusText = "";
      this.draftStatusAt = null;
      this.hideDraftToast();
      this.mentionedRecipients.clear();
      this.saved.emit({
        ...payload,
        isPrivate: this.isPrivateComment,
        bg_class_name: "bg-success",
        color_class_name: "text-success",
      });
      await this.loadComments({ forceScrollToBottom: true });
    } finally {
      this.saving = false;
    }
  }

  close(): void {
    if (
      this.currentOrderContext &&
      this.skipPersistDraftForOrder !== this.currentOrderContext
    ) {
      void this.persistDraftForOrder(this.currentOrderContext);
    }

    this.skipPersistDraftForOrder = null;
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

  onDraftInputChanged(): void {
    if (this.saving || this.loading) {
      return;
    }

    this.skipPersistDraftForOrder = null;

    if (this.isEditorContentEmpty()) {
      if (this.draftStatusText === "dirty") {
        this.draftStatusText = "";
        this.draftStatusAt = null;
      }
      this.updateDiscardDraftActionState();
      return;
    }

    this.draftStatusText = "dirty";
    this.draftStatusAt = null;
    this.updateDiscardDraftActionState();
  }

  get draftBadgeLabel(): string {
    if (this.draftStatusText === "dirty") {
      return "Draft not saved";
    }
    if (this.draftStatusText === "saving") {
      return "Saving draft...";
    }
    if (this.draftStatusText === "saved") {
      return "Draft saved";
    }
    if (this.draftStatusText === "restored") {
      return "Draft restored";
    }
    return "";
  }

  get draftBadgeClass(): string {
    if (this.draftStatusText === "dirty") {
      return "badge-dirty";
    }
    if (this.draftStatusText === "saving") {
      return "badge-saving";
    }
    if (this.draftStatusText === "saved") {
      return "badge-saved";
    }
    if (this.draftStatusText === "restored") {
      return "badge-restored";
    }
    return "";
  }

  private updateDiscardDraftActionState(): void {
    this.showDiscardDraftAction =
      !!this.orderNum &&
      !this.loading &&
      !this.saving &&
      (!this.isEditorContentEmpty() || this.draftStatusText === "restored");
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
    this.hideDraftToast();
    this.unlockBodyScroll();
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

  private getCurrentUserId(): number | null {
    const id = Number(this.authenticationService.currentUserValue?.id);
    return Number.isFinite(id) ? id : null;
  }

  private async persistDraftForOrder(orderNum: string): Promise<void> {
    const text = this.newComment;
    if (!orderNum || this.isEditorContentEmpty()) {
      return;
    }

    const userInfo = this.authenticationService.currentUserValue;
    if (!userInfo?.id) {
      return;
    }

    const existingDraft = await this.getLatestDraftForOrder(orderNum);
    if (existingDraft && String(existingDraft.comments || "") === String(text || "")) {
      return;
    }

    this.draftStatusText = "saving";
    this.draftStatusAt = null;

    if (existingDraft?.id) {
      await firstValueFrom(this.commentsService.deleteComment({ id: existingDraft.id, active: 0 }));
    }

    await this.commentsService.createComment({
      insert: 1,
      locationPath: window.location.href.split("?")[0],
      pageName: location.pathname,
      comments: text,
      emailToSendFromMention: [],
      emailCallBackUrl: `${window.location.href.split("?")[0]}?comment=${orderNum}`,
      created_by_name: userInfo.full_name,
      createdDate: new Date(),
      comments_html: stripHtml(text),
      type: this.type,
      orderNum,
      userId: userInfo.id,
      userName: userInfo.full_name,
      pid: null,
      active: CommentOffcanvasComponent.COMMENT_DRAFT_ACTIVE_VALUE,
    });

    this.draftStatusText = "saved";
    this.draftStatusAt = new Date();
    this.showDraftToastNow();
  }

  private async restoreDraftForOrder(orderNum: string): Promise<void> {
    const draft = await this.getLatestDraftForOrder(orderNum);
    this.newComment = String(draft?.comments || "");

    if (draft?.comments) {
      this.draftStatusText = "restored";
      this.draftStatusAt = new Date();
    } else {
      this.draftStatusText = "";
      this.draftStatusAt = null;
    }
  }

  private showDraftToastNow(): void {
    this.hideDraftToast();
    this.showDraftToast = true;
    this.draftToastTimer = setTimeout(() => {
      this.showDraftToast = false;
      this.draftToastTimer = null;
    }, 2000);
  }

  private hideDraftToast(): void {
    if (this.draftToastTimer) {
      clearTimeout(this.draftToastTimer);
      this.draftToastTimer = null;
    }
    this.showDraftToast = false;
  }

  private async clearDraftForOrder(orderNum: string): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return;
    }

    const drafts = await this.commentsService.find({
      orderNum,
      type: this.type,
      active: CommentOffcanvasComponent.COMMENT_DRAFT_ACTIVE_VALUE,
    });

    const mine = (Array.isArray(drafts) ? drafts : []).filter(
      (row: any) => Number(row?.userId) === userId && Number(row?.id) > 0
    );

    if (!mine.length) {
      return;
    }

    for (const draft of mine) {
      await firstValueFrom(this.commentsService.deleteComment({ id: draft.id, active: 0 }));
    }
  }

  private async getLatestDraftForOrder(orderNum: string): Promise<any | null> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return null;
    }

    const drafts = await this.commentsService.find({
      orderNum,
      type: this.type,
      active: CommentOffcanvasComponent.COMMENT_DRAFT_ACTIVE_VALUE,
    });

    const mine = (Array.isArray(drafts) ? drafts : []).filter(
      (row: any) => Number(row?.userId) === userId
    );

    if (!mine.length) {
      return null;
    }

    const sorted = [...mine].sort((a: any, b: any) => {
      const idA = Number(a?.id || 0);
      const idB = Number(b?.id || 0);
      return idB - idA;
    });

    return sorted[0] || null;
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

  getCommentUserImage(comment: any): string {
    const image = String(comment?.image || "").trim();
    if (!image) {
      return "assets/images/default-user.png";
    }
    return image;
  }

  onCommentAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target) {
      return;
    }
    target.onerror = null;
    target.src = "assets/images/default-user.png";
  }

  private lockBodyScroll(): void {
    if (typeof document === "undefined" || this.bodyScrollLocked) {
      return;
    }

    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this.bodyScrollLocked = true;
  }

  private unlockBodyScroll(): void {
    if (typeof document === "undefined" || !this.bodyScrollLocked) {
      return;
    }

    document.body.style.overflow = this.previousBodyOverflow || "";
    this.previousBodyOverflow = null;
    this.bodyScrollLocked = false;
  }

  isEditorContentEmpty(): boolean {
    const plain = stripHtml(this.newComment || "").replace(/\s|&nbsp;/g, "");
    return !plain;
  }
}
