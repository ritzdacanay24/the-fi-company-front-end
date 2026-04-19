import { Injectable, NotFoundException } from '@nestjs/common';
import { QualityVersionControlRepository } from './quality-version-control.repository';

@Injectable()
export class QualityVersionControlService {
  constructor(private readonly repository: QualityVersionControlRepository) {}

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
