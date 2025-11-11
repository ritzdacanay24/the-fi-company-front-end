import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-task-description',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-description.component.html',
  styleUrls: ['./task-description.component.scss']
})
export class TaskDescriptionComponent {
  @Input() progress: any;
  @Input() currentItemIndex: number = 1;
  @Input() totalItemsCount: number = 1;

  getCompletionPercentage(): number {
    if (this.totalItemsCount === 0) return 0;
    return (this.currentItemIndex / this.totalItemsCount) * 100;
  }
}
