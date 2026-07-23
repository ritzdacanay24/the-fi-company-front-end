import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { BucketBrowserItem, BucketBrowserService } from '@app/core/api/file-storage/bucket-browser.service';
import { ToastrService } from 'ngx-toastr';
import { FileViewerModalComponent } from '@app/shared/components/file-viewer-modal/file-viewer-modal.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { ActivatedRoute, Router } from '@angular/router';

interface FolderEntry {
  prefix: string;
  name: string;
}

interface FolderNode extends FolderEntry {
  depth: number;
  children: FolderNode[];
  hasLoadedChildren: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  isLoading: boolean;
}

interface FileEntry extends BucketBrowserItem {
  name: string;
  displayName?: string;
  sizeLabel: string;
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-bucket-browser',
  templateUrl: './bucket-browser.component.html',
  styles: [
    `
      .bucket-browser-page .panel-card {
        border: 1px solid var(--bs-border-color-translucent);
        border-radius: 0.75rem;
      }

      .tree-pane {
        max-height: 520px;
        overflow: auto;
        padding: 0.25rem 0;
      }

      .tree-loading {
        padding: 0.5rem 0.75rem;
      }

      .tree-node-entry {
        border-bottom: 1px solid var(--bs-border-color-translucent);
      }

      .tree-node-entry:last-child {
        border-bottom: none;
      }

      .tree-node-row {
        min-height: 36px;
        padding-right: 0.5rem;
      }

      .tree-toggle {
        width: 1rem;
      }

      .tree-node-label {
        color: var(--bs-body-color);
        font-size: 0.92rem;
      }

      .tree-node-label:hover {
        color: var(--bs-primary);
      }

      .tree-node-active {
        color: var(--bs-primary);
        font-weight: 600;
      }

      .file-key {
        max-width: 100%;
      }

      .min-w-0 {
        min-width: 0;
      }

      .table td,
      .table th {
        vertical-align: middle;
      }

      .bucket-browser-page .table {
        table-layout: auto;
      }

      .file-name-cell {
        min-width: 0;
      }

      .file-name {
        display: block;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .file-key {
        display: block;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .actions-cell {
        width: 130px;
        white-space: nowrap;
      }

      .file-thumb {
        width: 40px;
        min-width: 40px;
        height: 40px;
        border-radius: 0.35rem;
        border: 1px solid var(--bs-border-color-translucent);
        background: var(--bs-light);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .file-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .file-thumb-image {
        background: transparent;
      }

      .file-thumb-button {
        padding: 0;
        cursor: pointer;
      }

      .file-thumb-button:disabled {
        cursor: default;
        opacity: 0.85;
      }

      .file-thumb-button:not(:disabled):hover {
        border-color: var(--bs-primary);
      }
    `,
  ],
})
export class BucketBrowserComponent implements OnInit {
  private readonly api = inject(BucketBrowserService);
  private readonly toastr = inject(ToastrService);
  private readonly modal = inject(NgbModal);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private searchReloadTimer?: ReturnType<typeof setTimeout>;
  private lastUrlState = '';
  private readonly thumbnailUrlCache = new Map<string, string>();
  private readonly thumbnailLoadingKeys = new Set<string>();
  private readonly thumbnailExtensions = new Set([
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'bmp',
    'svg',
    'heic',
    'heif',
    'avif',
  ]);
  private readonly maxThumbnailsPerPage = 30;

  @ViewChild('fileSearchInput') fileSearchInput?: ElementRef<HTMLInputElement>;

  bucket = '';
  availableBuckets: string[] = [];
  selectedBucket = '';
  prefix = '';
  prefixInput = '';
  fileSearch = '';
  fileSearchMode: 'name' | 'path' = 'name';
  fileSearchScope: 'current' | 'all' = 'current';
  isLoading = false;
  isDeleting = false;
  nextToken = '';

  readonly rootNode: FolderNode = this.createNode('', 'root', 0);
  files: FileEntry[] = [];

  get filteredFiles(): FileEntry[] {
    if (!this.hasSearchTerm) {
      return this.files;
    }

    return this.files.filter((file) => this.matchesSearch(file));
  }

  get hasSearchTerm(): boolean {
    return !!String(this.fileSearch || '').trim();
  }

  get isGlobalSearchActive(): boolean {
    return !this.prefix && this.fileSearchScope === 'all' && this.hasSearchTerm;
  }

  get searchResultSummary(): string {
    if (!this.prefix && this.fileSearchScope === 'all' && !this.hasSearchTerm) {
      return 'Type to search all directories';
    }

    if (!this.hasSearchTerm) {
      return `${this.files.length} file${this.files.length === 1 ? '' : 's'}`;
    }

    const total = this.files.length;
    const visible = this.filteredFiles.length;
    return `${visible} of ${total} file${total === 1 ? '' : 's'}`;
  }

  async ngOnInit(): Promise<void> {
    this.restoreStateFromUrl();
    await this.loadAvailableBuckets();
    this.rootNode.isExpanded = true;
    await this.loadNodeChildren(this.rootNode);
    await this.load();
  }

  get breadcrumbs(): Array<{ label: string; prefix: string }> {
    const parts = this.prefix.split('/').filter(Boolean);
    const crumbs: Array<{ label: string; prefix: string }> = [{ label: 'root', prefix: '' }];

    let running = '';
    for (const part of parts) {
      running = running ? `${running}/${part}` : part;
      crumbs.push({ label: part, prefix: `${running}/` });
    }

    return crumbs;
  }

  async load(append = false): Promise<void> {
    const shouldSkipGlobalSearch = !this.prefix && this.fileSearchScope === 'all' && !this.hasSearchTerm;
    if (!append && shouldSkipGlobalSearch) {
      this.files = [];
      this.nextToken = '';
      return;
    }

    this.isLoading = true;
    try {
      const delimiter = this.fileSearchScope === 'all' ? '' : '/';
      const fileResponse = await this.api.list(this.prefix, append ? this.nextToken : '', 200, delimiter, this.selectedBucket);

      this.bucket = fileResponse.bucket;
      if (!this.selectedBucket && this.bucket) {
        this.selectedBucket = this.bucket;
      }
      this.prefix = fileResponse.prefix || '';
      this.prefixInput = this.prefix;
      this.nextToken = fileResponse.nextContinuationToken || '';
      this.syncStateToUrl();

      const fileRows = (fileResponse.items || [])
        .filter((row) => !!row.key && !row.key.endsWith('/'))
        .filter((row) => row.key !== this.prefix)
        .map((row) => ({
          ...row,
          name: this.extractFileName(row.key),
          sizeLabel: this.formatSize(row.size),
        }));

      if (append) {
        this.files = [...this.files, ...fileRows];
        this.loadThumbnailsForFiles(fileRows);
      } else {
        this.files = fileRows;
        this.loadThumbnailsForFiles(this.files);
      }

      if (!append) {
        await this.ensurePathVisible(this.prefix);
      }
    } catch {
      if (!append) {
        this.files = [];
      }
      this.toastr.error('Failed to load bucket contents');
    } finally {
      this.isLoading = false;
    }
  }

  async onApplyPrefix(): Promise<void> {
    const normalized = this.normalizePrefix(this.prefixInput);
    this.prefix = normalized;
    await this.load();
  }

  async openPrefix(targetPrefix: string): Promise<void> {
    this.prefix = this.normalizePrefix(targetPrefix);
    this.prefixInput = this.prefix;
    await this.load();
  }

  async goUp(): Promise<void> {
    const parts = this.prefix.split('/').filter(Boolean);
    parts.pop();
    this.prefix = parts.length ? `${parts.join('/')}/` : '';
    this.prefixInput = this.prefix;
    await this.load();
  }

  async onSelectNode(node: FolderNode): Promise<void> {
    await this.openPrefix(node.prefix);
  }

  async onToggleNode(node: FolderNode, event: MouseEvent): Promise<void> {
    event.stopPropagation();

    if (node.isExpanded) {
      node.isExpanded = false;
      return;
    }

    node.isExpanded = true;
    if (!node.hasLoadedChildren) {
      await this.loadNodeChildren(node);
    }
  }

  showToggle(node: FolderNode): boolean {
    return node.hasChildren || !node.hasLoadedChildren;
  }

  async refreshCurrentNodeChildren(): Promise<void> {
    const selected = this.findNodeByPrefix(this.prefix) || this.rootNode;
    await this.loadNodeChildren(selected, true);
  }

  canDeleteNode(node: FolderNode): boolean {
    return !!node.prefix && !node.isLoading && !this.isDeleting;
  }

  async deleteFolder(node: FolderNode, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    if (!this.canDeleteNode(node)) {
      return;
    }

    const result = await SweetAlert.confirm({
      title: `Delete folder ${node.name}?`,
      text: 'Only empty folders can be deleted. Remove files first if this fails.',
      icon: 'warning',
      confirmButtonText: 'Delete folder',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) {
      return;
    }

    this.isDeleting = true;
    try {
      await this.api.deletePrefix(node.prefix, this.selectedBucket);
      this.toastr.success('Folder deleted');

      const parentPrefix = this.getParentPrefix(node.prefix);
      const deletingSelectedPath = this.prefix.startsWith(node.prefix);
      if (deletingSelectedPath) {
        this.prefix = parentPrefix;
        this.prefixInput = parentPrefix;
      }

      await this.loadNodeChildren(this.rootNode, true);
      await this.ensurePathVisible(this.prefix);
      await this.load();
    } catch {
      // Error notifications are handled by the global API error pipeline.
    } finally {
      this.isDeleting = false;
    }
  }

  async previewFile(file: FileEntry): Promise<void> {
    try {
      const signed = await this.api.getSignedUrl(file.key, this.selectedBucket);
      const modalRef = this.modal.open(FileViewerModalComponent, {
        size: 'xl',
        centered: true,
        scrollable: true,
      });
      modalRef.componentInstance.url = signed.url;
      modalRef.componentInstance.fileName = signed.fileName;
      modalRef.componentInstance.loadBlob = () => this.api.getObjectBlob(file.key, this.selectedBucket);
    } catch {
      this.toastr.error('Failed to preview file');
    }
  }

  async downloadFile(file: FileEntry): Promise<void> {
    try {
      const signed = await this.api.getSignedUrl(file.key, this.selectedBucket);
      const link = document.createElement('a');
      link.href = signed.url;
      link.download = signed.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      this.toastr.error('Failed to download file');
    }
  }

  async deleteFile(file: FileEntry): Promise<void> {
    if (this.isDeleting) {
      return;
    }

    const result = await SweetAlert.confirm({
      title: `Delete ${file.name}?`,
      text: 'This will permanently remove the file from bucket storage.',
      icon: 'warning',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) {
      return;
    }

    this.isDeleting = true;
    try {
      await this.api.deleteObject(file.key, this.selectedBucket);
      this.thumbnailUrlCache.delete(this.toThumbnailCacheKey(file));
      this.thumbnailLoadingKeys.delete(this.toThumbnailCacheKey(file));
      this.toastr.success('File deleted');
      await this.load();
    } catch {
      this.toastr.error('Failed to delete file');
    } finally {
      this.isDeleting = false;
    }
  }

  setFileSearchMode(mode: 'name' | 'path'): void {
    this.fileSearchMode = mode;
  }

  async onBucketChange(nextBucket: string): Promise<void> {
    const safeBucket = String(nextBucket || '').trim();
    if (!safeBucket || safeBucket === this.selectedBucket) {
      return;
    }

    this.selectedBucket = safeBucket;
    this.bucket = safeBucket;
    this.prefix = '';
    this.prefixInput = '';
    this.nextToken = '';
    this.files = [];
    this.thumbnailUrlCache.clear();
    this.thumbnailLoadingKeys.clear();
    this.syncStateToUrl();

    this.rootNode.children = [];
    this.rootNode.hasLoadedChildren = false;
    this.rootNode.hasChildren = true;
    this.rootNode.isExpanded = true;

    await this.loadNodeChildren(this.rootNode, true);
    await this.load();
  }

  setFileSearchScope(scope: 'current' | 'all'): void {
    if (this.fileSearchScope === scope) {
      return;
    }

    this.fileSearchScope = scope;
    this.nextToken = '';

    void this.load();
  }

  onFileSearchChange(): void {
    if (this.prefix || this.fileSearchScope !== 'all') {
      return;
    }

    if (this.searchReloadTimer) {
      clearTimeout(this.searchReloadTimer);
    }

    const term = String(this.fileSearch || '').trim();
    if (!term) {
      this.files = [];
      this.nextToken = '';
      return;
    }

    this.searchReloadTimer = setTimeout(() => {
      this.nextToken = '';
      void this.load();
    }, 250);
  }

  clearFileSearch(): void {
    this.fileSearch = '';
    this.onFileSearchChange();
    this.focusSearch();
  }

  focusSearch(): void {
    const input = this.fileSearchInput?.nativeElement;
    if (!input) {
      return;
    }

    input.focus();
    input.select();
  }

  highlightMatch(value: string): string {
    const safeValue = this.escapeHtml(String(value || ''));
    const term = String(this.fileSearch || '').trim();
    if (!term) {
      return safeValue;
    }

    const escapedTerm = this.escapeRegExp(this.escapeHtml(term));
    const regex = new RegExp(`(${escapedTerm})`, 'ig');
    return safeValue.replace(regex, '<mark>$1</mark>');
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if (event.key !== '/') {
      return;
    }

    const target = event.target as HTMLElement | null;
    const isTypingTarget =
      !!target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable);

    if (isTypingTarget) {
      return;
    }

    event.preventDefault();
    this.focusSearch();
  }

  private normalizePrefix(value: string): string {
    const trimmed = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    if (!trimmed) {
      return '';
    }

    return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  }

  private extractFolderName(prefix: string): string {
    const normalized = String(prefix || '').replace(/\/+$/, '');
    const segments = normalized.split('/').filter(Boolean);
    return segments[segments.length - 1] || normalized || '/';
  }

  private extractFileName(key: string): string {
    const segments = String(key || '').split('/').filter(Boolean);
    return segments[segments.length - 1] || key;
  }

  private getParentPrefix(prefix: string): string {
    const segments = String(prefix || '').split('/').filter(Boolean);
    segments.pop();
    return segments.length ? `${segments.join('/')}/` : '';
  }

  private matchesSearch(file: FileEntry): boolean {
    const term = String(this.fileSearch || '').trim().toLowerCase();
    if (!term) {
      return true;
    }

    const fileName = String(file.name || '').toLowerCase();
    if (this.fileSearchMode === 'name') {
      return fileName.includes(term);
    }

    const fileKey = String(file.key || '').toLowerCase();
    return fileName.includes(term) || fileKey.includes(term);
  }

  isImageFile(file: FileEntry): boolean {
    return this.thumbnailExtensions.has(this.getFileExtension(file.name || file.key));
  }

  hasThumbnail(file: FileEntry): boolean {
    return this.thumbnailUrlCache.has(this.toThumbnailCacheKey(file));
  }

  getThumbnailUrl(file: FileEntry): string {
    return this.thumbnailUrlCache.get(this.toThumbnailCacheKey(file)) || '';
  }

  isThumbnailLoading(file: FileEntry): boolean {
    return this.thumbnailLoadingKeys.has(this.toThumbnailCacheKey(file));
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private createNode(prefix: string, name: string, depth: number): FolderNode {
    return {
      prefix,
      name,
      depth,
      children: [],
      hasLoadedChildren: false,
      hasChildren: true,
      isExpanded: false,
      isLoading: false,
    };
  }

  private async loadNodeChildren(node: FolderNode, force = false): Promise<void> {
    if (node.isLoading || (node.hasLoadedChildren && !force)) {
      return;
    }

    node.isLoading = true;
    try {
      const response = await this.api.list(node.prefix, '', 200, '/', this.selectedBucket);
      this.bucket = response.bucket || this.bucket;
      if (!this.selectedBucket && this.bucket) {
        this.selectedBucket = this.bucket;
      }
      const existingByPrefix = new Map(node.children.map((child) => [child.prefix, child]));
      const children = (response.prefixes || []).map((childPrefix) => {
        const existing = existingByPrefix.get(childPrefix);
        if (existing) {
          return existing;
        }

        return this.createNode(childPrefix, this.extractFolderName(childPrefix), node.depth + 1);
      });

      node.children = children;
      node.hasLoadedChildren = true;
      node.hasChildren = children.length > 0;
    } catch {
      node.hasLoadedChildren = true;
      node.hasChildren = false;
      if (force) {
        node.children = [];
      }
    } finally {
      node.isLoading = false;
    }
  }

  private findNodeByPrefix(targetPrefix: string, currentNode: FolderNode = this.rootNode): FolderNode | null {
    if (currentNode.prefix === targetPrefix) {
      return currentNode;
    }

    for (const child of currentNode.children) {
      const match = this.findNodeByPrefix(targetPrefix, child);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private async ensurePathVisible(prefix: string): Promise<void> {
    const segments = String(prefix || '').split('/').filter(Boolean);
    let cursor = this.rootNode;
    cursor.isExpanded = true;

    await this.loadNodeChildren(cursor);

    let runningPrefix = '';
    for (const segment of segments) {
      runningPrefix = runningPrefix ? `${runningPrefix}${segment}/` : `${segment}/`;

      let next = cursor.children.find((child) => child.prefix === runningPrefix);
      if (!next) {
        break;
      }

      cursor.isExpanded = true;
      cursor = next;
      await this.loadNodeChildren(cursor);
    }
  }

  private async loadAvailableBuckets(): Promise<void> {
    try {
      const response = await this.api.listBuckets();
      const buckets = Array.from(new Set((response.buckets || []).map((bucket) => String(bucket || '').trim()).filter(Boolean)));
      this.availableBuckets = buckets;

      const preferred = String(response.defaultBucket || '').trim();
      if (preferred) {
        if (!this.selectedBucket) {
          this.selectedBucket = preferred;
        }
      } else if (!this.selectedBucket && buckets.length) {
        this.selectedBucket = buckets[0];
      }

      this.syncStateToUrl();
    } catch {
      this.availableBuckets = [];
      this.selectedBucket = '';
      this.toastr.error('Failed to load available buckets');
    }
  }


  private formatSize(bytes: number): string {
    const value = Number(bytes || 0);
    if (value < 1024) {
      return `${value} B`;
    }

    if (value < 1024 * 1024) {
      return `${(value / 1024).toFixed(1)} KB`;
    }

    if (value < 1024 * 1024 * 1024) {
      return `${(value / (1024 * 1024)).toFixed(2)} MB`;
    }

    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  private restoreStateFromUrl(): void {
    const bucketFromUrl = String(this.route.snapshot.queryParamMap.get('bucket') || '').trim();
    const prefixFromUrl = this.normalizePrefix(String(this.route.snapshot.queryParamMap.get('prefix') || ''));

    if (bucketFromUrl) {
      this.selectedBucket = bucketFromUrl;
    }

    this.prefix = prefixFromUrl;
    this.prefixInput = prefixFromUrl;
  }

  private syncStateToUrl(): void {
    const queryParams: Record<string, string> = {};
    if (this.selectedBucket) {
      queryParams['bucket'] = this.selectedBucket;
    }
    if (this.prefix) {
      queryParams['prefix'] = this.prefix;
    }

    const nextState = JSON.stringify(queryParams);
    if (nextState === this.lastUrlState) {
      return;
    }

    this.lastUrlState = nextState;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  private loadThumbnailsForFiles(files: FileEntry[]): void {
    const candidates = files
      .filter((file) => this.isImageFile(file))
      .slice(0, this.maxThumbnailsPerPage);

    for (const file of candidates) {
      void this.ensureThumbnailSignedUrl(file);
    }
  }

  private async ensureThumbnailSignedUrl(file: FileEntry): Promise<void> {
    const cacheKey = this.toThumbnailCacheKey(file);
    if (this.thumbnailUrlCache.has(cacheKey) || this.thumbnailLoadingKeys.has(cacheKey)) {
      return;
    }

    this.thumbnailLoadingKeys.add(cacheKey);
    try {
      const signed = await this.api.getSignedUrl(file.key, this.selectedBucket);
      if (signed?.url) {
        this.thumbnailUrlCache.set(cacheKey, signed.url);
      }
    } catch {
      // Keep the row usable without thumbnail if signing fails for this file.
    } finally {
      this.thumbnailLoadingKeys.delete(cacheKey);
    }
  }

  private toThumbnailCacheKey(file: FileEntry): string {
    return `${this.selectedBucket || this.bucket}::${file.key}`;
  }

  private getFileExtension(name: string): string {
    const value = String(name || '');
    const index = value.lastIndexOf('.');
    if (index < 0) {
      return '';
    }

    return value.slice(index + 1).trim().toLowerCase();
  }
}
