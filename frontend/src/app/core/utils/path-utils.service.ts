import { Injectable, Inject } from '@angular/core';
import { Location, APP_BASE_HREF } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PathUtilsService {
  
  constructor(
    private location: Location,
    private router: Router,
    @Inject(APP_BASE_HREF) private baseHref: string
  ) {}

  /**
   * Normalizes path by removing production build prefixes
   * Uses Angular's Location service for proper path handling
   * @param pathName - The path to normalize
   * @returns Normalized path without build prefixes
   */
  normalizePath(pathName: string): string {
    if (!environment.production) {
      return pathName;
    }

    // Use Angular's Location service to normalize the path
    let normalizedPath = this.location.normalize(pathName);

    // Remove base href if it exists in the path
    if (this.baseHref && this.baseHref !== '/' && normalizedPath.startsWith(this.baseHref)) {
      normalizedPath = normalizedPath.substring(this.baseHref.length);
    }

    // Additional cleanup for legacy paths
    const prefixesToRemove = [
      '/velzon/angular/modern',
      /\/dist\/web(-v\d+)?/, // Handles /dist/web, /dist/web-v1, /dist/web-v2, etc.
    ];

    for (const prefix of prefixesToRemove) {
      if (typeof prefix === 'string') {
        normalizedPath = normalizedPath.replace(prefix, '');
      } else {
        // Handle regex patterns
        normalizedPath = normalizedPath.replace(prefix, '');
      }
    }

    return normalizedPath || '/';
  }

  /**
   * Creates a URL for opening in new window/tab with proper path normalization
   * Uses Angular Router for proper URL generation
   * @param route - The route path or route array
   * @returns Properly formatted URL for window.open()
   */
  createExternalUrl(route: string | any[]): string {
    // Use Angular Router to create the URL tree
    const urlTree = this.router.createUrlTree(Array.isArray(route) ? route : [route]);
    
    // Serialize the URL with proper base href handling
    return this.router.serializeUrl(urlTree);
  }

  /**
   * Gets the current normalized path
   * @returns Current path without build prefixes
   */
  getCurrentNormalizedPath(): string {
    return this.normalizePath(this.location.path());
  }

  /**
   * Gets the current base path for the application
   * @returns Base path string from Angular's APP_BASE_HREF
   */
  getBasePath(): string {
    return this.baseHref || '/';
  }
}