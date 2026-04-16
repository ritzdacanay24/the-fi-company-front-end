import { Injectable } from '@angular/core';
import { THE_FI_COMPANY_LAYOUT } from '@app/layouts/topbar/topbar.component';

interface ThemeLayoutConfig {
  LAYOUT: string;
  LAYOUT_MODE: string;
  LAYOUT_WIDTH: string;
  LAYOUT_POSITION: string;
  TOPBAR: string;
  SIDEBAR_COLOR: string;
  SIDEBAR_SIZE: string;
  SIDEBAR_IMAGE: string;
  SIDEBAR_VIEW: string;
  DATA_PRELOADER: string;
  SIDEBAR_VISIBILITY: string;
}

@Injectable({ providedIn: 'root' })
export class StandaloneLayoutThemeService {
  applyThemeLayoutAttributes(): void {
    const defaults: ThemeLayoutConfig = {
      LAYOUT: 'vertical',
      LAYOUT_MODE: 'light',
      LAYOUT_WIDTH: 'fluid',
      LAYOUT_POSITION: 'fixed',
      TOPBAR: 'light',
      SIDEBAR_COLOR: 'dark',
      SIDEBAR_SIZE: 'lg',
      SIDEBAR_IMAGE: 'none',
      SIDEBAR_VIEW: 'default',
      DATA_PRELOADER: 'disable',
      SIDEBAR_VISIBILITY: 'show',
    };

    let saved: Partial<ThemeLayoutConfig> | null = null;
    try {
      const raw = localStorage.getItem(THE_FI_COMPANY_LAYOUT);
      saved = raw ? (JSON.parse(raw) as Partial<ThemeLayoutConfig>) : null;
    } catch {
      saved = null;
    }

    const data: ThemeLayoutConfig = { ...defaults, ...(saved || {}) };

    document.documentElement.setAttribute('data-layout', data.LAYOUT);
    document.documentElement.setAttribute('data-bs-theme', data.LAYOUT_MODE);
    document.documentElement.setAttribute('data-layout-width', data.LAYOUT_WIDTH);
    document.documentElement.setAttribute('data-layout-position', data.LAYOUT_POSITION);
    document.documentElement.setAttribute('data-topbar', data.TOPBAR);
    document.documentElement.setAttribute('data-sidebar', data.SIDEBAR_COLOR);
    document.documentElement.setAttribute('data-sidebar-size', data.SIDEBAR_SIZE);
    document.documentElement.setAttribute('data-sidebar-image', data.SIDEBAR_IMAGE);
    document.documentElement.setAttribute('data-layout-style', data.SIDEBAR_VIEW);
    document.documentElement.setAttribute('data-preloader', data.DATA_PRELOADER);
    document.documentElement.setAttribute('data-sidebar-visibility', data.SIDEBAR_VISIBILITY);
  }
}