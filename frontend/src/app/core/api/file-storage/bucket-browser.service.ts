import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface BucketBrowserItem {
  key: string;
  size: number;
  lastModified?: string;
  url: string;
}

export interface BucketBrowserList {
  bucket: string;
  prefix: string;
  delimiter: string;
  nextContinuationToken?: string;
  prefixes: string[];
  items: BucketBrowserItem[];
}

export interface BucketBrowserAvailableBuckets {
  defaultBucket: string;
  buckets: string[];
}

@Injectable({ providedIn: 'root' })
export class BucketBrowserService {
  private readonly baseUrl = 'apiV2/file-storage/bucket';

  constructor(private readonly http: HttpClient) {}

  list(
    prefix = '',
    continuationToken = '',
    maxKeys = 200,
    delimiter: string | undefined = '/',
    bucket?: string,
  ): Promise<BucketBrowserList> {
    const params = new URLSearchParams();
    if (bucket) params.set('bucket', bucket);
    if (prefix) params.set('prefix', prefix);
    if (continuationToken) params.set('continuationToken', continuationToken);
    if (delimiter !== undefined) params.set('delimiter', delimiter);
    params.set('maxKeys', String(maxKeys));

    const query = params.toString();
    const url = query ? `${this.baseUrl}/list?${query}` : `${this.baseUrl}/list`;
    return firstValueFrom(this.http.get<BucketBrowserList>(url));
  }

  listBuckets(): Promise<BucketBrowserAvailableBuckets> {
    return firstValueFrom(this.http.get<BucketBrowserAvailableBuckets>(`${this.baseUrl}/available`));
  }

  getSignedUrl(key: string, bucket?: string): Promise<{ key: string; fileName: string; url: string }> {
    const params = new URLSearchParams();
    params.set('key', key);
    if (bucket) params.set('bucket', bucket);
    return firstValueFrom(this.http.get<{ key: string; fileName: string; url: string }>(`${this.baseUrl}/signed-url?${params.toString()}`));
  }

  getObjectBlob(key: string, bucket?: string): Promise<Blob> {
    const params = new URLSearchParams();
    params.set('key', key);
    if (bucket) params.set('bucket', bucket);
    return firstValueFrom(this.http.get(`${this.baseUrl}/object?${params.toString()}`, { responseType: 'blob' }));
  }

  deleteObject(key: string, bucket?: string): Promise<{ success: boolean; key: string }> {
    return firstValueFrom(this.http.request<{ success: boolean; key: string }>('delete', `${this.baseUrl}/object`, {
      body: {
        key,
        bucket,
      },
    }));
  }

  deletePrefix(prefix: string, bucket?: string): Promise<{ success: boolean; prefix: string }> {
    return firstValueFrom(this.http.request<{ success: boolean; prefix: string }>('delete', `${this.baseUrl}/prefix`, {
      body: {
        prefix,
        bucket,
      },
    }));
  }
}
