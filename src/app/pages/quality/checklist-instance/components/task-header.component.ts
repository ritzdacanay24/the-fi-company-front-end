import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-task-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card mb-4 shadow-sm border-0">
      <div class="card-body p-4">
        <div class="d-flex align-items-start">
          <!-- Task Number Badge -->
          <div class="me-3">
            <div class="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm" 
                 style="width: 48px; height: 48px; font-size: 1.1rem;"
                 [class]="completed ? 'bg-success' : 
                          isRequired && !completed ? 'bg-primary' : 'bg-secondary'">
              {{currentIndex}}
            </div>
          </div>
          
          <!-- Task Content -->
          <div class="flex-grow-1">
            <div class="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between mb-3">
              <div>
                <h5 class="mb-2 text-dark fw-bold">{{title}}</h5>
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <span class="badge bg-light text-dark px-3 py-2 rounded-pill">
                    Task {{currentIndex}} of {{totalItems}}
                  </span>
                  <span class="badge bg-danger px-3 py-2 rounded-pill" *ngIf="isRequired">
                    Required
                  </span>
                  <span class="badge bg-success px-3 py-2 rounded-pill" *ngIf="completed">
                    <i class="mdi mdi-check me-1"></i>Completed
                  </span>
                </div>
              </div>
              
              <!-- Overall Progress -->
              <div class="mt-3 mt-lg-0">
                <div class="progress" style="width: 200px; height: 8px;">
                  <div class="progress-bar bg-primary" 
                       [style.width.%]="(currentIndex / totalItems) * 100"
                       role="progressbar"></div>
                </div>
                <small class="text-muted d-block text-center mt-1">
                  {{(currentIndex / totalItems * 100) | number:'1.0-0'}}% Complete
                </small>
              </div>
            </div>
            
            <!-- Task Description -->
            <p class="text-muted mb-0" *ngIf="description">
              <i class="mdi mdi-information-outline me-2"></i>
              {{description}}
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TaskHeaderComponent {
  @Input() title!: string;
  @Input() description?: string;
  @Input() currentIndex!: number;
  @Input() totalItems!: number;
  @Input() isRequired: boolean = false;
  @Input() completed: boolean = false;
}
