import { Injectable } from '@angular/core';
import { BucketBrowserService } from './bucket-browser.service';

/**
 * Interface for media with storage location metadata.
 * Used by components storing S3 URLs with storage_location tracking.
 */
export interface S3MediaItem {
  url: string;
  storage_location?: 's3' | 'legacy' | null;
  [key: string]: any;
}

/**
 * S3MediaService - Centralized service for handling S3 signed URLs and media display.
 * 
 * Architecture:
 * - Media stores `url` as original (unsigned) URL
 * - `storage_location` metadata tells us if signing is needed
 * - At upload: Sign immediately for instant preview
 * - At display: Sign on-demand only for S3 URLs
 * - Non-S3 URLs pass through unchanged
 * 
 * Usage:
 * 1. Upload handler sets storage_location: 's3' | 'legacy'
 * 2. Component calls getDisplayUrl(image) when displaying from DB
 * 3. Service handles signing transparently
 */
@Injectable({ providedIn: 'root' })
export class S3MediaService {
  constructor(private bucketBrowser: BucketBrowserService) {}

  /**
   * Get display URL for media based on storage location.
   * If S3, signs on-demand for viewing.
   * If legacy, returns original URL as-is.
   * 
   * @param media Media item with url and storage_location
   * @returns Display-ready URL (signed if S3, original if legacy)
   */
  async getDisplayUrl(media: S3MediaItem): Promise<string> {
    if (!media?.url) return '';

    // Only sign if explicitly marked as S3
    if (media.storage_location === 's3' && media.url.includes('amazonaws')) {
      try {
        return await this.getSignedUrl(media.url);
      } catch (error) {
        console.warn('Failed to sign S3 URL, using original:', error);
        return media.url;
      }
    }

    // Legacy or non-S3 URLs return as-is
    return media.url;
  }

  /**
   * Get signed URL for S3 media.
   * Extracts S3 key from URL and calls backend signing endpoint.
   * 
   * @param s3Url Full S3 URL (https://bucket.s3.amazonaws.com/key/path/file)
   * @returns Signed URL valid for ~1 hour
   */
  async getSignedUrl(s3Url: string): Promise<string> {
    if (!s3Url || !s3Url.includes('amazonaws')) {
      return s3Url;
    }

    try {
      const key = this.extractS3Key(s3Url);
      const result = await this.bucketBrowser.getSignedUrl(key);
      return result.url || s3Url;
    } catch (error) {
      console.warn('Failed to sign S3 URL:', error);
      return s3Url;
    }
  }

  /**
   * Determine storage location from URL.
   * Returns 's3' if URL is from S3, 'legacy' otherwise.
   * 
   * @param url URL to check
   * @returns 's3' | 'legacy'
   */
  detectStorageLocation(url: string): 's3' | 'legacy' {
    if (!url) return 'legacy';
    return (url.includes('s3') || url.includes('amazonaws')) ? 's3' : 'legacy';
  }

  /**
   * Sign URL immediately (for upload preview).
   * Called right after upload to get signed URL for instant preview.
   * 
   * @param s3Url S3 URL from upload response
   * @returns Signed URL, or original if signing fails
   */
  async signForPreview(s3Url: string): Promise<string> {
    return this.getSignedUrl(s3Url);
  }

  /**
   * Extract S3 key from full URL.
   * Handles both formats:
   * - Virtual-hosted: https://bucket-name.s3.amazonaws.com/key/path/file.jpg
   * - Path-style: https://s3.amazonaws.com/bucket-name/key/path/file.jpg
   * 
   * @param s3Url Full S3 URL
   * @returns S3 key (path after bucket name)
   */
  private extractS3Key(s3Url: string): string {
    try {
      const url = new URL(s3Url);
      let key = url.pathname.substring(1); // Remove leading slash
      
      // Handle virtual-hosted style: bucket.s3.amazonaws.com/key
      if (url.hostname.includes('.s3.amazonaws.com') || url.hostname.includes('.s3.')) {
        const bucketPrefix = url.hostname.split('.')[0];
        if (key.startsWith(`${bucketPrefix}/`)) {
          key = key.substring(bucketPrefix.length + 1);
        }
        return decodeURIComponent(key);
      }
      
      // Handle path-style: s3.amazonaws.com/bucket/key
      // Pathname is like /bucket-name/key/path/file
      const parts = key.split('/');
      if (parts.length > 1) {
        // Remove bucket name from path (first part)
        key = parts.slice(1).join('/');
      }
      
      return decodeURIComponent(key);
    } catch {
      return s3Url;
    }
  }
}
