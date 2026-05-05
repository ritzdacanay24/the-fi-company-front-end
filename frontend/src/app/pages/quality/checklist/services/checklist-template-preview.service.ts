import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { ChecklistTemplate } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';
import { PhotoChecklistV2Service } from '@app/core/api/photo-checklist-config/photo-checklist-v2.service';

@Injectable({
  providedIn: 'root',
})
export class ChecklistTemplatePreviewService {
  private readonly templateCache = new Map<number, Observable<ChecklistTemplate>>();

  constructor(private readonly photoChecklistService: PhotoChecklistV2Service) {}

  getTemplateById(templateId: number, forceRefresh = false): Observable<ChecklistTemplate> {
    if (!templateId || templateId <= 0) {
      throw new Error('templateId must be a positive number');
    }

    if (!forceRefresh && this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }

    const request$ = this.photoChecklistService
      .getTemplate(templateId, { includeInactive: true })
      .pipe(shareReplay(1));

    this.templateCache.set(templateId, request$);
    return request$;
  }

  clearTemplateCache(templateId?: number): void {
    if (templateId && templateId > 0) {
      this.templateCache.delete(templateId);
      return;
    }

    this.templateCache.clear();
  }
}
