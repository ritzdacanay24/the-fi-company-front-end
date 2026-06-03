import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { jsPDF } from "jspdf";

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

  downloadSummaryPdf(): void {
    if (!this.template || !this.ticket) {
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const labelWidth = contentWidth * 0.42;
    const valueWidth = contentWidth - labelWidth;
    const bottomMargin = 12;
    let currentY = margin;

    const ensurePage = (requiredHeight: number): void => {
      if (currentY + requiredHeight <= pageHeight - bottomMargin) {
        return;
      }
      doc.addPage();
      currentY = margin;
    };

    const addSectionTitle = (title: string): void => {
      ensurePage(10);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(219, 227, 239);
      doc.rect(margin, currentY, contentWidth, 8, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text(title.toUpperCase(), margin + 2, currentY + 5.5);
      currentY += 8;
    };

    const addTableRows = (rows: Array<{ label: string; value: string }>): void => {
      if (!rows.length) {
        return;
      }

      doc.setFontSize(9);
      rows.forEach((row) => {
        const labelText = String(row.label || "-");
        const valueText = String(row.value || "-");
        const labelLines = doc.splitTextToSize(labelText, labelWidth - 4);
        const valueLines = doc.splitTextToSize(valueText, valueWidth - 4);
        const lineCount = Math.max(labelLines.length, valueLines.length, 1);
        const rowHeight = Math.max(6, lineCount * 4 + 2);

        ensurePage(rowHeight + 1);

        doc.setFillColor(252, 253, 255);
        doc.setDrawColor(229, 234, 242);
        doc.rect(margin, currentY, labelWidth, rowHeight, "FD");
        doc.rect(margin + labelWidth, currentY, valueWidth, rowHeight, "D");

        doc.setFont("helvetica", "bold");
        doc.setTextColor(51, 65, 85);
        doc.text(labelLines, margin + 2, currentY + 4.5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(17, 24, 39);
        doc.text(valueLines, margin + labelWidth + 2, currentY + 4.5);

        currentY += rowHeight;
      });
    };

    const addMetaCards = (): void => {
      const cards = [
        { label: "Status", value: String(this.ticket.status || "-").toUpperCase() },
        { label: "Completion", value: `${this.completionPercent}%` },
        { label: "Approved Amount", value: this.formatCurrency(this.approvedAmount) },
        { label: "Created By", value: this.ticket.createdBy || "-" },
        { label: "Created", value: this.formatDateTime(this.ticket.createdAt) },
        { label: "Finalized", value: this.formatDateTime(this.ticket.finalizedAt) },
      ];

      const cols = 2;
      const gap = 4;
      const cardWidth = (contentWidth - gap) / cols;
      const cardHeight = 14;

      cards.forEach((card, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = margin + col * (cardWidth + gap);
        const y = currentY + row * (cardHeight + gap);

        ensurePage(cardHeight + gap);
        doc.setDrawColor(219, 227, 239);
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y, cardWidth, cardHeight, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(card.label.toUpperCase(), x + 2, y + 4);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        const valueLines = doc.splitTextToSize(String(card.value || "-"), cardWidth - 4);
        doc.text(valueLines, x + 2, y + 8.5);
      });

      const cardRows = Math.ceil(cards.length / cols);
      currentY += cardRows * (cardHeight + gap);
    };

    // Header block
    doc.setFillColor(248, 251, 255);
    doc.setDrawColor(219, 227, 239);
    doc.rect(margin, currentY, contentWidth, 20, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(this.ticket.ticketId || "Checklist Summary", margin + 3, currentY + 7);
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(this.template.title || "Permit Checklist", margin + 3, currentY + 13);
    currentY += 24;

    addMetaCards();
    currentY += 2;

    addSectionTitle("Header Information");
    addTableRows(this.template.headerFields.map((field) => ({
      label: field.label,
      value: this.valueFor(field.key),
    })));

    currentY += 2;
    addSectionTitle("Process Timeline");
    addTableRows(this.template.processFields.map((field) => ({
      label: field.label,
      value: this.valueFor(field.key),
    })));

    currentY += 2;
    addSectionTitle("Attachments");
    addTableRows(
      this.summaryAttachments.length
        ? this.summaryAttachments.map((attachment) => ({
            label: attachment.uploadedBy || "Unknown User",
            value: `${attachment.fileName} (${this.formatFileSize(attachment.fileSize)} | ${this.formatDateTime(
              attachment.uploadedAt
            )})`,
          }))
        : [{ label: "Attachments", value: "No attachments uploaded." }]
    );

    doc.save(`${this.ticket.ticketId || "permit-checklist"}-summary.pdf`);
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
