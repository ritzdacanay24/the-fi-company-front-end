export interface UploadedSpreadsheetFile {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
}
