# Checklist Template PDF Import Feature

## Overview
The Checklist Template Editor now supports importing checklist data from PDF forms and CSV files, making it easy to digitize existing paper-based checklists.

## Features

### 1. PDF Import
- **Automatic Extraction**: Upload a PDF checklist form and the system will attempt to extract:
  - Template name (from filename or document title)
  - Part numbers and product types
  - Checklist items with titles and descriptions
  - Item order and required status
  - **Images embedded in the PDF** (automatically distributed to checklist items)

- **Supported PDF Formats**:
  - Forms with numbered lists (1. Item, 2. Item, etc.)
  - Checkbox-based lists (☐ Item, ☑ Item)
  - Bulleted lists (• Item, - Item, * Item)

### 2. CSV Import
- **Structured Data**: Import from Excel/CSV files
- **Expected Format**:
  ```
  Title, Description, Required, Angle, Distance, MinPhotos, MaxPhotos
  Check connector pins, Verify no damage or corrosion, true, front, close, 2, 5
  Inspect housing, Check for cracks or defects, true, side, medium, 1, 3
  ```

### 3. Manual Creation
- **Quick Setup**: Specify template name and number of items
- **Template Scaffold**: Creates empty items you can fill in manually
- **Use Case**: When you know the structure but don't have digital source

## How to Use

### Importing from PDF (like QA-FRM-202)

1. **Navigate to Template Editor**
   - Go to Quality → Template Manager
   - Click "Create New Template"

2. **Click Import Button**
   - Look for "Import" button next to "Back" button (only visible on new templates)
   - Opens import modal

3. **Upload PDF**
   - Click "Choose File" or drag PDF
   - Supported: `.pdf`, `.csv` files
   - System will process and extract checklist items
   - **Images in PDF will be automatically extracted and assigned to items**

4. **Review and Edit**
   - Imported items appear in the form
   - **Sample images from PDF are displayed for each item**
   - Edit titles, descriptions as needed
   - Add photo requirements
   - Replace or add additional sample images if needed

5. **Save Template**
   - Click "Create Template" when satisfied
   - Template is now available for use

### Importing from CSV

1. **Prepare CSV File**
   ```csv
   Title,Description,Required,Angle,Distance,MinPhotos,MaxPhotos
   Item 1 Title,Item 1 Description,true,front,close,1,5
   Item 2 Title,Item 2 Description,false,side,medium,0,3
   ```

2. **Upload in Import Modal**
   - Follow same steps as PDF import
   - Select your CSV file

3. **Data Mapping**
   - Title → Checklist item title
   - Description → Item description
   - Required → Is item required (true/false)
   - Angle → Photo angle requirement
   - Distance → Photo distance requirement
   - MinPhotos → Minimum photos required
   - MaxPhotos → Maximum photos allowed

### Manual Template Creation

1. **Click Import Button**
2. **Scroll to Manual Section**
3. **Enter Details**:
   - Template name: e.g., "VWL-03505-310 Inspection"
   - Number of items: e.g., 15
4. **Click "Create Manual Template"**
5. **Fill in Item Details**:
   - Each item starts with placeholder text
   - Update titles and descriptions
   - Configure photo requirements

## PDF Parsing Limitations

### Current Implementation
The implementation uses pdf.js for comprehensive extraction:
- Text extraction with layout preservation
- **Image extraction from embedded PDF images**
- Well-structured PDF forms
- Clear numbering or bullet points
- Standard formatting

### Known Limitations
- Complex layouts may not parse correctly
- Tables might not extract perfectly
- **Images are distributed evenly across checklist items**
- Scanned PDFs (images) won't work without OCR
- Very large PDFs may take time to process

### Future Enhancements
- Enhanced table detection and extraction
- OCR support for scanned documents
- Form field recognition
- AI-powered content extraction
- Manual image-to-item assignment UI

## Best Practices

### For Best PDF Import Results:
1. **Use Text-Based PDFs**: Not scanned images (unless images should be extracted as samples)
2. **Clear Structure**: Numbered or bulleted lists
3. **Consistent Formatting**: Same style for all items
4. **Simple Layout**: Single column works best
5. **Embedded Images**: PDFs with embedded images will have them extracted and assigned to items

### After Import:
1. **Review All Items**: Check for accuracy
2. **Verify Images**: Check that extracted images match the correct items
3. **Add Details**: Enhance descriptions
4. **Set Requirements**: Configure photo needs
5. **Adjust Samples**: Replace or reorder sample images as needed
6. **Test Template**: Create instance to verify

## Example: Importing QA-FRM-202

Your PDF "QA-FRM-202 VWL-03505-310_IC_Rev 2_2025725.pdf":

1. **Click Import** in template editor
2. **Upload PDF** from Downloads folder
3. **System Extracts**:
   - Name: "QA-FRM-202 VWL-03505-310 IC Rev 2"
   - Part Number: "VWL-03505-310"
   - Items: All inspection points from the form
   - **Images: Embedded images distributed to items**
4. **Review** each item and its assigned image
5. **Add** photo requirements for critical items
6. **Adjust** sample images if needed (replace or reorder)
7. **Save** template

## Troubleshooting

### Import Fails
- **Check file format**: Must be .pdf or .csv
- **File size**: Large files may timeout
- **PDF structure**: Try manual import if auto-fails

### Missing Data
- **Manual fix**: Edit items after import
- **Re-import**: Try different source format
- **Manual entry**: Last resort for complex forms

### Images Not Showing
- **Check browser console**: Look for image extraction errors
- **Verify PDF format**: Images must be embedded, not just displayed
- **Manual upload**: Add images manually after import if extraction fails

### Photo Requirements Not Imported
- This is expected - add manually after import
- Future versions may support this

### Images Assigned to Wrong Items
- PDF parser distributes images evenly across items
- Manually reassign by removing/uploading to correct items
- Future enhancement: manual image-to-item mapping UI

## Technical Notes

### PDF Parser Service
Located: `src/app/pages/quality/checklist-template-editor/services/pdf-parser.service.ts`

Key methods:
- `parsePdfToTemplate()` - Main PDF parsing (text + images)
- `extractImagesFromPdf()` - Image extraction using canvas rendering
- `parseCsvToTemplate()` - CSV parsing  
- `createManualTemplate()` - Manual scaffold

### Dependencies
- **pdf.js (pdfjs-dist)**: Full PDF parsing with text and image extraction
- **Canvas API**: Used for rendering and extracting images from PDF pages
- **Planned**: Tesseract.js for OCR support

## API Integration

The import feature is client-side only:
- No API changes required
- Uses existing template creation endpoint
- Parsed data conforms to ChecklistTemplate interface

## Security Considerations

- **File validation**: Only PDF/CSV accepted
- **Size limits**: Prevent large uploads
- **Content sanitization**: XSS protection
- **Client-side processing**: No server storage of uploaded files

## Related Documentation
- [Photo Checklist Configuration System](./photo-checklist-configuration-system.md)
- [Checklist Template Editor Guide](./checklist-template-editor-guide.md)
- [Quality Document Integration](./quality-document-integration.md)

## Support

For issues with PDF import:
1. Try manual import with item count
2. Check console for parsing errors
3. Verify PDF is text-based (not scanned)
4. Contact support with PDF sample
