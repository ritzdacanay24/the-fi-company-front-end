import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

export interface PDFExportData {
  instance: any;
  template: any;
  generated_at: string;
  base_url: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  constructor() { }

  /**
   * Generate and download a checklist instance PDF
   */
  async generateChecklistPDF(data: PDFExportData, filename: string): Promise<void> {
    try {
      const instance = data.instance;
      const template = data.template;

      // Create PDF (A4, portrait)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const maxWidth = pageWidth - (margin * 2);
      let currentY = margin;

      // Set default font
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      // ===== HEADER =====
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Quality Control Inspection Report', margin, currentY);
      currentY += 12;

      // Document info box
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const infoLines = [
        `Template: ${template?.name || 'N/A'}`,
        `Work Order: ${instance?.work_order_number || 'N/A'}`,
        `Serial Number: ${instance?.serial_number || 'N/A'}`,
        `Part Number: ${instance?.part_number || 'N/A'}`,
        `Operator: ${instance?.operator_name || 'N/A'}`,
        `Status: ${instance?.status || 'N/A'}`,
        `Progress: ${instance?.progress_percentage || 0}%`,
        `Generated: ${new Date(data.generated_at).toLocaleString()}`
      ];

      const infoBoxY = currentY;
      const infoBoxHeight = infoLines.length * 5 + 4;
      
      // Light gray background for info box
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, infoBoxY, maxWidth, infoBoxHeight, 'F');
      
      // Info text
      currentY += 2;
      infoLines.forEach(line => {
        doc.text(line, margin + 2, currentY);
        currentY += 5;
      });
      
      currentY += 4;

      // ===== ITEMS AND PHOTOS =====
      if (instance?.items && Array.isArray(instance.items)) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');

        instance.items.forEach((item: any, index: number) => {
          // Check if we need a new page
          if (currentY > pageHeight - 40) {
            doc.addPage();
            currentY = margin;
          }

          // Item title
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`Item ${index + 1}: ${item.title || 'Untitled'}`, margin, currentY);
          currentY += 7;

          // Item description if available
          if (item.description) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            const descLines = doc.splitTextToSize(
              this.stripHtml(item.description),
              maxWidth - 2
            );
            descLines.forEach(line => {
              if (currentY > pageHeight - 35) {
                doc.addPage();
                currentY = margin;
              }
              doc.text(line, margin + 2, currentY);
              currentY += 4;
            });
            currentY += 2;
          }

          // Item completion status
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const completed = item.is_completed ? 'COMPLETED' : 'PENDING';
          // Set color based on completion (green for completed, red for pending)
          if (item.is_completed) {
            doc.setTextColor(0, 128, 0); // Green
          } else {
            doc.setTextColor(255, 0, 0); // Red
          }
          doc.text(`Status: ${completed}`, margin + 2, currentY);
          doc.setTextColor(0, 0, 0);
          currentY += 5;

          // Item notes if available
          if (item.notes) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            const noteLines = doc.splitTextToSize(
              `Notes: ${item.notes}`,
              maxWidth - 2
            );
            noteLines.forEach(line => {
              if (currentY > pageHeight - 35) {
                doc.addPage();
                currentY = margin;
              }
              doc.text(line, margin + 2, currentY);
              currentY += 4;
            });
            currentY += 2;
          }

          // Photos
          const photos = item.photos || [];
          if (photos.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(`Photos: ${photos.length}`, margin + 2, currentY);
            currentY += 5;

            // Limit to first 3 photos per item for space
            const photosToInclude = photos.slice(0, 3);
            const photoWidth = (maxWidth - 4) / 2;
            const photoHeight = 50;
            let photoX = margin;
            let photoY = currentY;
            let photosInRow = 0;

            photosToInclude.forEach((photoUrl: string, photoIdx: number) => {
              if (currentY > pageHeight - 60) {
                doc.addPage();
                currentY = margin;
                photoX = margin;
                photoY = currentY;
                photosInRow = 0;
              }

              try {
                // Try to load and embed the image
                // Note: This requires CORS-enabled image URLs
                const img = new Image();
                const loadPromise = new Promise<void>((resolve) => {
                  img.onload = () => {
                    try {
                      doc.addImage(img, 'JPEG', photoX, photoY, photoWidth, photoHeight);
                    } catch (e) {
                      // If embedding fails, just add a placeholder
                      doc.text(`[Photo ${photoIdx + 1}]`, photoX, photoY);
                    }
                    resolve();
                  };
                  img.onerror = () => {
                    doc.text(`[Photo ${photoIdx + 1}]`, photoX, photoY);
                    resolve();
                  };
                  img.src = photoUrl;
                });
              } catch (e) {
                // Placeholder for photos that can't be loaded
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.text(`[Photo ${photoIdx + 1}]`, photoX + 2, photoY + 20);
              }

              photosInRow++;
              if (photosInRow >= 2) {
                photoX = margin;
                photoY += photoHeight + 2;
                currentY = photoY + 2;
                photosInRow = 0;
              } else {
                photoX += photoWidth + 2;
              }
            });

            if (photos.length > 3) {
              currentY = photoY + photoHeight + 5;
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(8);
              doc.text(`+${photos.length - 3} more photo(s)`, margin + 2, currentY);
            }

            currentY += 8;
          }

          // Add separator
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 5;
        });
      }

      // ===== FOOTER =====
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = margin;
      }
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated on ${new Date(data.generated_at).toLocaleString()}`,
        margin,
        pageHeight - 5
      );

      // Save the PDF
      doc.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
}
