import { Injectable } from '@angular/core';
import { WebsocketService } from '@app/core/services/websocket.service';
import { BehaviorSubject, Observable, filter, map } from 'rxjs';

// WebSocket message type constants
const SERIAL_NUMBER_SELECTED = "SERIAL_NUMBER_SELECTED";
const SERIAL_NUMBER_RELEASED = "SERIAL_NUMBER_RELEASED";
const SERIAL_NUMBER_USED = "SERIAL_NUMBER_USED";

export interface SerialNumberWithStatus {
  serial_number: string; // Keep original property name for template compatibility
  serialNumber: string; // Also keep camelCase for consistency
  category?: string; // Preserve category for display
  isAvailable: boolean;
  selectedBy?: string; // User name who selected it
  selectedByUserId?: string; // User ID who selected it
  // Include any other original properties that might exist
  [key: string]: any;
}

export interface SerialNumberUpdateMessage {
  message: string;
  type: string;
  data: {
    action: 'selected' | 'released' | 'used';
    serialNumber: string;
    userId: string;
    userName?: string;
    sessionId?: string; // Add session ID to distinguish browser sessions
    category?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RealTimeSerialNumberService {
  
  private availableSerialNumbers$ = new BehaviorSubject<SerialNumberWithStatus[]>([]);
  private currentlySelected: string = '';
  private currentUserId: string = '';
  private sessionId: string = '';

  constructor(private websocketService: WebsocketService) {
    // Generate unique session ID
    this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    console.log('Initialized RealTimeSerialNumberService with session ID:', this.sessionId);

    // Connect to WebSocket if not already connected
    if (!this.websocketService.getWebSocket()) {
      this.websocketService.connect();
    }

    // Subscribe to WebSocket messages for serial number updates
    const webSocket = this.websocketService.getWebSocket();
    if (webSocket) {
      webSocket.pipe(
        filter((message: any) => 
          message && 
          message.type && 
          [SERIAL_NUMBER_SELECTED, SERIAL_NUMBER_RELEASED, SERIAL_NUMBER_USED].includes(message.type)
        ),
        map((message: any) => message as SerialNumberUpdateMessage)
      ).subscribe({
        next: (message) => this.handleSerialNumberUpdate(message),
        error: (error) => console.error('Error handling serial number WebSocket message:', error)
      });
    }
  }

  /**
   * Set the available serial numbers (from initial load)
   */
  setAvailableSerialNumbers(serialNumbers: any[]) {
    // Convert to SerialNumberWithStatus objects
    const serialNumbersWithStatus: SerialNumberWithStatus[] = serialNumbers.map(serial => ({
      ...serial, // Spread original properties to preserve all data
      serial_number: typeof serial === 'string' ? serial : serial.serial_number || serial.serialNumber,
      serialNumber: typeof serial === 'string' ? serial : serial.serial_number || serial.serialNumber,
      isAvailable: true,
      selectedBy: undefined,
      selectedByUserId: undefined
    }));
    this.availableSerialNumbers$.next(serialNumbersWithStatus);
  }

  /**
   * Get observable of available serial numbers
   */
  getAvailableSerialNumbers(): Observable<SerialNumberWithStatus[]> {
    return this.availableSerialNumbers$.asObservable();
  }

  /**
   * Notify that a serial number has been selected
   */
  selectSerialNumber(serialNumber: string, userId: string, userName?: string) {
    const message = {
      message: `Serial number ${serialNumber} selected`,
      type: SERIAL_NUMBER_SELECTED,
      data: {
        action: 'selected' as const,
        serialNumber,
        userId,
        userName,
        sessionId: this.sessionId
      }
    };

    console.log('Sending serial number selection:', message);
    this.websocketService.next(message);
    
    // Update local state immediately - mark as selected
    // This is important for the same session since we ignore our own WebSocket messages
    this.markSerialNumberAsSelected(serialNumber, userId, userName);
    
    // Track our current selection
    this.currentlySelected = serialNumber;
  }

  /**
   * Notify that a serial number has been released
   */
  releaseSerialNumber(serialNumber: string, userId: string) {
    const message = {
      message: `Serial number ${serialNumber} released`,
      type: SERIAL_NUMBER_RELEASED,
      data: {
        action: 'released' as const,
        serialNumber,
        userId,
        sessionId: this.sessionId
      }
    };

    console.log('Sending serial number release:', message);
    this.websocketService.next(message);
    
    // Update local state immediately - mark as available
    // This is important for the same session since we ignore our own WebSocket messages
    this.markSerialNumberAsAvailable(serialNumber);
    
    // Clear our current selection if it matches
    if (this.currentlySelected === serialNumber) {
      this.currentlySelected = '';
    }
  }

  /**
   * Notify that a serial number has been permanently used
   */
  useSerialNumber(serialNumber: string, userId: string) {
    const message = {
      message: `Serial number ${serialNumber} permanently used`,
      type: SERIAL_NUMBER_USED,
      data: {
        action: 'used' as const,
        serialNumber,
        userId,
        sessionId: this.sessionId
      }
    };

    console.log('Sending serial number permanent use:', message);
    this.websocketService.next(message);
    
    // Update local state immediately - remove from available list
    // This is important for the same session since we ignore our own WebSocket messages
    this.removeSerialNumberFromAvailable(serialNumber);
    
    // Clear our current selection if it matches (since it's now permanently used)
    if (this.currentlySelected === serialNumber) {
      this.currentlySelected = '';
    }
  }

  /**
   * Handle incoming WebSocket messages about serial number updates
   */
  private handleSerialNumberUpdate(message: SerialNumberUpdateMessage) {
    console.log('Received serial number update:', message);
    console.log('Current session ID:', this.sessionId, 'Message session ID:', message.data.sessionId);
    console.log('Current user ID:', this.currentUserId, 'Message user ID:', message.data.userId);
    
    // Only ignore messages from the same browser session (not same user)
    if (message.data.sessionId === this.sessionId) {
      console.log('Ignoring own message - same browser session');
      return;
    }

    console.log('Processing message from different session - proceeding with update');

    switch (message.data.action) {
      case 'selected':
        // Mark as selected instead of removing
        this.markSerialNumberAsSelected(
          message.data.serialNumber, 
          message.data.userId, 
          message.data.userName
        );
        break;
        
      case 'used':
        // Remove from available list (permanently consumed)
        this.removeSerialNumberFromAvailable(message.data.serialNumber);
        break;
        
      case 'released':
        // Mark as available again
        this.markSerialNumberAsAvailable(message.data.serialNumber);
        break;
    }
  }

  /**
   * Mark a serial number as selected by a user
   */
  private markSerialNumberAsSelected(serialNumber: string, userId: string, userName?: string) {
    const currentSerials = this.availableSerialNumbers$.value;
    const updatedSerials = currentSerials.map(serial => 
      serial.serialNumber === serialNumber 
        ? { ...serial, isAvailable: false, selectedBy: userName || 'Unknown User', selectedByUserId: userId }
        : serial
    );
    console.log(`Marking serial ${serialNumber} as selected by ${userName || userId}`);
    this.availableSerialNumbers$.next(updatedSerials);
  }

  /**
   * Mark a serial number as available again
   */
  private markSerialNumberAsAvailable(serialNumber: string) {
    const currentSerials = this.availableSerialNumbers$.value;
    const updatedSerials = currentSerials.map(serial => 
      serial.serialNumber === serialNumber 
        ? { ...serial, isAvailable: true, selectedBy: undefined, selectedByUserId: undefined }
        : serial
    );
    console.log(`Marking serial ${serialNumber} as available again`);
    this.availableSerialNumbers$.next(updatedSerials);
  }

  /**
   * Remove a serial number from the available list (permanently consumed)
   */
  private removeSerialNumberFromAvailable(serialNumber: string) {
    const currentSerials = this.availableSerialNumbers$.value;
    const updatedSerials = currentSerials.filter(
      serial => serial.serialNumber !== serialNumber
    );
    console.log(`Removing serial ${serialNumber} from available list. Before: ${currentSerials.length}, After: ${updatedSerials.length}`);
    this.availableSerialNumbers$.next(updatedSerials);
  }

  /**
   * Set current user ID to filter out own messages
   */
  setCurrentUserId(userId: string) {
    console.log('Setting current user ID to:', userId, 'Type:', typeof userId);
    this.currentUserId = userId;
  }

  /**
   * Get currently selected serial number
   */
  getCurrentlySelected(): string {
    return this.currentlySelected;
  }

  /**
   * Clean up and release current selection when component is destroyed
   */
  cleanup() {
    if (this.currentlySelected && this.currentUserId) {
      console.log('Cleaning up - releasing currently selected serial:', this.currentlySelected);
      this.releaseSerialNumber(this.currentlySelected, this.currentUserId);
    }
  }
}
