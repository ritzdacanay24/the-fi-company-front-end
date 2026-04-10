import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  selector: 'app-checklist-app-install',
  templateUrl: './checklist-app-install.component.html',
  styleUrls: ['./checklist-app-install.component.scss']
})
export class ChecklistAppInstallComponent implements OnInit, OnDestroy {
  private previousManifestHref: string | null = null;
  private previousThemeColor: string | null = null;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.swapManifest('checklist-manifest.webmanifest');
    this.setThemeColor('#0d6efd');

    const search = this.document.defaultView?.location?.search || '';
    const params = new URLSearchParams(search);
    if (params.get('launch') === '1') {
      this.openWorkflow();
    }
  }

  ngOnDestroy(): void {
    this.restoreManifest();
    this.restoreThemeColor();
  }

  openWorkflow(): void {
    this.router.navigate(['/standalone/checklist']);
  }

  private swapManifest(href: string): void {
    let manifestLink = this.document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;

    if (!manifestLink) {
      manifestLink = this.document.createElement('link');
      manifestLink.setAttribute('rel', 'manifest');
      this.document.head.appendChild(manifestLink);
    }

    this.previousManifestHref = manifestLink.getAttribute('href');
    manifestLink.setAttribute('href', href);
  }

  private restoreManifest(): void {
    const manifestLink = this.document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      return;
    }

    if (this.previousManifestHref) {
      manifestLink.setAttribute('href', this.previousManifestHref);
      return;
    }

    manifestLink.setAttribute('href', 'manifest.webmanifest');
  }

  private setThemeColor(color: string): void {
    let themeMeta = this.document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;

    if (!themeMeta) {
      themeMeta = this.document.createElement('meta');
      themeMeta.setAttribute('name', 'theme-color');
      this.document.head.appendChild(themeMeta);
    }

    this.previousThemeColor = themeMeta.getAttribute('content');
    themeMeta.setAttribute('content', color);
  }

  private restoreThemeColor(): void {
    const themeMeta = this.document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!themeMeta) {
      return;
    }

    themeMeta.setAttribute('content', this.previousThemeColor || '#2e3230');
  }
}
