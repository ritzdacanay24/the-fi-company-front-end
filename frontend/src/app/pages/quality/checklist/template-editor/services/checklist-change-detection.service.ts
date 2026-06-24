import { Injectable } from '@angular/core';

/**
 * Pure helper service for detecting and describing changes between checklist template versions.
 * All methods are stateless — they operate only on the arguments passed in.
 */
@Injectable({ providedIn: 'root' })
export class ChecklistChangeDetectionService {

  /** Recursively flatten a nested items tree into a flat array with level/parent_id set. */
  flattenNestedItems(items: any[], level = 0, parentId: number | null = null): any[] {
    const result: any[] = [];
    for (const item of items) {
      const flat = { ...item, level: item?.level ?? level, parent_id: item?.parent_id ?? parentId };
      const children = flat.children;
      delete flat.children;
      result.push(flat);
      if (Array.isArray(children) && children.length > 0) {
        result.push(...this.flattenNestedItems(children, level + 1, item.id));
      }
    }
    return result;
  }

  /** Increment the minor version of a version string (e.g. "1.0" → "1.1"). */
  getNextVersion(currentVersion: string | number | null | undefined): string {
    if (!currentVersion) return '1.0';
    const parts = String(currentVersion).split('.');
    const major = parseInt(parts[0], 10) || 1;
    const minor = parseInt(parts[1], 10) || 0;
    return `${major}.${minor + 1}`;
  }

  /** Produce a structured diff between a saved template and new form data. */
  detectTemplateChanges(originalTemplate: any, newData: any): any {
    const changes: any = {
      has_changes: false,
      field_changes: [],
      items_added: [],
      items_removed: [],
      items_modified: []
    };

    const fieldsToCheck = [
      { key: 'name', label: 'Template Name' },
      { key: 'description', label: 'Description' },
      { key: 'part_number', label: 'Part Number' },
      { key: 'product_type', label: 'Product Type' },
      { key: 'category', label: 'Category' },
      { key: 'is_active', label: 'Active Status' },
      { key: 'max_upload_size_mb', label: 'Max Upload Size' }
    ];

    for (const field of fieldsToCheck) {
      const normalizedOld = this.normalizeTemplateFieldValue(field.key, originalTemplate[field.key]);
      const normalizedNew = this.normalizeTemplateFieldValue(field.key, newData[field.key]);
      if (normalizedOld !== normalizedNew) {
        changes.has_changes = true;
        changes.field_changes.push({ field: field.label, old_value: normalizedOld, new_value: normalizedNew });
      }
    }

    const oldItemsRaw = originalTemplate.items || [];
    const oldItems = Array.isArray(oldItemsRaw) && oldItemsRaw.some((i: any) => Array.isArray(i?.children) && i.children.length > 0)
      ? this.flattenNestedItems(oldItemsRaw)
      : oldItemsRaw;
    const newItems: any[] = newData.items || [];

    const newItemsById = new Map<number, any>();
    const newItemsWithoutId: any[] = [];
    for (const item of newItems) {
      item.id ? newItemsById.set(item.id, item) : newItemsWithoutId.push(item);
    }

    for (const oldItem of oldItems) {
      if (!oldItem.id) continue;
      const newItem = newItemsById.get(oldItem.id);
      if (!newItem) {
        changes.has_changes = true;
        changes.items_removed.push({ title: oldItem.title, order_index: oldItem.order_index });
      } else {
        const itemChanges = this.compareItems(oldItem, newItem);
        if (itemChanges.length > 0) {
          changes.has_changes = true;
          changes.items_modified.push({ title: newItem.title, order_index: newItem.order_index, changes: itemChanges });
        }
        newItemsById.delete(oldItem.id);
      }
    }

    const addedItems: any[] = [...newItemsWithoutId];
    newItemsById.forEach(item => addedItems.push(item));
    if (addedItems.length > 0) {
      changes.has_changes = true;
      for (const item of addedItems) {
        changes.items_added.push({ title: item.title, order_index: item.order_index });
      }
    }

    return changes;
  }

  /** Compare two versions of the same item and return a list of field-level changes. */
  compareItems(oldItem: any, newItem: any): any[] {
    const itemChanges: any[] = [];
    const fieldsToCheck = [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'is_required', label: 'Active' },
      { key: 'sample_image_url', label: 'Sample Image' },
      { key: 'sample_images', label: 'Sample & Reference Images' },
      { key: 'sample_videos', label: 'Sample Videos' },
      { key: 'links', label: 'Links' },
      { key: 'photo_requirements', label: 'Photo Requirements' },
      { key: 'submission_type', label: 'Submission Type' },
      { key: 'submission_time_seconds', label: 'Submission Time Limit' },
      { key: 'order_index', label: 'Position' },
      { key: 'level', label: 'Hierarchy Level' },
      { key: 'parent_id', label: 'Parent Item' }
    ];

    for (const field of fieldsToCheck) {
      const oldValue = oldItem[field.key];
      const newValue = newItem[field.key];
      if (this.isEmptyValue(oldValue) && this.isEmptyValue(newValue)) continue;

      if (field.key === 'sample_images') {
        if (this.sortedStringify(this.normalizeSampleImages(oldValue)) !== this.sortedStringify(this.normalizeSampleImages(newValue))) {
          itemChanges.push({ field: field.label, old_value: this.normalizeSampleImages(oldValue), new_value: this.normalizeSampleImages(newValue) });
        }
      } else if (field.key === 'sample_videos') {
        if (this.sortedStringify(this.normalizeSampleVideos(oldValue)) !== this.sortedStringify(this.normalizeSampleVideos(newValue))) {
          itemChanges.push({ field: field.label, old_value: this.normalizeSampleVideos(oldValue), new_value: this.normalizeSampleVideos(newValue) });
        }
      } else if (field.key === 'links') {
        if (this.sortedStringify(this.normalizeLinks(oldValue)) !== this.sortedStringify(this.normalizeLinks(newValue))) {
          itemChanges.push({ field: field.label, old_value: this.normalizeLinks(oldValue), new_value: this.normalizeLinks(newValue) });
        }
      } else if (field.key === 'photo_requirements') {
        if (this.sortedStringify(this.normalizePhotoRequirements(oldValue)) !== this.sortedStringify(this.normalizePhotoRequirements(newValue))) {
          itemChanges.push({ field: field.label, old_value: this.normalizePhotoRequirements(oldValue), new_value: this.normalizePhotoRequirements(newValue) });
        }
      } else if (typeof oldValue === 'object' && oldValue !== null && typeof newValue === 'object' && newValue !== null) {
        if (this.sortedStringify(this.normalizeValue(oldValue)) !== this.sortedStringify(this.normalizeValue(newValue))) {
          itemChanges.push({ field: field.label, old_value: oldValue, new_value: newValue });
        }
      } else if (typeof oldValue === 'number' || typeof newValue === 'number') {
        const oldNum = (oldValue == null) ? null : Number(oldValue);
        const newNum = (newValue == null) ? null : Number(newValue);
        if (oldNum !== newNum) {
          itemChanges.push({ field: field.label, old_value: oldValue, new_value: newValue });
        }
      } else if (oldValue !== newValue) {
        itemChanges.push({ field: field.label, old_value: oldValue, new_value: newValue });
      }
    }
    return itemChanges;
  }

  /** Build a human-readable revision summary from a change diff. */
  buildRevisionSummary(changes: any): string {
    if (!changes?.has_changes) return '';
    const lines: string[] = [];

    if (changes.field_changes?.length) {
      lines.push(`Template fields updated: ${changes.field_changes.map((c: any) => c.field).join(', ')}`);
    }
    if (changes.items_added?.length) {
      lines.push(`Items added: ${changes.items_added.map((i: any) => i.title || 'Untitled').join(', ')}`);
    }
    if (changes.items_removed?.length) {
      lines.push(`Items removed: ${changes.items_removed.map((i: any) => i.title || 'Untitled').join(', ')}`);
    }
    if (changes.items_modified?.length) {
      const combined = new Map<string, Set<string>>();
      for (const item of changes.items_modified) {
        const key = `${item.title || 'Untitled'}|${item.order_index ?? ''}`;
        if (!combined.has(key)) combined.set(key, new Set<string>());
        const fields: string[] = (item.changes || []).map((c: any) => c.field).filter(Boolean);
        for (const f of fields) combined.get(key)!.add(f);
      }
      combined.forEach((fields, key) => {
        const [title, orderIndex] = key.split('|');
        const fieldList = Array.from(fields).join(', ');
        if (fieldList) {
          lines.push(`Item "${title}"${orderIndex ? ` (#${orderIndex})` : ''}: ${fieldList}`);
        }
      });
    }

    return lines.join('\n');
  }

  /** Short summary string used in revision records. */
  generateChangesSummary(changes: any): string {
    if (!changes) return 'Template updated';
    const parts: string[] = [];
    if (changes.field_changes?.length) parts.push(`${changes.field_changes.length} field change(s)`);
    if (changes.items_added?.length) parts.push(`${changes.items_added.length} item(s) added`);
    if (changes.items_removed?.length) parts.push(`${changes.items_removed.length} item(s) removed`);
    if (changes.items_modified?.length) parts.push(`${changes.items_modified.length} item(s) modified`);
    return parts.join(', ') || 'No significant changes';
  }

  // ─── Normalization helpers ───────────────────────────────────────────────

  normalizeTemplateFieldValue(key: string, value: any): any {
    if (key === 'is_active') return !!value;
    if (key === 'max_upload_size_mb') {
      if (value == null || value === '') return null;
      const n = Number(value);
      return Number.isNaN(n) ? null : n;
    }
    if (typeof value === 'string') {
      const t = value.trim();
      return t === '' ? null : t;
    }
    return value === undefined ? null : value;
  }

  normalizeSampleImages(images: any): any {
    if (!Array.isArray(images)) return null;
    return images
      .map(img => ({
        url: img.url, label: img.label || '', description: img.description || '',
        type: img.type || 'photo', image_type: img.image_type || 'sample',
        is_primary: !!img.is_primary, order_index: img.order_index || 0
      }))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  normalizeSampleVideos(videos: any): any {
    if (!Array.isArray(videos)) return null;
    return videos
      .map(vid => ({
        url: vid.url, label: vid.label || '', description: vid.description || '',
        type: vid.type || 'video', is_primary: !!vid.is_primary,
        order_index: vid.order_index || 0, duration_seconds: vid.duration_seconds ?? null
      }))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  normalizeLinks(links: any): any {
    if (!Array.isArray(links)) return null;
    return links
      .map(l => ({ title: (l.title || '').trim(), url: (l.url || '').trim(), description: (l.description || '').trim() }))
      .sort((a, b) => `${a.title}|${a.url}|${a.description}`.localeCompare(`${b.title}|${b.url}|${b.description}`));
  }

  normalizePhotoRequirements(req: any): any {
    const defaults = { angle: '', distance: '', lighting: '', focus: '', min_photos: null, max_photos: null, picture_required: true, max_video_duration_seconds: 30 };
    if (!req || typeof req !== 'object') return defaults;
    const n = {
      angle: (req.angle || '').trim(),
      distance: (req.distance || '').trim(),
      lighting: (req.lighting || '').trim(),
      focus: (req.focus || '').trim(),
      min_photos: (req.min_photos == null || req.min_photos === '') ? null : Number(req.min_photos),
      max_photos: (req.max_photos == null || req.max_photos === '') ? null : Number(req.max_photos),
      picture_required: req.picture_required === undefined ? true : !!req.picture_required,
      max_video_duration_seconds: (req.max_video_duration_seconds == null || req.max_video_duration_seconds === '') ? 30 : Number(req.max_video_duration_seconds)
    };
    if (Number.isNaN(n.min_photos as any)) n.min_photos = null;
    if (Number.isNaN(n.max_photos as any)) n.max_photos = null;
    if (Number.isNaN(n.max_video_duration_seconds as any)) n.max_video_duration_seconds = 30;
    return n;
  }

  isEmptyValue(value: any): boolean {
    if (value == null) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    if (typeof value === 'string') return value.trim() === '';
    return false;
  }

  normalizeValue(value: any): any {
    if (value == null) return null;
    if (typeof value === 'object' && Object.keys(value).length === 0) return null;
    return value;
  }

  sortedStringify(obj: any): string {
    if (obj == null) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return JSON.stringify(obj.map(i => this.sortedStringify(i)));
    const sorted: any = {};
    for (const k of Object.keys(obj).sort()) sorted[k] = obj[k];
    return JSON.stringify(sorted);
  }
}
