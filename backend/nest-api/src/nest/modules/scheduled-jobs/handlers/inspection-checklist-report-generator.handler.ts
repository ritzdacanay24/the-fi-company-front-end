import { Injectable } from '@nestjs/common';
import { ReportGeneratorService } from '@/nest/modules/photo-checklist/report-generator.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

@Injectable()
export class InspectionChecklistReportGeneratorHandler implements ScheduledJobHandler {
  constructor(private readonly reportGeneratorService: ReportGeneratorService) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      await this.reportGeneratorService.processQueuedReports();

      return {
        id: 'inspection-checklist-report-generator',
        name: 'Inspection Checklist Report Generator',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs: Date.now() - startedAtMs,
        message: 'Inspection checklist report queue processed.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        id: 'inspection-checklist-report-generator',
        name: 'Inspection Checklist Report Generator',
        trigger,
        ok: false,
        statusCode: 500,
        durationMs: Date.now() - startedAtMs,
        message,
      };
    }
  }
}
