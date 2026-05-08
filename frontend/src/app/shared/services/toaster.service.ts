import { Injectable, inject } from '@angular/core';
import { NotificationService } from '@app/core/services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class ToasterService {
  private readonly notification = inject(NotificationService);

  showSuccess(message?: string): void {
    if (!message) return;
    this.notification.success(message);
  }

  showError(message?: string): void {
    this.notification.error(message ?? 'An unexpected error occurred.');
  }

  showWarning(message?: string): void {
    if (!message) return;
    this.notification.warning(message);
  }

  showInfo(message?: string): void {
    if (!message) return;
    this.notification.info(message);
  }

  clearAll(): void {
    this.notification.clear();
  }
}
