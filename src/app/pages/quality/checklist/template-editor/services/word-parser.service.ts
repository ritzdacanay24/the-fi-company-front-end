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
      
      console.log('📄 Starting Word document parsing...');
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Parse with mammoth - extracts text AND images
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
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
              
              // Only log first few images to prevent freeze
              if (this.imageConversionCount <= this.MAX_IMAGE_LOGS) {
                console.log(`🖼️ Image ${this.imageConversionCount}:`, {
                  contentType,
                  base64Length: cleanBase64.length,
                  dataUrlLength: dataUrl.length
                });
                
                // Warn if truncated
                if (cleanBase64.length < 1000) {
                  console.warn(`⚠️ Image ${this.imageConversionCount} appears truncated (only ${cleanBase64.length} chars)`);
                }
              } else if (this.imageConversionCount === this.MAX_IMAGE_LOGS + 1) {
                console.log(`ℹ️ Processing ${this.imageConversionCount}+ images (logging suppressed for performance)...`);
              }
              
              return {
                src: dataUrl
              };
            });
          })
        }
      );

      console.log('✅ Word document converted to HTML');
      console.log('📝 Extracted HTML length:', result.value.length);
      
      // Check if HTML contains complete data URLs by searching for src attributes
      const srcMatches = result.value.match(/src="data:image\/[^"]+"/g);
      if (srcMatches && srcMatches.length > 0) {
        console.log(`🖼️ Found ${srcMatches.length} data URL(s) in raw HTML`);
        srcMatches.slice(0, 3).forEach((match, idx) => {
          const dataUrl = match.substring(5, match.length - 1); // Remove 'src="' and '"'
          console.log(`   Data URL ${idx + 1} length in raw HTML: ${dataUrl.length} chars`);
        });
      }
      
      if (result.messages && result.messages.length > 0) {
        console.warn('⚠️ Conversion warnings:', result.messages);
      }
      
      // DEBUG: Check for images in HTML
      const tempDoc = new DOMParser().parseFromString(result.value, 'text/html');
      const images = tempDoc.querySelectorAll('img');
      console.log(`🖼️ Total <img> tags found after DOM parsing: ${images.length}`);
      
      if (images.length > 0 && images.length <= 3) {
        // Only log first 3 images
        images.forEach((img, idx) => {
          const isDataUrl = img.src?.startsWith('data:');
          console.log(`   Image ${idx + 1} after DOM parsing:`, {
            isDataUrl,
            srcLength: img.src?.length || 0,
            mimeType: isDataUrl ? img.src.split(';')[0].split(':')[1] : 'N/A'
          });
        });
      } else if (images.length > 3) {
        console.log(`   ℹ️ ${images.length} images found (only showing first 3)`);
      }

      // Parse the HTML to extract structured data
      const template = this.parseHtmlToTemplate(result.value, file.name);
      
      // DEBUG: Log the full parsed template
      console.log('\n📦 ===== FULL PARSED TEMPLATE =====');
      console.log(JSON.stringify(template, null, 2));
      console.log('📦 ===== END PARSED TEMPLATE =====\n');
      
      console.log('✅ Successfully parsed Word document');
      console.log(`   - Template: ${template.name}`);
      console.log(`   - Items: ${template.items.length}`);
      console.log(`   - Images: ${template.items.reduce((sum, item) => sum + (item.sample_images?.length || 0), 0)}`);

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
      items: []
    };

    // Extract metadata from document
    const metadata = this.extractMetadata(doc);
    if (metadata.part_number) template.part_number = metadata.part_number;
    if (metadata.product_type) template.product_type = metadata.product_type;

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
   * Extract description (first paragraph after title)
   */
  private extractDescription(doc: Document): string {
    const firstP = doc.querySelector('p');
    if (firstP && firstP.textContent?.trim()) {
      return firstP.textContent.trim();
    }
    return '';
  }

  /**
   * Extract metadata (part number, product type) from document
   * Looks for patterns like:
   * - "Part Number: ABC123"
   * - "Product: Widget XYZ"
   * - Tables with metadata (header tables before checklist)
   * - The Fi Company P/N, Customer P/N fields
   */
  private extractMetadata(doc: Document): { part_number?: string; product_type?: string } {
    const metadata: { part_number?: string; product_type?: string } = {};
    
    // Search all text for patterns
    const allText = doc.body.textContent || '';
    
    // Look for "The Fi Company P/N" or "Customer P/N" in tables
    const tables = doc.querySelectorAll('table');
    tables.forEach((table) => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td, th');
        const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');
        
        // Check for Fi Company P/N
        cellTexts.forEach((text, index) => {
          if (text.toLowerCase().includes('fi company p/n') || text.toLowerCase().includes('the fi company p/n')) {
            // Next cell should have the part number
            if (index + 1 < cellTexts.length) {
              const pn = cellTexts[index + 1].trim();
              if (pn && pn.length > 0 && !pn.toLowerCase().includes('description')) {
                metadata.part_number = pn;
              }
            }
          }
          
          // Check for Description field (product type)
          if (text.toLowerCase().includes('description:')) {
            if (index + 1 < cellTexts.length) {
              const desc = cellTexts[index + 1].trim();
              if (desc && desc.length > 0 && !desc.toLowerCase().includes('customer')) {
                metadata.product_type = desc;
              }
            }
          }
        });
      });
    });
    
    // Part number patterns (fallback)
    if (!metadata.part_number) {
      const partMatch = allText.match(/(?:Part\s*(?:Number|#)?|P\/N)[:\s]+([A-Z0-9\-]+)/i);
      if (partMatch) {
        metadata.part_number = partMatch[1].trim();
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
      console.log(`📊 Found ${tables.length} table(s), attempting table-based extraction...`);
      
      let totalRowsProcessed = 0;
      let totalRowsSkipped = 0;
      
      tables.forEach((table, tableIndex) => {
        const rows = table.querySelectorAll('tr');
        console.log(`   Table ${tableIndex + 1} has ${rows.length} rows`);
        
        // Check if this table is the main checklist table (has "Critical to Quality" and "Pictures" columns)
        const headerRow = rows[0];
        const headerCells = headerRow?.querySelectorAll('td, th');
        const headerTexts = Array.from(headerCells || []).map(c => c.textContent?.trim().toLowerCase() || '');
        
        console.log(`   📋 Table ${tableIndex + 1} header texts:`, headerTexts);
        
        const isChecklistTable = headerTexts.some(t => 
          (t.includes('critical') && t.includes('quality')) || 
          t.includes('pictures')
        );
        
        // Check if the first cell might be an item number (for tables where each item is in its own table)
        const firstCellText = headerCells && headerCells[0] ? headerCells[0].textContent?.trim() : '';
        const mightBeItemTable = firstCellText && !isNaN(parseInt(firstCellText)) && parseInt(firstCellText) > 0;
        
        if (!isChecklistTable && !mightBeItemTable) {
          console.log(`   ⚠️ Table ${tableIndex + 1} appears to be metadata/header table, skipping...`);
          return; // Skip this table (header/metadata table)
        }
        
        if (isChecklistTable) {
          console.log(`   ✓ Table ${tableIndex + 1} identified as checklist table`);
        } else if (mightBeItemTable) {
          console.log(`   ✓ Table ${tableIndex + 1} identified as single-item table (starts with number: ${firstCellText})`);
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
        console.log(`✅ Successfully extracted ${items.length} items from table(s)`);
        console.log(`   📊 Summary: ${totalRowsProcessed} rows processed, ${totalRowsSkipped} rows skipped`);
        return items;
      }
    }

    // Strategy 2: Extract from numbered/bullet lists
    const lists = doc.querySelectorAll('ol, ul');
    if (lists.length > 0) {
      console.log(`📝 Found ${lists.length} list(s), attempting list-based extraction...`);
      
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
        console.log(`✅ Successfully extracted ${items.length} items from list(s)`);
        return items;
      }
    }

    // Strategy 3: Extract from headings + paragraphs
    const headings = doc.querySelectorAll('h2, h3, h4');
    if (headings.length > 0) {
      console.log(`📑 Found ${headings.length} heading(s), attempting heading-based extraction...`);
      
      headings.forEach((heading) => {
        const item = this.parseHeadingItem(heading, orderIndex);
        if (item) {
          items.push(item);
          orderIndex++;
        }
      });
      
      if (items.length > 0) {
        console.log(`✅ Successfully extracted ${items.length} items from heading(s)`);
        return items;
      }
    }

    // Strategy 4: Fallback - parse all paragraphs
    console.log('⚠️ No structured content found, falling back to paragraph extraction...');
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

    console.log(`✅ Extracted ${items.length} items using fallback method`);
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
      // Log what we're skipping for debugging
      if (firstCellText && firstCellText !== 'No' && firstCellText !== 'No.' && !firstCellText.toLowerCase().includes('item')) {
        console.log(`   ⚠️ Skipping row with first cell: "${firstCellText}" (not a valid item number)`);
      }
      return null;
    }

    console.log(`   ✓ Processing item ${itemNumber}: "${firstCellText}"`);

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
      console.log(`   ℹ️ Item ${itemNumber} has ${images.length} images - creating sub-items`);
      
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
      console.log(`   ✅ Image ${imageNumber} data URL is valid and can be loaded`, {
        width: testImg.width,
        height: testImg.height
      });
    };
    
    testImg.onerror = (error) => {
      console.error(`   ❌ Image ${imageNumber} data URL failed to load:`, error);
      console.error(`      Data URL length: ${dataUrl.length}`);
      console.error(`      Data URL prefix: ${dataUrl.substring(0, 100)}`);
    };
    
    testImg.src = dataUrl;
  }
}
