/**
 * EYEFI Asset Number Label ZPL Template
 * 
 * Label Content:
 * - Asset Number (YYYYMMDDXXX format with barcode)
 * - EYEFI Part Number
 * - Date
 * - Volts
 * - Hz (Frequency)
 * - Amps (Current)
 * - "DRY LOCATIONS ONLY" warning
 * - The FI Company Logo
 * 
 * Label Size: 4" x 6" (102mm x 152mm)
 * Printer: Zebra thermal printer
 */

export interface AssetNumberLabelData {
  assetNumber: string;          // e.g., "20251125001"
  eyefiPartNumber: string;       // e.g., "EF-PN-12345"
  date: string;                  // e.g., "11/25/2025"
  volts: string;                 // e.g., "120V"
  hz: string;                    // e.g., "60Hz"
  amps: string;                  // e.g., "15A"
  copies?: number;               // Number of copies to print (default: 1)
}

/**
 * Generate ZPL commands for EYEFI Asset Number label with embedded logo
 * 
 * Logo: The FI Company logo converted from src/assets/images/the-fi.png
 * The logo is embedded as ZPL ^GFA graphic data (no external files needed)
 * Label Orientation: Landscape (6" x 4")
 */
export function generateAssetNumberLabelZPL(data: AssetNumberLabelData): string {
  const copies = data.copies || 1;
  
  return `
^XA
^POI
^PQ${copies},0,1,Y

^FX ===== THE FI COMPANY LOGO (Embedded) =====
^FO50,30^GFA,4368,4368,39,,::gM0FF,gL07FF,gK03IF,gK0JF,gJ03JF,gJ07JF,gI01KF,gI03KF,gI07KF,gI0LF,gH01LF,gH03LF,gH07LF,gH0MF,:gG01MF,gG01LF800E,gG03KF8007FC,gG03JFEI0IF,gG07JFC001IF8,gG07JFI03IFC,gG0JFEI07IFC,gG0JFEI07IFE,gG0JFCI0JFE,g01JF8I0JFE,:g01JFJ0JFE,:::g01IFEJ07IFC,g01IFEJ03IFC,g01IFEJ03IF8,g01IFEJ01IF,g01IFEK07FE,g01IFEK01F,g01IFE,:g03IFE,1FFC01C03001FF8I03TFEK07EI03F8001C01C007F8I0EI0380E00701C,1FFC01E07803FF8I03TFEJ01FF8007FE001E03E00FFC001FI03C0F00783C,1FFC01E07803FF8I03TFEJ03FF801IF001F03E00FFE001FI03E0F00783C,03E001E07803CK03TFEJ07C3801E0F801F87E00F1F001F8003F0F003C78,01C001E07803CK03TFEJ0FJ03C07801F8FE00F0F003F8003F0F001CF,01C001E07803CK03TFEJ0FJ03803801FDFE00F07003F8003F8F001FF,01C001IF803FFJ03TFEJ0EJ07803C01IFE00F0F007BC003FCFI0FE,01C001IF803FFJ03TFEJ0EJ07803C01EFDE00F9F0079C003FEFI07C,01C001IF803FFJ03TFEJ0EJ07803C01EF9E00FFE00F1E0039FFI07C,01C001E07803CK03TFEJ0FJ03803C01E71E00FFC00F1E0038FFI038,01C001E07803CK03TFEJ0FJ03C07801E31E00FEI0FFE00387FI038,01C001E07803CK03TFEJ0781001E0F801E01E00FI01IF00383FI038,01C001E07803FF8I03TFEJ03FF801IF001E01E00FI01IF00383FI038,01C001E07803FF8I03TFEJ01FF800FFE001E01E00FI03C0780381FI038,01C001C07001FF8I03TFEK0FFI03F8001C01C007I03C0380380EI038,g03JFJ03IFE,g01IFEJ01IFE,:::::::::::::::::::::::::g01IFEJ01IFC,:g01IFEJ01IF8,:g01IFEJ01IF,g01IFEJ01FFE,:g01IFEJ01FF8,g01IFEJ01FF,g01IFEJ01FC,g01IFEJ01E,g01IFE,:::::::::::g03IFE,g01IFE,,::^FS

^FX ===== ASSET NUMBER (Large, with barcode) =====
^CF0,25
^FO400,40^FDAsset Number:^FS
^CF0,50
^FO400,75^FD${data.assetNumber}^FS
^FO400,150^BY2,2.5^B3N,N,100,N,N^FD${data.assetNumber}^FS

^FX ===== EYEFI PART NUMBER =====
^CF0,25
^FO50,280^FDEYEFI Part Number:^FS
^CF0,40
^FO50,315^FD${data.eyefiPartNumber}^FS

^FX ===== ELECTRICAL SPECIFICATIONS =====
^CF0,25
^FO400,280^FDDate: ${data.date}^FS

^CF0,35
^FO400,315^FD${data.volts}  |  ${data.hz}  |  ${data.amps}^FS

^FX ===== WARNING MESSAGE =====
^CF0,30
^FO50,380^GB900,60,3^FS
^FO100,395^FDDRY LOCATIONS ONLY^FS

^XZ
`.trim();
}

/**
 * Generate ZPL with FI Company logo (if available as graphic)
 * This assumes you have the logo stored as a ZPL graphic object on the printer
 * 
 * To store the logo on the printer:
 * 1. Use logo from project: src/assets/images/the-fi.png or src/assets/images/fi-color.png
 * 2. Convert to ZPL using Labelary: http://labelary.com/viewer.html
 *    - Upload PNG file
 *    - Set DPI to match your printer (203 or 300)
 *    - Download the ZPL code
 * 3. Send ^DFE:FILOGO.GRF^FS command with graphic data to store on printer
 * 4. Use ^XGE:FILOGO.GRF^FS to recall the stored graphic
 * 
 * @param logoGraphicName - Name of the stored graphic on the printer (default: 'E:FILOGO.GRF')
 */
export function generateAssetNumberLabelWithLogoZPL(data: AssetNumberLabelData, logoGraphicName: string = 'E:FILOGO.GRF'): string {
  const copies = data.copies || 1;
  
  return `
^XA
^PQ${copies},0,1,Y

^FX ===== THE FI COMPANY LOGO (from stored graphic) =====
^FX Logo source: https://the-fi-company.com/wp-content/uploads/2024/09/The-Fi-Company-Logo-Blue-1.png
^FO50,20^XG${logoGraphicName},1,1^FS

^FX ===== ASSET NUMBER (Large, with barcode) =====
^CF0,30
^FO50,140^FDAsset Number:^FS
^CF0,60
^FO50,180^FD${data.assetNumber}^FS
^FO50,260^BY3,2.5^B3N,N,120,N,N^FD${data.assetNumber}^FS

^FX ===== EYEFI PART NUMBER =====
^CF0,30
^FO50,420^FDEYEFI Part Number:^FS
^CF0,45
^FO50,460^FD${data.eyefiPartNumber}^FS

^FX ===== ELECTRICAL SPECIFICATIONS =====
^CF0,30
^FO50,540^FDDate: ${data.date}^FS

^CF0,40
^FO50,590^FD${data.volts}  |  ${data.hz}  |  ${data.amps}^FS

^FX ===== WARNING MESSAGE (Highlighted) =====
^CF0,35
^FO50,660^GB700,70,3^FS
^FO100,680^FDDRY LOCATIONS ONLY^FS

^FX ===== BOTTOM SEPARATOR LINE =====
^FO50,750^GB700,2,2^FS

^XZ
`.trim();
}

/**
 * Print asset number label to Zebra printer
 * Opens new window with ZPL commands that the printer can process
 */
export function printAssetNumberLabel(data: AssetNumberLabelData): void {
  const zplCommands = generateAssetNumberLabelZPL(data);
  
  const printWindow = window.open('', 'PRINT', 'height=500,width=600');
  if (printWindow) {
    printWindow.document.write(zplCommands);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  } else {
    console.error('Failed to open print window. Please check popup blocker settings.');
  }
}
