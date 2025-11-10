import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as pdfjsLib from 'pdfjs-dist';

// Polyfill for Promise.withResolvers (required for newer pdf.js versions)
// This is a newer ES2024 feature not yet widely supported
if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function <T>() {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
  };
}

// Configure PDF.js worker - must match the installed pdfjs-dist version (5.4.296)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

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
  sample_images?: SampleImage[]; // Array of image objects with base64 URLs
  photo_requirements?: {
    angle?: string;
    distance?: string; 
    lighting?: string;
    focus?: string;
    min_photos?: number;
    max_photos?: number;
  };
  // Hierarchical structure support
  children?: ParsedChecklistItem[]; // Sub-items (e.g., multiple reference photos for one inspection item)
  parent_id?: number; // Reference to parent item's order_index
  level?: number; // 0 = parent/root item, 1 = child/sub-item
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
export class PdfParserService {

  constructor(private http: HttpClient) { }

  /**
   * Parse PDF file and extract checklist template data
   */
  async parsePdfToTemplate(file: File): Promise<ParsedTemplate> {
    try {
      // Extract text from PDF
      const text = await this.extractTextFromPdf(file);
      
      // Extract images via backend API
      const imageData = await this.extractImagesViaBackend(file);
      
      console.log(`Extracted ${imageData.images.length} images in ${imageData.groups.length} groups from PDF`);
      
      return this.parseTextToTemplate(text, file.name, imageData);
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF file. Please ensure it is a valid checklist template.');
    }
  }

  /**
   * Extract images using backend PHP API
   */
  private async extractImagesViaBackend(file: File): Promise<{images: string[], groups: any[]}> {
    try {
      console.log('🖼️ Sending PDF to backend for image extraction...');
      
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await firstValueFrom(
        this.http.post<{
          success: boolean, 
          images: any[], 
          imageGroups?: any[],
          count: number, 
          groupCount?: number,
          error?: string
        }>(
          'Quality/pdf-extract-images.php',
          formData
        )
      );
      
      if (!response.success) {
        console.warn('Backend image extraction failed:', response.error);
        return {images: [], groups: []};
      }
      
      console.log(`✅ Backend extracted ${response.count} images in ${response.groupCount || 0} groups`);
      
      // DEBUG: Log position data availability
      if ((response as any).debug) {
        console.log('🔍 DEBUG - Position data check:', (response as any).debug);
      }
      
      // Convert base64 images to file URLs for consistency
      const base64Images = response.images.map(img => img.url);
      console.log(`📸 Converting ${base64Images.length} base64 images to file URLs...`);
      const fileUrls = await this.saveImagesToFiles(base64Images);
      
      // Update groups with file URLs instead of base64
      const updatedGroups = response.imageGroups?.map((group: any) => ({
        ...group,
        images: group.images?.map((img: any, idx: number) => ({
          ...img,
          url: fileUrls[response.images.findIndex((ri: any) => ri.url === img.url)] || img.url
        }))
      })) || [];
      
      // Return file URLs and updated groups
      return {
        images: fileUrls,
        groups: updatedGroups
      };
      
    } catch (error) {
      console.error('❌ Error calling backend for image extraction:', error);
      return {images: [], groups: []}; // Return empty arrays on error
    }
  }

  /**
   * Save base64 images to file system and return file URLs
   */
  private async saveImagesToFiles(base64Images: string[]): Promise<string[]> {
    try {
      console.log(`💾 Saving ${base64Images.length} images to file system...`);
      
      const response = await firstValueFrom(
        this.http.post<{
          success: boolean,
          images: Array<{path: string, filename: string, size: number}>,
          count: number,
          error?: string
        }>(
          'Quality/save-checklist-image.php',
          { images: base64Images }
        )
      );
      
      if (!response.success) {
        console.warn('Failed to save images to files:', response.error);
        // Fallback to base64 if file saving fails
        return base64Images;
      }
      
      console.log(`✅ Saved ${response.count} images to disk`);
      
      // Return file URLs (relative paths for frontend)
      return response.images.map(img => `/${img.path}`);
      
    } catch (error) {
      console.error('❌ Error saving images to files:', error);
      // Fallback to base64 on error
      return base64Images;
    }
  }

  /**
   * Extract text from PDF using pdf.js library
   * Production-ready implementation
   */
  private async extractTextFromPdf(file: File): Promise<string> {
    try {
      console.log('Reading PDF file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Validate it's actually a PDF file
      if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('File is not a PDF. Please select a valid PDF file.');
      }
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      console.log('ArrayBuffer size:', arrayBuffer.byteLength);
      
      // Check if ArrayBuffer is valid
      if (arrayBuffer.byteLength === 0) {
        throw new Error('PDF file is empty or could not be read.');
      }
      
      // Create Uint8Array for pdf.js
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Check PDF header (should start with %PDF-)
      const header = String.fromCharCode(...uint8Array.slice(0, 5));
      console.log('PDF header:', header);
      
      if (!header.startsWith('%PDF-')) {
        throw new Error('Invalid PDF file format. The file does not have a valid PDF header.');
      }
      
      console.log('Loading PDF document...');
      const loadingTask = pdfjsLib.getDocument({ 
        data: uint8Array,
        verbosity: 0 // Reduce console spam
      });
      
      const pdf = await loadingTask.promise;
      console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      let fullText = '';
      const textByPage: string[] = [];
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Extracting text from page ${pageNum}...`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract text items with line break detection based on Y position
        let pageText = '';
        let lastY = -1;
        const lineThreshold = 5; // Y position difference to consider as new line
        
        textContent.items.forEach((item: any) => {
          if ('str' in item && 'transform' in item) {
            const currentY = item.transform[5]; // Y position
            
            // If Y position changed significantly, it's a new line
            if (lastY !== -1 && Math.abs(currentY - lastY) > lineThreshold) {
              pageText += '\n';
            }
            
            pageText += item.str + ' ';
            lastY = currentY;
          }
        });
        
        textByPage.push(pageText);
        fullText += pageText + '\n\n'; // Double newline between pages
        
        console.log(`Page ${pageNum} text length: ${pageText.length} characters`);
      }
      
      console.log('Full extracted text preview:', fullText.substring(0, 500) + '...');
      console.log('Total text length:', fullText.length);
      
      if (fullText.length === 0) {
        throw new Error('No text could be extracted from the PDF. The PDF might be scanned images without text, or might be corrupted.');
      }
      
      return fullText;
    } catch (error: any) {
      console.error('PDF.js parsing error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Provide more specific error messages
      if (error.message?.includes('Invalid PDF')) {
        throw error; // Re-throw our custom validation errors
      } else if (error.message?.includes('password')) {
        throw new Error('This PDF is password-protected. Please provide an unprotected PDF file.');
      } else if (error.message?.includes('corrupted') || error.message?.includes('damaged')) {
        throw new Error('The PDF file appears to be corrupted or damaged. Please try a different file.');
      } else {
        throw new Error(`Failed to read PDF: ${error.message || 'Unknown error'}. Please ensure the file is a valid, unprotected PDF.`);
      }
    }
  }

  /**
   * Extract images from PDF
   * NOTE: Image extraction is disabled for now - users can add images manually
   * PDF.js doesn't provide reliable access to embedded images without complex workarounds
   */
  private async extractImagesFromPdf(pdfData: Uint8Array): Promise<string[]> {
    console.log('ℹ️ Image extraction is currently disabled. Images can be added manually after import.');
    return []; // Return empty array - no automatic image extraction
  }

  /**
   * Parse extracted text into template structure
   */
  private parseTextToTemplate(text: string, filename: string, imageData: {images: string[], groups: any[]} = {images: [], groups: []}): ParsedTemplate {
    // First split into lines, THEN normalize spaces within each line
    const lines = text.split('\n')
      .map(l => l.replace(/\s+/g, ' ').trim()) // Normalize spaces within each line
      .filter(l => l.length > 0);
    
    console.log('Total lines:', lines.length);
    console.log('Sample lines (first 30):', lines.slice(0, 30));
    
    const template: ParsedTemplate = {
      name: this.extractTemplateName(filename, lines),
      description: this.extractDescription(lines),
      category: 'quality_control',
      part_number: this.extractPartNumber(lines),
      product_type: this.extractProductType(lines),
      items: this.extractChecklistItems(lines, imageData)
    };

    console.log('📄 Parsed Template JSON:', JSON.stringify(template, null, 2));

    return template;
  }

  /**
   * Extract template name from filename or content
   */
  private extractTemplateName(filename: string, lines: string[]): string {
    // Try to extract from filename
    let nameFromFile = filename.replace('.pdf', '').replace(/_/g, ' ');
    
    // Look for specific patterns in QA forms
    // Pattern: QA-FRM-XXX Part-Number Description
    const qaFormMatch = nameFromFile.match(/QA-FRM-\d+\s+([A-Z0-9\-]+)/i);
    if (qaFormMatch) {
      // Found QA form with part number
      return `Quality Inspection - ${qaFormMatch[1]}`;
    }
    
    // Look for title in first few lines of content
    const titlePatterns = [
      /Critical to Quality Inspection Checklist/i,
      /Quality Inspection Checklist/i,
      /Inspection Checklist/i,
      /Checklist/i
    ];
    
    for (const line of lines.slice(0, 10)) {
      for (const pattern of titlePatterns) {
        if (pattern.test(line)) {
          // Found a title, try to extract part number from nearby lines
          const partNumber = this.extractPartNumber(lines);
          if (partNumber) {
            return `${line.trim()} - ${partNumber}`;
          }
          return line.trim();
        }
      }
    }

    return nameFromFile;
  }

  /**
   * Extract description from content
   */
  private extractDescription(lines: string[]): string {
    // Look for description-like content
    const descLine = lines.find(line => 
      line.toLowerCase().includes('description') || 
      line.toLowerCase().includes('purpose')
    );

    if (descLine) {
      const parts = descLine.split(':');
      return parts.length > 1 ? parts[1].trim() : '';
    }

    return '';
  }

  /**
   * Extract part number from content
   */
  private extractPartNumber(lines: string[]): string {
    // Look for "The Fi Company P/N:" or "Part Number:" patterns
    const partPatterns = [
      /The\s+Fi\s+Company\s+P\/N:\s*([A-Z0-9\-]+)/i,
      /Part\s+Number:\s*([A-Z0-9\-]+)/i,
      /P\/N:\s*([A-Z0-9\-]+)/i,
      /Part\s+#:\s*([A-Z0-9\-]+)/i
    ];

    for (const line of lines) {
      for (const pattern of partPatterns) {
        const match = line.match(pattern);
        if (match) {
          console.log('Found part number:', match[1]);
          return match[1].trim();
        }
      }
    }

    // Fallback: Look for patterns like VWL-XXXXX-XXX
    for (const line of lines) {
      const genericMatch = line.match(/\b([A-Z]{2,4}-\d{4,6}-\d{2,4})\b/);
      if (genericMatch) {
        console.log('Found part number (generic pattern):', genericMatch[1]);
        return genericMatch[1];
      }
    }

    return '';
  }

  /**
   * Extract product type from content
   */
  private extractProductType(lines: string[]): string {
    // Look for "Description:" field which often contains product type
    const descPatterns = [
      /Description:\s*(.+)/i,
      /Product:\s*(.+)/i,
      /Product\s+Type:\s*(.+)/i
    ];

    for (const line of lines) {
      for (const pattern of descPatterns) {
        const match = line.match(pattern);
        if (match && match[1].length > 0 && match[1].length < 100) {
          console.log('Found product type:', match[1].trim());
          return match[1].trim();
        }
      }
    }

    return '';
  }

  /**
   * Extract checklist items from text
   * Specifically targets numbered items from QA-FRM "No" column
   */
  private extractChecklistItems(lines: string[], imageData: {images: string[], groups: any[]}): ParsedChecklistItem[] {
    const items: ParsedChecklistItem[] = [];
    let currentItem: Partial<ParsedChecklistItem> | null = null;
    let inItemsSection = false;

    console.log('Starting item extraction (looking for numbered items)...');
    console.log(`Available images: ${imageData.images.length} total, ${imageData.groups.length} groups`);

    // Pattern to match lines starting with a number (the "No" column)
    const numberedItemPattern = /^(\d+)\s+[•\-]?\s*(.+)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty or very short lines
      if (line.length < 3) continue;

      // Check if we're in the checklist section
      if (!inItemsSection && (line.includes('Process Steps') || line.includes('Critical to Quality'))) {
        inItemsSection = true;
        console.log(`✓ Found checklist section at line ${i}: "${line}"`);
        continue;
      }

      if (!inItemsSection) continue;

      // Try to match numbered item pattern (from "No" column)
      const match = line.match(numberedItemPattern);
      
      if (match) {
        // Save previous item if exists
        if (currentItem && currentItem.title) {
          items.push({
            title: currentItem.title,
            description: (currentItem.description || '').trim(),
            order_index: items.length + 1,
            is_required: true,
            photo_requirements: {
              angle: '',
              distance: '',
              lighting: '',
              focus: '',
              min_photos: 1,
              max_photos: 5
            }
          });
          console.log(`  ✓ Saved item #${items.length}: "${currentItem.title.substring(0, 60)}..."`);
        }

        // Start new item
        const itemNumber = match[1];
        const itemText = match[2].trim();
        
        console.log(`✓ Found item #${itemNumber} at line ${i}: "${itemText.substring(0, 80)}"`);
        
        currentItem = {
          title: itemText,
          description: '',
          is_required: true
        };
      } 
      // If we have a current item and line starts with bullet, it's part of the description
      else if (currentItem && line.match(/^[•\-\*]\s+(.+)/)) {
        const bulletText = line.replace(/^[•\-\*]\s+/, '').trim();
        currentItem.description = (currentItem.description || '').trim() + ' • ' + bulletText;
        console.log(`    Added bullet to description: "${bulletText.substring(0, 50)}"`);
      }
      // If we have a current item and line looks like a continuation
      else if (currentItem && 
               line.length > 15 && 
               line.length < 300 &&
               !line.match(/^(The Fi Company|Quality Inspector|Production|Page \d+|QA-FRM)/i) &&
               !line.match(/^[A-Z\s]+:$/)) {
        
        // Check if this might be a sub-item (like "1.", "2.", etc. within a main item)
        const subItemMatch = line.match(/^(\d+)\.\s*(.+)/);
        if (subItemMatch) {
          currentItem.description = (currentItem.description || '').trim() + ` [${subItemMatch[1]}] ` + subItemMatch[2];
          console.log(`    Added sub-item: "${subItemMatch[2].substring(0, 50)}"`);
        }
        // Or if line starts with common instruction words
        else if (line.match(/^(Verify|Check|Ensure|Confirm|Perform|On the|Left|Right|through|P\d+)/i)) {
          if (currentItem.description.length > 0) {
            currentItem.description += ' - ';
          }
          currentItem.description += line;
          console.log(`    Added continuation: "${line.substring(0, 50)}"`);
        }
      }
    }

    // Add last item
    if (currentItem && currentItem.title) {
      items.push({
        title: currentItem.title,
        description: (currentItem.description || '').trim(),
        order_index: items.length + 1,
        is_required: true,
        photo_requirements: {
          angle: '',
          distance: '',
          lighting: '',
          focus: '',
          min_photos: 1,
          max_photos: 5
        }
      });
      console.log(`  ✓ Saved final item #${items.length}: "${currentItem.title.substring(0, 60)}..."`);
    }

    console.log(`\n✓✓✓ Total extracted: ${items.length} checklist items`);
    
    // Use grouped images to handle multiple images per row (Y-position grouping)
    if (imageData.groups && imageData.groups.length > 0) {
      console.log(`📸 Using Y-position grouped images (${imageData.groups.length} groups)...`);
      console.log(`📝 We have ${items.length} text items extracted from PDF`);
      console.log(`🖼️ We have ${imageData.groups.length} image groups from PDF`);
      
      let itemIndex = 0;
      for (const group of imageData.groups) {
        if (group.images.length === 1) {
          // Single image in row - assign to one item
          if (itemIndex < items.length) {
            items[itemIndex].sample_images = [{
              url: group.images[0].url,
              label: `Reference Image`,
              description: `Sample image from PDF`,
              type: 'photo',
              is_primary: true,
              order_index: 0
            }];
            console.log(`  ✓ Item ${itemIndex + 1} assigned 1 image from group at Y=${Math.round(group.yPosition || 0)}`);
            itemIndex++;
          } else {
            // Create placeholder item for extra image
            items.push({
              title: `Inspection Item ${itemIndex + 1}`,
              description: 'Edit this item title and description as needed',
              order_index: itemIndex + 1,
              is_required: true,
              sample_images: [{
                url: group.images[0].url,
                label: `Reference Image`,
                description: `Sample image from PDF`,
                type: 'photo',
                is_primary: true,
                order_index: 0
              }],
              photo_requirements: {
                angle: '',
                distance: '',
                lighting: '',
                focus: '',
                min_photos: 1,
                max_photos: 5
              }
            });
            console.log(`  ✓ Created placeholder item ${itemIndex + 1} for extra image`);
            itemIndex++;
          }
        } else {
          // Multiple images in same row
          const baseItem = itemIndex < items.length ? items[itemIndex] : null;
          const parentOrderIndex = itemIndex + 1;
          
          console.log(`\n🔍 Processing group ${itemIndex + 1} with ${group.images.length} images:`);
          console.log(`   itemIndex: ${itemIndex}, items.length: ${items.length}`);
          console.log(`   baseItem exists: ${!!baseItem}`);
          if (baseItem) {
            console.log(`   baseItem.title: "${baseItem.title}"`);
            console.log(`   baseItem.description: "${baseItem.description || '(empty)'}"`);
          }
          
          // Only create parent-child structure if we have a baseItem with actual text from PDF
          if (baseItem) {
            // We have extracted text - create parent with children
            console.log(`  📋 Group at Y=${Math.round(group.yPosition || 0)} has ${group.images.length} images - creating parent with ${group.images.length} children`);
            
            // Create parent item, preserving existing title/description from PDF
            const parentItem: ParsedChecklistItem = {
              title: baseItem.title,
              description: baseItem.description,
              order_index: parentOrderIndex,
              is_required: baseItem.is_required !== undefined ? baseItem.is_required : true,
              photo_requirements: baseItem.photo_requirements || {
                angle: '',
                distance: '',
                lighting: '',
                focus: '',
                min_photos: 1,
                max_photos: 5
              },
              level: 0,
              children: []
            };
            
            console.log(`    📝 Parent item will use: "${parentItem.title}" - "${parentItem.description?.substring(0, 50)}..."`);
            
            // Create child items for each image
            for (let imgIdx = 0; imgIdx < group.images.length; imgIdx++) {
              const childItem: ParsedChecklistItem = {
                title: `Reference Photo ${imgIdx + 1}`,
                description: `Sample image ${imgIdx + 1} of ${group.images.length}`,
                order_index: parentOrderIndex + (imgIdx * 0.1), // e.g., 14.1, 14.2, 14.3
                is_required: true,
                level: 1, // Child level
                parent_id: parentOrderIndex,
                sample_images: [{
                  url: group.images[imgIdx].url,
                  label: `Reference Image ${imgIdx + 1}`,
                  description: `Sample image from PDF`,
                  type: 'photo',
                  is_primary: imgIdx === 0,
                  order_index: imgIdx
                }],
                photo_requirements: {
                  angle: '',
                  distance: '',
                  lighting: '',
                  focus: '',
                  min_photos: 1,
                  max_photos: 1
                }
              };
              
              parentItem.children!.push(childItem);
              console.log(`    ✓ Created child item ${parentOrderIndex}.${imgIdx + 1} with image ${imgIdx + 1}/${group.images.length}`);
            }
            
            // Update existing item with parent structure
            Object.assign(baseItem, parentItem);
            console.log(`  ✓ Parent item ${parentOrderIndex} created with ${group.images.length} children`);
            itemIndex++;
          } else {
            // No baseItem - ran out of extracted text, just create simple items for remaining images
            console.log(`  ⚠️ No text item available for group with ${group.images.length} images - creating ${group.images.length} simple placeholder items`);
            
            for (let imgIdx = 0; imgIdx < group.images.length; imgIdx++) {
              items.push({
                title: `Inspection Item ${itemIndex + 1}`,
                description: 'Edit this item title and description as needed',
                order_index: itemIndex + 1,
                is_required: true,
                level: 0,
                sample_images: [{
                  url: group.images[imgIdx].url,
                  label: `Reference Image`,
                  description: `Sample image from PDF`,
                  type: 'photo',
                  is_primary: true,
                  order_index: 0
                }],
                photo_requirements: {
                  angle: '',
                  distance: '',
                  lighting: '',
                  focus: '',
                  min_photos: 1,
                  max_photos: 5
                }
              });
              console.log(`    ✓ Created placeholder item ${itemIndex + 1} for extra image ${imgIdx + 1}`);
              itemIndex++;
            }
          }
        }
      }
      
      console.log(`✓ Successfully assigned all images from ${imageData.groups.length} groups to ${itemIndex} items`);
    } else if (imageData.images && imageData.images.length > 0) {
      // Fallback: No grouping available, use sequential assignment
      console.log(`📸 Assigning ${imageData.images.length} images sequentially (no grouping)...`);
      
      // If we have more images than items, create placeholder items for the extra images
      if (imageData.images.length > items.length) {
        const itemsNeeded = imageData.images.length - items.length;
        console.log(`⚠️ Creating ${itemsNeeded} additional placeholder items for extra images`);
        
        for (let i = items.length; i < imageData.images.length; i++) {
          items.push({
            title: `Inspection Item ${i + 1}`,
            description: 'Edit this item title and description as needed',
            order_index: i + 1,
            is_required: true,
            photo_requirements: {
              angle: '',
              distance: '',
              lighting: '',
              focus: '',
              min_photos: 1,
              max_photos: 5
            }
          });
        }
        
        console.log(`✓ Total items after adding placeholders: ${items.length}`);
      }
      
      // Now assign images to items (one per item)
      for (let i = 0; i < imageData.images.length; i++) {
        items[i].sample_images = [{
          url: imageData.images[i],
          label: `Reference Image`,
          description: `Sample image from PDF`,
          type: 'photo',
          is_primary: true,
          order_index: 0
        }];
        
        console.log(`  ✓ Item ${i + 1} assigned image ${i + 1}`);
      }
      
      console.log(`✓ Successfully assigned all ${imageData.images.length} images to items`);
    }
    
    return items;
  }

  /**
   * Fallback extraction for PDFs that don't match standard patterns
   */
  private fallbackItemExtraction(lines: string[]): ParsedChecklistItem[] {
    const items: ParsedChecklistItem[] = [];
    let orderIndex = 1;

    // Just extract lines that look like checklist items (reasonable length, no special formatting)
    for (const line of lines) {
      if (line.length > 15 && line.length < 150 && 
          !line.match(/^Page \d+/) &&
          !line.match(/^QA-FRM/) &&
          !line.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/) && // Date
          !line.includes('@') && // Email
          !line.match(/^[A-Z\s]+:$/)) { // Section headers

        items.push({
          title: line.trim(),
          description: '',
          order_index: orderIndex++,
          is_required: true,
          photo_requirements: {
            angle: '',
            distance: '',
            lighting: '',
            focus: '',
            min_photos: 1,
            max_photos: 5
          }
        });
      }

      // Limit fallback to 20 items
      if (items.length >= 20) break;
    }

    return items;
  }

  /**
   * Finalize item with defaults
   */
  private finalizeItem(item: Partial<ParsedChecklistItem>, order: number): ParsedChecklistItem {
    return {
      title: item.title || `Item ${order}`,
      description: (item.description || '').trim(),
      order_index: order,
      is_required: item.is_required ?? true,
      photo_requirements: {
        angle: '',
        distance: '',
        lighting: '',
        focus: '',
        min_photos: 1,
        max_photos: 5
      }
    };
  }

  /**
   * Manual template creation from user input
   * Use this when PDF parsing isn't available
   */
  createManualTemplate(data: {
    name: string;
    itemCount: number;
    category?: string;
    part_number?: string;
  }): ParsedTemplate {
    const items: ParsedChecklistItem[] = [];

    for (let i = 1; i <= data.itemCount; i++) {
      items.push({
        title: `Inspection Item ${i}`,
        description: 'Add description for this inspection point',
        order_index: i,
        is_required: true,
        photo_requirements: {
          angle: '',
          distance: '',
          lighting: '',
          focus: '',
          min_photos: 1,
          max_photos: 5
        }
      });
    }

    return {
      name: data.name,
      category: data.category || 'quality_control',
      part_number: data.part_number || '',
      product_type: '',
      items
    };
  }

  /**
   * Parse from CSV/Excel format
   * Alternative to PDF if user provides spreadsheet
   */
  async parseCsvToTemplate(file: File): Promise<ParsedTemplate> {
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Expected CSV format:
    // Title, Description, Required, Angle, Distance, MinPhotos, MaxPhotos
    
    const items: ParsedChecklistItem[] = [];
    let orderIndex = 1;

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length >= 2) {
        items.push({
          title: values[0],
          description: values[1] || '',
          order_index: orderIndex++,
          is_required: values[2]?.toLowerCase() === 'true' || values[2] === '1',
          photo_requirements: {
            angle: values[3] || '',
            distance: values[4] || '',
            lighting: '',
            focus: '',
            min_photos: parseInt(values[5]) || 1,
            max_photos: parseInt(values[6]) || 5
          }
        });
      }
    }

    return {
      name: file.name.replace('.csv', ''),
      category: 'quality_control',
      items
    };
  }
}
