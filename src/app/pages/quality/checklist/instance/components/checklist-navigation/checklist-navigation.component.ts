import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checklist-navigation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checklist-navigation.component.html',
  styleUrls: ['./checklist-navigation.component.scss']
})
export class ChecklistNavigationComponent {
  @Input() currentItemIndex: number = 1;
  @Input() totalItemsCount: number = 1;
  @Input() isFirstItem: boolean = false;
  @Input() isLastItem: boolean = false;
  @Input() isReviewMode: boolean = false;
  @Input() completedItemsCount: number = 0;
  @Input() instance: any;
  @Input() saving: boolean = false;
  @Input() requiredCompletionStatus: any;
  
  @Output() previousItem = new EventEmitter<void>();
  @Output() nextItem = new EventEmitter<void>();
  @Output() toggleReviewMode = new EventEmitter<void>();
  @Output() saveProgress = new EventEmitter<void>();
  @Output() submitChecklist = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();

  onPreviousItem() {
    this.previousItem.emit();
  }

  onNextItem() {
    this.nextItem.emit();
  }

  onToggleReviewMode() {
    this.toggleReviewMode.emit();
  }

  onSaveProgress() {
    this.saveProgress.emit();
  }

  onSubmitChecklist() {
    this.submitChecklist.emit();
  }

  onGoBack() {
    this.goBack.emit();
  }

  getCompletionPercentage(): number {
    if (this.totalItemsCount === 0) return 0;
    return (this.currentItemIndex / this.totalItemsCount) * 100;
  }

  isSubmitReady(): boolean {
    return this.requiredCompletionStatus?.completed === this.requiredCompletionStatus?.total;
  }

  isCompleted(): boolean {
    return this.instance?.status === 'completed' || this.instance?.status === 'submitted';
  }
}
