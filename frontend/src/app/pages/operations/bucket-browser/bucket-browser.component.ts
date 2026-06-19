import { Component, OnInit, inject } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { BucketBrowserItem, BucketBrowserService } from '@app/core/api/file-storage/bucket-browser.service';
import { ToastrService } from 'ngx-toastr';
import { FileViewerModalComponent } from '@app/shared/components/file-viewer-modal/file-viewer-modal.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

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
    `,
  ],
})
export class BucketBrowserComponent implements OnInit {
  private readonly api = inject(BucketBrowserService);
  private readonly toastr = inject(ToastrService);
  private readonly modal = inject(NgbModal);

  bucket = '';
  prefix = '';
  prefixInput = '';
  isLoading = false;
  isDeleting = false;
  nextToken = '';

  readonly rootNode: FolderNode = this.createNode('', 'root', 0);
  files: FileEntry[] = [];

  async ngOnInit(): Promise<void> {
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
    this.isLoading = true;
    try {
      const fileResponse = await this.api.list(this.prefix, append ? this.nextToken : '', 200, '');

      this.bucket = fileResponse.bucket;
      this.prefix = fileResponse.prefix || '';
      this.prefixInput = this.prefix;
      this.nextToken = fileResponse.nextContinuationToken || '';

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
      } else {
        this.files = fileRows;
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
      await this.api.deletePrefix(node.prefix);
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
      const signed = await this.api.getSignedUrl(file.key);
      const modalRef = this.modal.open(FileViewerModalComponent, {
        size: 'xl',
        centered: true,
        scrollable: true,
      });
      modalRef.componentInstance.url = signed.url;
      modalRef.componentInstance.fileName = signed.fileName;
    } catch {
      this.toastr.error('Failed to preview file');
    }
  }

  async downloadFile(file: FileEntry): Promise<void> {
    try {
      const signed = await this.api.getSignedUrl(file.key);
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
      await this.api.deleteObject(file.key);
      this.toastr.success('File deleted');
      await this.load();
    } catch {
      this.toastr.error('Failed to delete file');
    } finally {
      this.isDeleting = false;
    }
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
      const response = await this.api.list(node.prefix, '', 200, '/');
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
        next = this.createNode(runningPrefix, segment, cursor.depth + 1);
        cursor.children = [...cursor.children, next];
        cursor.hasChildren = true;
      }

      cursor.isExpanded = true;
      cursor = next;
      await this.loadNodeChildren(cursor);
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
}
