import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QualityVersionControlRepository } from './quality-version-control.repository';

@Injectable()
export class QualityVersionControlService {
  constructor(private readonly repository: QualityVersionControlRepository) {}

  async createChecklistDocument(payload: {
    prefix?: string;
    title?: string;
    description?: string;
    department?: string;
    category?: string;
    template_id?: number;
    created_by?: string;
    revision_description?: string;
  }) {
    const required: Array<keyof typeof payload> = [
      'prefix',
      'title',
      'department',
      'category',
      'template_id',
      'created_by',
      'revision_description',
    ];

    for (const field of required) {
      const value = payload[field];
      if (value == null || String(value).trim() === '') {
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    }

    const result = await this.repository.createChecklistDocumentWithInitialRevision({
      prefix: String(payload.prefix),
      title: String(payload.title),
      description: payload.description ? String(payload.description) : undefined,
      department: String(payload.department),
      category: String(payload.category),
      template_id: Number(payload.template_id),
      created_by: String(payload.created_by),
      revision_description: String(payload.revision_description),
    });

    return {
      success: true,
      document_id: result.document_id,
      document_number: result.document_number,
      revision_id: result.revision_id,
      revision_number: 1,
      message: `Document ${result.document_number} created successfully with Rev 1`,
    };
  }

  async createChecklistRevision(payload: {
    document_id?: number;
    template_id?: number;
    revision_description?: string;
    changes_summary?: string;
    items_added?: number;
    items_removed?: number;
    items_modified?: number;
    changes_detail?: unknown;
    created_by?: string;
  }) {
    const required: Array<keyof typeof payload> = [
      'document_id',
      'template_id',
      'revision_description',
      'created_by',
    ];

    for (const field of required) {
      const value = payload[field];
      if (value == null || String(value).trim() === '') {
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    }

    const itemsAdded = Number(payload.items_added ?? 0);
    const itemsRemoved = Number(payload.items_removed ?? 0);
    const itemsModified = Number(payload.items_modified ?? 0);

    const changesSummary = String(payload.changes_summary || '').trim() || [
      itemsAdded > 0 ? `Added ${itemsAdded} item(s)` : '',
      itemsRemoved > 0 ? `Removed ${itemsRemoved} item(s)` : '',
      itemsModified > 0 ? `Modified ${itemsModified} item(s)` : '',
    ].filter(Boolean).join(', ');

    const result = await this.repository.createChecklistRevisionWithMetadata({
      document_id: Number(payload.document_id),
      template_id: Number(payload.template_id),
      revision_description: String(payload.revision_description),
      changes_summary: changesSummary,
      items_added: itemsAdded,
      items_removed: itemsRemoved,
      items_modified: itemsModified,
      changes_detail: payload.changes_detail,
      created_by: String(payload.created_by),
    });

    return {
      success: true,
      revision_id: result.revision_id,
      revision_number: result.revision_number,
      document_number: result.document_number,
      message: `${result.document_number}, Rev ${result.revision_number} created successfully (Pending Approval)`,
    };
  }

  async approveChecklistRevision(payload: { revision_id?: number; approved_by?: string }) {
    if (!payload.revision_id || !payload.approved_by) {
      throw new BadRequestException('Missing required fields: revision_id, approved_by');
    }

    await this.repository.approveRevision(Number(payload.revision_id), String(payload.approved_by));
    return {
      success: true,
      message: 'Revision approved successfully',
    };
  }

  async getChecklistRevisionHistory(documentId: number) {
    if (!documentId || Number.isNaN(documentId)) {
      throw new BadRequestException('Missing required parameter: document_id');
    }

    return this.repository.getChecklistRevisionHistory(documentId);
  }

  async getDocuments(filters?: {
    type?: string;
    category?: string;
    department?: string;
    status?: string;
    search?: string;
  }) {
    return this.repository.getDocuments(filters);
  }

  async getDocument(id: number) {
    const doc = await this.repository.getDocumentById(id);
    if (!doc) {
      throw new NotFoundException(`Quality document ${id} not found`);
    }
    return doc;
  }

  async createDocument(payload: {
    document_type?: string;
    prefix?: string;
    title: string;
    description?: string;
    category?: string;
    department: string;
    created_by?: string;
    initial_revision?: {
      title?: string;
      description?: string;
      change_description?: string;
      effective_date?: string;
    };
  }) {
    const prefix = payload.prefix || payload.document_type || 'QA-FRM';
    const { prefix: resolvedPrefix, nextNumber } = await this.repository.getNextSequenceNumber(prefix);
    const documentNumber = `${resolvedPrefix}-${nextNumber}`;
    const createdBy = payload.created_by || 'system';

    const documentId = await this.repository.createDocument({
      document_number: documentNumber,
      prefix: resolvedPrefix,
      sequence_number: nextNumber,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      department: payload.department,
      created_by: createdBy,
    });

    // Create initial revision
    await this.repository.createRevision({
      document_id: documentId,
      revision_number: 1,
      description: payload.initial_revision?.description || payload.initial_revision?.change_description || 'Initial revision',
      changes_summary: payload.initial_revision?.change_description,
      created_by: createdBy,
    });

    const document = await this.repository.getDocumentById(documentId);
    return {
      success: true,
      message: 'Document created successfully',
      document_id: documentId,
      document_number: documentNumber,
      document,
    };
  }

  async updateDocument(id: number, updates: Record<string, unknown>) {
    await this.getDocument(id); // ensures it exists
    await this.repository.updateDocument(id, updates);
    return { success: true, message: 'Document updated successfully' };
  }

  async deleteDocument(id: number) {
    await this.getDocument(id);
    await this.repository.deleteDocument(id);
    return { success: true, message: 'Document deleted successfully' };
  }

  async getRevisions(documentId: number) {
    return this.repository.getRevisions(documentId);
  }

  async createRevision(payload: {
    document_id: number;
    title?: string;
    description?: string;
    change_description?: string;
    effective_date?: string;
    template_data?: unknown;
    created_by?: string;
  }) {
    const existing = await this.repository.getRevisions(payload.document_id);
    const nextRevNumber = existing.length > 0
      ? Math.max(...existing.map(r => Number(r['revision_number']))) + 1
      : 1;

    const revisionId = await this.repository.createRevision({
      document_id: payload.document_id,
      revision_number: nextRevNumber,
      description: payload.description || payload.change_description || '',
      changes_summary: payload.change_description,
      created_by: payload.created_by || 'system',
    });

    return {
      success: true,
      message: 'Revision created successfully',
      revision_number: nextRevNumber,
      revision_id: revisionId,
    };
  }

  async updateRevision(id: number, updates: Record<string, unknown>) {
    const rev = await this.repository.getRevisionById(id);
    if (!rev) throw new NotFoundException(`Revision ${id} not found`);
    await this.repository.updateRevision(id, updates);
    return { success: true, message: 'Revision updated successfully' };
  }

  async approveRevision(revisionId: number, approvedBy: string) {
    const rev = await this.repository.getRevisionById(revisionId);
    if (!rev) throw new NotFoundException(`Revision ${revisionId} not found`);
    await this.repository.approveRevision(revisionId, approvedBy);
    return { success: true, message: 'Revision approved' };
  }

  async rejectRevision(revisionId: number, rejectedBy: string, reason: string) {
    const rev = await this.repository.getRevisionById(revisionId);
    if (!rev) throw new NotFoundException(`Revision ${revisionId} not found`);
    await this.repository.rejectRevision(revisionId, rejectedBy, reason);
    return { success: true, message: 'Revision rejected' };
  }

  async generateDocumentNumber(documentType: string, department?: string) {
    const documentNumber = await this.repository.peekNextSequenceNumber(documentType);
    return { document_number: documentNumber, formatted: documentNumber };
  }

  async getStats() {
    return this.repository.getStats();
  }

  async getDepartments() {
    return this.repository.getDepartments();
  }

  async searchDocuments(query: string, filters?: { status?: string; department?: string }) {
    return this.repository.getDocuments({ search: query, ...filters });
  }
}
