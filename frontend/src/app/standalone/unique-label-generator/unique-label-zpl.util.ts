import { UniqueLabelIdentifier } from './unique-label-generator-api.service';

function sanitizeZplText(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\^~]/g, '-')
    .trim();
}

function buildSingleLabelZpl(item: UniqueLabelIdentifier): string {
  const uniqueId = sanitizeZplText(item.unique_identifier);
  const partNumber = sanitizeZplText(item.part_number);
  const workOrder = sanitizeZplText(item.work_order_number || '-');
  const quantityPrinted = sanitizeZplText(String(item.quantity_printed));

  return [
    '^XA',
    '^PW812',
    '^LL406',
    '^LH0,0',
    '^CF0,28',
    '^FO30,20^FDUnique Label^FS',
    '^CF0,54',
    `^FO30,60^FD${uniqueId}^FS`,
    '^CF0,30',
    `^FO30,140^FDPart: ${partNumber}^FS`,
    `^FO30,180^FDWO: ${workOrder}^FS`,
    `^FO30,220^FDQty Printed: ${quantityPrinted}^FS`,
    '^BY2,3,68',
    `^FO30,262^BCN,68,Y,N,N^FD${uniqueId}^FS`,
    '^XZ',
  ].join('\n');
}

export function buildBatchZpl(items: UniqueLabelIdentifier[]): string {
  return items.map((item) => buildSingleLabelZpl(item)).join('\n');
}

export function downloadZplFile(items: UniqueLabelIdentifier[], filename: string): void {
  if (!items.length) {
    return;
  }

  const zpl = buildBatchZpl(items);
  const blob = new Blob([zpl], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.zpl') ? filename : `${filename}.zpl`;
  anchor.click();

  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function printZplToZebra(items: UniqueLabelIdentifier[]): Promise<void> {
  if (!items.length) {
    throw new Error('No labels available for Zebra printing.');
  }

  const zpl = buildBatchZpl(items);
  const popup = window.open('', '_blank', 'width=1000,height=760');

  if (!popup) {
    throw new Error('Allow popups to print Zebra labels.');
  }

  const escapedZpl = escapeHtml(zpl);
  popup.document.write(`
    <html>
      <head>
        <title>Raw ZPL Print</title>
        <style>
          body { margin: 0; }
          pre {
            margin: 0;
            white-space: pre-wrap;
            padding: 12px;
            font-family: Consolas, Monaco, monospace;
            font-size: 12px;
            line-height: 1.35;
          }
        </style>
      </head>
      <body>
        <pre>${escapedZpl}</pre>
        <script>window.print();</script>
      </body>
    </html>
  `);
  popup.document.close();
}