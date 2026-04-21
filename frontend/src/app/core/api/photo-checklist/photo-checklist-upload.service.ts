import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ChecklistImageUploadResponse {
  success: boolean;
  url?: string;
  filename?: string;
  template_id?: number;
  item_id?: number;
  item_title?: string;
  template_name?: string;
  message?: string;
  error?: string;
}

export interface ChecklistImageUploadRequest {
  template_id: number;
  item_id: number;
  file: File;
}

@Injectable({
  providedIn: 'root'
})
export class PhotoChecklistUploadService {

  constructor(private http: HttpClient) { }

  private readonly uploadApiBaseUrl = environment.apiV2UploadBaseUrl.replace(/\/+$/, '');
  private readonly fileStorageUploadUrl = `${this.uploadApiBaseUrl}/file-storage/upload`;
  private readonly fileStorageDeleteUrl = `${this.uploadApiBaseUrl}/file-storage/delete`;
  private readonly sampleImagesFolder = 'photoChecklist';
  private readonly tempImagesFolder = 'photoChecklist/temp';

  /**
   * Upload a sample image for a checklist item
   * @param request Upload request with template_id, item_id, and file
   * @returns Promise with upload response
   */
  async uploadSampleImage(request: ChecklistImageUploadRequest): Promise<ChecklistImageUploadResponse> {
    try {
      const response = await this.uploadToFolder(request.file, this.sampleImagesFolder);
      return {
        ...response,
        template_id: request.template_id,
        item_id: request.item_id,
      };
    } catch (error: any) {
      const errorResponse: ChecklistImageUploadResponse = {
        success: false,
        error: error.error?.error || error.message || 'Upload failed'
      };
      
      throw errorResponse;
    }
  }

  /**
   * Upload sample image for template editing (when template/item IDs might not exist yet)
   * @param file Image file to upload
   * @param tempIdentifier Temporary identifier for the upload
   * @returns Promise with upload response
   */
  async uploadTemporaryImage(file: File, tempIdentifier: string): Promise<ChecklistImageUploadResponse> {
    try {
      const folder = tempIdentifier ? this.tempImagesFolder : this.sampleImagesFolder;
      return this.uploadToFolder(file, folder);
    } catch (error: any) {
      const errorResponse: ChecklistImageUploadResponse = {
        success: false,
        error: error.error?.error || error.error?.message || error.message || 'Upload failed'
      };
      throw errorResponse;
    }
  }

  /**
   * Delete an uploaded image
   * @param imageUrl URL of the image to delete
   * @returns Promise with deletion result
   */
  async deleteImage(imageUrl: string): Promise<{success: boolean, message?: string, error?: string}> {
    try {
      const response = await firstValueFrom(
        this.http.delete<{success: boolean, message?: string, error?: string}>(
          this.fileStorageDeleteUrl,
          {
            body: { image_url: imageUrl }
          }
        )
      );
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.error?.error || error.error?.message || error.message || 'Delete failed'
      };
    }
  }

  private async uploadToFolder(file: File, folder: string): Promise<ChecklistImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await firstValueFrom(
      this.http.post<{ success: boolean; fileName?: string; url?: string }>(
        this.fileStorageUploadUrl,
        formData,
      ),
    );

    return {
      success: !!response?.success,
      url: response?.url,
      filename: response?.fileName,
      message: response?.success ? 'Image uploaded successfully' : 'Upload failed',
      error: response?.success ? undefined : 'Upload failed',
    };
  }

  /**
   * Validate image file before upload
   * @param file File to validate
   * @returns Validation result
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      };
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size too large. Maximum size is 5MB.'
      };
    }

    return { valid: true };
  }

  /**
   * Get formatted file size string
   * @param bytes File size in bytes
   * @returns Formatted size string
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
