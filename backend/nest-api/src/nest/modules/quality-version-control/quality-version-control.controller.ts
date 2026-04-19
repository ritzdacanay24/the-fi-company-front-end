import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { QualityVersionControlService } from './quality-version-control.service';

@Controller(['quality-version-control', 'Quality/quality-version-control'])
export class QualityVersionControlController {
  constructor(private readonly service: QualityVersionControlService) {}

  // ── Documents ────────────────────────────────────────────────────────────────

  @Get('documents')
  async getDocuments(
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getDocuments({ type, category, department, status, search });
  }

  @Get('documents/search')
  async searchDocuments(
    @Query('q') q: string,
    @Query('status') status?: string,
    @Query('department') department?: string,
  ) {
    return this.service.searchDocuments(q, { status, department });
  }

  @Get('documents/:id')
  async getDocument(@Param('id', ParseIntPipe) id: number) {
    return this.service.getDocument(id);
  }

  @Post('documents')
  async createDocument(@Body() payload: Record<string, unknown>) {
    return this.service.createDocument(payload as any);
  }

  @Put('documents/:id')
  async updateDocument(@Param('id', ParseIntPipe) id: number, @Body() updates: Record<string, unknown>) {
    return this.service.updateDocument(id, updates);
  }

  @Delete('documents/:id')
  async deleteDocument(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteDocument(id);
  }

  @Get('documents/:id/export')
  async exportDocument(
    @Param('id', ParseIntPipe) id: number,
    @Query('format') format: 'pdf' | 'json' | 'excel' = 'json',
    @Res() res: Response,
  ) {
    const doc = await this.service.getDocument(id);
    const revisions = await this.service.getRevisions(id);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="document-${id}.json"`);
      return res.send(JSON.stringify({ document: doc, revisions }, null, 2));
    }

    // For pdf/excel formats not yet implemented, return JSON with a note
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="document-${id}.json"`);
    return res.send(JSON.stringify({ document: doc, revisions }, null, 2));
  }

  // ── Revisions ────────────────────────────────────────────────────────────────

  @Get('documents/:id/revisions')
  async getRevisions(@Param('id', ParseIntPipe) id: number) {
    return this.service.getRevisions(id);
  }

  @Post('revisions')
  async createRevision(@Body() payload: Record<string, unknown>) {
    return this.service.createRevision(payload as any);
  }

  @Put('revisions/:id')
  async updateRevision(@Param('id', ParseIntPipe) id: number, @Body() updates: Record<string, unknown>) {
    return this.service.updateRevision(id, updates);
  }

  @Post('revisions/:id/approve')
  async approveRevision(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { approved_by?: string },
  ) {
    return this.service.approveRevision(id, body.approved_by || 'system');
  }

  @Post('revisions/:id/reject')
  async rejectRevision(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { rejected_by?: string; reason?: string },
  ) {
    return this.service.rejectRevision(id, body.rejected_by || 'system', body.reason || '');
  }

  // ── Utility ──────────────────────────────────────────────────────────────────

  @Get('generate-document-number')
  async generateDocumentNumber(
    @Query('document_type') documentType: string,
    @Query('department') department?: string,
  ) {
    return this.service.generateDocumentNumber(documentType, department);
  }

  @Get('stats')
  async getStats() {
    return this.service.getStats();
  }

  @Get('departments')
  async getDepartments() {
    return this.service.getDepartments();
  }
}
