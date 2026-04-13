import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checklist-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checklist-header.component.html',
  styleUrls: ['./checklist-header.component.scss']
})
export class ChecklistHeaderComponent {
  @Input() template: any;
  @Input() instance: any;
  @Input() completedItemsCount: number = 0;
  @Input() totalItemsCount: number = 0;
  
  @Output() goBackClicked = new EventEmitter<void>();

  onGoBack() {
    this.goBackClicked.emit();
  }

  getCompletionPercentage(): number {
    if (this.totalItemsCount === 0) return 0;
    return (this.completedItemsCount / this.totalItemsCount) * 100;
  }
}
