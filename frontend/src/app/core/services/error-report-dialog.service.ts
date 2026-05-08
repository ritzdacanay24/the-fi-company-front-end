import { Injectable, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ErrorReportDialogComponent } from '../components/error-report-dialog/error-report-dialog.component';
import { TicketType, TicketPriority } from '@app/shared/interfaces/ticket.interface';

export interface ErrorReportDialogData {
  type?: TicketType;
  title?: string;
  description?: string;
  priority?: TicketPriority;
}

/**
 * Opens the support ticket submit dialog.
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorReportDialogService {
  private readonly modalService = inject(NgbModal);

  open(initialData?: ErrorReportDialogData): Promise<boolean> {
    const modalRef = this.modalService.open(ErrorReportDialogComponent, {
      size: 'lg',
      backdrop: 'static',
      centered: true
    });

    if (initialData) {
      const instance = modalRef.componentInstance as ErrorReportDialogComponent;
      if (initialData.type) instance.form.patchValue({ type: initialData.type });
      if (initialData.title) instance.form.patchValue({ title: initialData.title });
      if (initialData.description) {
        const html = this.convertMarkdownToQuillHtml(initialData.description);
        instance.form.patchValue({ description: html });
      }
      if (initialData.priority) instance.form.patchValue({ priority: initialData.priority });
    }

    return modalRef.result.then(
      (result) => !!result,
      () => false
    );
  }

  private convertMarkdownToQuillHtml(markdown: string): string {
    let html = markdown;

    // **bold** → <strong>bold</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const sections = html.split('\n\n');
    const processed = sections.map(section => {
      const lines = section.split('\n');
      const bulletLines = lines.filter(l => l.trimStart().startsWith('- '));
      const nonBullet = lines.filter(l => !l.trimStart().startsWith('- '));

      let result = '';
      if (nonBullet.length) result += nonBullet.join('<br>');
      if (bulletLines.length) {
        const items = bulletLines.map(l => `<li>${l.trimStart().slice(2)}</li>`).join('');
        result += `<ul>${items}</ul>`;
      }
      return result;
    });

    return processed.join('<br><br>');
  }
}
