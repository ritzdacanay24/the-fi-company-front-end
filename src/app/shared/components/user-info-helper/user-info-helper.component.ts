import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-user-info-helper',
  template: `
    <div class="card shadow-sm border-0 mb-3" *ngIf="savedUser">
      <div class="card-header bg-light">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="mdi mdi-account-check me-2 text-success"></i>
            Use Saved Information
          </h6>
          <button class="btn btn-sm btn-success" (click)="useSavedInfo.emit(savedUser)">
            <i class="mdi mdi-check"></i> Use
          </button>
        </div>
      </div>
      <div class="card-body p-3">
        <div class="row">
          <div class="col-md-6">
            <strong>{{savedUser.first_name}} {{savedUser.last_name}}</strong><br>
            <small class="text-muted">{{savedUser.email}}</small>
          </div>
          <div class="col-md-6">
            <small class="text-muted">{{savedUser.company}}</small><br>
            <small class="text-muted">{{savedUser.phone}}</small>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UserInfoHelperComponent {
  @Input() savedUser: any;
  @Output() useSavedInfo = new EventEmitter<any>();
}
