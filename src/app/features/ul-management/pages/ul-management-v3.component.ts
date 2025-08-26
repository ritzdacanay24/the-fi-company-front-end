import { Component, OnInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { faker } from '@faker-js/faker';

export interface ULLabel {
  id: number;
  ul_number: string;
  status: 'available' | 'used';
  dateCreated: Date;
  dateUsed?: Date;
}

export interface ULUsage {
  id: number;
  ul_number: string;
  serial_number: string;
  quantity: number;
  date_used: Date;
  user_signature: string;
  customer: string;
  dateCreated: Date;
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgbModule],
  selector: 'app-ul-management-v3',
  templateUrl: './ul-management-v3.component.html',
  styleUrls: ['./ul-management-v3.component.scss']
})
export class ULManagementV3Component implements OnInit {
  labels: ULLabel[] = [];
  usages: ULUsage[] = [];
  nextId = 1;
  
  // Forms
  rangeForm: FormGroup;
  usageForm: FormGroup;
  
  // UI State
  showRangeForm = false;
  selectedUL: ULLabel | null = null;
  selectedULIds: number[] = [];
  // ng-bootstrap modal reference for batch modal
  private modalRef: NgbModalRef | null = null;
  // Individual forms for each selected UL in batch
  batchForms: { [ulId: number]: FormGroup } = {};
  // Progress tracking for large range operations
  isProcessingRange = false;
  rangeProgress = { current: 0, total: 0, message: '' };
  batchUsageForm: FormGroup;
  
  constructor(private fb: FormBuilder, private modalService: NgbModal) {
    this.rangeForm = this.fb.group({
      startNumber: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      endNumber: ['', [Validators.required, Validators.pattern(/^\d+$/)]]
    });
    
    this.usageForm = this.fb.group({
      serial_number: ['', [Validators.required, Validators.minLength(3)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      date_used: [new Date().toISOString().substring(0, 10), Validators.required],
      user_signature: ['', [Validators.required, Validators.minLength(2)]],
      customer: ['', [Validators.required, Validators.minLength(2)]]
    });

    // Remove the standalone batchUsageForm since we'll create individual forms
  }

  ngOnInit() {
    this.loadFromStorage();
    if (this.labels.length === 0) {
      // Add some sample data for demo
      this.addULRange('73908498', '73908507');
    }
  }

  // Admin functionality - Add UL range
  async addULRange(start: string, end: string) {
    const startNum = parseInt(start, 10);
    const endNum = parseInt(end, 10);
    
    if (isNaN(startNum) || isNaN(endNum) || endNum < startNum) {
      alert('Invalid range');
      return;
    }
    
    const count = endNum - startNum + 1;
    if (count > 50000) {
      alert('Range too large (max 50,000). Please use smaller batches.');
      return;
    }
    
    // For large ranges (>1000), use async processing
    if (count > 1000) {
      await this.processLargeRange(startNum, endNum);
      return;
    }
    
    // For smaller ranges, use synchronous processing
    this.processSmallerRange(startNum, endNum);
  }

  private async processLargeRange(startNum: number, endNum: number) {
    this.isProcessingRange = true;
    const totalCount = endNum - startNum + 1;
    let processedCount = 0;
    let addedCount = 0;
    let skippedCount = 0;
    
    // Process in chunks to prevent freezing
    const chunkSize = 500;
    const newULs: ULLabel[] = [];
    
    this.rangeProgress = {
      current: 0,
      total: totalCount,
      message: 'Analyzing UL range...'
    };

    try {
      // Process in chunks with small delays to keep UI responsive
      for (let i = startNum; i <= endNum; i += chunkSize) {
        const chunkEnd = Math.min(i + chunkSize - 1, endNum);
        
        // Update progress
        this.rangeProgress.message = `Processing ULs ${i} to ${chunkEnd}...`;
        
        // Process chunk
        for (let j = i; j <= chunkEnd; j++) {
          const ulNumber = j.toString();
          const existingLabel = this.labels.find(l => l.ul_number === ulNumber);
          
          if (!existingLabel) {
            newULs.push({
              id: this.nextId++,
              ul_number: ulNumber,
              status: 'available',
              dateCreated: new Date()
            });
            addedCount++;
          } else {
            skippedCount++;
          }
          
          processedCount++;
          this.rangeProgress.current = processedCount;
        }
        
        // Add chunk to database and save periodically
        if (newULs.length >= chunkSize) {
          this.labels.push(...newULs.splice(0, chunkSize));
          this.saveToStorage();
        }
        
        // Small delay to keep UI responsive
        await this.delay(10);
      }
      
      // Add remaining ULs
      if (newULs.length > 0) {
        this.labels.push(...newULs);
      }
      
      this.saveToStorage();
      
      // Show results
      let message = `Range processing completed!\n\n`;
      message += `✅ Added: ${addedCount} new UL numbers\n`;
      if (skippedCount > 0) {
        message += `⏭️ Skipped: ${skippedCount} duplicates\n`;
      }
      message += `📊 Total processed: ${processedCount} UL numbers`;
      
      alert(message);
      
    } catch (error) {
      console.error('Error processing range:', error);
      alert('An error occurred while processing the range. Some ULs may have been added.');
    } finally {
      this.isProcessingRange = false;
      this.rangeProgress = { current: 0, total: 0, message: '' };
    }
  }

  private processSmallerRange(startNum: number, endNum: number) {
    // Check for existing UL numbers in the range
    const existingULs: string[] = [];
    const newULs: string[] = [];
    
    for (let i = startNum; i <= endNum; i++) {
      const ulNumber = i.toString();
      const existingLabel = this.labels.find(l => l.ul_number === ulNumber);
      
      if (existingLabel) {
        existingULs.push(ulNumber);
      } else {
        newULs.push(ulNumber);
      }
    }
    
    // Handle duplicates
    if (existingULs.length > 0) {
      const duplicateCount = existingULs.length;
      const newCount = newULs.length;
      
      let message = `Found ${duplicateCount} UL number(s) that already exist in the database:\n\n`;
      
      // Show first few duplicates as examples
      const exampleDuplicates = existingULs.slice(0, 5);
      message += exampleDuplicates.join(', ');
      if (existingULs.length > 5) {
        message += ` ... and ${existingULs.length - 5} more`;
      }
      
      if (newCount > 0) {
        message += `\n\n${newCount} new UL number(s) can still be added.`;
        message += '\n\nOptions:';
        message += '\n1. Add only the new UL numbers (skip duplicates)';
        message += '\n2. Cancel and adjust your range';
        message += '\n\nDo you want to add only the new UL numbers?';
        
        const confirmed = confirm(message);
        
        if (!confirmed) {
          return; // User chose to cancel
        }
        
        // Add only new ULs
        this.addNewULsToDatabase(newULs);
        
        alert(`Successfully added ${newCount} new UL numbers. Skipped ${duplicateCount} duplicates.`);
      } else {
        // All ULs in range already exist
        alert(`All UL numbers in the range ${startNum} to ${endNum} already exist in the database. No new ULs were added.`);
        return;
      }
    } else {
      // No duplicates, add all ULs
      this.addNewULsToDatabase(newULs);
      alert(`Successfully added ${newULs.length} new UL numbers to the database.`);
    }
    
    this.saveToStorage();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private addNewULsToDatabase(ulNumbers: string[]) {
    ulNumbers.forEach(ulNumber => {
      this.labels.push({
        id: this.nextId++,
        ul_number: ulNumber,
        status: 'available',
        dateCreated: new Date()
      });
    });
  }

  onRangeSubmit() {
    if (this.rangeForm.valid && !this.isProcessingRange) {
      const { startNumber, endNumber } = this.rangeForm.value;
      
      // Validate range first
      const startNum = parseInt(startNumber, 10);
      const endNum = parseInt(endNumber, 10);
      
      if (isNaN(startNum) || isNaN(endNum) || endNum < startNum) {
        alert('Please enter a valid range where end number is greater than or equal to start number.');
        return;
      }
      
      const count = endNum - startNum + 1;
      
      // Check for potential typos - huge ranges that might be accidental
      const typoCheck = this.checkForPotentialTypo(startNumber, endNumber, count);
      if (typoCheck.isPotentialTypo) {
        const useCorrection = confirm(
          `⚠️ POTENTIAL TYPO DETECTED ⚠️\n\n` +
          `Your range: ${startNumber} to ${endNumber} (${count.toLocaleString()} ULs)\n\n` +
          `This seems unusually large. Did you mean:\n` +
          `${typoCheck.suggestedStart} to ${typoCheck.suggestedEnd} (${typoCheck.suggestedCount.toLocaleString()} ULs)?\n\n` +
          `Click OK to use the suggested range, or Cancel to keep your original range.`
        );
        
        if (useCorrection) {
          // Update form with corrected values
          this.rangeForm.patchValue({
            startNumber: typoCheck.suggestedStart,
            endNumber: typoCheck.suggestedEnd
          });
          // Recursively call with corrected values
          setTimeout(() => this.onRangeSubmit(), 100);
          return;
        }
      }
      
      if (count > 50000) {
        alert('Range is too large. Maximum 50,000 UL numbers can be added at once. Please use smaller batches.');
        return;
      }
      
      // Show different warnings based on range size
      let confirmMessage = `You are about to add UL range: ${startNumber} to ${endNumber}\n`;
      confirmMessage += `Total numbers in range: ${count.toLocaleString()}\n\n`;
      
      if (count > 1000) {
        confirmMessage += `⚠️ This is a large range (${count.toLocaleString()} ULs). Processing will take some time and show progress.\n\n`;
      } else {
        // Show preview for smaller ranges
        const preview = this.previewULRange(startNumber, endNumber);
        if (preview.existing.length > 0) {
          confirmMessage += `⚠️ Warning: ${preview.existing.length} numbers already exist and will be skipped\n`;
          confirmMessage += `✅ ${preview.new.length} new numbers will be added\n\n`;
        } else {
          confirmMessage += `✅ All ${count} numbers are new and will be added\n\n`;
        }
      }
      
      confirmMessage += 'Do you want to proceed?';
      
      const confirmed = confirm(confirmMessage);
      if (confirmed) {
        this.addULRange(startNumber, endNumber);
        this.rangeForm.reset();
        this.showRangeForm = false;
      }
    }
  }

  // Check for potential typos in UL ranges
  private checkForPotentialTypo(startStr: string, endStr: string, count: number): {
    isPotentialTypo: boolean;
    suggestedStart: string;
    suggestedEnd: string;
    suggestedCount: number;
  } {
    // If range is reasonable, no typo
    if (count <= 100000) {
      return {
        isPotentialTypo: false,
        suggestedStart: startStr,
        suggestedEnd: endStr,
        suggestedCount: count
      };
    }

    // Check if end number has extra digit(s) compared to start
    const startLen = startStr.length;
    const endLen = endStr.length;
    
    if (endLen > startLen) {
      // Try removing extra digits from the end
      const trimmedEnd = endStr.substring(0, startLen);
      const trimmedEndNum = parseInt(trimmedEnd, 10);
      const startNum = parseInt(startStr, 10);
      const newCount = trimmedEndNum - startNum + 1;
      
      // If trimming makes sense (reasonable range), suggest it
      if (newCount > 0 && newCount <= 100000 && trimmedEnd.startsWith(startStr.substring(0, startLen - 2))) {
        return {
          isPotentialTypo: true,
          suggestedStart: startStr,
          suggestedEnd: trimmedEnd,
          suggestedCount: newCount
        };
      }
    }

    // Check if start and end have similar patterns but end has extra digits
    if (endLen > startLen && endStr.startsWith(startStr.substring(0, startLen - 1))) {
      // Try to find a reasonable end number
      const baseEnd = startStr.replace(/\d{1,2}$/, ''); // Remove last 1-2 digits
      const startLastDigits = startStr.substring(baseEnd.length);
      const potentialEnd = baseEnd + (parseInt(startLastDigits) + 50).toString(); // Add reasonable range
      const potentialEndNum = parseInt(potentialEnd, 10);
      const startNum = parseInt(startStr, 10);
      const newCount = potentialEndNum - startNum + 1;
      
      if (newCount > 0 && newCount <= 1000) {
        return {
          isPotentialTypo: true,
          suggestedStart: startStr,
          suggestedEnd: potentialEnd,
          suggestedCount: newCount
        };
      }
    }

    // No clear correction found
    return {
      isPotentialTypo: false,
      suggestedStart: startStr,
      suggestedEnd: endStr,
      suggestedCount: count
    };
  }

  // Preview what will be added in a range
  private previewULRange(start: string, end: string): { existing: string[], new: string[], total: number } {
    const startNum = parseInt(start, 10);
    const endNum = parseInt(end, 10);
    const existing: string[] = [];
    const newULs: string[] = [];
    
    for (let i = startNum; i <= endNum; i++) {
      const ulNumber = i.toString();
      const existingLabel = this.labels.find(l => l.ul_number === ulNumber);
      
      if (existingLabel) {
        existing.push(ulNumber);
      } else {
        newULs.push(ulNumber);
      }
    }
    
    return {
      existing,
      new: newULs,
      total: endNum - startNum + 1
    };
  }

  // User functionality - Select UL and record usage
  selectUL(label: ULLabel) {
    if (label.status === 'used') {
      const nextAvailable = this.getNextAvailableUL();
      if (nextAvailable) {
        const confirmed = confirm(
          `UL ${label.ul_number} is already used. Select next available UL ${nextAvailable.ul_number} instead?`
        );
        
        if (confirmed) {
          this.selectedUL = nextAvailable;
          this.usageForm.reset({
            quantity: 1,
            date_used: new Date().toISOString().substring(0, 10)
          });
        }
      } else {
        alert('UL is already used and no available ULs for replacement.');
      }
    } else if (label.status === 'available') {
      this.selectedUL = label;
      this.usageForm.reset({
        quantity: 1,
        date_used: new Date().toISOString().substring(0, 10)
      });
    }
  }

  toggleSelect(id: number, event: any) {
    const label = this.labels.find(l => l.id === id);
    if (!label) return;
    
    if (event.target.checked) {
      // Check if UL is already used
      if (label.status === 'used') {
        event.target.checked = false; // Uncheck the checkbox
        alert(`UL ${label.ul_number} is already used and cannot be selected.`);
        return;
      }
      
      const idx = this.selectedULIds.indexOf(id);
      if (idx === -1) this.selectedULIds.push(id);
    } else {
      const idx = this.selectedULIds.indexOf(id);
      if (idx > -1) this.selectedULIds.splice(idx, 1);
    }
  }

  toggleSelectAll(event: any) {
    const available = this.getAvailableLabels();
    if (event.target.checked) {
      this.selectedULIds = available.map(a => a.id);
    } else {
      this.selectedULIds = [];
    }
  }

  clearSelection() {
    this.selectedULIds = [];
  }

  openBatchModal(content: TemplateRef<any>) {
    if (this.selectedULIds.length === 0) return;
    
    // Create individual forms for each selected UL
    this.batchForms = {};
    this.selectedULIds.forEach(ulId => {
      this.batchForms[ulId] = this.fb.group({
        serial_number: ['', [Validators.required, Validators.minLength(3)]],
        quantity: [1, [Validators.required, Validators.min(1)]],
        date_used: [new Date().toISOString().substring(0, 10), Validators.required],
        user_signature: ['Batch User', [Validators.required, Validators.minLength(2)]],
        customer: ['Eyefi', [Validators.required, Validators.minLength(2)]]
      });
    });
    
    this.modalRef = this.modalService.open(content, { size: 'xl', backdrop: 'static' });
  }

  submitBatchUsage() {
    // Validate all forms first
    const allValid = Object.values(this.batchForms).every(form => form.valid);
    if (!allValid) {
      alert('Please fill all required fields for each UL');
      return;
    }
    
    // Check for already used ULs and prepare replacements
    const replacements: { originalId: number, originalUL: string, newId: number, newUL: string }[] = [];
    const finalULIds: number[] = [];
    
    for (const ulId of this.selectedULIds) {
      const label = this.labels.find(l => l.id === ulId);
      if (!label) continue;
      
      if (label.status === 'used') {
        // Find next available UL to replace the used one
        const nextAvailable = this.getNextAvailableUL();
        if (nextAvailable) {
          replacements.push({
            originalId: ulId,
            originalUL: label.ul_number,
            newId: nextAvailable.id,
            newUL: nextAvailable.ul_number
          });
          finalULIds.push(nextAvailable.id);
          
          // Copy form data from original to replacement UL
          this.batchForms[nextAvailable.id] = this.fb.group({
            serial_number: [this.batchForms[ulId].value.serial_number, [Validators.required, Validators.minLength(3)]],
            quantity: [this.batchForms[ulId].value.quantity, [Validators.required, Validators.min(1)]],
            date_used: [this.batchForms[ulId].value.date_used, Validators.required],
            user_signature: [this.batchForms[ulId].value.user_signature, [Validators.required, Validators.minLength(2)]],
            customer: [this.batchForms[ulId].value.customer, [Validators.required, Validators.minLength(2)]]
          });
        } else {
          alert(`UL ${label.ul_number} is already used and no available ULs for replacement. Please deselect it.`);
          return;
        }
      } else {
        finalULIds.push(ulId);
      }
    }
    
    // Show replacement confirmation if any
    if (replacements.length > 0) {
      const replacementText = replacements.map(r => 
        `UL ${r.originalUL} (already used) → UL ${r.newUL}`
      ).join('\n');
      
      const confirmed = confirm(
        `The following ULs were already used and will be replaced with next available ULs:\n\n${replacementText}\n\nDo you want to proceed?`
      );
      
      if (!confirmed) {
        // Clean up replacement forms
        replacements.forEach(r => delete this.batchForms[r.newId]);
        return;
      }
    }
    
    // Process each final UL with its form data
    finalULIds.forEach(ulId => {
      const form = this.batchForms[ulId];
      const formValue = form.value;
      const usageDate = new Date(formValue.date_used);
      
      const label = this.labels.find(l => l.id === ulId);
      if (label && label.status === 'available') {
        label.status = 'used';
        label.dateUsed = usageDate;
        this.usages.unshift({
          id: this.nextId++,
          ul_number: label.ul_number,
          serial_number: formValue.serial_number,
          quantity: formValue.quantity,
          date_used: usageDate,
          user_signature: formValue.user_signature,
          customer: formValue.customer,
          dateCreated: new Date()
        });
      }
    });
    
    // Show success message
    let successMessage = `Successfully recorded usage for ${finalULIds.length} ULs.`;
    if (replacements.length > 0) {
      successMessage += `\n${replacements.length} ULs were automatically replaced with available ones.`;
    }
    alert(successMessage);
    
    this.selectedULIds = [];
    this.batchForms = {};
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }
    this.saveToStorage();
  }

  onUsageSubmit() {
    if (this.usageForm.valid && this.selectedUL) {
      // Check if the selected UL is still available
      if (this.selectedUL.status === 'used') {
        const nextAvailable = this.getNextAvailableUL();
        if (nextAvailable) {
          const confirmed = confirm(
            `UL ${this.selectedUL.ul_number} is already used. Replace with next available UL ${nextAvailable.ul_number}?`
          );
          
          if (confirmed) {
            this.selectedUL = nextAvailable;
          } else {
            alert('Please select a different UL number.');
            this.selectedUL = null;
            return;
          }
        } else {
          alert('UL is already used and no available ULs for replacement. Please select a different UL.');
          this.selectedUL = null;
          return;
        }
      }
      
      const usage: ULUsage = {
        id: this.nextId++,
        ul_number: this.selectedUL.ul_number,
        ...this.usageForm.value,
        date_used: new Date(this.usageForm.value.date_used),
        dateCreated: new Date()
      };
      
      this.usages.push(usage);
      this.selectedUL.status = 'used';
      this.selectedUL.dateUsed = new Date();
      
      const successMessage = `Successfully recorded usage for UL ${this.selectedUL.ul_number}.`;
      alert(successMessage);
      
      this.selectedUL = null;
      this.usageForm.reset({
        quantity: 1,
        date_used: new Date().toISOString().substring(0, 10)
      });
      
      this.saveToStorage();
    }
  }

  cancelUsage() {
    this.selectedUL = null;
    this.usageForm.reset();
  }

  // Storage
  saveToStorage() {
    try {
      const data = {
        labels: this.labels,
        usages: this.usages,
        nextId: this.nextId
      };
      localStorage.setItem('ul_management_v3', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem('ul_management_v3');
      if (data) {
        const parsed = JSON.parse(data);
        this.labels = parsed.labels || [];
        this.usages = parsed.usages || [];
        this.nextId = parsed.nextId || 1;
        
        // Convert date strings back to Date objects
        this.labels.forEach(l => {
          l.dateCreated = new Date(l.dateCreated);
          if (l.dateUsed) l.dateUsed = new Date(l.dateUsed);
        });
        this.usages.forEach(u => {
          u.date_used = new Date(u.date_used);
          u.dateCreated = new Date(u.dateCreated);
        });
      }
    } catch (e) {
      console.warn('Failed to load from localStorage', e);
    }
  }

  // Helper methods
  getAvailableLabels(): ULLabel[] {
    return this.labels.filter(l => l.status === 'available').sort((a, b) => 
      parseInt(a.ul_number) - parseInt(b.ul_number)
    );
  }

  getNextAvailableUL(): ULLabel | null {
    const available = this.getAvailableLabels();
    return available.length > 0 ? available[0] : null;
  }

  getStats() {
    return {
      total: this.labels.length,
      available: this.labels.filter(l => l.status === 'available').length,
      used: this.labels.filter(l => l.status === 'used').length,
      totalUsages: this.usages.length
    };
  }

  // Quick actions
  selectNextAvailable() {
    const next = this.getNextAvailableUL();
    if (next) {
      this.selectUL(next);
    }
  }

  // Helper to get UL label by ID
  getULById(id: number): ULLabel | undefined {
    return this.labels.find(l => l.id === id);
  }

  // Check if a range has any existing UL numbers (for UI feedback)
  checkRangeOverlap(): { hasOverlap: boolean, overlapCount: number, newCount: number, totalCount: number, isPotentialTypo: boolean, typoSuggestion?: string } {
    const startNumber = this.rangeForm.get('startNumber')?.value;
    const endNumber = this.rangeForm.get('endNumber')?.value;
    
    if (!startNumber || !endNumber) {
      return { hasOverlap: false, overlapCount: 0, newCount: 0, totalCount: 0, isPotentialTypo: false };
    }
    
    const startNum = parseInt(startNumber, 10);
    const endNum = parseInt(endNumber, 10);
    
    if (isNaN(startNum) || isNaN(endNum) || endNum < startNum) {
      return { hasOverlap: false, overlapCount: 0, newCount: 0, totalCount: 0, isPotentialTypo: false };
    }
    
    const totalCount = endNum - startNum + 1;
    
    // Check for potential typo
    const typoCheck = this.checkForPotentialTypo(startNumber, endNumber, totalCount);
    
    // For huge ranges, don't compute overlap (would freeze)
    if (totalCount > 100000) {
      return { 
        hasOverlap: false, 
        overlapCount: 0, 
        newCount: 0, 
        totalCount,
        isPotentialTypo: typoCheck.isPotentialTypo,
        typoSuggestion: typoCheck.isPotentialTypo ? `${typoCheck.suggestedStart} to ${typoCheck.suggestedEnd}` : undefined
      };
    }
    
    const preview = this.previewULRange(startNumber, endNumber);
    return {
      hasOverlap: preview.existing.length > 0,
      overlapCount: preview.existing.length,
      newCount: preview.new.length,
      totalCount: preview.total,
      isPotentialTypo: typoCheck.isPotentialTypo,
      typoSuggestion: typoCheck.isPotentialTypo ? `${typoCheck.suggestedStart} to ${typoCheck.suggestedEnd}` : undefined
    };
  }
}
