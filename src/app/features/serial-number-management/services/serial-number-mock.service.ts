import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { SerialNumber, SerialNumberAssignment, SerialNumberStats, SerialNumberBatch } from '../models/serial-number.model';

@Injectable({
  providedIn: 'root'
})
export class SerialNumberMockService {
  
  private mockSerialNumbers: SerialNumber[] = [
    {
      id: 1,
      serial_number: 'EYE2024001001',
      product_model: 'EyeFi Pro X1',
      hardware_version: 'v2.1',
      firmware_version: '1.4.2',
      manufacture_date: '2024-01-15',
      batch_number: 'BATCH-2024-001',
      status: 'available',
      qr_code: 'QR-EYE2024001001',
      barcode: 'BC-EYE2024001001',
      created_at: '2024-01-15T10:00:00Z',
      created_by: 1
    },
    {
      id: 2,
      serial_number: 'EYE2024001002',
      product_model: 'EyeFi Pro X1',
      hardware_version: 'v2.1',
      firmware_version: '1.4.2',
      manufacture_date: '2024-01-15',
      batch_number: 'BATCH-2024-001',
      status: 'assigned',
      qr_code: 'QR-EYE2024001002',
      barcode: 'BC-EYE2024001002',
      created_at: '2024-01-15T10:00:00Z',
      created_by: 1
    },
    {
      id: 3,
      serial_number: 'EYE2024002001',
      product_model: 'EyeFi Standard S2',
      hardware_version: 'v1.8',
      firmware_version: '1.2.1',
      manufacture_date: '2024-02-01',
      batch_number: 'BATCH-2024-002',
      status: 'shipped',
      qr_code: 'QR-EYE2024002001',
      barcode: 'BC-EYE2024002001',
      created_at: '2024-02-01T10:00:00Z',
      created_by: 1
    },
    {
      id: 4,
      serial_number: 'EYE2024002002',
      product_model: 'EyeFi Standard S2',
      hardware_version: 'v1.8',
      firmware_version: '1.2.1',
      manufacture_date: '2024-02-01',
      batch_number: 'BATCH-2024-002',
      status: 'defective',
      qr_code: 'QR-EYE2024002002',
      barcode: 'BC-EYE2024002002',
      created_at: '2024-02-01T10:00:00Z',
      created_by: 1
    },
    {
      id: 5,
      serial_number: 'EYE2024003001',
      product_model: 'EyeFi Enterprise E3',
      hardware_version: 'v3.0',
      firmware_version: '2.1.0',
      manufacture_date: '2024-03-10',
      batch_number: 'BATCH-2024-003',
      status: 'available',
      qr_code: 'QR-EYE2024003001',
      barcode: 'BC-EYE2024003001',
      created_at: '2024-03-10T10:00:00Z',
      created_by: 1
    }
  ];

  private mockAssignments: SerialNumberAssignment[] = [
    {
      id: 1,
      serial_number_id: 2,
      serial_number: 'EYE2024001002',
      work_order_number: 'WO-2024-0101',
      customer_name: 'Acme Corporation',
      customer_po: 'PO-ACME-2024-001',
      assigned_date: '2024-01-20',
      assigned_by_user: 'jsmith',
      assigned_by_name: 'John Smith',
      notes: 'Assigned for production line testing',
      wo_nbr: 240101,
      wo_due_date: '2024-01-25',
      wo_part: 'EYE-PRO-X1',
      wo_qty_ord: 10,
      wo_routing: 'RT-001',
      wo_line: 'Line A',
      wo_description: 'EyeFi Pro X1 Assembly',
      created_at: '2024-01-20T14:30:00Z',
      created_by: 1
    },
    {
      id: 2,
      serial_number_id: 3,
      serial_number: 'EYE2024002001',
      work_order_number: 'WO-2024-0102',
      customer_name: 'Tech Solutions Inc',
      customer_po: 'PO-TECH-2024-005',
      assigned_date: '2024-02-05',
      shipped_date: '2024-02-08',
      tracking_number: 'TRK-123456789',
      assigned_by_user: 'mwilson',
      assigned_by_name: 'Mike Wilson',
      notes: 'Shipped to customer location',
      wo_nbr: 240102,
      wo_due_date: '2024-02-10',
      wo_part: 'EYE-STD-S2',
      wo_qty_ord: 5,
      wo_routing: 'RT-002',
      wo_line: 'Line B',
      wo_description: 'EyeFi Standard S2 Assembly',
      created_at: '2024-02-05T09:15:00Z',
      created_by: 2
    }
  ];

  private mockStats: SerialNumberStats = {
    total_serial_numbers: 150,
    available_count: 85,
    assigned_count: 35,
    shipped_count: 25,
    defective_count: 5,
    by_product_model: {
      'EyeFi Pro X1': 60,
      'EyeFi Standard S2': 50,
      'EyeFi Enterprise E3': 40
    },
    recent_assignments: this.mockAssignments.slice(0, 5)
  };

  // Mock API methods
  getAllSerialNumbers(): Observable<any> {
    return of({ success: true, data: this.mockSerialNumbers }).pipe(delay(500));
  }

  getSerialNumberById(id: number): Observable<any> {
    const serialNumber = this.mockSerialNumbers.find(sn => sn.id === id);
    return of({ success: true, data: serialNumber }).pipe(delay(300));
  }

  getSerialNumberByNumber(serialNumber: string): Observable<any> {
    const sn = this.mockSerialNumbers.find(s => s.serial_number === serialNumber);
    return of({ success: true, data: sn }).pipe(delay(300));
  }

  createSerialNumber(serialNumber: SerialNumber): Observable<any> {
    const newSerialNumber = {
      ...serialNumber,
      id: this.mockSerialNumbers.length + 1,
      created_at: new Date().toISOString()
    };
    this.mockSerialNumbers.push(newSerialNumber);
    return of({ success: true, data: newSerialNumber }).pipe(delay(800));
  }

  bulkCreateSerialNumbers(serialNumbers: Partial<SerialNumber>[]): Observable<any> {
    const newSerialNumbers = serialNumbers.map((sn, index) => ({
      ...sn,
      id: this.mockSerialNumbers.length + index + 1,
      created_at: new Date().toISOString()
    }));
    this.mockSerialNumbers.push(...newSerialNumbers as SerialNumber[]);
    return of({ success: true, data: newSerialNumbers, count: newSerialNumbers.length }).pipe(delay(1500));
  }

  generateSerialNumbersBatch(batchData: Partial<SerialNumberBatch>): Observable<any> {
    const { prefix = 'EYE', start_number = 1, quantity = 10, product_model = 'EyeFi Pro X1' } = batchData;
    const generatedNumbers = [];
    
    for (let i = 0; i < quantity; i++) {
      const serialNumber = `${prefix}${(start_number + i).toString().padStart(8, '0')}`;
      generatedNumbers.push({
        id: this.mockSerialNumbers.length + i + 1,
        serial_number: serialNumber,
        product_model,
        status: 'available',
        manufacture_date: new Date().toISOString().split('T')[0],
        batch_number: `BATCH-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(3, '0')}`,
        created_at: new Date().toISOString()
      });
    }
    
    this.mockSerialNumbers.push(...generatedNumbers);
    return of({ 
      success: true, 
      data: generatedNumbers, 
      batch_info: batchData,
      count: quantity 
    }).pipe(delay(2000));
  }

  searchSerialNumbers(query: string): Observable<any> {
    const filtered = this.mockSerialNumbers.filter(sn => 
      sn.serial_number.toLowerCase().includes(query.toLowerCase()) ||
      sn.product_model.toLowerCase().includes(query.toLowerCase())
    );
    return of({ success: true, data: filtered }).pipe(delay(400));
  }

  assignSerialNumber(assignment: SerialNumberAssignment): Observable<any> {
    const newAssignment = {
      ...assignment,
      id: this.mockAssignments.length + 1,
      created_at: new Date().toISOString()
    };
    this.mockAssignments.push(newAssignment);
    
    // Update serial number status
    const serialNumber = this.mockSerialNumbers.find(sn => sn.serial_number === assignment.serial_number);
    if (serialNumber) {
      serialNumber.status = 'assigned';
    }
    
    return of({ success: true, data: newAssignment }).pipe(delay(800));
  }

  getSerialNumberAssignments(): Observable<any> {
    return of({ success: true, data: this.mockAssignments }).pipe(delay(500));
  }

  getSerialNumberStats(): Observable<SerialNumberStats> {
    return of(this.mockStats).pipe(delay(600));
  }

  getAvailableSerialNumbers(limit?: number): Observable<any> {
    const available = this.mockSerialNumbers.filter(sn => sn.status === 'available');
    const result = limit ? available.slice(0, limit) : available;
    return of({ success: true, data: result }).pipe(delay(300));
  }

  validateSerialNumber(serialNumber: string): Observable<any> {
    const exists = this.mockSerialNumbers.some(sn => sn.serial_number === serialNumber);
    return of({ 
      success: true, 
      data: { 
        valid: !exists, 
        exists,
        message: exists ? 'Serial number already exists' : 'Serial number is available'
      }
    }).pipe(delay(300));
  }

  getProductModels(): Observable<string[]> {
    const models = [...new Set(this.mockSerialNumbers.map(sn => sn.product_model))];
    return of(models).pipe(delay(200));
  }

  getUsageReport(filters?: any): Observable<any> {
    const reportData = this.mockAssignments.map(assignment => ({
      id: assignment.id,
      serial_number: assignment.serial_number,
      product_model: this.mockSerialNumbers.find(sn => sn.serial_number === assignment.serial_number)?.product_model,
      customer_name: assignment.customer_name,
      work_order_number: assignment.work_order_number,
      assigned_date: assignment.assigned_date,
      shipped_date: assignment.shipped_date,
      assigned_by_name: assignment.assigned_by_name,
      notes: assignment.notes,
      wo_nbr: assignment.wo_nbr,
      wo_due_date: assignment.wo_due_date,
      wo_part: assignment.wo_part,
      wo_qty_ord: assignment.wo_qty_ord,
      wo_routing: assignment.wo_routing,
      wo_line: assignment.wo_line,
      wo_description: assignment.wo_description
    }));
    
    return of({ success: true, data: reportData }).pipe(delay(700));
  }
}