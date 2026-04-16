export interface UpdateEyeFiSerialStatusDto {
  status: 'available' | 'assigned' | 'shipped' | 'returned' | 'defective';
  reason?: string;
}
