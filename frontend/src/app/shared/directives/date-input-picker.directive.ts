import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: 'input[type="date"]',
  standalone: true,
})
export class DateInputPickerDirective {
  constructor(private readonly el: ElementRef<HTMLInputElement>) {}

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    this.tryOpenNativePicker(event);
  }

  @HostListener('keydown.enter')
  onEnter(): void {
    this.tryOpenNativePicker();
  }

  @HostListener('keydown.space')
  onSpace(): void {
    this.tryOpenNativePicker();
  }

  private tryOpenNativePicker(event?: Event): void {
    const input = this.el.nativeElement as HTMLInputElement & {
      showPicker?: () => void;
    };

    if ((event && !event.isTrusted) || input.disabled || input.readOnly) {
      return;
    }

    // showPicker is browser-dependent and can still reject in some contexts.
    // Swallow the error so the app never breaks from a native picker restriction.
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        // No-op fallback: native control remains usable via the calendar icon.
      }
    }
  }
}
