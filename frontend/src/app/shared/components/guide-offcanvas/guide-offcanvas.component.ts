import { CommonModule } from '@angular/common';
import { Component, Input, Optional } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { AppGuideData } from '@app/core/services/app-guide.service';

@Component({
  selector: 'app-guide-offcanvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guide-offcanvas.component.html',
  styleUrls: ['./guide-offcanvas.component.scss'],
})
export class GuideOffcanvasComponent {
  @Input() data: AppGuideData | null = null;
  @Input() modeLabel = '';
  @Input() closeHandler: (() => void) | null = null;

  constructor(@Optional() public activeOffcanvas: NgbActiveOffcanvas | null) {}

  closeGuide(): void {
    if (this.activeOffcanvas) {
      this.activeOffcanvas.dismiss();
    }

    if (this.closeHandler) {
      this.closeHandler();
    }
  }

  jumpTo(selector: string): void {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLElement)) {
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    // Temporary focus ring for guide jumps.
    el.classList.add('app-tour-highlight');
    window.setTimeout(() => {
      el.classList.remove('app-tour-highlight');
    }, 1100);
  }
}
