import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

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

  /**
   * Upload a sample image for a checklist item
   * @param request Upload request with template_id, item_id, and file
   * @returns Promise with upload response
   */
  async uploadSampleImage(request: ChecklistImageUploadRequest): Promise<ChecklistImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('template_id', request.template_id.toString());
    formData.append('item_id', request.item_id.toString());

    try {
      const response = await firstValueFrom(
        this.http.post<ChecklistImageUploadResponse>(
          '/backend/api/photo-checklist/upload-sample-image.php',
          formData
        )
      );
      
      return response;
    } catch (error: any) {
      // Handle HTTP errors and return a formatted response
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
    console.log('PhotoChecklistUploadService.uploadTemporaryImage called with:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      tempIdentifier: tempIdentifier
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('temp_id', tempIdentifier);

    console.log('FormData created, making HTTP request to:', '/backend/api/photo-checklist/upload-temp-image.php');

    try {
      const response = await firstValueFrom(
        this.http.post<ChecklistImageUploadResponse>(
          'photo-checklist/upload-temp-image.php',
          formData
        )
      );
      
      console.log('HTTP response received:', response);
      return response;
    } catch (error: any) {
      console.error('HTTP request failed:', error);
      console.error('Error details:', {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        error: error.error
      });

      const errorResponse: ChecklistImageUploadResponse = {
        success: false,
        error: error.error?.error || error.error?.message || error.message || 'Upload failed'
      };
      
      console.error('Throwing error response:', errorResponse);
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
          'photo-checklist/delete-image.php',
          {
            body: { image_url: imageUrl }
          }
        )
      );
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.error?.error || error.message || 'Delete failed'
      };
    }
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
