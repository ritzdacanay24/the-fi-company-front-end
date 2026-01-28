import { Injectable } from '@angular/core';
import * as mammoth from 'mammoth';

interface SampleImage {
  url: string;
  label?: string;
  description?: string;
  type?: string;
  is_primary?: boolean;
  order_index?: number;
}

interface ParsedChecklistItem {
  title: string;
  description: string;
  order_index: number;
  is_required: boolean;
  sample_images?: SampleImage[];
  photo_requirements?: {
    angle?: string;
    distance?: string;
    lighting?: string;
    focus?: string;
    min_photos?: number;
    max_photos?: number;
  };
  children?: ParsedChecklistItem[];
  parent_id?: number;
  level?: number;
}

interface ParsedTemplate {
  name: string;
  description?: string;
  category?: string;
  part_number?: string;
  product_type?: string;
  customer_part_number?: string;
  revision?: string;
  original_filename?: string;
  review_date?: string;
  revision_number?: string;
  revision_details?: string;
  revised_by?: string;
  items: ParsedChecklistItem[];
}

@Injectable({
  providedIn: 'root'
})
export class WordParserService {
  private imageConversionCount = 0;
  private readonly MAX_IMAGE_LOGS = 3; // Only log first 3 images

  constructor() { }

  /**
   * Parse Word document (.docx) and extract checklist template data
   * 
   * Word documents provide superior extraction because:
   * 1. Structured content (headings, lists, tables preserved)
   * 2. Reliable text extraction
   * 3. Image metadata available
   * 4. Formatting preserved (bold, italic, bullets)
   */
  async parseWordToTemplate(file: File): Promise<ParsedTemplate> {
    try {
      // Reset counter for each parse
      this.imageConversionCount = 0;
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Parse with mammoth - extracts text AND images
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          includeDefaultStyleMap: true,
          includeEmbeddedStyleMap: true,
          convertImage: mammoth.images.imgElement((image) => {
            return image.read("base64").then((imageBuffer) => {
              // Increment counter
              this.imageConversionCount++;
              
              // Ensure content type is valid (default to png if not specified)
              const contentType = image.contentType || 'image/png';
              
              // Clean the base64 string (remove any whitespace)
              const cleanBase64 = imageBuffer.replace(/\s/g, '');
              
              // Construct the data URL
              const dataUrl = `data:${contentType};base64,${cleanBase64}`;
              
              return {
                src: dataUrl
              };
            });
          })
        }
      );

      // Parse the HTML to extract structured data
      const template = this.parseHtmlToTemplate(result.value, file.name);

      return template;
    } catch (error) {
      console.error('❌ Error parsing Word document:', error);
      throw new Error('Failed to parse Word document. Please ensure it is a valid .docx file.');
    }
  }

  /**
   * Parse HTML (from Word) into structured template data
   * 
   * Advantages over PDF parsing:
   * - Headers are actual <h1>, <h2> tags (not positioned text)
   * - Lists maintain <ul>, <ol> structure
   * - Tables are proper <table> elements
   * - Images have alt text and are inline with content
   */
  private parseHtmlToTemplate(html: string, filename: string): ParsedTemplate {
    // Create temporary DOM element to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract metadata from document first (to get category)
    const metadata = this.extractMetadata(doc);
    
    console.log('📊 Extracted metadata:', metadata);

    const extractedDescription = this.extractDescription(doc);
    console.log('📝 Extracted description:', extractedDescription);

    const template: ParsedTemplate = {
      name: this.extractTemplateName(doc, filename),
      description: extractedDescription,
      category: metadata.category || 'quality_control', // Use extracted category or default
      items: [],
      original_filename: filename
    };
    
    console.log('📋 Template before applying metadata:', {
      name: template.name,
      description: template.description,
      category: template.category
    });

    // Apply other metadata to template
    if (metadata.part_number) template.part_number = metadata.part_number;
    if (metadata.product_type) template.product_type = metadata.product_type;
    if (metadata.customer_part_number) template.customer_part_number = metadata.customer_part_number;
    if (metadata.revision) template.revision = metadata.revision;
    if (metadata.review_date) template.review_date = metadata.review_date;
    if (metadata.revision_number) template.revision_number = metadata.revision_number;
    if (metadata.revision_details) template.revision_details = metadata.revision_details;
    if (metadata.revised_by) template.revised_by = metadata.revised_by;
    
    console.log('✅ Final template after applying metadata:', {
      name: template.name,
      description: template.description,
      category: template.category,
      product_type: template.product_type,
      part_number: template.part_number
    });

    // Extract checklist items from document structure
    template.items = this.extractChecklistItems(doc);

    return template;
  }

  /**
   * Extract template name from document
   * - First <h1> heading
   * - Or first bold text
   * - Or filename
   */
  private extractTemplateName(doc: Document, filename: string): string {
    // Try h1 first (but exclude if it looks like an item title)
    const h1 = doc.querySelector('h1');
    if (h1 && h1.textContent?.trim()) {
      const text = h1.textContent.trim();
      // Exclude if it looks like an item number/title (e.g., "1", "1.", "Label", single word < 4 chars)
      if (!this.looksLikeItemTitle(text)) {
        return text;
      }
    }

    // Try for title-like elements (elements with "title" in class or that look like titles)
    const titleElements = doc.querySelectorAll('p.title, div.title, span.title, p:first-of-type');
    for (const el of Array.from(titleElements)) {
      const text = el.textContent?.trim();
      if (text && text.length > 10 && !this.looksLikeItemTitle(text)) {
        return text;
      }
    }

    // Try strong/bold at top (but only if it's substantial text)
    const strong = doc.querySelector('strong, b');
    if (strong && strong.textContent?.trim()) {
      const text = strong.textContent.trim();
      // Only use if it's more than 4 characters and doesn't look like an item number
      if (text.length > 4 && !this.looksLikeItemTitle(text)) {
        return text;
      }
    }

    // Fallback to filename (cleaned up)
    return this.cleanFilename(filename);
  }

  /**
   * Check if text looks like an item title rather than a template name
   */
  private looksLikeItemTitle(text: string): boolean {
    // Single number or number with period (e.g., "1", "1.")
    if (/^\d+\.?$/.test(text)) {
      return true;
    }
    
    // Very short single words (likely item labels)
    if (text.length < 4 && /^[A-Za-z]+$/.test(text)) {
      return true;
    }
    
    // Common item-specific words that shouldn't be template names
    const itemKeywords = ['label', 'check', 'verify', 'inspect', 'test', 'review'];
    if (itemKeywords.includes(text.toLowerCase())) {
      return true;
    }
    
    return false;
  }

  /**
   * Clean up filename to make a nice template name
   */
  private cleanFilename(filename: string): string {
    // Remove extension
    let name = filename.replace(/\.(docx|doc|pdf|csv)$/i, '');
    
    // Replace underscores and hyphens with spaces
    name = name.replace(/[_-]/g, ' ');
    
    // Capitalize first letter of each word
    name = name.replace(/\b\w/g, char => char.toUpperCase());
    
    // If still too short or looks generic, add context
    if (name.length < 5 || /^(doc|file|checklist)$/i.test(name)) {
      name = 'Imported Checklist Template - ' + name;
    }
    
    return name;
  }

  /**
   * Extract description - generate a summary based on document content
   */
  private extractDescription(doc: Document): string {
    const allText = doc.body.textContent || '';
    
    // Look for common description patterns
    // 1. Try to find product/part info at the top
    const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // 2. Look for quality inspection related text
    if (allText.toLowerCase().includes('quality') || allText.toLowerCase().includes('inspection')) {
      const itemCount = (allText.match(/\b\d+\b/g) || []).length;
      const hasLabels = allText.toLowerCase().includes('label');
      const hasConnections = allText.toLowerCase().includes('connection');
      const hasSoftware = allText.toLowerCase().includes('software');
      
      let description = 'Quality inspection checklist';
      const features: string[] = [];
      
      if (hasLabels) features.push('label verification');
      if (hasConnections) features.push('connection testing');
      if (hasSoftware) features.push('software validation');
      
      if (features.length > 0) {
        description += ' including ' + features.join(', ');
      }
      
      return description + '.';
    }
    
    // 3. Fallback: Use first meaningful paragraph
    const firstP = doc.querySelector('p');
    if (firstP && firstP.textContent?.trim() && firstP.textContent.trim().length > 20) {
      return firstP.textContent.trim().substring(0, 200);
    }
    
    // 4. Final fallback
    return 'Inspection checklist document';
  }

  /**
   * Extract metadata (part number, product type, category) from document
   * Looks for patterns like:
   * - "Part Number: ABC123"
   * - "Product: Widget XYZ"
   * - "Category: installation"
   * - Tables with metadata (header tables before checklist)
   * - The Fi Company P/N, Customer P/N fields
   */
  private extractMetadata(doc: Document): { 
    part_number?: string; 
    product_type?: string; 
    customer_part_number?: string; 
    revision?: string;
    review_date?: string;
    revision_number?: string;
    revision_details?: string;
    revised_by?: string;
    category?: string;
  } {
    const metadata: { 
      part_number?: string; 
      product_type?: string; 
      customer_part_number?: string; 
      revision?: string;
      review_date?: string;
      revision_number?: string;
      revision_details?: string;
      revised_by?: string;
      category?: string;
    } = {};
    
    // Search all text for patterns
    const allText = doc.body.textContent || '';
    
    // Look for "The Fi Company P/N" or "Customer P/N" in tables
    const tables = doc.querySelectorAll('table');
    
    tables.forEach((table, tableIndex) => {
      const rows = table.querySelectorAll('tr');
      
      // Check if this is a checklist items table (skip for metadata extraction)
      // Checklist tables have columns like: No, Process Steps, Category, Critical to Quality, Pictures
      const firstRow = rows[0];
      const firstRowCells = firstRow?.querySelectorAll('td, th');
      const firstRowTexts = Array.from(firstRowCells || []).map(c => c.textContent?.trim().toLowerCase() || '');
      
      const isChecklistTable = firstRowTexts.some(t => 
        (t.includes('critical') && t.includes('quality')) || 
        t.includes('pictures') ||
        (t.includes('process') && t.includes('steps'))
      );
      
      // Skip checklist tables - we only want metadata tables here
      if (isChecklistTable) {
        return;
      }
      
      // Check if this is a 2-row metadata table (row 1 = headers, row 2 = values)
      if (rows.length === 2) {
        const headerRow = rows[0];
        const valueRow = rows[1];
        const headerCells = headerRow.querySelectorAll('td, th');
        const valueCells = valueRow.querySelectorAll('td, th');
        const headerTexts = Array.from(headerCells).map(c => c.textContent?.trim() || '');
        const valueTexts = Array.from(valueCells).map(c => c.textContent?.trim() || '');
        
        // Match headers to values
        headerTexts.forEach((header, index) => {
          const value = valueTexts[index] || '';
          const headerLower = header.toLowerCase();
          
          // Check for Fi Company P/N
          if (headerLower.includes('fi company p/n') && value) {
            metadata.part_number = value;
          }

          // Check for Customer P/N
          if (headerLower.includes('customer p/n') && value) {
            metadata.customer_part_number = value;
          }

          // Check for Category (check BEFORE Description to avoid confusion)
          // ONLY extract category from metadata tables, NOT from checklist item tables
          // Only process if we have Fi Company P/N or Customer P/N in the same row (confirms it's metadata)
          if (headerLower.includes('category') && value && !headerLower.includes('description')) {
            // Check if this is actually a metadata table by looking for P/N fields
            const hasPartNumberField = headerTexts.some(h => 
              h.toLowerCase().includes('fi company p/n') || 
              h.toLowerCase().includes('customer p/n')
            );
            
            // Only extract category if this is clearly a metadata table
            if (hasPartNumberField) {
              // Normalize category value to match dropdown options
              const categoryLower = value.toLowerCase().trim();
              if (categoryLower.includes('quality') || categoryLower.includes('control')) {
                metadata.category = 'quality_control';
              } else if (categoryLower.includes('install')) {
                metadata.category = 'installation';
              } else if (categoryLower.includes('maintain')) {
                metadata.category = 'maintenance';
              } else if (categoryLower.includes('inspect')) {
                metadata.category = 'inspection';
              } else {
                // Try exact match
                const validCategories = ['quality_control', 'installation', 'maintenance', 'inspection'];
                if (validCategories.includes(categoryLower)) {
                  metadata.category = categoryLower as any;
                }
              }
            }
          }

          // Check for Description (but NOT if it's the Category field)
          // ONLY extract from tables with P/N fields (metadata tables)
          if (headerLower.includes('description') && !headerLower.includes('category') && value && !value.toLowerCase().includes('customer')) {
            // Verify this is a metadata table
            const hasPartNumberField = headerTexts.some(h => 
              h.toLowerCase().includes('fi company p/n') || 
              h.toLowerCase().includes('customer p/n')
            );
            
            if (hasPartNumberField) {
              metadata.product_type = value;
            }
          }

          // Check for Revised By (must check BEFORE generic revision)
          if ((headerLower.includes('revised by') || headerLower.includes('author') || headerLower.includes('prepared by') || headerLower.includes('created by')) && value) {
            metadata.revised_by = value;
          }
          // Check for Review/Revision Date (must check BEFORE generic revision)
          else if ((headerLower.includes('review date') || headerLower.includes('revision date') || headerLower.includes('rev. date') || headerLower.includes('date')) && value && !headerLower.includes('by')) {
            metadata.review_date = value;
          }
          // Check for Revision Number (must check BEFORE generic revision)
          else if ((headerLower.includes('revision number') || headerLower.includes('rev number') || headerLower.includes('rev #') || headerLower.includes('rev.')) && value) {
            metadata.revision_number = value;
          }
          // Check for Revision Details/Description (must check BEFORE generic revision)
          else if ((headerLower.includes('revision detail') || headerLower.includes('rev detail') || headerLower.includes('revision description') || headerLower.includes('changes') || headerLower.includes('revision:')) && value) {
            metadata.revision_details = value;
          }
          // Check for generic Revision field (last priority)
          else if ((headerLower === 'revision' || headerLower === 'rev' || (headerLower.includes('rev') && !headerLower.includes('by') && !headerLower.includes('date') && !headerLower.includes('detail'))) && value) {
            metadata.revision = value;
          }
        });
      } else {
        // Multi-row table - check each row for inline patterns
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td, th');
          const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');

          cellTexts.forEach((text, index) => {
            const textLower = text.toLowerCase();
            const nextValue = index + 1 < cellTexts.length ? cellTexts[index + 1].trim() : '';

            // Pattern 1: "The Fi Company P/N: VALUE" in same cell
            if (textLower.includes('fi company p/n')) {
              const match = text.match(/(?:the\s+)?fi\s+company\s+p\/n\s*[:\s]+([A-Z0-9\-]+)/i);
              if (match && match[1]) {
                metadata.part_number = match[1].trim();
              }
              // Pattern 2: Next cell has the value
              else if (nextValue && !nextValue.toLowerCase().includes('description')) {
                metadata.part_number = nextValue;
              }
            }

            // Customer P/N detection
            if (textLower.includes('customer p/n') || textLower.includes('customer pn')) {
              if (nextValue && !nextValue.toLowerCase().includes('fi company')) {
                metadata.customer_part_number = nextValue;
              }
            }

            // PRIORITY-ORDERED REVISION FIELDS (specific fields BEFORE generic revision)
            
            // 1. Revised By / Author / Prepared By (FIRST PRIORITY)
            if ((textLower.includes('revised by') || textLower.includes('author') || textLower.includes('prepared by') || textLower.includes('created by')) && !metadata.revised_by) {
              const match = text.match(/(?:revised\s+by|author|prepared\s+by|created\s+by)\s*[:\s]+(.+)/i);
              if (match && match[1]) {
                metadata.revised_by = match[1].trim();
              } else if (nextValue) {
                metadata.revised_by = nextValue;
              }
            }
            // 2. Review/Revision Date (SECOND PRIORITY)
            else if ((textLower.includes('review date') || textLower.includes('revision date') || textLower.includes('rev. date') || (textLower === 'date' || textLower.includes('date:'))) && !textLower.includes('by') && !metadata.review_date) {
              const match = text.match(/(?:review\s+date|revision\s+date|rev\.\s+date|date)\s*[:\s]+(.+)/i);
              if (match && match[1]) {
                metadata.review_date = match[1].trim();
              } else if (nextValue) {
                metadata.review_date = nextValue;
              }
            }
            // 3. Revision Number (THIRD PRIORITY)
            else if ((textLower.includes('revision number') || textLower.includes('rev number') || textLower.includes('rev #') || textLower.includes('rev.')) && !metadata.revision_number) {
              const match = text.match(/(?:revision\s+number|rev\s+number|rev\s+#|rev\.)\s*[:\s]+(.+)/i);
              if (match && match[1]) {
                metadata.revision_number = match[1].trim();
              } else if (nextValue) {
                metadata.revision_number = nextValue;
              }
            }
            // 4. Revision Details/Changes (FOURTH PRIORITY)
            else if ((textLower.includes('revision detail') || textLower.includes('rev detail') || textLower.includes('revision description') || textLower.includes('changes') || textLower === 'revision:') && !metadata.revision_details) {
              const match = text.match(/(?:revision\s+detail|rev\s+detail|revision\s+description|changes|revision:)\s*[:\s]+(.+)/i);
              if (match && match[1]) {
                metadata.revision_details = match[1].trim();
              } else if (nextValue) {
                metadata.revision_details = nextValue;
              }
            }
            // 5. Generic Revision field (LAST PRIORITY - only if exact match)
            else if ((textLower === 'revision' || textLower === 'rev' || textLower === 'revision:' || textLower === 'rev:') && !metadata.revision) {
              const match = text.match(/(?:revision|rev)\s*[:\s]+(.+)/i);
              if (match && match[1]) {
                metadata.revision = match[1].trim();
              } else if (nextValue) {
                metadata.revision = nextValue;
              }
            }

            // Category field (check BEFORE Description)
            if ((textLower.includes('category:') || textLower === 'category') && !textLower.includes('description') && !metadata.category) {
              const match = text.match(/category\s*[:\s]+(.+)/i);
              let categoryValue = '';
              if (match && match[1]) {
                categoryValue = match[1].trim();
              } else if (nextValue) {
                categoryValue = nextValue;
              }
              
              if (categoryValue) {
                // Normalize category value to match dropdown options
                const categoryLower = categoryValue.toLowerCase().trim();
                if (categoryLower.includes('quality') || categoryLower.includes('control')) {
                  metadata.category = 'quality_control';
                } else if (categoryLower.includes('install')) {
                  metadata.category = 'installation';
                } else if (categoryLower.includes('maintain')) {
                  metadata.category = 'maintenance';
                } else if (categoryLower.includes('inspect')) {
                  metadata.category = 'inspection';
                } else {
                  // Try exact match
                  const validCategories = ['quality_control', 'installation', 'maintenance', 'inspection'];
                  if (validCategories.includes(categoryLower)) {
                    metadata.category = categoryLower as any;
                  }
                }
              }
            }

            // Description field (product type) - but NOT if it's the Category field
            if ((textLower.includes('description:') || textLower === 'description') && !textLower.includes('category')) {
              const match = text.match(/description\s*[:\s]+(.+)/i);
              if (match && match[1]) {
                const desc = match[1].trim();
                if (desc && desc.length > 3 && !desc.toLowerCase().includes('customer')) {
                  metadata.product_type = desc;
                }
              } else if (nextValue && nextValue.length > 0 && !nextValue.toLowerCase().includes('customer')) {
                metadata.product_type = nextValue;
              }
            }
          });
        });
      }
    });
    
    // Part number patterns (fallback) - look for common Fi Company part number formats
    if (!metadata.part_number) {
      // Pattern 1: Standard format like VWL-03505-310, CTO-03532-310
      const fiPartMatch = allText.match(/\b([A-Z]{2,4}-\d{5}-\d{3})\b/);
      if (fiPartMatch) {
        metadata.part_number = fiPartMatch[1].trim();
      } else {
        // Pattern 2: Generic P/N format
        const partMatch = allText.match(/(?:Part\s*(?:Number|#)?|P\/N)[:\s]+([A-Z0-9\-]+)/i);
        if (partMatch) {
          metadata.part_number = partMatch[1].trim();
        }
      }
    }

    // Product type patterns (fallback)
    if (!metadata.product_type) {
      const productMatch = allText.match(/(?:Product(?:\s+Type)?|Description)[:\s]+([^\n]+)/i);
      if (productMatch) {
        const prod = productMatch[1].trim();
        // Don't use if it's a cell header or too short
        if (prod.length > 3 && !prod.toLowerCase().includes('customer')) {
          metadata.product_type = prod;
        }
      }
    }

    return metadata;
  }

  /**
   * Extract checklist items from document structure
   * 
   * Recognizes:
   * - Tables (prioritized - common for quality checklists)
   * - Numbered lists (1., 2., 3. or 1, 2, 3)
   * - Headings (h2, h3 for hierarchy)
   * - Bullet points (sub-items)
   * - Images (inline with items)
   */
  private extractChecklistItems(doc: Document): ParsedChecklistItem[] {
    const items: ParsedChecklistItem[] = [];
    let orderIndex = 1;

    // Strategy 1: Extract from tables FIRST (most common for quality checklists)
    const tables = doc.querySelectorAll('table');
    if (tables.length > 0) {
      let totalRowsProcessed = 0;
      let totalRowsSkipped = 0;
      
      tables.forEach((table, tableIndex) => {
        const rows = table.querySelectorAll('tr');
        
        // Check if this table is the main checklist table (has "Critical to Quality" and "Pictures" columns)
        const headerRow = rows[0];
        const headerCells = headerRow?.querySelectorAll('td, th');
        const headerTexts = Array.from(headerCells || []).map(c => c.textContent?.trim().toLowerCase() || '');
        
        console.log(`\n📋 Table ${tableIndex + 1}: Analyzing ${rows.length} rows...`);
        
        const isChecklistTable = headerTexts.some(t => 
          (t.includes('critical') && t.includes('quality')) || 
          t.includes('pictures') ||
          t.includes('process')
        );
        
        // Check if the first cell might be an item number (for tables where each item is in its own table)
        const firstCellText = headerCells && headerCells[0] ? headerCells[0].textContent?.trim() : '';
        const mightBeItemTable = firstCellText && !isNaN(parseInt(firstCellText)) && parseInt(firstCellText) > 0;
        
        if (!isChecklistTable && !mightBeItemTable) {
          console.log(`   ⏭️ Skipping table ${tableIndex + 1} (not a checklist table)`);
          return; // Skip this table (header/metadata table)
        }
        
        console.log(`   ✓ Processing table ${tableIndex + 1} as checklist table`);
        
        // Skip the first row if it's a header row (contains column names, not item numbers)
        const startRow = headerTexts.some(t => t === 'no' || t.includes('process') || t.includes('critical')) ? 1 : 0;
        console.log(`   Starting from row ${startRow} (${startRow === 1 ? 'skipping header' : 'no header detected'})`);
        
        for (let rowIndex = startRow; rowIndex < rows.length; rowIndex++) {
          const row = rows[rowIndex];
          // Pass header row to parseTableRow for dynamic column detection
          const item = this.parseTableRow(row, orderIndex, headerRow);
          if (item) {
            items.push(item);
            orderIndex++;
            totalRowsProcessed++;
            
            // If item has children, add them to the flat items array right after parent
            if (item.children && Array.isArray(item.children) && item.children.length > 0) {
              console.log(`✓ Item ${item.order_index}: Creating ${item.children.length} sub-items`);
              item.children.forEach((child: ParsedChecklistItem) => {
                items.push(child);
              });
              // Remove children from parent since we've flattened them
              delete item.children;
            }
          } else {
            totalRowsSkipped++;
          }
        }
        
        console.log(`   📊 Table ${tableIndex + 1} summary: ${totalRowsProcessed} items extracted, ${totalRowsSkipped} rows skipped\n`);
      });
      
      // If we successfully extracted items from tables, return them
      if (items.length > 0) {
        const subItemCount = items.filter(i => i.level === 1).length;
        console.log(`✅ Returning ${items.length} total items (${subItemCount} sub-items)`);
        return items;
      }
    }

    // Strategy 2: Extract from numbered/bullet lists
    const lists = doc.querySelectorAll('ol, ul');
    if (lists.length > 0) {
      lists.forEach((list) => {
        const listItems = list.querySelectorAll('li');
        listItems.forEach((li) => {
          const item = this.parseListItem(li, orderIndex);
          if (item) {
            items.push(item);
            orderIndex++;
          }
        });
      });
      
      if (items.length > 0) {
        return items;
      }
    }

    // Strategy 3: Extract from headings + paragraphs
    const headings = doc.querySelectorAll('h2, h3, h4');
    if (headings.length > 0) {
      headings.forEach((heading) => {
        const item = this.parseHeadingItem(heading, orderIndex);
        if (item) {
          items.push(item);
          orderIndex++;
        }
      });
      
      if (items.length > 0) {
        return items;
      }
    }

    // Strategy 4: Fallback - parse all paragraphs
    const paragraphs = doc.querySelectorAll('p');
    paragraphs.forEach((p) => {
      const text = p.textContent?.trim();
      if (text && text.length > 10) {
        items.push({
          title: text.substring(0, 100),
          description: text.length > 100 ? text.substring(100) : '',
          order_index: orderIndex,
          is_required: true,
          level: 0
        });
        orderIndex++;
      }
    });

    return items;
  }

  /**
   * Parse a list item (<li>) into checklist item
   */
  private parseListItem(li: HTMLLIElement, orderIndex: number): ParsedChecklistItem | null {
    const text = li.textContent?.trim();
    if (!text) return null;

    // Check for nested lists (sub-items)
    const nestedList = li.querySelector('ul, ol');
    const children: ParsedChecklistItem[] = [];
    
    if (nestedList) {
      const nestedItems = nestedList.querySelectorAll('li');
      nestedItems.forEach((nestedLi, idx) => {
        const childText = nestedLi.textContent?.trim();
        if (childText) {
          children.push({
            title: childText.substring(0, 100),
            description: childText.length > 100 ? childText.substring(100) : '',
            order_index: orderIndex + (idx + 1) * 0.1,
            is_required: true,
            level: 1,
            parent_id: orderIndex
          });
        }
      });
    }

    // Extract images within this list item
    const images = this.extractImages(li);

    // Parse photo requirements from text
    const requirements = this.extractPhotoRequirements(text);

    return {
      title: text.substring(0, 100),
      description: text.length > 100 ? text.substring(100) : '',
      order_index: orderIndex,
      is_required: true,
      level: 0,
      sample_images: images.length > 0 ? images : undefined,
      photo_requirements: requirements,
      children: children.length > 0 ? children : undefined
    };
  }

  /**
   * Parse a heading element into checklist item
   */
  private parseHeadingItem(heading: Element, orderIndex: number): ParsedChecklistItem | null {
    const title = heading.textContent?.trim();
    if (!title) return null;

    // Get following paragraph as description
    let description = '';
    let nextElement = heading.nextElementSibling;
    if (nextElement && nextElement.tagName === 'P') {
      description = nextElement.textContent?.trim() || '';
    }

    // Extract images from next elements
    const images: SampleImage[] = [];
    let imgElement = heading.nextElementSibling;
    while (imgElement && images.length < 3) {
      if (imgElement.tagName === 'IMG' || imgElement.querySelector('img')) {
        const img = imgElement.tagName === 'IMG' ? imgElement as HTMLImageElement : imgElement.querySelector('img');
        if (img && img.src) {
          images.push({
            url: img.src,
            label: img.alt || `Image ${images.length + 1}`,
            is_primary: images.length === 0,
            order_index: images.length
          });
        }
      }
      imgElement = imgElement.nextElementSibling;
      
      // Stop at next heading
      if (imgElement && ['H1', 'H2', 'H3', 'H4'].includes(imgElement.tagName)) {
        break;
      }
    }

    return {
      title,
      description,
      order_index: orderIndex,
      is_required: true,
      level: 0,
      sample_images: images.length > 0 ? images : undefined,
      photo_requirements: this.extractPhotoRequirements(title + ' ' + description)
    };
  }

  /**
   * Parse a table row into checklist item
   * Handles common checklist table formats with dynamic column detection:
   * - No | Process Steps | [Category] | Critical to Quality | Pictures
   * The Category column is optional - method detects column positions dynamically
   */
  private parseTableRow(row: HTMLTableRowElement, orderIndex: number, headerRow?: HTMLTableRowElement): ParsedChecklistItem | null {
    const cells = row.querySelectorAll('td, th');
    if (cells.length === 0) {
      return null;
    }

    // Get the first cell (should be the "No" column with item number)
    const firstCell = cells[0];
    const firstCellText = firstCell?.textContent?.trim() || '';
    
    // Check if first cell contains a number (1, 2, 3, etc.) - these are the actual checklist items
    const itemNumberFromDoc = parseInt(firstCellText);
    const isNumberedItem = !isNaN(itemNumberFromDoc) && itemNumberFromDoc > 0 && firstCellText.length <= 3;
    
    if (!isNumberedItem) {
      console.log(`   ⏭️ Skipping row (first cell: "${firstCellText}" is not a valid item number)`);
      return null;
    }

    // Use orderIndex (sequential counter) instead of itemNumberFromDoc to avoid duplicates
    const itemNumber = orderIndex;
    console.log(`\n   ━━━ Processing Item ${itemNumber} (doc number: ${itemNumberFromDoc}) ━━━`);
    console.log(`   Row has ${cells.length} cells:`, Array.from(cells).map((c, i) => {
      const text = c.textContent?.trim().substring(0, 30) || '';
      const imgCount = c.querySelectorAll('img').length;
      return `[${i}] ${text}${imgCount > 0 ? ` [${imgCount} img]` : ''}`;
    }));

    // Dynamically find ALL column positions by looking at header row
    let processStepsIndex = -1;  // NEW: Detect "Process Steps" column for title
    let categoryIndex = -1;       // NEW: Optional "Category" column
    let criticalToQualityIndex = -1;
    let picturesIndex = -1;
    
    if (headerRow) {
      const headerCells = headerRow.querySelectorAll('td, th');
      console.log(`🔍 Analyzing header row:`, 
        Array.from(headerCells).map((c, i) => `[${i}] ${c.textContent?.trim()}`));
      
      Array.from(headerCells).forEach((headerCell, index) => {
        const headerText = headerCell.textContent?.trim().toLowerCase() || '';
        
        // Detect "No" column (should be index 0)
        if (headerText.includes('no') && index === 0) {
          console.log(`✓ Found "No" at column ${index}`);
        }
        
        // Detect "Process Steps" column (usually index 1)
        if (headerText.includes('process') && headerText.includes('step')) {
          processStepsIndex = index;
          console.log(`✓ Found "Process Steps" at column ${index}`);
        }
        
        // Detect "Category" column (optional, usually index 2 if present)
        if (headerText === 'category' || headerText.includes('category') && !headerText.includes('description')) {
          categoryIndex = index;
          console.log(`✓ Found "Category" at column ${index}`);
        }
        
        // Detect "Critical to Quality" column
        if (headerText.includes('critical') && headerText.includes('quality')) {
          criticalToQualityIndex = index;
          console.log(`✓ Found "Critical to Quality" at column ${index}`);
        }
        
        // Detect "Pictures" column
        if (headerText.includes('pictures') || headerText.includes('picture')) {
          picturesIndex = index;
          console.log(`✓ Found "Pictures" at column ${index}`);
        }
      });
    } else {
      console.warn('⚠️ No header row found for this table');
    }
    
    // Fallback detection if header row doesn't exist or columns weren't found
    if (processStepsIndex === -1) {
      // "Process Steps" is typically column 1 (after "No")
      processStepsIndex = 1;
      console.log(`⚠️ Using fallback: Process Steps at column ${processStepsIndex}`);
    }
    
    if (criticalToQualityIndex === -1) {
      console.log(`🔎 Critical to Quality not found in header, searching cells for item ${itemNumber}...`);
      console.log(`   Available cells:`, Array.from(cells).map((c, i) => {
        const text = c.textContent?.trim().substring(0, 30) || '';
        const hasImg = c.querySelectorAll('img').length > 0;
        return `[${i}] ${text}${hasImg ? ' [HAS IMAGE]' : ''}`;
      }));
      
      // Search cells for the one with substantial text content (likely Critical to Quality)
      // Start searching from column 2 or 3 (skip No, Process Steps, and possibly Category)
      const searchStartIndex = categoryIndex > 0 ? categoryIndex + 1 : 2;
      for (let i = searchStartIndex; i < cells.length; i++) {
        const cellText = cells[i].textContent?.trim() || '';
        const hasImages = cells[i].querySelectorAll('img').length > 0;
        
        // If cell has substantial text and no images, it's likely Critical to Quality
        if (cellText.length > 20 && !hasImages) {
          criticalToQualityIndex = i;
          console.log(`✓ Found Critical to Quality at cell ${i} (has ${cellText.length} chars, no images)`);
          break;
        }
      }
      
      // If still not found, estimate based on table structure
      if (criticalToQualityIndex === -1) {
        // If category column exists (3+ non-picture columns), use index 3, else use index 2
        criticalToQualityIndex = categoryIndex > 0 ? 3 : 2;
        console.log(`⚠️ Using estimated fallback: column ${criticalToQualityIndex} (category exists: ${categoryIndex > 0})`);
      }
    }

    // Extract title from "Process Steps" column
    const titleCell = processStepsIndex >= 0 && processStepsIndex < cells.length 
      ? cells[processStepsIndex] 
      : null;
    let title = '';
    
    if (titleCell) {
      title = titleCell.textContent?.trim() || '';
      console.log(`📝 Item ${itemNumber}: Using column ${processStepsIndex} (Process Steps) for title: "${title.substring(0, 50)}..."`);
    }

    // Extract description from "Critical to Quality" column
    const descriptionCell = criticalToQualityIndex >= 0 && criticalToQualityIndex < cells.length 
      ? cells[criticalToQualityIndex] 
      : null;
    let description = '';
    
    if (descriptionCell) {
      // Use innerHTML to preserve formatting (bold, bullets, lists, etc.)
      const descHTML = descriptionCell.innerHTML?.trim() || '';
      description = descHTML;
      
      console.log(`📝 Item ${itemNumber}: Using column ${criticalToQualityIndex} (Critical to Quality) for description`);
      console.log(`   Description length: ${description.length} chars`);
    }
    
    // If still no title, try to extract from description or use generic
    if (!title || title.length < 3) {
      if (description) {
        const descText = descriptionCell?.textContent?.trim() || '';
        const firstSentence = descText.split(/[.!?\n]/)[0].trim();
        title = firstSentence.substring(0, 100);
      } else {
        title = `Inspection Item ${itemNumber}`;
      }
    }

    // Extract images from "Pictures" column (or search all cells if Pictures column not found)
    const images: SampleImage[] = [];
    
    if (picturesIndex >= 0) {
      // We know exactly where the Pictures column is
      console.log(`📷 Looking for images in Pictures column (index ${picturesIndex})`);
      const picturesCell = cells[picturesIndex];
      if (picturesCell) {
        const imgElements = picturesCell.querySelectorAll('img');
        console.log(`   Found ${imgElements.length} image(s) in Pictures column`);
        
        imgElements.forEach((img, idx) => {
          const isDataUrl = img.src?.startsWith('data:') || false;
          const isValidDataUrl = isDataUrl && img.src.includes('base64,') && img.src.split('base64,')[1]?.length > 0;
          
          // Validate the image source
          if (img.src && img.src !== '' && !img.src.includes('placeholder')) {
            // For data URLs, ensure they're properly formatted
            if (isDataUrl && !isValidDataUrl) {
              console.warn(`⚠️ Invalid data URL format for image in item ${itemNumber}`);
              return;
            }
            
            // Sanitize the data URL if needed
            let cleanSrc = img.src;
            if (isDataUrl) {
              // Remove any potential whitespace in the base64 part
              const [header, base64Data] = img.src.split('base64,');
              if (base64Data) {
                cleanSrc = `${header}base64,${base64Data.replace(/\s/g, '')}`;
              }
            }
            
            images.push({
              url: cleanSrc,
              label: img.alt || `Sample Image ${images.length + 1}`,
              description: img.title || '',
              is_primary: images.length === 0,
              order_index: images.length,
              type: 'photo'
            });
            console.log(`   ✓ Added image ${images.length}: ${img.alt || 'unnamed'}`);
          }
        });
      }
    } else {
      // Pictures column not found - search all cells after the description column
      console.log(`📷 Pictures column not detected, searching all cells after description...`);
      const startIdx = criticalToQualityIndex >= 0 ? criticalToQualityIndex + 1 : 2;
      
      for (let cellIdx = startIdx; cellIdx < cells.length; cellIdx++) {
        const cell = cells[cellIdx];
        const imgElements = cell.querySelectorAll('img');
        
        if (imgElements.length > 0) {
          console.log(`   Found ${imgElements.length} image(s) in column ${cellIdx}`);
          imgElements.forEach((img, idx) => {
            const isDataUrl = img.src?.startsWith('data:') || false;
            const isValidDataUrl = isDataUrl && img.src.includes('base64,') && img.src.split('base64,')[1]?.length > 0;
            
            // Validate the image source
            if (img.src && img.src !== '' && !img.src.includes('placeholder')) {
              // For data URLs, ensure they're properly formatted
              if (isDataUrl && !isValidDataUrl) {
                console.warn(`⚠️ Invalid data URL format for image in item ${itemNumber}`);
                return;
              }
              
              // Sanitize the data URL if needed
              let cleanSrc = img.src;
              if (isDataUrl) {
                // Remove any potential whitespace in the base64 part
                const [header, base64Data] = img.src.split('base64,');
                if (base64Data) {
                  cleanSrc = `${header}base64,${base64Data.replace(/\s/g, '')}`;
                }
              }
              
              images.push({
                url: cleanSrc,
                label: img.alt || `Sample Image ${images.length + 1}`,
                description: img.title || '',
                is_primary: images.length === 0,
                order_index: images.length,
                type: 'photo'
              });
              console.log(`   ✓ Added image ${images.length}: ${img.alt || 'unnamed'}`);
            }
          });
        }
      }
    }

    console.log(`📊 Item ${itemNumber} extraction summary:`);
    console.log(`   - Title: "${title.substring(0, 50)}${title.length > 50 ? '...' : ''}"`);
    console.log(`   - Description length: ${description.length} chars`);
    console.log(`   - Images found: ${images.length}`);

    // If we have multiple images (more than 1), create sub-items
    // Otherwise, just attach the single image to the main item
    let children: ParsedChecklistItem[] | undefined = undefined;
    let mainItemImages: SampleImage[] | undefined = undefined;

    if (images.length > 1) {
      // Multiple images: Create child items (one image each)
      // Each child will have one image, parent will have none
      children = images.map((image, imgIndex) => ({
        title: image.label || image.description || `Sample Image ${imgIndex + 1}`,
        description: description, // Inherit parent's description
        order_index: itemNumber + ((imgIndex + 1) / 100), // 3.01, 3.02, 3.03, etc.
        is_required: true,
        level: 1, // Mark as sub-item
        parent_id: itemNumber, // Reference the parent's order_index (e.g., 3)
        sample_images: [image], // Each child gets one image
        photo_requirements: this.extractPhotoRequirements(description)
      }));
      
      // Parent item has no image (images distributed to children)
      mainItemImages = undefined;
      
      console.log(`📸 Created ${children.length} sub-items for item ${itemNumber}:`);
      children.forEach((child, idx) => {
        console.log(`   - Sub-item ${idx + 1}: order=${child.order_index}, parent_id=${child.parent_id}, level=${child.level}`);
      });
    } else {
      // Single image or no image: Attach to main item
      mainItemImages = images.length > 0 ? images : undefined;
      console.log(`📸 Attached ${images.length} image(s) directly to item ${itemNumber}`);
    }

    // Always create the main parent item
    // If we have children, this parent will have no images but will contain the description/title
    // If no children, this item may have 0-1 images attached directly
    const item: ParsedChecklistItem = {
      title,
      description,
      order_index: itemNumber, // Use the actual item number from the document (e.g., 3)
      is_required: true,
      level: 0, // Always mark parent as level 0
      parent_id: null, // Parent items have no parent_id
      sample_images: mainItemImages,
      children: children, // Include children array if we have sub-items
      photo_requirements: this.extractPhotoRequirements(description)
    };

    return item;
  }

  /**
   * Extract images from an element
   */
  private extractImages(element: Element): SampleImage[] {
    const images: SampleImage[] = [];
    const imgElements = element.querySelectorAll('img');
    
    imgElements.forEach((img, index) => {
      if (img.src && img.src !== '') {
        const isDataUrl = img.src.startsWith('data:');
        let cleanSrc = img.src;
        
        // For data URLs, sanitize the base64 part
        if (isDataUrl && img.src.includes('base64,')) {
          const [header, base64Data] = img.src.split('base64,');
          if (base64Data) {
            cleanSrc = `${header}base64,${base64Data.replace(/\s/g, '')}`;
          }
        }
        
        images.push({
          url: cleanSrc,
          label: img.alt || `Image ${index + 1}`,
          description: img.title || '',
          is_primary: index === 0,
          order_index: index,
          type: 'photo'
        });
      }
    });

    return images;
  }

  /**
   * Extract photo requirements from text
   * Looks for patterns like:
   * - "min 2 photos"
   * - "45-degree angle"
   * - "close-up"
   * - "good lighting"
   */
  private extractPhotoRequirements(text: string): {
    angle?: string;
    distance?: string;
    lighting?: string;
    focus?: string;
    min_photos?: number;
    max_photos?: number;
  } {
    const requirements: any = {};

    // Angle patterns
    const angleMatch = text.match(/(?:angle|view|perspective)[:\s]+([^\.,\n]+)/i);
    if (angleMatch) {
      requirements.angle = angleMatch[1].trim();
    } else if (text.match(/45[°\-\s]degree/i)) {
      requirements.angle = '45-degree angle';
    } else if (text.match(/straight[- ]on|front[- ]view/i)) {
      requirements.angle = 'Straight-on view';
    }

    // Distance patterns
    const distanceMatch = text.match(/(?:distance|zoom|proximity)[:\s]+([^\.,\n]+)/i);
    if (distanceMatch) {
      requirements.distance = distanceMatch[1].trim();
    } else if (text.match(/close[- ]up/i)) {
      requirements.distance = 'Close-up';
    } else if (text.match(/full[- ]view|wide/i)) {
      requirements.distance = 'Full view';
    }

    // Lighting patterns
    if (text.match(/good light|well[- ]lit|bright/i)) {
      requirements.lighting = 'Well-lit, good lighting';
    } else if (text.match(/natural light/i)) {
      requirements.lighting = 'Natural lighting preferred';
    }

    // Focus patterns
    if (text.match(/clear|sharp|focus/i)) {
      requirements.focus = 'Clear focus on detail';
    }

    // Photo count
    const minMatch = text.match(/(?:min|minimum|at least)\s+(\d+)\s+photo/i);
    if (minMatch) {
      requirements.min_photos = parseInt(minMatch[1]);
    }

    const maxMatch = text.match(/(?:max|maximum|up to)\s+(\d+)\s+photo/i);
    if (maxMatch) {
      requirements.max_photos = parseInt(maxMatch[1]);
    }

    return requirements;
  }

  /**
   * Validate if a string is valid base64
   */
  private isValidBase64(str: string): boolean {
    if (!str || str.length === 0) {
      return false;
    }
    
    // Check if it matches base64 pattern
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) {
      return false;
    }
    
    // Try to decode it
    try {
      // In browser, we can use atob to test
      if (typeof atob !== 'undefined') {
        atob(str);
        return true;
      }
      return true; // If atob is not available, just check the regex
    } catch (e) {
      return false;
    }
  }

  /**
   * Test if a data URL can be loaded as an image
   */
  private testDataUrl(dataUrl: string, imageNumber: number): void {
    const testImg = new Image();
    
    testImg.onload = () => {
      // Image loaded successfully (silent)
    };
    
    testImg.onerror = (error) => {
      console.error(`Image ${imageNumber} data URL failed to load:`, error);
    };
    
    testImg.src = dataUrl;
  }
}
