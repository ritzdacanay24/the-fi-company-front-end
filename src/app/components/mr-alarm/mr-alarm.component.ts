import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { from } from 'rxjs';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';

@Component({
  standalone: true,
  selector: 'app-mr-alarm',
  imports: [CommonModule],
  template: `` // No visible UI — background poller only
})
export class MrAlarmComponent implements OnInit, OnDestroy {

  pendingPickingCount = 0;
  pendingValidationCount = 0;
  alarmActive = false;

  private pollSub: Subscription | null = null;
  private alarmAudio: HTMLAudioElement | null = null;
  private dismissed = false;
  private prevPickingCount = -1;
  private prevValidationCount = -1;

  constructor(private mrService: MaterialRequestService) {}

  ngOnInit(): void {
    this.pollSub = interval(30000).pipe(
      startWith(0),
      switchMap(() => from(
        Promise.all([
          this.mrService.getPicking(),
          this.mrService.getValidation()
        ])
      ))
    ).subscribe({
      next: ([picking, validation]: [any, any]) => {
        const pickCount = (Array.isArray(picking) ? picking : picking?.result)?.length ?? 0;
        const valCount = (Array.isArray(validation) ? validation : validation?.result)?.length ?? 0;
        const total = pickCount + valCount;
        const prevTotal = Math.max(0, this.prevPickingCount) + Math.max(0, this.prevValidationCount);
        const isFirst = this.prevPickingCount === -1;

        this.pendingPickingCount = pickCount;
        this.pendingValidationCount = valCount;

        if (total === 0) {
          // Queue cleared — stop alarm and reset dismiss state
          this.stopAlarm();
          this.dismissed = false;
          this.alarmActive = false;
        } else if (isFirst && total > 0) {
          // Items exist on first poll
          this.triggerAlarm();
        } else if (!isFirst && total > prevTotal) {
          // New items arrived — re-alarm regardless of previous dismiss
          this.dismissed = false;
          this.triggerAlarm();
        }

        this.prevPickingCount = pickCount;
        this.prevValidationCount = valCount;
      },
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.stopAlarm();
  }

  dismissAlarm(): void {
    this.dismissed = true;
    this.alarmActive = false;
    this.stopAlarm();
  }

  private triggerAlarm(): void {
    if (this.dismissed) return;
    this.alarmActive = true;
    if (!this.alarmAudio) {
      this.alarmAudio = new Audio('assets/sounds/mixkit-alert-alarm-1005 (1).wav');
      this.alarmAudio.loop = true;
    }
    this.alarmAudio.play().catch(() => {});
  }

  private stopAlarm(): void {
    if (this.alarmAudio) {
      this.alarmAudio.pause();
      this.alarmAudio.currentTime = 0;
      this.alarmAudio = null;
    }
  }
}
