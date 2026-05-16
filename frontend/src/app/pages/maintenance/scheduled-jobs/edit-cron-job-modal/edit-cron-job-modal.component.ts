import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ScheduledJobRow } from '@app/core/api/scheduled-jobs/scheduled-jobs.service';
import { Subscription } from 'rxjs';

interface CronPreset {
  value: string;
  label: string;
}

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
  selectedPreset = '__custom__';

  readonly cronPresets: CronPreset[] = [
    { value: '0 */15 * * * *', label: 'Every 15 minutes' },
    { value: '0 */30 * * * *', label: 'Every 30 minutes' },
    { value: '0 0 * * * *', label: 'Every hour' },
    { value: '0 0 */2 * * *', label: 'Every 2 hours' },
    { value: '0 0 0 * * *', label: 'Daily at 12:00 AM' },
    { value: '0 0 6 * * *', label: 'Daily at 6:00 AM' },
    { value: '0 0 8 * * *', label: 'Daily at 8:00 AM' },
    { value: '0 0 6 * * 1-5', label: 'Weekdays at 6:00 AM' },
    { value: '0 0 8 * * 1-5', label: 'Weekdays at 8:00 AM' },
    { value: '0 0 4 * * 1-5', label: 'Weekdays at 4:00 AM' },
    { value: '0 0 17 * * 1-5', label: 'Weekdays at 5:00 PM' },
    { value: '0 0 4,17 * * 1-5', label: 'Weekdays at 4:00 AM and 5:00 PM' },
    { value: '0 0 9 * * 1-5', label: 'Weekdays at 9:00 AM' },
    { value: '0 0 6 * * 1', label: 'Mondays at 6:00 AM' },
    { value: '0 0 2 1 * *', label: 'First day of month at 2:00 AM' },
    { value: '0 0 0 * * 0', label: 'Sundays at 12:00 AM' },
  ];

  private cronValueSub?: Subscription;

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

    this.cronValueSub = this.cronControl?.valueChanges.subscribe((value: string) => {
      this.selectedPreset = this.findPresetForCron(value) ?? '__custom__';
    });
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
      this.selectedPreset = this.findPresetForCron(this.job.cron) ?? '__custom__';
    }
  }

  onPresetChange(value: string): void {
    this.selectedPreset = value;
    if (value === '__custom__') {
      return;
    }

    this.cronControl?.setValue(value);
    this.cronControl?.markAsDirty();
    this.cronControl?.markAsTouched();
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

  ngOnDestroy(): void {
    this.cronValueSub?.unsubscribe();
  }

  private markAllFieldsTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });
  }

  private findPresetForCron(value: string | null | undefined): string | null {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return null;
    }

    const match = this.cronPresets.find((preset) => preset.value === normalized);
    return match?.value ?? null;
  }
}
