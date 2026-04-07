import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

interface SummaryField {
  key: string;
  label: string;
}

interface SummaryTemplate {
  title: string;
  subtitle: string;
  headerFields: SummaryField[];
  processFields: SummaryField[];
}

interface SummaryTicket {
  ticketId: string;
  createdBy: string;
  createdAt: string;
  finalizedAt?: string;
  status: string;
  values: Record<string, string>;
  attachments?: SummaryAttachment[];
}

interface SummaryAttachment {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  uploadedBy: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  dataUrl?: string;
}

@Component({
  standalone: true,
  selector: "app-permit-checklist-summary",
  imports: [CommonModule],
  templateUrl: "./permit-checklist-summary.component.html",
  styleUrls: ["./permit-checklist-summary.component.scss"],
})
export class PermitChecklistSummaryComponent {
  @Input() template!: SummaryTemplate;
  @Input() ticket!: SummaryTicket;
  @Input() completionPercent = 0;
  @Input() approvedAmount = 0;
  @Output() attachmentSelected = new EventEmitter<SummaryAttachment>();

  formatDateTime(value?: string): string {
    if (!value) {
      return "-";
    }
    return new Date(value).toLocaleString();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  valueFor(key: string): string {
    const value = this.ticket?.values?.[key];
    return String(value || "-");
  }

  get summaryAttachments(): SummaryAttachment[] {
    return [...(this.ticket?.attachments || [])].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  formatFileSize(bytes: number): string {
    if (!bytes) {
      return "0 B";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }

    return `${(kb / 1024).toFixed(1)} MB`;
  }

  openAttachment(attachment: SummaryAttachment): void {
    this.attachmentSelected.emit(attachment);
  }

  printSummary(): void {
    if (!this.template || !this.ticket) {
      return;
    }

    const html = this.buildSummaryHtml();
    const printWindow = window.open("", "_blank", "width=1080,height=900");
    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  private buildSummaryHtml(): string {
    const headerRows = this.template.headerFields
      .map((field) => `<tr><th>${this.escapeHtml(field.label)}</th><td>${this.escapeHtml(this.valueFor(field.key))}</td></tr>`)
      .join("");

    const processRows = this.template.processFields
      .map((field) => `<tr><th>${this.escapeHtml(field.label)}</th><td>${this.escapeHtml(this.valueFor(field.key))}</td></tr>`)
      .join("");

    const attachmentRows = this.summaryAttachments.length
      ? this.summaryAttachments
          .map(
            (attachment) =>
              `<tr>
                <th>${this.escapeHtml(attachment.uploadedBy || "Unknown User")}</th>
                <td>${this.escapeHtml(attachment.fileName)} <span class="file-meta">(${this.escapeHtml(this.formatFileSize(attachment.fileSize))} | ${this.escapeHtml(this.formatDateTime(attachment.uploadedAt))})</span></td>
              </tr>`
          )
          .join("")
      : `<tr><th>Attachments</th><td>No attachments uploaded.</td></tr>`;

    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${this.escapeHtml(this.ticket.ticketId)} - Checklist Summary</title>
    <style>
      body { font-family: "Segoe UI", Arial, sans-serif; margin: 24px; color: #1f2937; background: #ffffff; }
      .sheet { max-width: 980px; margin: 0 auto; }
      .heading { border: 1px solid #dbe3ef; border-radius: 10px; padding: 14px 16px; background: #f8fbff; }
      h1 { margin: 0; font-size: 22px; }
      h2 { margin: 2px 0 0; font-size: 15px; color: #334155; font-weight: 600; }
      .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
      .meta-card { border: 1px solid #dbe3ef; border-radius: 8px; padding: 8px 10px; background: #ffffff; }
      .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; font-weight: 700; }
      .meta-value { margin-top: 3px; font-size: 13px; font-weight: 700; color: #0f172a; }
      .section { margin-top: 14px; border: 1px solid #dbe3ef; border-radius: 10px; overflow: hidden; }
      .section-head { padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid #dbe3ef; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border-bottom: 1px solid #e5eaf2; padding: 8px 10px; font-size: 12px; vertical-align: top; }
      th { width: 47%; background: #fcfdff; text-align: left; color: #334155; }
      .file-meta { color: #64748b; font-size: 11px; }
      tr:last-child th, tr:last-child td { border-bottom: 0; }
      @media print {
        body { margin: 10mm; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="heading">
        <h1>${this.escapeHtml(this.ticket.ticketId)}</h1>
        <h2>${this.escapeHtml(this.template.title)}</h2>
        <div class="meta">
          <div class="meta-card"><div class="meta-label">Status</div><div class="meta-value">${this.escapeHtml(this.ticket.status)}</div></div>
          <div class="meta-card"><div class="meta-label">Completion</div><div class="meta-value">${this.completionPercent}%</div></div>
          <div class="meta-card"><div class="meta-label">Approved Amount</div><div class="meta-value">${this.escapeHtml(this.formatCurrency(this.approvedAmount))}</div></div>
          <div class="meta-card"><div class="meta-label">Created By</div><div class="meta-value">${this.escapeHtml(this.ticket.createdBy)}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">Header Information</div>
        <table>
          <tbody>${headerRows}</tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-head">Process Timeline</div>
        <table>
          <tbody>${processRows}</tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-head">Attachments</div>
        <table>
          <tbody>${attachmentRows}</tbody>
        </table>
      </div>
    </div>
  </body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
