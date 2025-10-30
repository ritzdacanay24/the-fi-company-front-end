# PDF to Checklist Template Mapping Guide

## How PDF Data Extraction Works

### Overview
The PDF parser uses `pdfjs-dist` library to extract text from PDFs and then applies intelligent pattern matching to map the content to checklist template fields.

## Extraction Process Flow

```
1. PDF File Upload
   ↓
2. Load PDF with pdf.js
   ↓
3. Extract text from all pages
   ↓
4. Apply pattern matching rules
   ↓
5. Map to template fields
   ↓
6. Populate form
```

## Field Mapping Rules

### 1. Template Name
**Source**: Extracted from filename or PDF content

**Patterns Matched**:
- Filename: `QA-FRM-202 VWL-03505-310_IC_Rev 2_2025725.pdf`
  - Extracts: `Quality Inspection - VWL-03505-310`
- Content: "Critical to Quality Inspection Checklist"
  - Uses as-is or combines with part number

**Code**:
```typescript
private extractTemplateName(filename: string, lines: string[]): string {
  // Pattern: QA-FRM-XXX Part-Number
  const qaFormMatch = nameFromFile.match(/QA-FRM-\d+\s+([A-Z0-9\-]+)/i);
  
  // Look for title patterns in first 10 lines
  const titlePatterns = [
    /Critical to Quality Inspection Checklist/i,
    /Quality Inspection Checklist/i
  ];
}
```

**Example Mapping**:
```
PDF Filename: QA-FRM-202 VWL-03505-310_IC_Rev 2_2025725.pdf
      ↓
Template Name: Quality Inspection - VWL-03505-310
```

---

### 2. Part Number
**Source**: Extracted from PDF content

**Patterns Matched**:
```typescript
// Specific patterns
/The\s+Fi\s+Company\s+P\/N:\s*([A-Z0-9\-]+)/i
/Part\s+Number:\s*([A-Z0-9\-]+)/i
/P\/N:\s*([A-Z0-9\-]+)/i

// Generic pattern (fallback)
/\b([A-Z]{2,4}-\d{4,6}-\d{2,4})\b/
```

**Example from Your PDF**:
```
PDF Content: "The Fi Company P/N: VWL-03505-310"
      ↓
Part Number: VWL-03505-310

Alternative:
PDF Content: "Part Number: VWL-03505-310"
      ↓
Part Number: VWL-03505-310
```

---

### 3. Description / Product Type
**Source**: Extracted from "Description:" field

**Patterns Matched**:
```typescript
/Description:\s*(.+)/i
/Product:\s*(.+)/i
/Product\s+Type:\s*(.+)/i
```

**Example from Your PDF**:
```
PDF Content: "Description: VWL_3X1 WOF TRIO"
      ↓
Product Type: VWL_3X1 WOF TRIO
```

---

### 4. Category
**Source**: Auto-assigned based on content or defaults to 'quality_control'

**Logic**:
- If PDF contains "Quality" or "Inspection" → `quality_control`
- If contains "Installation" → `installation`
- If contains "Maintenance" → `maintenance`
- Default → `quality_control`

---

### 5. Checklist Items
**Source**: Extracted from numbered lists, bullet points, or verification instructions

**Patterns Matched**:

#### a) Numbered Items
```typescript
/^(\d+)\s+(.+)$/       // 1 Item description
/^(\d+)\.\s+(.+)$/     // 1. Item description  
/^(\d+)\)\s+(.+)$/     // 1) Item description
```

**Example from Your PDF**:
```
PDF: "1    Check staging and Hardware as per QA-FRM-203 PDC"
      ↓
Item 1:
  title: "Check staging and Hardware as per QA-FRM-203 PDC"
  order_index: 1
  is_required: true
```

#### b) Checkbox Items
```typescript
/^[☐☑✓✗]\s+(.+)$/      // ☐ Item
/^\[[\s\w]\]\s+(.+)$/  // [ ] Item or [x] Item
```

#### c) Bullet Points
```typescript
/^[•\-\*]\s+(.+)$/     // • Item or - Item
```

**Example from Your PDF**:
```
PDF: "• IGT Serial Tag"
      ↓
Sub-item or description: "IGT Serial Tag"
```

#### d) Action Verbs
```typescript
/^Check\s+(.+)/i       // Check something
/^Verify\s+(.+)/i      // Verify something
/^Ensure\s+(.+)/i      // Ensure something
/^Inspect\s+(.+)/i     // Inspect something
```

**Example from Your PDF**:
```
PDF: "Verify SIGN labels are applied:"
      ↓
Item:
  title: "Verify SIGN labels are applied:"
  order_index: 2
```

---

## Your Specific PDF Structure

### QA-FRM-202 Layout

```
+--------------------------------------------------+
| The Fi Company P/N: VWL-03505-310               |
| Description: VWL_3X1 WOF TRIO                   |
+--------------------------------------------------+
| Work Order Number | Date | Customer Asset# | UL# |
+--------------------------------------------------+
| No. | Process Steps | Critical to Quality      |
+--------------------------------------------------+
| 1   | Check staging and Hardware as per...      |
|     | • Ensure Installation Instructions...     |
+--------------------------------------------------+
| 2   | Verify SIGN labels are applied:           |
|     | 1. On the top of the left wedge:          |
|     |    • IGT Serial Tag                       |
|     | 2. Left wedge                             |
|     |    • Fi Serial Tag                        |
|     |    • IGT Serial Tag                       |
|     |    • UL Label                             |
|     |    • Ground Continuity Test label         |
+--------------------------------------------------+
```

### Mapping Result

```json
{
  "name": "Quality Inspection - VWL-03505-310",
  "part_number": "VWL-03505-310",
  "product_type": "VWL_3X1 WOF TRIO",
  "category": "quality_control",
  "items": [
    {
      "order_index": 1,
      "title": "Check staging and Hardware as per QA-FRM-203 PDC",
      "description": "Ensure Installation Instructions printed and included with Hardware Kit Box",
      "is_required": true
    },
    {
      "order_index": 2,
      "title": "Verify SIGN labels are applied:",
      "description": "On the top of the left wedge: IGT Serial Tag - Left wedge: Fi Serial Tag, IGT Serial Tag, UL Label, Ground Continuity Test label",
      "is_required": true
    },
    {
      "order_index": 3,
      "title": "Verify SIGN and WEDGES Data Connection are plugged in correct orientation",
      "description": "",
      "is_required": true
    }
  ]
}
```

---

## Section Detection Logic

The parser uses section headers to identify where checklist items begin:

```typescript
const sectionHeaders = [
  'Critical to Quality',
  'Process Steps',
  'Verification',
  'Inspection Points',
  'Check',
  'Verify'
];
```

Once a section header is found, the parser enters "items section" mode and starts extracting items.

---

## Description Aggregation

Multi-line descriptions are aggregated by detecting continuation lines:

```typescript
// Current item exists and line doesn't match item patterns
if (!matched && inItemsSection && currentItem) {
  // Check if line is a description (not a header/field label)
  if (!line.match(/^[A-Z\s]+:/) &&      // Not "Description:"
      !line.match(/^Page \d+/) &&        // Not "Page 1"
      !line.match(/^QA-FRM/)) {          // Not form ID
    // Add to description
    currentItem.description += ' ' + line;
  }
}
```

**Example**:
```
Line 1: "Check staging and Hardware as per QA-FRM-203 PDC"
Line 2: "Ensure Installation Instructions printed and"
Line 3: "included with Hardware Kit Box"

Result:
title: "Check staging and Hardware as per QA-FRM-203 PDC"
description: "Ensure Installation Instructions printed and included with Hardware Kit Box"
```

---

## Sub-Item Detection

Nested items (bullets, indented text) are treated as part of the parent item's description:

```typescript
const verifyPatterns = [
  /^(\w+\s+)?Serial\s+Tag$/i,
  /^UL\s+Label$/i,
  /^Ground\s+Continuity/i
];
```

**Example from Your PDF**:
```
Main Item: "Verify SIGN labels are applied:"
  Sub-items:
    • IGT Serial Tag        → Added to description
    • Fi Serial Tag         → Added to description
    • UL Label              → Added to description
    • Ground Continuity     → Added to description

Result:
title: "Verify SIGN labels are applied:"
description: "IGT Serial Tag, Fi Serial Tag, UL Label, Ground Continuity Test label"
```

---

## Fallback Extraction

If standard patterns don't match, the parser uses a fallback method:

```typescript
private fallbackItemExtraction(lines: string[]): ParsedChecklistItem[] {
  // Extract lines that look like items (15-150 chars, no dates/emails)
  for (const line of lines) {
    if (line.length > 15 && line.length < 150 && 
        !line.match(/^Page \d+/) &&
        !line.match(/^QA-FRM/) &&
        !line.includes('@')) {
      items.push({ title: line.trim(), ... });
    }
  }
}
```

This ensures some items are extracted even from poorly formatted PDFs.

---

## Photo Requirements

Photo requirements are NOT extracted from PDFs (not typically included in source docs).

**Default Values**:
```json
{
  "angle": "",
  "distance": "",
  "lighting": "",
  "focus": "",
  "min_photos": 1,
  "max_photos": 5
}
```

Users must manually configure these after import.

---

## Limitations & Edge Cases

### What Works Well ✅
- Numbered lists (1., 2., 3.)
- Bulleted lists (•, -, *)
- Clear section headers
- Standard form layouts
- Text-based PDFs

### What Doesn't Work ❌
- Scanned PDFs (images) - requires OCR
- Complex table structures
- Multi-column layouts
- Hand-drawn checkboxes
- Embedded images/graphics

### Workarounds
1. **Scanned PDFs**: Use OCR preprocessing (Tesseract.js)
2. **Tables**: Extract table data separately and convert to CSV
3. **Complex layouts**: Use manual import option
4. **Poor extraction**: Edit items after import

---

## Debug/Troubleshooting

### Enable Console Logging
The parser logs extraction progress:

```typescript
console.log(`PDF loaded. Pages: ${pdf.numPages}`);
console.log(`Page ${pageNum} text length: ${pageText.length}`);
console.log('Full extracted text:', fullText.substring(0, 500));
console.log('Found part number:', match[1]);
console.log(`Found checklist item ${orderIndex}: ${itemTitle}`);
console.log(`Extracted ${items.length} checklist items`);
```

### Check Browser Console
After uploading PDF, check console for:
- Number of pages extracted
- Text extraction success
- Items found vs expected
- Pattern matching details

### Common Issues

**Issue**: No items extracted
- **Check**: Console shows "No items found with standard patterns"
- **Solution**: Verify PDF is text-based (not scanned)

**Issue**: Wrong part number extracted
- **Check**: Console shows "Found part number: XXX"
- **Solution**: Update regex patterns in `extractPartNumber()`

**Issue**: Items missing descriptions
- **Check**: Descriptions are on separate lines
- **Solution**: Adjust continuation line detection logic

---

## Testing Your PDF

To test with QA-FRM-202:

1. **Upload PDF** in import modal
2. **Check Console** for extraction logs
3. **Verify Mapping**:
   - Template name includes "VWL-03505-310"
   - Part number is "VWL-03505-310"
   - Product type is "VWL_3X1 WOF TRIO"
   - At least 3-5 checklist items extracted
4. **Review Items** for accuracy
5. **Manual Cleanup** if needed

---

## Future Enhancements

### Planned Improvements
- [ ] Table structure detection
- [ ] OCR for scanned PDFs
- [ ] Multi-column layout support
- [ ] Image/diagram extraction
- [ ] AI-powered content understanding
- [ ] Learning from user corrections

### Configuration Options (Future)
```typescript
interface ParserConfig {
  enableOCR: boolean;
  tableDetection: boolean;
  minItemLength: number;
  maxItemLength: number;
  customPatterns: RegExp[];
}
```

---

## Related Files

- **Service**: `pdf-parser.service.ts`
- **Component**: `checklist-template-editor.component.ts`
- **Documentation**: `checklist-template-pdf-import.md`

## Support

For extraction issues with specific PDF formats, provide:
1. Sample PDF (with sensitive data removed)
2. Console log output
3. Expected vs actual extraction results
4. PDF structure description

This helps improve pattern matching for new formats!
