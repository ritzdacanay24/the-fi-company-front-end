import {
  Component,
  ElementRef,
  Input,
  OnInit,
  Pipe,
  PipeTransform,
  ViewChild,
} from "@angular/core";
import { WorkOrderService } from "@app/core/api/field-service/work-order.service";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SignaturePad, SignaturePadModule } from "angular2-signaturepad";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { DomSanitizer } from "@angular/platform-browser";

@Pipe({ name: "safe", standalone: true })
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(url) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

@Injectable({
  providedIn: "root",
})
export class BillingService {
  constructor(public modalService: NgbModal) {}

  open(data: any) {
    const modalRef = this.modalService.open(BillingModalComponent, {
      size: "md",
      fullscreen: true,
      centered: false,
    });
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, SignaturePadModule, SafePipe],
  selector: "app-billing-modal",
  templateUrl: "./billing-modal.component.html",
})
export class BillingModalComponent implements OnInit {
  @Input() public data: any;
  @ViewChild("sharepointFrame") sharepointFrame: ElementRef;

  url: string;
  safeUrl: any;
  isLoading = true;
  hasError = false;
  errorMessage = '';
  showIframe = true;
  debugInfo: string = '';

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private api: WorkOrderService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.processUrl();
  }

  processUrl() {
    try {
      this.url = this.extractUrl(this.data);
      this.debugInfo = `Original input: ${this.data}\nExtracted URL: ${this.url}`;
      
      // Try to make the URL more iframe-friendly
      this.url = this.makeIframeFriendly(this.url);
      this.debugInfo += `\nProcessed URL: ${this.url}`;
      
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.url);

      // Start with iframe attempt
      this.showIframe = true;
      this.hasError = false;
      this.isLoading = true;

      // Very short timeout since SharePoint usually blocks immediately
      setTimeout(() => {
        if (this.isLoading) {
          this.hasError = true;
          this.isLoading = false;
          this.showIframe = false;
          this.errorMessage = 'SharePoint content cannot be embedded due to X-Frame-Options or Content Security Policy restrictions.';
        }
      }, 3000); // 3 second timeout
      
    } catch (error) {
      console.error("Error processing URL:", error);
      this.hasError = true;
      this.isLoading = false;
      this.showIframe = false;
      this.errorMessage = error.message || 'Invalid URL format';
      this.debugInfo = `Error: ${error.message}`;
    }
  }

  makeIframeFriendly(url: string): string {
    // Common SharePoint URL modifications that might help with embedding
    if (url.includes('sharepoint.com') || url.includes('.sharepoint.')) {
      // Try to add embed parameters if they don't exist
      if (!url.includes('action=embedview') && !url.includes('embed=')) {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}action=embedview&wdAr=1.7777777777777777`;
      }
      
      // Remove any conflicting parameters
      url = url.replace(/&web=1/g, '');
      url = url.replace(/\?web=1/g, '?');
    }
    
    return url;
  }

  extractUrl(text: string): string {
    if (!text) throw new Error("No URL provided");

    // Clean up the text first
    text = text.trim();

    // If it's already a direct URL
    if (text.startsWith("http")) {
      return text;
    }

    // Extract from iframe - try multiple regex patterns
    const patterns = [
      /<iframe[^>]*src=["'](.*?)["']/i,
      /src=["'](https?:\/\/[^"']*?)["']/i,
      /src=["']([^"']*?)["']/i,
      /<iframe[^>]*src=([^\s>]*)/i
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        return match[1].replace(/&amp;/g, '&'); // Decode HTML entities
      }
    }

    // Try to find any URL in the text
    const urlPattern = /(https?:\/\/[^\s<>"']+)/i;
    const urlMatch = urlPattern.exec(text);
    if (urlMatch) {
      return urlMatch[1];
    }

    throw new Error("Could not extract URL from provided content");
  }

  onFrameLoad() {
    console.log('Iframe loaded successfully');
    this.isLoading = false;
    this.hasError = false;
  }

  onFrameError(event?: any) {
    console.error('Iframe loading error:', event);
    this.isLoading = false;
    this.hasError = true;
    this.showIframe = false;
    this.errorMessage = 'Content blocked by server security policies (X-Frame-Options: DENY/SAMEORIGIN or CSP frame-ancestors).';
  }

  // Add a method to check if the URL loads in a hidden iframe first
  async testUrl(): Promise<boolean> {
    return new Promise((resolve) => {
      const testFrame = document.createElement('iframe');
      testFrame.style.position = 'absolute';
      testFrame.style.top = '-9999px';
      testFrame.style.left = '-9999px';
      testFrame.style.width = '1px';
      testFrame.style.height = '1px';
      
      const timeout = setTimeout(() => {
        document.body.removeChild(testFrame);
        resolve(false);
      }, 2000);
      
      testFrame.onload = () => {
        clearTimeout(timeout);
        document.body.removeChild(testFrame);
        resolve(true);
      };
      
      testFrame.onerror = () => {
        clearTimeout(timeout);
        document.body.removeChild(testFrame);
        resolve(false);
      };
      
      testFrame.src = this.url;
      document.body.appendChild(testFrame);
    });
  }

  async retryWithTest() {
    this.isLoading = true;
    this.hasError = false;
    this.showIframe = false;
    
    const canLoad = await this.testUrl();
    
    if (canLoad) {
      this.showIframe = true;
      this.isLoading = true;
      // Give it another chance
      setTimeout(() => {
        if (this.isLoading) {
          this.hasError = true;
          this.isLoading = false;
          this.showIframe = false;
        }
      }, 5000);
    } else {
      this.hasError = true;
      this.isLoading = false;
      this.errorMessage = 'URL test failed - content definitely cannot be embedded.';
    }
  }

  retryIframe() {
    this.retryWithTest();
  }

  refreshFrame() {
    this.retryIframe();
  }

  openInNewTab() {
    if (this.url) {
      window.open(this.url, "_blank", "noopener,noreferrer");
    }
  }

  // Try to open in a popup window with more features
  openInPopup() {
    if (this.url) {
      const popup = window.open(
        this.url, 
        'sharepoint-popup', 
        'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,location=yes'
      );
      
      if (!popup) {
        alert('Popup blocked. Please allow popups for this site and try again, or use "Open in New Tab".');
      }
    }
  }

  // Add copy to clipboard functionality
  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      console.log('URL copied to clipboard');
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback for older browsers
      this.fallbackCopyTextToClipboard(text);
    }
  }

  fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      console.log('URL copied to clipboard (fallback)');
    } catch (err) {
      console.error('Fallback copy failed: ', err);
    }

    document.body.removeChild(textArea);
  }

  close() {
    this.ngbActiveModal.close();
  }

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  // Debug method to show all the processing information
  showDebugInfo() {
    alert(`Debug Information:\n\n${this.debugInfo}\n\nFinal URL: ${this.url}`);
  }
}
