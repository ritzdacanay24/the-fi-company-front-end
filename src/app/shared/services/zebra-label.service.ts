import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import moment from 'moment';

export interface ZebraLabelTemplate {
  id: string;
  name: string;
  description: string;
  size: string;
  orientation: 'Portrait' | 'Landscape';
  zplTemplate: string;
  width?: number; // Width in pixels for HTML preview
  height?: number; // Height in pixels for HTML preview
}

export interface ZplPreviewElement {
  type: 'text' | 'barcode';
  x: number;
  y: number;
  content: string;
  fontSize?: number;
  fontWidth?: number;
  rotation?: number;
  barcodeHeight?: number;
  barcodeWidth?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ZebraLabelService {

  constructor(private toastrService: ToastrService) {}

  private templates: ZebraLabelTemplate[] = [
    {
      id: 'serial-number-standard',
      name: 'Standard Serial Number Label',
      description: '4x2 inch label with serial number and barcode',
      size: '4 x 2',
      orientation: 'Landscape',
      width: 400,
      height: 200,
      zplTemplate: `^XA
^FO50,50^A0N,60,50^FDSERIAL NUMBER:^FS
^FO50,120^A0N,80,70^FD{SERIAL_NUMBER}^FS
^FO50,220^BY2,3,100^BCN,,Y,N,N,A^FD{SERIAL_NUMBER}^FS
^FO50,350^A0N,40,30^FDGENERATED: {DATE_TIME}^FS
^PQ{QUANTITY}^FS
^XZ`
    },
    {
      id: 'serial-number-compact',
      name: 'Compact Serial Number Label',
      description: '2x1 inch compact label',
      size: '2 x 1',
      orientation: 'Landscape',
      width: 200,
      height: 100,
      zplTemplate: `^XA
^FO30,30^A0N,40,35^FD{SERIAL_NUMBER}^FS
^FO30,80^BY2,2,60^BCN,,Y,N,N,A^FD{SERIAL_NUMBER}^FS
^PQ{QUANTITY}^FS
^XZ`
    },
    {
      id: 'serial-number-detailed',
      name: 'Detailed Serial Number Label',
      description: '4x3 inch label with additional information',
      size: '4 x 3',
      orientation: 'Portrait',
      width: 400,
      height: 300,
      zplTemplate: `^XA
^FO50,50^A0N,50,40^FDPRODUCT SERIAL NUMBER^FS
^FO50,120^A0N,70,60^FD{SERIAL_NUMBER}^FS
^FO50,200^BY2,3,80^BCN,,Y,N,N,A^FD{SERIAL_NUMBER}^FS
^FO50,320^A0N,35,25^FDMANUFACTURED: {DATE_TIME}^FS
^FO50,360^A0N,35,25^FDPART#: {PART_NUMBER}^FS
^FO50,400^A0N,35,25^FDQTY: {QUANTITY}^FS
^PQ{QUANTITY}^FS
^XZ`
    },
    {
      id: 'eyefi-asset-number',
      name: 'EyeFi Asset Number Label (Electrical)',
      description: '4x2 inch compact label with asset number, electrical specs, and company logo',
      size: '4 x 2',
      orientation: 'Landscape',
      width: 400,
      height: 400,
      zplTemplate: `^XA

^FO620,10^GFA,1140,1140,20,,:::S01F8,S07F8,R01FF8,R03FF8,R07FF8,R0IF8,Q01IF8,Q01IF,Q03FF80F,Q03FE03F8,Q07FC03FC,Q07FC07FC,Q07F807FC,Q07F803FC,:Q07F801F8,Q07F8006,Q07F8,Q0FF8,03E0841F00MFC00F81F03081E03018831,01808C1800MFC01803183981307018813,01808C1800MFC01006183B8130781C81E,0180FC1E00MFC01006083E81F0581F80E,01808C1800MFC01802183481C0F81380C,0180841800MFC00C0310308100FC11804,0080841E007LFC00701E02081008410804,Q0FF803FC,Q07F801FC,:::::::::::::Q07F801F8,Q07F801F,Q07F801C,Q07F8,::::::,:^FS

^CF0,25
^FO30,20^FDEYEFI ASSET: {SERIAL_NUMBER}^FS
^FO30,50^BY1.5,2,60^BCN,,N,N,N,A^FD{SERIAL_NUMBER}^FS
^FO30,130^GB340,0,1^FS
^CF0,20
^FO30,140^FDPN: {PART_NUMBER}^FS
^FO30,165^FDDATE: {DATE}^FS
^FO30,190^FDVOLTS: ____  HZ: ____  AMPS: ____^FS
^FO30,215^GB340,0,1^FS
^CF0,22
^FO30,225^FDDRY LOCATIONS ONLY^FS

^PQ{QUANTITY}^FS
^XZ`
    }
  ];

  getTemplates(): ZebraLabelTemplate[] {
    return this.templates;
  }

  getTemplate(id: string): ZebraLabelTemplate | undefined {
    return this.templates.find(template => template.id === id);
  }

  generateZplCommand(
    templateId: string, 
    serialNumber: string, 
    options: {
      quantity?: number;
      partNumber?: string;
      dateTime?: string;
      [key: string]: any;
    } = {}
  ): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    let zpl = template.zplTemplate;
    
    // Replace placeholders
    zpl = zpl.replace(/{SERIAL_NUMBER}/g, serialNumber.toUpperCase());
    zpl = zpl.replace(/{QUANTITY}/g, (options.quantity || 1).toString());
    zpl = zpl.replace(/{DATE_TIME}/g, options.dateTime || moment().format('MM/DD/YYYY HH:mm'));
    zpl = zpl.replace(/{DATE}/g, options['date'] || moment().format('MM/DD/YYYY'));
    zpl = zpl.replace(/{PART_NUMBER}/g, options.partNumber || '');

    // Replace any custom placeholders
    Object.keys(options).forEach(key => {
      const placeholder = `{${key.toUpperCase()}}`;
      zpl = zpl.replace(new RegExp(placeholder, 'g'), options[key] || '');
    });

    return zpl;
  }

  printLabel(
    templateId: string, 
    serialNumber: string, 
    options: {
      quantity?: number;
      partNumber?: string;
      dateTime?: string;
      [key: string]: any;
    } = {}
  ): void {
    try {
      const zpl = this.generateZplCommand(templateId, serialNumber, options);
      
      setTimeout(() => {
        const printWindow = window.open('', 'PRINT', 'height=500,width=600');
        printWindow.document.write(zpl.replace(/(.{80})/g, '$1<br>') + '\nEOL');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        this.toastrService.success(
          `${options.quantity || 1} label(s) sent to Zebra printer`
        );
      }, 200);
    } catch (error) {
      this.toastrService.error(`Error printing label: ${error.message}`);
    }
  }

  downloadZplFile(
    templateId: string, 
    serialNumber: string, 
    options: {
      quantity?: number;
      partNumber?: string;
      dateTime?: string;
      [key: string]: any;
    } = {}
  ): void {
    try {
      const zpl = this.generateZplCommand(templateId, serialNumber, options);
      
      const blob = new Blob([zpl], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `serial-${serialNumber}-${templateId}.zpl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      this.toastrService.success('ZPL file downloaded');
    } catch (error) {
      this.toastrService.error(`Error downloading ZPL file: ${error.message}`);
    }
  }

  /**
   * Parse ZPL commands and generate HTML preview elements
   */
  parseZplForPreview(zplCommand: string): ZplPreviewElement[] {
    const elements: ZplPreviewElement[] = [];
    const lines = zplCommand.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Parse text fields (^FO x,y ^A0N,height,width ^FD text ^FS)
      const textMatch = trimmedLine.match(/\^FO(\d+),(\d+)\^A0N,(\d+),(\d+)\^FD(.+?)\^FS/);
      if (textMatch) {
        const [, x, y, height, width, text] = textMatch;
        elements.push({
          type: 'text',
          x: parseInt(x),
          y: parseInt(y),
          content: text,
          fontSize: parseInt(height) * 0.6, // Convert ZPL height to CSS font-size
          fontWidth: parseInt(width)
        });
        continue;
      }

      // Parse barcode fields (^FO x,y ^BY width,ratio,height ^BCN,,Y,N,N,A ^FD data ^FS)
      const barcodeMatch = trimmedLine.match(/\^FO(\d+),(\d+)\^BY(\d+),(\d+),(\d+)\^BCN[^\\^]*\^FD(.+?)\^FS/);
      if (barcodeMatch) {
        const [, x, y, width, ratio, height, data] = barcodeMatch;
        elements.push({
          type: 'barcode',
          x: parseInt(x),
          y: parseInt(y),
          content: data,
          barcodeWidth: parseInt(width),
          barcodeHeight: parseInt(height)
        });
        continue;
      }
    }

    return elements;
  }

  /**
   * Generate realistic HTML preview for a ZPL label that looks like an actual printed label
   */
  generateHtmlPreview(
    templateId: string,
    serialNumber: string,
    options: {
      quantity?: number;
      partNumber?: string;
      dateTime?: string;
      [key: string]: any;
    } = {}
  ): { html: string; template: ZebraLabelTemplate } {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    const zpl = this.generateZplCommand(templateId, serialNumber, options);
    const elements = this.parseZplForPreview(zpl);

    // Calculate realistic dimensions (96 DPI standard for label printing)
    const dpi = 96;
    const [widthInches, heightInches] = template.size.split(' x ').map(s => parseFloat(s.trim()));
    const widthPx = Math.round(widthInches * dpi);
    const heightPx = Math.round(heightInches * dpi);

    let html = `
      <div class="label-preview-wrapper" style="
        display: inline-block;
        margin: 20px;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
      ">
        <!-- Label with realistic styling -->
        <div class="zpl-label-preview" style="
          position: relative;
          width: ${widthPx}px;
          height: ${heightPx}px;
          background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
          border: 1px solid #e9ecef;
          border-radius: 3px;
          font-family: 'Courier New', 'Monaco', monospace;
          box-shadow: 
            inset 0 1px 3px rgba(255,255,255,0.8),
            0 2px 6px rgba(0,0,0,0.1);
          overflow: hidden;
        ">
          <!-- Label texture overlay -->
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 1px,
                rgba(0,0,0,0.01) 1px,
                rgba(0,0,0,0.01) 2px
              );
            pointer-events: none;
          "></div>
          
          <!-- Size indicator -->
          <div style="
            position: absolute;
            top: -25px;
            left: 0;
            font-size: 10px;
            color: #6c757d;
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            border: 1px solid #dee2e6;
            font-family: system-ui, -apple-system, sans-serif;
          ">${template.size}" Thermal Label</div>
          
          <!-- Perforation marks for realism -->
          <div style="
            position: absolute;
            left: -5px;
            top: 10%;
            bottom: 10%;
            width: 3px;
            background: repeating-linear-gradient(
              to bottom,
              #dee2e6 0px,
              #dee2e6 2px,
              transparent 2px,
              transparent 6px
            );
          "></div>
          <div style="
            position: absolute;
            right: -5px;
            top: 10%;
            bottom: 10%;
            width: 3px;
            background: repeating-linear-gradient(
              to bottom,
              #dee2e6 0px,
              #dee2e6 2px,
              transparent 2px,
              transparent 6px
            );
          "></div>
    `;

    elements.forEach(element => {
      if (element.type === 'text') {
        // Convert ZPL coordinates to CSS pixels (ZPL uses 203 DPI typically)
        const cssX = Math.round((element.x / 203) * dpi);
        const cssY = Math.round((element.y / 203) * dpi);
        const cssFontSize = Math.round((element.fontSize || 12) * 0.75); // Convert ZPL to CSS font size
        
        html += `
          <div style="
            position: absolute;
            left: ${cssX}px;
            top: ${cssY}px;
            font-size: ${cssFontSize}px;
            font-weight: 600;
            color: #000;
            white-space: nowrap;
            line-height: 1;
            text-shadow: 0 0 1px rgba(0,0,0,0.1);
            font-family: 'Courier New', 'Monaco', monospace;
          ">${element.content}</div>
        `;
      } else if (element.type === 'barcode') {
        const cssX = Math.round((element.x / 203) * dpi);
        const cssY = Math.round((element.y / 203) * dpi);
        const barcodeWidth = Math.min(
          Math.round(((element.barcodeWidth || 2) * 20) * (dpi / 203)), 
          widthPx - cssX - 10
        );
        const barcodeHeight = Math.round(((element.barcodeHeight || 60) / 203) * dpi);
        
        html += `
          <div style="
            position: absolute;
            left: ${cssX}px;
            top: ${cssY}px;
            width: ${barcodeWidth}px;
            height: ${barcodeHeight}px;
            background: repeating-linear-gradient(
              to right,
              #000 0px,
              #000 1px,
              #fff 1px,
              #fff 2px,
              #000 2px,
              #000 3px,
              #fff 3px,
              #fff 4px,
              #000 4px,
              #000 6px,
              #fff 6px,
              #fff 7px
            );
            display: flex;
            align-items: end;
            justify-content: center;
            border: 1px solid rgba(0,0,0,0.1);
          ">
            <div style="
              background: rgba(255,255,255,0.95);
              padding: 1px 3px;
              font-size: 8px;
              color: #000;
              margin-bottom: -1px;
              font-family: 'Courier New', monospace;
              font-weight: 500;
              border-radius: 1px;
            ">${element.content}</div>
          </div>
        `;
      }
    });

    html += `
        </div>
        
        <!-- Label backing/liner effect -->
        <div style="
          position: absolute;
          top: 3px;
          left: 3px;
          right: -3px;
          bottom: -3px;
          background: #e9ecef;
          border-radius: 3px;
          z-index: -1;
          opacity: 0.7;
        "></div>
        
        <!-- Print quality indicator -->
        <div style="
          margin-top: 10px;
          text-align: center;
          font-size: 10px;
          color: #6c757d;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          <span style="
            background: #e7f3ff;
            color: #0969da;
            padding: 2px 6px;
            border-radius: 10px;
            border: 1px solid #b6e3ff;
          ">
            <i class="mdi mdi-printer" style="font-size: 10px;"></i> 203 DPI Print Quality
          </span>
        </div>
      </div>
    `;

    return { html, template };
  }

  previewLabel(
    templateId: string, 
    serialNumber: string, 
    options: {
      quantity?: number;
      partNumber?: string;
      dateTime?: string;
      [key: string]: any;
    } = {}
  ): string {
    try {
      return this.generateZplCommand(templateId, serialNumber, options);
    } catch (error) {
      this.toastrService.error(`Error generating preview: ${error.message}`);
      return '';
    }
  }
}
