import { Injectable } from '@angular/core';

export interface WorkOrderInfo {
  number?: string;
  part?: string;
  cp_cust_part?: string;
  description?: string;
  qty_ord?: string | number;
  due_date?: string;
  routing?: string;
  line?: string;
}

export interface BatchInfo {
  quantity: number;
  category?: string;
  status?: string;
  date?: string;
  createdBy?: string;
  batchId?: string | null;
}

export interface AssetInfo {
  index: number;
  assetNumber: string;
  eyefiSerial: string;
  ulNumber: string;
  ulCategory?: string;
  igtSerial?: string;
  agsAsset?: string;
  sgAsset?: string;
}

export interface PrintReportData {
  workOrder: WorkOrderInfo;
  batch: BatchInfo;
  customer: string;
  assets: AssetInfo[];
  timestamp: Date;
  createdBy: string;
}

@Injectable({
  providedIn: 'root'
})
export class SerialReportPrintService {

  constructor() { }

  /**
   * Print Serial Number Report
   * @param data Report data to print
   */
  printSerialReport(data: PrintReportData): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the report');
      return;
    }

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Serial Number Report - WO ${data.workOrder.number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          .section { margin: 20px 0; }
          .section-title { font-weight: bold; color: #555; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #007bff; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
          .user-info { margin-top: 10px; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #007bff; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <button class="no-print" onclick="window.print()" style="margin-bottom: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer;">
          Print Report
        </button>
        
        <h1>Serial Number Assignment Report</h1>
        
        <div class="user-info">
          <strong>Created By:</strong> ${data.createdBy}
        </div>
        
        <div class="section">
          <div class="section-title">Work Order Information</div>
          <table>
            <tr><th style="width: 200px;">Work Order #</th><td>${data.workOrder.number || 'N/A'}</td></tr>
            <tr><th>Part Number</th><td>${data.workOrder.part || 'N/A'}</td></tr>
            <tr><th>Customer Part #</th><td>${data.workOrder.cp_cust_part || 'N/A'}</td></tr>
            <tr><th>Description</th><td>${data.workOrder.description || 'N/A'}</td></tr>
            <tr><th>Ordered Quantity</th><td>${data.workOrder.qty_ord || 'N/A'}</td></tr>
            <tr><th>Due Date</th><td>${data.workOrder.due_date || 'N/A'}</td></tr>
            <tr><th>Routing</th><td>${data.workOrder.routing || 'N/A'}</td></tr>
            <tr><th>Line</th><td>${data.workOrder.line || 'N/A'}</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Batch Details</div>
          <table>
            <tr><th>Quantity</th><td>${data.batch.quantity}</td></tr>
            ${data.batch.batchId ? `<tr><th>Batch ID</th><td><strong>${data.batch.batchId}</strong></td></tr>` : ''}
            <tr><th>Category</th><td>${data.batch.category || 'N/A'}</td></tr>
            <tr><th>Status</th><td>${data.batch.status || 'N/A'}</td></tr>
            <tr><th>Customer</th><td>${data.customer}</td></tr>
            <tr><th>Date/Time</th><td>${data.batch.date || data.timestamp.toLocaleString()}</td></tr>
            <tr><th>Created By</th><td>${data.batch.createdBy || data.createdBy}</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Created Assets (${data.assets.length})</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${data.customer} Asset Number</th>
                <th>EyeFi Serial Number</th>
                <th>UL Number</th>
                <th>UL Category</th>
              </tr>
            </thead>
            <tbody>
              ${data.assets.map(asset => `
                <tr>
                  <td>${asset.index}</td>
                  <td><strong>${asset.assetNumber}</strong></td>
                  <td>${asset.eyefiSerial}</td>
                  <td>${asset.ulNumber}</td>
                  <td>${asset.ulCategory || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          Generated on ${new Date().toLocaleString()} | EyeFi Serial Workflow System | Report generated by ${data.createdBy}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  }

  /**
   * Print multiple work orders grouped report
   * @param groupedData Map of work order number to report data
   * @param currentUser User generating the report
   */
  printMultiWorkOrderReport(groupedData: Map<string, PrintReportData>, currentUser: string): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the report');
      return;
    }

    const totalAssignments = Array.from(groupedData.values()).reduce((sum, data) => sum + data.assets.length, 0);

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Serial Number Report - ${groupedData.size} Work Order(s)</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          .section { margin: 20px 0; page-break-inside: avoid; }
          .section-title { font-weight: bold; color: #555; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #007bff; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
          .user-info { margin-top: 10px; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #007bff; }
          .wo-section { margin-bottom: 40px; page-break-inside: avoid; }
          @media print {
            .no-print { display: none; }
            .wo-section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <button class="no-print" onclick="window.print()" style="margin-bottom: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer;">
          Print Report
        </button>
        
        <h1>Serial Number Assignment Report</h1>
        
        <div class="user-info">
          <strong>Generated By:</strong> ${currentUser}<br>
          <strong>Total Assignments:</strong> ${totalAssignments}<br>
          <strong>Work Orders:</strong> ${groupedData.size}
        </div>
        
        ${Array.from(groupedData.entries()).map(([woNumber, data]) => `
          <div class="wo-section">
            <div class="section">
              <div class="section-title">Work Order Information</div>
              <table>
                <tr><th style="width: 200px;">Work Order #</th><td>${woNumber}</td></tr>
                <tr><th>Part Number</th><td>${data.workOrder.part || 'N/A'}</td></tr>
                <tr><th>Customer Part #</th><td>${data.workOrder.cp_cust_part || 'N/A'}</td></tr>
                <tr><th>Description</th><td>${data.workOrder.description || 'N/A'}</td></tr>
                <tr><th>Customer Name</th><td>${data.customer || 'N/A'}</td></tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Batch Details</div>
              <table>
                <tr><th>Quantity</th><td>${data.assets.length}</td></tr>
                ${data.batch.batchId ? `<tr><th>Batch ID</th><td><strong>${data.batch.batchId}</strong></td></tr>` : ''}
                <tr><th>Status</th><td>${data.batch.status || 'N/A'}</td></tr>
                <tr><th>Date/Time</th><td>${data.batch.date || data.timestamp.toLocaleString()}</td></tr>
                <tr><th>Created By</th><td>${data.batch.createdBy || data.createdBy}</td></tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Created Assets (${data.assets.length})</div>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Asset Number</th>
                    <th>EyeFi Serial Number</th>
                    <th>UL Number</th>
                    <th>IGT Serial</th>
                    <th>AGS Asset</th>
                    <th>SG Asset</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.assets.map((asset, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td><strong>${asset.assetNumber}</strong></td>
                      <td>${asset.eyefiSerial}</td>
                      <td>${asset.ulNumber}</td>
                      <td>${asset.igtSerial || 'N/A'}</td>
                      <td>${asset.agsAsset || 'N/A'}</td>
                      <td>${asset.sgAsset || 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}

        <div class="footer">
          Generated on ${new Date().toLocaleString()} | EyeFi Serial Workflow System | Report generated by ${currentUser}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  }
}
