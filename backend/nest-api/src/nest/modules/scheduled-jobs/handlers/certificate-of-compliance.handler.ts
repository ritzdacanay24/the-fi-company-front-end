import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { EmailService } from '@/shared/email/email.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface ShippedOrder extends RowDataPacket {
  order_number: string;
  reference: string;
  customer_email: string;
  customer_name: string;
  ship_date: string;
  total_quantity: number;
}

@Injectable()
export class CertificateOfComplianceHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(CertificateOfComplianceHandler.name);

  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly emailService: EmailService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();
    let successCount = 0;

    try {
      // Query QAD for Aristocrat shipments completed today
      const shipments = await this.qadOdbcService.query<ShippedOrder[]>(`
        SELECT 
          so.order_number,
          so.reference,
          c.email as customer_email,
          c.name as customer_name,
          so.ship_date,
          SUM(sol.quantity_ordered) as total_quantity
        FROM shipping_order so
        JOIN shipping_order_line sol ON sol.shipping_order_id = so.id
        JOIN customer c ON c.id = so.customer_id
        WHERE c.code = 'ARISTOCRAT'
        AND DATE(so.ship_date) = CURDATE()
        AND so.status = 'Completed'
        GROUP BY so.order_number, so.reference, c.email, c.name, so.ship_date
        ORDER BY so.order_number ASC
      `);

      if (shipments.length > 0) {
        for (const shipment of shipments) {
          // Generate COC content (basic compliance template)
          const cocHtml = this.generateCOCDocument(shipment);

          // Send to customer email if available
          if (shipment.customer_email) {
            try {
              await this.emailService.sendMail({
                to: [shipment.customer_email],
                subject: `Certificate of Compliance - Order ${shipment.order_number}`,
                html: cocHtml,
              });
              successCount++;
            } catch (emailError) {
              this.logger.warn(`Failed to send COC email for order ${shipment.order_number}: ${emailError}`);
            }
          }
        }
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(
        `[${trigger}] certificate-of-compliance -> ${successCount}/${shipments.length} COCs sent in ${durationMs}ms`,
      );

      return {
        id: 'certificate-of-compliance',
        name: 'Certificate of Compliance',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${successCount} certificates of compliance generated and sent.`,
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
      this.logger.error(`[${trigger}] certificate-of-compliance failed in ${durationMs}ms: ${message}`);

      return {
        id: 'certificate-of-compliance',
        name: 'Certificate of Compliance',
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

  /**
   * Generates a Certificate of Compliance document HTML for the shipment.
   * This is a basic compliance template; customize as needed for Aristocrat requirements.
   */
  private generateCOCDocument(shipment: ShippedOrder): string {
    const certNumber = `${shipment.order_number}-COC-${new Date().getTime()}`;
    const today = new Date().toLocaleDateString();

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .section { margin: 20px 0; }
            .field { display: flex; margin: 10px 0; }
            .label { font-weight: bold; width: 150px; }
            .value { flex: 1; }
            .signature-line { border-bottom: 1px solid #333; width: 200px; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #999; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CERTIFICATE OF COMPLIANCE</h1>
            <p>Aristocrat Gaming Systems</p>
          </div>

          <div class="section">
            <div class="field">
              <div class="label">Certificate #:</div>
              <div class="value">${certNumber}</div>
            </div>
            <div class="field">
              <div class="label">Date Issued:</div>
              <div class="value">${today}</div>
            </div>
            <div class="field">
              <div class="label">Order Number:</div>
              <div class="value">${shipment.order_number}</div>
            </div>
            <div class="field">
              <div class="label">Reference:</div>
              <div class="value">${shipment.reference}</div>
            </div>
          </div>

          <div class="section">
            <h3>Shipment Details</h3>
            <table>
              <tr>
                <th>Customer</th>
                <td>${shipment.customer_name}</td>
              </tr>
              <tr>
                <th>Quantity</th>
                <td>${shipment.total_quantity}</td>
              </tr>
              <tr>
                <th>Ship Date</th>
                <td>${shipment.ship_date}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h3>Certification Statement</h3>
            <p>
              We hereby certify that the goods shipped under the above reference have been inspected, 
              tested, and found to comply with all applicable specifications and quality standards.
              This certificate is issued in accordance with Aristocrat Gaming Systems quality assurance requirements.
            </p>
          </div>

          <div class="section">
            <p>Authorizing Company: Eye-Fi, Inc.</p>
            <div class="signature-line"></div>
            <p>Authorized Representative</p>
          </div>

          <p style="font-size:11px;color:#999;margin-top:50px">
            This is an automatically generated Certificate of Compliance. 
            This document serves as proof of compliance and quality assurance.
          </p>
        </body>
      </html>
    `;
  }
}
