import { Component, OnInit, inject } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from '@app/core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { FileViewerModalComponent } from '@app/shared/components/file-viewer-modal/file-viewer-modal.component';
import { ResourceDto, ResourcesService } from '@app/core/api/resources/resources.service';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

interface ResourceItem {
  id: number;
  category: string;
  title: string;
  description: string;
  fileName: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  active: number;
  icon: string;
}

interface ResourceGroup {
  category: string;
  items: ResourceItem[];
}

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
  selector: 'app-operations-resources',
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.scss'],
})
export class ResourcesComponent implements OnInit {
  private readonly resourcesService = inject(ResourcesService);
  private readonly auth = inject(AuthenticationService);
  private readonly toastr = inject(ToastrService);
  private readonly fb = inject(FormBuilder);
  private readonly modalService = inject(NgbModal);
  private readonly offcanvasService = inject(NgbOffcanvas);

  searchTerm = '';
  isLoading = false;
  isUploading = false;
  isSavingEdit = false;
  isDeletingEdit = false;

  uploadFile: File | null = null;
  editFile: File | null = null;
  editingResource: ResourceItem | null = null;

  readonly uploadForm = this.fb.group({
    category: ['', Validators.required],
    title: ['', Validators.required],
    description: [''],
  });

  readonly editForm = this.fb.group({
    category: ['', Validators.required],
    title: ['', Validators.required],
    description: [''],
    active: [true, Validators.required],
  });

  private allResources: ResourceItem[] = [];
  groupedResources: ResourceGroup[] = [];

  async ngOnInit(): Promise<void> {
    await this.loadResources();
  }

  private mapDto(item: ResourceDto): ResourceItem {
    return {
      id: item.id,
      category: item.category,
      title: item.title,
      description: item.description,
      fileName: item.file_name,
      size: item.size_bytes ? `${(item.size_bytes / 1024 / 1024).toFixed(2)} MB` : 'File',
      uploadedAt: item.created_at,
      uploadedBy: item.created_by_name || 'Unknown',
      active: item.active,
      icon: item.icon || 'ri-file-pdf-line',
    };
  }

  private async loadResources(): Promise<void> {
    this.isLoading = true;
    try {
      const rows = await this.resourcesService.listActive();
      this.allResources = rows.map((x) => this.mapDto(x));
    } catch {
      this.allResources = [];
      this.toastr.warning('Unable to load resources API');
    } finally {
      this.isLoading = false;
      this.rebuildGroups();
    }
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.rebuildGroups();
  }

  private rebuildGroups(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const filtered = term
      ? this.allResources.filter((item) =>
          [item.category, item.title, item.description, item.fileName]
            .join(' ')
            .toLowerCase()
            .includes(term)
        )
      : this.allResources;

    const groups = new Map<string, ResourceItem[]>();
    for (const item of filtered) {
      const list = groups.get(item.category) || [];
      list.push(item);
      groups.set(item.category, list);
    }

    this.groupedResources = Array.from(groups.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }

  trackByCategory(_: number, group: ResourceGroup): string {
    return group.category;
  }

  trackById(_: number, item: ResourceItem): number {
    return item.id;
  }

  openAdminUpload(content: unknown): void {
    this.uploadForm.reset({ category: '', title: '', description: '' });
    this.uploadFile = null;
    this.offcanvasService.open(content, { position: 'end', panelClass: 'resources-admin-offcanvas' });
  }

  openAdminEdit(content: unknown, item: ResourceItem): void {
    this.editingResource = item;
    this.editFile = null;
    this.editForm.patchValue({
      category: item.category,
      title: item.title,
      description: item.description,
      active: item.active === 1,
    });

    this.offcanvasService.open(content, { position: 'end', panelClass: 'resources-admin-offcanvas' });
  }

  onUploadFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFile = input.files?.[0] || null;
  }

  onEditFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.editFile = input.files?.[0] || null;
  }

  async uploadResource(offcanvas: { dismiss: () => void }): Promise<void> {
    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      return;
    }

    if (!this.uploadFile) {
      this.toastr.error('Please select a document file');
      return;
    }

    const user = this.auth.currentUserValue;
    const createdByName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || user?.email || '';

    this.isUploading = true;
    try {
      await this.resourcesService.create(
        {
          category: String(this.uploadForm.value.category || ''),
          title: String(this.uploadForm.value.title || ''),
          description: String(this.uploadForm.value.description || ''),
          created_by_name: createdByName,
          active: true,
        },
        this.uploadFile,
      );

      this.toastr.success('Resource uploaded');
      offcanvas.dismiss();
      await this.loadResources();
    } catch {
      this.toastr.error('Failed to upload resource');
    } finally {
      this.isUploading = false;
    }
  }

  async saveEdit(offcanvas: { dismiss: () => void }): Promise<void> {
    if (!this.editingResource) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSavingEdit = true;
    try {
      await this.resourcesService.update(
        this.editingResource.id,
        {
          category: String(this.editForm.value.category || ''),
          title: String(this.editForm.value.title || ''),
          description: String(this.editForm.value.description || ''),
          active: !!this.editForm.value.active,
        },
        this.editFile || undefined,
      );

      this.toastr.success('Resource updated');
      offcanvas.dismiss();
      await this.loadResources();
    } catch {
      this.toastr.error('Failed to update resource');
    } finally {
      this.isSavingEdit = false;
    }
  }

  async deleteResource(offcanvas: { dismiss: () => void }): Promise<void> {
    if (!this.editingResource || this.isDeletingEdit) {
      return;
    }

    const result = await SweetAlert.confirm({
      title: `Delete ${this.editingResource.title}?`,
      text: 'This action cannot be undone.',
      icon: 'warning',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) {
      return;
    }

    this.isDeletingEdit = true;
    try {
      await this.resourcesService.remove(this.editingResource.id);
      this.toastr.success('Resource deleted');
      offcanvas.dismiss();
      await this.loadResources();
    } catch {
      this.toastr.error('Failed to delete resource');
    } finally {
      this.isDeletingEdit = false;
    }
  }

  async previewResource(item: ResourceItem): Promise<void> {
    try {
      const signed = await this.resourcesService.getSignedUrl(item.id, 'inline');
      const modalRef = this.modalService.open(FileViewerModalComponent, {
        size: 'xl',
        centered: true,
        scrollable: false,
      });
      modalRef.componentInstance.url = signed.url;
      modalRef.componentInstance.fileName = signed.fileName;
    } catch {
      this.toastr.error('Failed to preview resource');
    }
  }

  async downloadResource(item: ResourceItem): Promise<void> {
    try {
      const { blob, fileName } = await this.resourcesService.downloadBlob(item.id);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      this.toastr.error('Failed to download resource');
    }
  }
}
