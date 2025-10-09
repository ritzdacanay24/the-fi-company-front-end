import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MockToggleService {
  private useMockDataSubject = new BehaviorSubject<boolean>(true); // Start with mock data enabled
  public useMockData$ = this.useMockDataSubject.asObservable();

  constructor() {
    // Check if mock mode is stored in localStorage
    const storedMockMode = localStorage.getItem('serial-number-management-mock-mode');
    if (storedMockMode !== null) {
      this.useMockDataSubject.next(storedMockMode === 'true');
    }
  }

  toggleMockData(): void {
    const newValue = !this.useMockDataSubject.value;
    this.useMockDataSubject.next(newValue);
    localStorage.setItem('serial-number-management-mock-mode', newValue.toString());
  }

  setMockData(useMock: boolean): void {
    this.useMockDataSubject.next(useMock);
    localStorage.setItem('serial-number-management-mock-mode', useMock.toString());
  }

  get currentValue(): boolean {
    return this.useMockDataSubject.value;
  }
}