import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { SerialNumberService } from '@app/features/serial-number-management/services/serial-number.service';

interface SequenceData {
  type: string;
  loading: boolean;
  error: string | null;
  data: any[];
  count: number;
  debug?: any;
  rawResponse?: any;
}

interface RecentlyUsedData {
  type: string;
  loading: boolean;
  error: string | null;
  data: any[];
  count: number;
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-serial-sequence-debug-modal',
  templateUrl: './serial-sequence-debug-modal.component.html',
  styleUrls: ['./serial-sequence-debug-modal.component.scss']
})
export class SerialSequenceDebugModalComponent implements OnInit {
  
  // Currently selected serials (passed from workflow)
  currentlySelectedEyefi: string[] = [];
  currentlySelectedUl: string[] = [];
  currentlySelectedIgt: string[] = [];
  
  eyefiSequence: SequenceData = {
    type: 'EyeFi Serials',
    loading: false,
    error: null,
    data: [],
    count: 0
  };

  ulSequence: SequenceData = {
    type: 'UL Labels',
    loading: false,
    error: null,
    data: [],
    count: 0
  };

  igtSequence: SequenceData = {
    type: 'IGT Serials',
    loading: false,
    error: null,
    data: [],
    count: 0
  };

  // Recently used serials
  recentlyUsedEyefi: RecentlyUsedData = {
    type: 'Recently Used EyeFi',
    loading: false,
    error: null,
    data: [],
    count: 0
  };

  recentlyUsedUl: RecentlyUsedData = {
    type: 'Recently Used UL',
    loading: false,
    error: null,
    data: [],
    count: 0
  };

  recentlyUsedIgt: RecentlyUsedData = {
    type: 'Recently Used IGT',
    loading: false,
    error: null,
    data: [],
    count: 0
  };

  displayLimit: number = 20;
  recentLimit: number = 10;
  autoRefreshEnabled: boolean = false;
  private refreshInterval: any;

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private serialNumberService: SerialNumberService
  ) {}

  ngOnInit() {
    this.loadAllSequences();
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadAllSequences() {
    await Promise.all([
      this.loadEyefiSequence(),
      this.loadUlSequence(),
      this.loadIgtSequence(),
      this.loadRecentlyUsedEyefi(),
      this.loadRecentlyUsedUl(),
      this.loadRecentlyUsedIgt()
    ]);
  }

  async loadEyefiSequence() {
    this.eyefiSequence.loading = true;
    this.eyefiSequence.error = null;
    
    try {
      const response = await this.serialNumberService.getAvailableEyefiSerialsFromAPI(this.displayLimit);
      this.eyefiSequence.rawResponse = response;
      
      if (response.success) {
        this.eyefiSequence.data = response.data || [];
        this.eyefiSequence.count = response.count || 0;
        this.eyefiSequence.debug = response.debug || null;
      } else {
        this.eyefiSequence.error = response.error || 'Unknown error';
      }
    } catch (error: any) {
      this.eyefiSequence.error = error.message || 'Failed to load EyeFi serials';
      console.error('EyeFi sequence error:', error);
    } finally {
      this.eyefiSequence.loading = false;
    }
  }

  async loadUlSequence() {
    this.ulSequence.loading = true;
    this.ulSequence.error = null;
    
    try {
      const response = await this.serialNumberService.getAvailableUlLabelsFromAPI(this.displayLimit);
      this.ulSequence.rawResponse = response;
      
      if (response.success) {
        this.ulSequence.data = response.data || [];
        this.ulSequence.count = response.count || 0;
        this.ulSequence.debug = response.debug || null;
      } else {
        this.ulSequence.error = response.error || 'Unknown error';
      }
    } catch (error: any) {
      this.ulSequence.error = error.message || 'Failed to load UL labels';
      console.error('UL sequence error:', error);
    } finally {
      this.ulSequence.loading = false;
    }
  }

  async loadIgtSequence() {
    this.igtSequence.loading = true;
    this.igtSequence.error = null;
    
    try {
      const response = await this.serialNumberService.getAvailableIgtSerialsFromAPI(this.displayLimit);
      this.igtSequence.rawResponse = response;
      
      if (response.success) {
        this.igtSequence.data = response.data || [];
        this.igtSequence.count = response.count || 0;
        this.igtSequence.debug = response.debug || null;
      } else {
        this.igtSequence.error = response.error || 'Unknown error';
      }
    } catch (error: any) {
      this.igtSequence.error = error.message || 'Failed to load IGT serials';
      console.error('IGT sequence error:', error);
    } finally {
      this.igtSequence.loading = false;
    }
  }

  async loadRecentlyUsedEyefi() {
    this.recentlyUsedEyefi.loading = true;
    this.recentlyUsedEyefi.error = null;
    
    try {
      const response = await this.serialNumberService.getRecentlyUsedEyefiSerialsFromAPI(this.recentLimit);
      
      if (response.success) {
        this.recentlyUsedEyefi.data = response.data || [];
        this.recentlyUsedEyefi.count = response.count || 0;
      } else {
        this.recentlyUsedEyefi.error = response.error || 'Unknown error';
      }
    } catch (error: any) {
      this.recentlyUsedEyefi.error = error.message || 'Failed to load recently used EyeFi serials';
      console.error('Recently used EyeFi error:', error);
    } finally {
      this.recentlyUsedEyefi.loading = false;
    }
  }

  async loadRecentlyUsedUl() {
    this.recentlyUsedUl.loading = true;
    this.recentlyUsedUl.error = null;
    
    try {
      const response = await this.serialNumberService.getRecentlyUsedUlLabelsFromAPI(this.recentLimit);
      
      if (response.success) {
        this.recentlyUsedUl.data = response.data || [];
        this.recentlyUsedUl.count = response.count || 0;
      } else {
        this.recentlyUsedUl.error = response.error || 'Unknown error';
      }
    } catch (error: any) {
      this.recentlyUsedUl.error = error.message || 'Failed to load recently used UL labels';
      console.error('Recently used UL error:', error);
    } finally {
      this.recentlyUsedUl.loading = false;
    }
  }

  async loadRecentlyUsedIgt() {
    this.recentlyUsedIgt.loading = true;
    this.recentlyUsedIgt.error = null;
    
    try {
      const response = await this.serialNumberService.getRecentlyUsedIgtSerialsFromAPI(this.recentLimit);
      
      if (response.success) {
        this.recentlyUsedIgt.data = response.data || [];
        this.recentlyUsedIgt.count = response.count || 0;
      } else {
        this.recentlyUsedIgt.error = response.error || 'Unknown error';
      }
    } catch (error: any) {
      this.recentlyUsedIgt.error = error.message || 'Failed to load recently used IGT serials';
      console.error('Recently used IGT error:', error);
    } finally {
      this.recentlyUsedIgt.loading = false;
    }
  }

  isCurrentlySelected(serialNumber: string, type: 'eyefi' | 'ul' | 'igt'): boolean {
    switch (type) {
      case 'eyefi':
        return this.currentlySelectedEyefi.includes(serialNumber);
      case 'ul':
        return this.currentlySelectedUl.includes(serialNumber);
      case 'igt':
        return this.currentlySelectedIgt.includes(serialNumber);
      default:
        return false;
    }
  }

  onLimitChange() {
    this.loadAllSequences();
  }

  toggleAutoRefresh() {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    
    if (this.autoRefreshEnabled) {
      this.refreshInterval = setInterval(() => {
        this.loadAllSequences();
      }, 5000); // Refresh every 5 seconds
    } else {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
      }
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text);
    });
  }

  copyRawResponse(sequence: SequenceData) {
    const jsonString = JSON.stringify(sequence.rawResponse, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      console.log('Raw response copied to clipboard');
    });
  }

  dismiss() {
    this.ngbActiveModal.dismiss('dismiss');
  }

  close() {
    this.ngbActiveModal.close();
  }
}
