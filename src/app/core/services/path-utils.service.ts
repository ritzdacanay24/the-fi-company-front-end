import { Injectable, Inject } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class PathUtilsService {

  constructor(
    @Inject(APP_BASE_HREF) private baseHref: string,
    private location: Location,
    private router: Router
  ) {}

  /**
   * Get the current base path (e.g., /dist/web or /dist/web-v1)
   */
  getBasePath(): string {
    return this.baseHref;
  }

  /**
   * Normalize a path by prepending the base href if needed
   */
  normalizePath(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    if (path.startsWith(this.baseHref)) {
      return path;
    }
    
    return this.location.prepareExternalUrl(path);
  }

  /**
   * Build a URL relative to the current base path
   */
  buildUrl(relativePath: string): string {
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.substring(1);
    }
    
    return `${this.baseHref}/${relativePath}`;
  }

  /**
   * Generate a router URL that respects the base href
   */
  generateRouterUrl(commands: any[]): string {
    const urlTree = this.router.createUrlTree(commands);
    return this.location.prepareExternalUrl(this.router.serializeUrl(urlTree));
  }

  /**
   * Create an external URL for opening in new windows/tabs
   */
  createExternalUrl(commands: any[], queryParams?: any): string {
    const urlTree = this.router.createUrlTree(commands, { queryParams });
    const url = this.router.serializeUrl(urlTree);
    return this.location.prepareExternalUrl(url);
  }

  /**
   * Open a URL in a new window, respecting the base path
   */
  openInNewWindow(relativePath: string): void {
    const fullUrl = this.buildUrl(relativePath);
    window.open(fullUrl, '_blank');
  }
}