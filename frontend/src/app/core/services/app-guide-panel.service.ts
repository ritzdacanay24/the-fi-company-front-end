import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppGuideData } from './app-guide.service';

export interface AppGuidePanelState {
  isOpen: boolean;
  data: AppGuideData | null;
  modeLabel: string;
}

@Injectable({ providedIn: 'root' })
export class AppGuidePanelService {
  private readonly stateSubject = new BehaviorSubject<AppGuidePanelState>({
    isOpen: false,
    data: null,
    modeLabel: '',
  });

  readonly state$ = this.stateSubject.asObservable();

  open(data: AppGuideData, modeLabel: string): void {
    this.stateSubject.next({
      isOpen: true,
      data,
      modeLabel,
    });
  }

  close(): void {
    this.stateSubject.next({
      isOpen: false,
      data: null,
      modeLabel: '',
    });
  }
}