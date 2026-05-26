import { Injectable, Logger } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { SCHEDULED_JOB_IDS } from '../scheduled-job-ids';
import { ScheduledJobRecipientsService } from '../scheduled-job-recipients.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface CountRow extends RowDataPacket {
	rows_to_insert: number;
}

interface InsertedShortageRow extends RowDataPacket {
	id: number;
	jobNumber: string;
	mrf_line: number;
	partNumber: string;
	qty: number;
	createdDate: string;
}

@Injectable()
export class MaterialRequestShortageBackfillHandler implements ScheduledJobHandler {
	private readonly logger = new Logger(MaterialRequestShortageBackfillHandler.name);

	constructor(
		private readonly mysqlService: MysqlService,
		private readonly emailService: EmailService,
		private readonly emailTemplateService: EmailTemplateService,
		private readonly scheduledJobRecipientsService: ScheduledJobRecipientsService,
	) {}

	async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
		const startedAtMs = Date.now();
		const batchPrefix = this.buildBatchPrefix();

		try {
			const { previewCount, insertedCount, insertedRows } = await this.mysqlService.withTransaction(async (connection) => {
				const [previewRows] = await connection.query<CountRow[]>(`
					SELECT COUNT(*) AS rows_to_insert
					FROM mrf_det d
					INNER JOIN mrf m ON d.mrf_id = m.id
					LEFT JOIN shortageRequest sr ON sr.mrf_line = d.id
					WHERE d.active = 1
						AND m.active = 1
						AND d.qty > 0
						AND COALESCE(d.qtyPicked, 0) < d.qty
						AND sr.id IS NULL
						AND m.pickedCompletedDate IS NOT NULL
						AND DATE(d.createdDate) > '2026-04-30'
						AND d.createdBy != 3
				`);

				const previewCount = Number(previewRows[0]?.rows_to_insert || 0);

				const [insertResult] = await connection.query<ResultSetHeader>(`
					INSERT INTO shortageRequest (
						jobNumber,
						woNumber,
						lineNumber,
						dueDate,
						reasonPartNeeded,
						priority,
						assemblyNumber,
						mrfId,
						createdBy,
						partNumber,
						qty,
						comments,
						partDesc,
						graphicsShortage,
						mrf_line
					)
					SELECT
						CONCAT(?, '-', d.id) AS jobNumber,
						COALESCE(m.pickList, '') AS woNumber,
						COALESCE(m.lineNumber, '') AS lineNumber,
						m.dueDate,
						'Material request shortages' AS reasonPartNeeded,
						COALESCE(m.priority, '') AS priority,
						COALESCE(m.assemblyNumber, '') AS assemblyNumber,
						CAST(m.id AS CHAR) AS mrfId,
						CAST(COALESCE(NULLIF(m.createdBy, ''), '0') AS UNSIGNED) AS createdBy,
						COALESCE(d.partNumber, '') AS partNumber,
						GREATEST(d.qty - COALESCE(d.qtyPicked, 0), 0) AS qty,
						'' AS comments,
						COALESCE(d.description, '') AS partDesc,
						'false' AS graphicsShortage,
						d.id AS mrf_line
					FROM mrf_det d
					INNER JOIN mrf m ON d.mrf_id = m.id
					LEFT JOIN shortageRequest sr ON sr.mrf_line = d.id
					WHERE d.active = 1
						AND m.active = 1
						AND d.qty > 0
						AND COALESCE(d.qtyPicked, 0) < d.qty
						AND sr.id IS NULL
						AND m.pickedCompletedDate IS NOT NULL
						AND DATE(d.createdDate) > '2026-04-30'
						AND d.createdBy != 3
				`, [batchPrefix]);

				const [insertedRows] = await connection.query<InsertedShortageRow[]>(`
					SELECT id, jobNumber, mrf_line, partNumber, qty, createdDate
					FROM shortageRequest
					WHERE jobNumber LIKE CONCAT(?, '-%')
					ORDER BY id DESC
					LIMIT 100
				`, [batchPrefix]);

				return {
					previewCount,
					insertedCount: Number(insertResult.affectedRows || 0),
					insertedRows,
				};
			});

			if (insertedCount > 0) {
				const recipients = await this.scheduledJobRecipientsService.resolveSubscribedEmails(
					SCHEDULED_JOB_IDS.MATERIAL_REQUEST_SHORTAGE_BACKFILL,
				);

				if (recipients.length > 0) {
					const html = this.emailTemplateService.render('material-request-shortage-backfill', {
						batchPrefix,
						trigger,
						previewCount,
						insertedCount,
						insertedRows,
					});

					await this.emailService.sendMail({
						to: recipients,
						scheduledJobId: SCHEDULED_JOB_IDS.MATERIAL_REQUEST_SHORTAGE_BACKFILL,
						subject: `Material Request Shortage Backfill: ${insertedCount} inserted`,
						html,
					});
				}
			}

			const durationMs = Date.now() - startedAtMs;
			const message = `Material request shortage backfill complete. Preview: ${previewCount}, Inserted: ${insertedCount}.`;

			this.logger.log(
				`[${trigger}] ${SCHEDULED_JOB_IDS.MATERIAL_REQUEST_SHORTAGE_BACKFILL} -> preview=${previewCount}, inserted=${insertedCount} in ${durationMs}ms`,
			);

			return {
				id: SCHEDULED_JOB_IDS.MATERIAL_REQUEST_SHORTAGE_BACKFILL,
				name: 'Material Request Shortage Backfill',
				trigger,
				ok: true,
				statusCode: 200,
				durationMs,
				message,
				lastRun: {
					startedAt: new Date(startedAtMs).toISOString(),
					finishedAt: new Date().toISOString(),
					durationMs,
					status: 'success',
					triggerType: trigger,
					errorMessage: null,
				},
			};
		} catch (error: unknown) {
			const durationMs = Date.now() - startedAtMs;
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(
				`[${trigger}] ${SCHEDULED_JOB_IDS.MATERIAL_REQUEST_SHORTAGE_BACKFILL} failed in ${durationMs}ms: ${message}`,
			);

			return {
				id: SCHEDULED_JOB_IDS.MATERIAL_REQUEST_SHORTAGE_BACKFILL,
				name: 'Material Request Shortage Backfill',
				trigger,
				ok: false,
				statusCode: 500,
				durationMs,
				message,
				lastRun: {
					startedAt: new Date(startedAtMs).toISOString(),
					finishedAt: new Date().toISOString(),
					durationMs,
					status: 'failure',
					triggerType: trigger,
					errorMessage: message,
				},
			};
		}
	}

	private buildBatchPrefix(): string {
		const now = new Date();
		const yyyy = now.getFullYear().toString();
		const mm = String(now.getMonth() + 1).padStart(2, '0');
		const dd = String(now.getDate()).padStart(2, '0');
		const hh = String(now.getHours()).padStart(2, '0');
		const mi = String(now.getMinutes()).padStart(2, '0');
		const ss = String(now.getSeconds()).padStart(2, '0');
		return `MRS-BACKFILL-${yyyy}${mm}${dd}${hh}${mi}${ss}`;
	}
}
