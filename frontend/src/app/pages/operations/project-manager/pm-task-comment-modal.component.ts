import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { PmTaskComment, PmTaskRecord } from './services/project-manager-tasks-data.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-pm-task-comment-modal',
  imports: [SharedModule, ReactiveFormsModule],
  template: `
    <div class="modal-header">
      <div>
        <h5 class="modal-title mb-0">Comments</h5>
        <small class="text-muted">{{ task.taskName }}</small>
      </div>
      <button type="button" class="btn-close" (click)="close()"></button>
    </div>

    <div class="modal-body p-0 pm-comment-modal-body">
      <!-- Comment list -->
      <div class="comment-list px-3 pt-3" style="max-height: 360px; overflow-y: auto;">
        <div *ngIf="!comments.length" class="text-muted small py-3 text-center">
          No comments yet. Be the first to add one.
        </div>
        <div *ngFor="let c of comments; let i = index" class="comment-item" [class.comment-item-continuation]="isContinuation(i)">
          <div class="d-flex align-items-center gap-2 mb-1" *ngIf="!isContinuation(i)">
            <span class="avatar-circle">{{ initials(c.author) }}</span>
            <strong class="small">{{ c.author }}</strong>
            <span class="text-muted small ms-auto">{{ formatDate(c.createdAt) }}</span>
          </div>
          <div class="comment-bubble">{{ c.text }}</div>
        </div>
      </div>

      <!-- Add comment -->
      <div class="border-top px-3 py-3">
        <div class="d-flex gap-2 align-items-start">
          <span class="avatar-circle">{{ initials(currentAuthor) }}</span>
          <div class="flex-grow-1">
            <textarea
              class="form-control form-control-sm pm-comment-input"
              rows="2"
              placeholder="Write a comment..."
              [formControl]="commentText"
            ></textarea>
            <div class="d-flex gap-2 mt-2 align-items-center">
              <small class="text-muted">Posting as {{ currentAuthor }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer py-2">
      <span class="text-muted small me-auto">{{ comments.length }} comment{{ comments.length !== 1 ? 's' : '' }}</span>
      <button
        type="button"
        class="btn btn-primary btn-sm"
        [disabled]="commentText.invalid || !currentAuthor"
        (click)="addComment()"
      >
        Post
      </button>
    </div>
  `,
  styles: [`
    .avatar-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      min-width: 30px;
      border-radius: 50%;
      background: var(--vz-primary);
      color: var(--vz-white);
      font-size: 11px;
      font-weight: 600;
    }
    .comment-bubble {
      background: var(--vz-secondary-bg);
      border: 1px solid var(--vz-border-color);
      color: var(--vz-body-color);
      border-radius: 0 8px 8px 8px;
      padding: 8px 12px;
      font-size: 13px;
      white-space: pre-wrap;
    }
    .comment-item {
      margin-bottom: 12px;
    }
    .comment-item-continuation {
      margin-left: 0;
      margin-top: -6px;
    }
    .comment-item-continuation .comment-bubble {
      border-radius: 8px;
    }
    .pm-comment-input {
      background: var(--vz-secondary-bg);
      color: var(--vz-body-color);
      border-color: var(--vz-border-color);
    }
    .pm-comment-input::placeholder {
      color: var(--vz-secondary-color);
      opacity: 1;
    }
    :host-context([data-bs-theme='dark']) .pm-comment-modal-body {
      background: var(--vz-card-bg);
    }
    :host-context([data-bs-theme='dark']) .pm-comment-input {
      background: var(--vz-secondary-bg);
      color: var(--vz-body-color);
      border-color: rgba(255, 255, 255, 0.18);
    }
    :host-context([data-bs-theme='dark']) .comment-bubble {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.14);
      color: var(--vz-body-color);
    }
    :host-context([data-bs-theme='dark']) .btn-close {
      filter: invert(1) grayscale(100%);
      opacity: 0.85;
    }
  `]
})
export class PmTaskCommentModalComponent implements OnInit {
  @Input() task!: PmTaskRecord;
  @Input() initialComments: PmTaskComment[] = [];

  comments: PmTaskComment[] = [];
  private nextCommentId = 1;
  currentAuthor = '';

  commentText = new FormControl('', [Validators.required, Validators.maxLength(1000)]);

  constructor(
    private activeModal: NgbActiveModal,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.comments = [...this.initialComments];
    this.nextCommentId = this.comments.length
      ? Math.max(...this.comments.map(c => c.id)) + 1
      : 1;
    this.currentAuthor = this.resolveCurrentUserName();
  }

  addComment(): void {
    const text = (this.commentText.value || '').trim();
    const author = this.currentAuthor.trim();
    if (!text || !author) return;

    const comment: PmTaskComment = {
      id: this.nextCommentId++,
      taskId: this.task.id,
      author,
      text,
      createdAt: new Date().toISOString()
    };

    this.comments = [...this.comments, comment];
    this.commentText.reset();
  }

  dismiss(): void {
    // Persist comment edits consistently regardless of which close path is used.
    this.activeModal.close(this.comments);
  }

  close(): void {
    this.activeModal.close(this.comments);
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map(w => w[0] || '')
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  isContinuation(index: number): boolean {
    if (index <= 0) return false;

    const current = this.comments[index];
    const previous = this.comments[index - 1];
    if (!current || !previous) return false;

    return String(current.author || '').trim().toLowerCase() === String(previous.author || '').trim().toLowerCase();
  }

  private resolveCurrentUserName(): string {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      return 'Project Manager';
    }

    const nameCandidates = [
      currentUser.full_name,
      currentUser.fullName,
      `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
      `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
      currentUser.name,
      currentUser.username,
      currentUser.email
    ];

    const displayName = nameCandidates.find((candidate: any) => String(candidate || '').trim().length > 0);
    return String(displayName || 'Project Manager').trim();
  }
}
