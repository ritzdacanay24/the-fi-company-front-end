import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ScheduledJobRow } from '@app/core/api/scheduled-jobs/scheduled-jobs.service';

@Component({
  selector: 'app-edit-cron-job-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-cron-job-modal.component.html',
  styleUrls: ['./edit-cron-job-modal.component.scss']
})
export class EditCronJobModalComponent implements OnInit {
  form!: FormGroup;
  job?: ScheduledJobRow;
  isSubmitting = false;

  readonly cronHelpText = `Cron format: minute hour day month weekday
    Examples:
    - 0 9 * * 1-5  (Every weekday at 9:00 AM)
    - 0 */4 * * *   (Every 4 hours)
    - 0 0 * * 0     (Every Sunday at midnight)
    - 30 2 15 * *   (15th of month at 2:30 AM)`;

  constructor(
    private readonly fb: FormBuilder,
    public readonly activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      cron: ['', [Validators.required, this.cronValidator()]],
      active: [true],
      note: ['']
    });

    if (this.job) {
      this.form.patchValue({
        cron: this.job.cron,
        active: this.job.active,
        note: this.job.note || ''
      });
    }
  }

  private cronValidator() {
    return (control: any) => {
      if (!control.value) {
        return null;
      }

      const cronParts = control.value.trim().split(/\s+/);
      
      // Standard cron has 5 parts (minute hour day month weekday)
      // Extended cron has 6 parts (second minute hour day month weekday)
      if (cronParts.length !== 5 && cronParts.length !== 6) {
        return { invalidCron: 'Cron expression must have 5 or 6 space-separated parts' };
      }

      // Basic validation: check if parts are numbers, *, ranges, or lists
      const cronRegex = /^(\d+|\*|,|-|\/)+$/;
      for (let i = 0; i < cronParts.length; i++) {
        if (!cronRegex.test(cronParts[i])) {
          const partNames = ['minute', 'hour', 'day', 'month', 'weekday'];
          return { invalidCron: `Invalid ${partNames[i]}: ${cronParts[i]}` };
        }
      }

      return null;
    };
  }

  get cronControl() {
    return this.form.get('cron');
  }

  get isCronInvalid(): boolean {
    return !!(this.cronControl && this.cronControl.invalid && (this.cronControl.dirty || this.cronControl.touched));
  }

  get cronErrorMessage(): string {
    const errors = this.cronControl?.errors;
    if (errors?.['required']) {
      return 'Cron expression is required';
    }
    if (errors?.['invalidCron']) {
      return errors['invalidCron'];
    }
    return 'Invalid cron expression';
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.markAllFieldsTouched();
      return;
    }

    this.isSubmitting = true;
    try {
      const result = {
        cron: this.form.value.cron,
        active: this.form.value.active,
        note: this.form.value.note
      };
      this.activeModal.close(result);
    } finally {
      this.isSubmitting = false;
    }
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }

  private markAllFieldsTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });
  }
}
