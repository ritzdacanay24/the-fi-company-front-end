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

@Injectable({ providedIn: 'root' })
export class BucketBrowserService {
  private readonly baseUrl = 'apiV2/file-storage/bucket';

  constructor(private readonly http: HttpClient) {}

  list(prefix = '', continuationToken = '', maxKeys = 200, delimiter: string | undefined = '/'): Promise<BucketBrowserList> {
    const params = new URLSearchParams();
    if (prefix) params.set('prefix', prefix);
    if (continuationToken) params.set('continuationToken', continuationToken);
    if (delimiter !== undefined) params.set('delimiter', delimiter);
    params.set('maxKeys', String(maxKeys));

    const query = params.toString();
    const url = query ? `${this.baseUrl}/list?${query}` : `${this.baseUrl}/list`;
    return firstValueFrom(this.http.get<BucketBrowserList>(url));
  }

  getSignedUrl(key: string): Promise<{ key: string; fileName: string; url: string }> {
    const encodedKey = encodeURIComponent(key);
    return firstValueFrom(this.http.get<{ key: string; fileName: string; url: string }>(`${this.baseUrl}/signed-url?key=${encodedKey}`));
  }

  deleteObject(key: string): Promise<{ success: boolean; key: string }> {
    return firstValueFrom(this.http.request<{ success: boolean; key: string }>('delete', `${this.baseUrl}/object`, {
      body: { key },
    }));
  }

  deletePrefix(prefix: string): Promise<{ success: boolean; prefix: string }> {
    return firstValueFrom(this.http.request<{ success: boolean; prefix: string }>('delete', `${this.baseUrl}/prefix`, {
      body: { prefix },
    }));
  }
}
