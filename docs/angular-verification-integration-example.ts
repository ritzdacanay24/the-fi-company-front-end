/**
 * Example Angular Component Integration
 * Add these methods to your existing serial-assignments component
 */

import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

interface VerificationSession {
  id: string;
  assignment_id: number;
  expected_serial: string;
  qr_data: string;
  expires_at: string;
}

interface VerificationResult {
  session_id: string;
  expected_serial: string;
  captured_serial: string;
  match_result: 'match' | 'mismatch' | 'pending';
  is_match: boolean;
  photo_path: string;
}

export class SerialAssignmentsComponent {
  
  // Verification state
  currentVerificationSession: VerificationSession | null = null;
  verificationStatus: 'idle' | 'active' | 'verified' | 'failed' = 'idle';
  verificationPolling: Subscription | null = null;
  verificationResult: VerificationResult | null = null;
  showVerificationModal = false;

  constructor(private http: HttpClient) {}

  /**
   * Start verification process for a serial assignment
   */
  async startSerialVerification(assignmentId: number, expectedSerial: string) {
    try {
      const response: any = await this.http.post(
        '/backend/api/verification-session/create-session.php',
        {
          assignment_id: assignmentId,
          expected_serial: expectedSerial,
          created_by: this.getCurrentUsername()
        }
      ).toPromise();

      if (response.success) {
        this.currentVerificationSession = response.session;
        this.verificationStatus = 'active';
        this.showVerificationModal = true;
        
        // Start polling for verification updates
        this.startVerificationPolling();
        
        console.log('Verification session created:', response.session.id);
      } else {
        alert('Failed to create verification session: ' + response.error);
      }
    } catch (error) {
      console.error('Error creating verification session:', error);
      alert('Error starting verification. Please try again.');
    }
  }

  /**
   * Poll for verification updates every second
   */
  private startVerificationPolling() {
    if (!this.currentVerificationSession) return;

    const sessionId = this.currentVerificationSession.id;
    
    // Poll every 1 second, stop after 5 minutes (300 polls)
    let pollCount = 0;
    this.verificationPolling = interval(1000)
      .pipe(
        takeWhile(() => 
          this.verificationStatus === 'active' && 
          pollCount < 300
        )
      )
      .subscribe(async () => {
        pollCount++;
        await this.checkVerificationStatus(sessionId);
      });
  }

  /**
   * Check if verification is complete
   */
  private async checkVerificationStatus(sessionId: string) {
    try {
      const response: any = await this.http.get(
        `/backend/api/verification-session/get-session.php?session_id=${sessionId}`
      ).toPromise();

      if (response.success) {
        const session = response.session;
        
        // Check if verification complete
        if (session.match_result !== 'pending') {
          this.onVerificationComplete(session);
        }

        // Check if session expired
        if (response.is_expired) {
          this.onVerificationExpired();
        }
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  }

  /**
   * Handle verification completion
   */
  private onVerificationComplete(session: any) {
    // Stop polling
    if (this.verificationPolling) {
      this.verificationPolling.unsubscribe();
      this.verificationPolling = null;
    }

    // Update status
    const isMatch = session.match_result === 'match';
    this.verificationStatus = isMatch ? 'verified' : 'failed';
    
    this.verificationResult = {
      session_id: session.id,
      expected_serial: session.expected_serial,
      captured_serial: session.captured_serial,
      match_result: session.match_result,
      is_match: isMatch,
      photo_path: session.photo_path
    };

    // Play sound feedback
    this.playVerificationSound(isMatch);

    // Show notification
    if (isMatch) {
      this.showSuccessNotification('Serial verified successfully! ✅');
      
      // Refresh assignment list to show verified status
      this.refreshAssignments();
    } else {
      this.showErrorNotification(
        `Serial mismatch! Expected ${session.expected_serial}, got ${session.captured_serial}`
      );
    }
  }

  /**
   * Handle session expiration
   */
  private onVerificationExpired() {
    if (this.verificationPolling) {
      this.verificationPolling.unsubscribe();
      this.verificationPolling = null;
    }

    this.verificationStatus = 'idle';
    alert('Verification session expired. Please start a new verification.');
    this.closeVerificationModal();
  }

  /**
   * Close verification modal
   */
  closeVerificationModal() {
    if (this.verificationPolling) {
      this.verificationPolling.unsubscribe();
      this.verificationPolling = null;
    }

    this.showVerificationModal = false;
    this.currentVerificationSession = null;
    this.verificationStatus = 'idle';
    this.verificationResult = null;
  }

  /**
   * Get QR code data for display
   */
  getQRCodeData(): string {
    return this.currentVerificationSession?.qr_data || '';
  }

  /**
   * Get tablet companion URL
   */
  getTabletCompanionUrl(): string {
    return `${window.location.origin}/backend/tablet-companion.html`;
  }

  /**
   * Copy session ID to clipboard
   */
  copySessionId() {
    if (!this.currentVerificationSession) return;
    
    navigator.clipboard.writeText(this.currentVerificationSession.id);
    this.showSuccessNotification('Session ID copied to clipboard!');
  }

  /**
   * Play sound feedback
   */
  private playVerificationSound(isSuccess: boolean) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = isSuccess ? 800 : 400;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  /**
   * Check if assignment requires verification
   */
  requiresVerification(assignment: any): boolean {
    // Rule 1: High-value customers (IGT, ATI)
    const highValueCustomers = ['IGT', 'ATI', 'Aristocrat'];
    if (highValueCustomers.includes(assignment.customer_name)) {
      return true;
    }

    // Rule 2: Work orders over $10,000
    if (assignment.wo_value && assignment.wo_value > 10000) {
      return true;
    }

    // Rule 3: New employees (first 30 days)
    const userStartDate = this.getUserStartDate(assignment.assigned_by);
    if (userStartDate) {
      const daysEmployed = Math.floor(
        (Date.now() - userStartDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysEmployed < 30) {
        return true;
      }
    }

    // Rule 4: Random sampling (20% of assignments)
    if (Math.random() < 0.20) {
      return true;
    }

    return false;
  }

  /**
   * Bulk verify multiple assignments
   */
  async bulkVerifyAssignments(assignments: any[]) {
    for (const assignment of assignments) {
      if (this.requiresVerification(assignment)) {
        await this.startSerialVerification(
          assignment.id,
          assignment.eyefi_serial_number
        );
        
        // Wait for verification to complete before next
        await this.waitForVerification();
      }
    }
  }

  /**
   * Wait for current verification to complete
   */
  private waitForVerification(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.verificationStatus !== 'active') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });
  }

  // Helper methods (implement based on your app structure)
  private getCurrentUsername(): string {
    // Return current logged-in user
    return 'current_user';
  }

  private getUserStartDate(username: string): Date | null {
    // Return user's employment start date
    return null;
  }

  private refreshAssignments() {
    // Reload assignments list
  }

  private showSuccessNotification(message: string) {
    // Show success toast/notification
    console.log('✅ Success:', message);
  }

  private showErrorNotification(message: string) {
    // Show error toast/notification
    console.log('❌ Error:', message);
  }
}
