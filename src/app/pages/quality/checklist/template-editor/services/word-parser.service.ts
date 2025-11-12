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

    const template: ParsedTemplate = {
      name: this.extractTemplateName(doc, filename),
      description: this.extractDescription(doc),
      category: 'quality_control',
      items: [],
      original_filename: filename
    };

    // Extract metadata from document
    const metadata = this.extractMetadata(doc);
    if (metadata.part_number) template.part_number = metadata.part_number;
    if (metadata.product_type) template.product_type = metadata.product_type;
    if (metadata.customer_part_number) template.customer_part_number = metadata.customer_part_number;
    if (metadata.revision) template.revision = metadata.revision;
    if (metadata.review_date) template.review_date = metadata.review_date;
    if (metadata.revision_number) template.revision_number = metadata.revision_number;
    if (metadata.revision_details) template.revision_details = metadata.revision_details;
    if (metadata.revised_by) template.revised_by = metadata.revised_by;

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
    // Try h1 first
    const h1 = doc.querySelector('h1');
    if (h1 && h1.textContent?.trim()) {
      return h1.textContent.trim();
    }

    // Try strong/bold at top
    const strong = doc.querySelector('strong, b');
    if (strong && strong.textContent?.trim()) {
      return strong.textContent.trim();
    }

    // Fallback to filename
    return filename.replace(/\.(docx|doc)$/i, '');
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
   * Extract metadata (part number, product type) from document
   * Looks for patterns like:
   * - "Part Number: ABC123"
   * - "Product: Widget XYZ"
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
    } = {};
    
    // Search all text for patterns
    const allText = doc.body.textContent || '';
    
    // Look for "The Fi Company P/N" or "Customer P/N" in tables
    const tables = doc.querySelectorAll('table');
    
    tables.forEach((table, tableIndex) => {
      const rows = table.querySelectorAll('tr');
      
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

          // Check for Description
          if (headerLower.includes('description') && value && !value.toLowerCase().includes('customer')) {
            metadata.product_type = value;
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

            // Description field (product type)
            if (textLower.includes('description:') || textLower === 'description') {
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
        
        const isChecklistTable = headerTexts.some(t => 
          (t.includes('critical') && t.includes('quality')) || 
          t.includes('pictures')
        );
        
        // Check if the first cell might be an item number (for tables where each item is in its own table)
        const firstCellText = headerCells && headerCells[0] ? headerCells[0].textContent?.trim() : '';
        const mightBeItemTable = firstCellText && !isNaN(parseInt(firstCellText)) && parseInt(firstCellText) > 0;
        
        if (!isChecklistTable && !mightBeItemTable) {
          return; // Skip this table (header/metadata table)
        }
        
        rows.forEach((row, rowIndex) => {
          const item = this.parseTableRow(row, orderIndex);
          if (item) {
            items.push(item);
            orderIndex++;
            totalRowsProcessed++;
          } else {
            totalRowsSkipped++;
          }
        });
      });
      
      // If we successfully extracted items from tables, return them
      if (items.length > 0) {
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
   * Handles common checklist table formats:
   * - Column 1: Item Number (1, 2, 3) in red circles
   * - Column 2: Process Steps (usually "In process")
   * - Column 3: Critical to Quality (Description with bullet points)
   * - Column 4: Pictures (Sample Images)
   */
  private parseTableRow(row: HTMLTableRowElement, orderIndex: number): ParsedChecklistItem | null {
    const cells = row.querySelectorAll('td, th');
    if (cells.length === 0) {
      return null;
    }

    // Get the first cell (should be the "No" column with item number)
    const firstCell = cells[0];
    const firstCellText = firstCell?.textContent?.trim() || '';
    
    // Check if first cell contains a number (1, 2, 3, etc.) - these are the actual checklist items
    const itemNumber = parseInt(firstCellText);
    const isNumberedItem = !isNaN(itemNumber) && itemNumber > 0 && firstCellText.length <= 3;
    
    if (!isNumberedItem) {
      return null;
    }

    // For numbered items:
    // Cell 0: Item number (1, 2, etc.)
    // Cell 1: Process Steps (usually "In process")
    // Cell 2: Critical to Quality (this is the description)
    // Cell 3: Pictures (images)

    // Extract description from "Critical to Quality" column (typically cell 2)
    const descriptionCell = cells.length > 2 ? cells[2] : cells.length > 1 ? cells[1] : null;
    let description = '';
    let title = '';
    
    if (descriptionCell) {
      // Use innerHTML to preserve formatting (bold, bullets, lists, etc.)
      const descHTML = descriptionCell.innerHTML?.trim() || '';
      description = descHTML;
      
      // Use textContent for title (plain text)
      const descText = descriptionCell.textContent?.trim() || '';
      const firstSentence = descText.split(/[.!?\n]/)[0].trim();
      title = firstSentence.substring(0, 100);
    }
    
    // If still no title, use generic
    if (!title || title.length < 3) {
      title = `Inspection Item ${itemNumber}`;
    }

    // Extract images from "Pictures" column (search all cells since column order may vary)
    const images: SampleImage[] = [];
    
    // Check each cell for images (starting from cell 2 onwards, skipping item number and process steps)
    for (let cellIdx = 2; cellIdx < cells.length; cellIdx++) {
      const cell = cells[cellIdx];
      const imgElements = cell.querySelectorAll('img');
      
      if (imgElements.length > 0) {
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
          }
        });
      }
    }

    // If we have multiple images (more than 1), create sub-items
    // Otherwise, just attach the single image to the main item
    let children: ParsedChecklistItem[] | undefined = undefined;
    let mainItemImages: SampleImage[] | undefined = undefined;

    if (images.length > 1) {
      // Multiple images: Create parent item (no image) + child items (one image each)
      children = images.map((image, imgIndex) => ({
        title: image.label || image.description || `Image ${imgIndex + 1}`,
        description: description, // Inherit parent's description
        order_index: itemNumber + ((imgIndex + 1) / 100), // 9.01, 9.02, 9.03, etc.
        is_required: true,
        level: 1,
        sample_images: [image], // Each child gets one image
        photo_requirements: this.extractPhotoRequirements(description)
      }));
      
      // Parent item has no image
      mainItemImages = undefined;
    } else {
      // Single image or no image: Attach to main item
      mainItemImages = images.length > 0 ? images : undefined;
    }

    const item = {
      title,
      description,
      order_index: itemNumber, // Use the actual item number from the document
      is_required: true,
      level: 0,
      sample_images: mainItemImages,
      children: children,
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
