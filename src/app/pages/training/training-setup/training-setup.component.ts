import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { TrainingService } from '../services/training.service';
import { TrainingTemplateService } from '../services/training-template.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { 
  Employee, 
  CreateTrainingSessionRequest,
  TrainingSession,
  TrainingTemplate,
  TrainingTemplateCategory
} from '../models/training.model';

@Component({
  selector: 'app-training-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './training-setup.component.html',
  styleUrls: ['./training-setup.component.scss']
})
export class TrainingSetupComponent implements OnInit, OnDestroy {
  
  trainingForm: FormGroup;
  isLoading = false;
  isSaving = false;
  
  // Edit mode
  isEditMode = false;
  sessionId: number | null = null;
  existingSession: TrainingSession | null = null;
  
  // Employee management
  allEmployees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  selectedEmployees: Employee[] = [];
  employeeSearchTerm = '';
  showEmployeeDropdown = false;
  
  // Template management
  availableTemplates: TrainingTemplate[] = [];
  templateCategories: TrainingTemplateCategory[] = [];
  selectedTemplate: TrainingTemplate | null = null;
  
  // Form state
  showSuccessMessage = false;
  showErrorMessage = false;
  messageText = '';
  createdSession: TrainingSession | null = null;
  
  private searchSubscription?: Subscription;
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private trainingService: TrainingService,
    private templateService: TrainingTemplateService,
    private authService: AuthenticationService
  ) {
    this.trainingForm = this.createForm();
  }

  ngOnInit(): void {
    // Check if we're in edit mode
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.sessionId = Number(id);
      this.loadExistingSession();
    } else {
      this.setDefaultValues();
      
      // Check for template ID passed via query parameters
      const templateId = this.route.snapshot.queryParamMap.get('templateId');
      if (templateId) {
        this.loadAndUseTemplate(Number(templateId));
      }
    }
    
    this.loadEmployees();
    this.setupEmployeeSearch();
    
    // Load templates for new sessions
    if (!this.isEditMode) {
      this.loadTemplates();
    }
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      purpose: ['', [Validators.required]],
      date: ['', [Validators.required]],
      startTime: ['', [Validators.required]],
      endTime: ['', [Validators.required]],
      location: ['', [Validators.required]],
      facilitatorName: [this.getCurrentUserName(), [Validators.required]]
    });
  }

  private getCurrentUserName(): string {
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      // Try different possible user name fields
      if (currentUser.firstName && currentUser.lastName) {
        return `${currentUser.firstName} ${currentUser.lastName}`;
      }
      if (currentUser.first_name && currentUser.last_name) {
        return `${currentUser.first_name} ${currentUser.last_name}`;
      }
      if (currentUser.username) {
        return currentUser.username;
      }
      if (currentUser.email) {
        return currentUser.email;
      }
      if (currentUser.name) {
        return currentUser.name;
      }
    }
    return ''; // Fallback to empty string if no user data available
  }

  private setDefaultValues(): void {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    this.trainingForm.patchValue({ date: today });
    
    // Set default times
    this.trainingForm.patchValue({ 
      startTime: '09:00',
      endTime: '11:00'
    });
  }

  private loadEmployees(): void {
    this.isLoading = true;
    this.trainingService.getAllEmployees().subscribe({
      next: (employees) => {
        this.allEmployees = employees.sort((a, b) => 
          `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`)
        );
        this.filteredEmployees = [...this.allEmployees];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.showMessage('Error loading employee list', 'error');
        this.isLoading = false;
      }
    });
  }

  private loadExistingSession(): void {
    if (!this.sessionId) return;
    
    this.isLoading = true;
    this.trainingService.getTrainingSession(this.sessionId).subscribe({
      next: (rawSession) => {
        console.log('Raw session data from backend:', rawSession);
        const session = this.mapTrainingSessionData(rawSession);
        console.log('Mapped session data:', session);
        this.existingSession = session;
        this.populateFormWithSession(session);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading session:', error);
        this.showMessage('Error loading session data', 'error');
        this.isLoading = false;
        // Navigate back if session not found
        this.router.navigate(['/training/manage']);
      }
    });
  }

  private mapTrainingSessionData(rawData: any): TrainingSession {
    // Map snake_case backend fields to camelCase frontend fields
    return {
      id: rawData.id,
      title: rawData.title,
      description: rawData.description,
      purpose: rawData.purpose,
      date: rawData.date,
      startTime: rawData.start_time || rawData.startTime,
      endTime: rawData.end_time || rawData.endTime,
      duration: rawData.duration,
      durationMinutes: rawData.duration_minutes || rawData.durationMinutes || 0,
      location: rawData.location,
      facilitatorName: rawData.facilitator_name || rawData.facilitatorName,
      facilitatorSignature: rawData.facilitator_signature || rawData.facilitatorSignature,
      status: rawData.status,
      createdBy: rawData.created_by || rawData.createdBy,
      createdDate: rawData.created_date || rawData.createdDate,
      expectedAttendees: rawData.expectedAttendees || rawData.expected_attendees || [],
      actualAttendees: rawData.actualAttendees || rawData.actual_attendees || []
    };
  }

  private populateFormWithSession(session: TrainingSession): void {
    console.log('Populating form with session data:', session);
    console.log('StartTime:', session.startTime, 'EndTime:', session.endTime, 'Facilitator:', session.facilitatorName);
    
    this.trainingForm.patchValue({
      title: session.title,
      description: session.description,
      purpose: session.purpose,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      location: session.location,
      facilitatorName: session.facilitatorName
    });
    
    console.log('Form values after patching:', this.trainingForm.value);
    
    // Load selected employees if available
    if (session.expectedAttendees && session.expectedAttendees.length > 0) {
      this.selectedEmployees = session.expectedAttendees.map(attendee => attendee.employee);
    }
  }

  private setupEmployeeSearch(): void {
    // This would typically be set up with a search form control, 
    // but for simplicity, we'll handle it manually
  }

  // Employee Selection Methods
  onEmployeeSearch(term: string): void {
    this.employeeSearchTerm = term;
    if (term.length === 0) {
      this.filteredEmployees = [...this.allEmployees];
      this.showEmployeeDropdown = false;
      return;
    }

    if (term.length >= 2) {
      this.filteredEmployees = this.allEmployees.filter(emp => 
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(term.toLowerCase()) ||
        emp.position.toLowerCase().includes(term.toLowerCase()) ||
        emp.department?.toLowerCase().includes(term.toLowerCase()) ||
        (emp.badgeNumber && emp.badgeNumber.includes(term))
      );
      this.showEmployeeDropdown = true;
    } else {
      this.showEmployeeDropdown = false;
    }
  }

  selectEmployee(employee: Employee): void {
    if (!this.selectedEmployees.find(emp => emp.id === employee.id)) {
      this.selectedEmployees.push(employee);
      this.employeeSearchTerm = '';
      this.showEmployeeDropdown = false;
    }
  }

  removeEmployee(employeeId: number): void {
    this.selectedEmployees = this.selectedEmployees.filter(emp => emp.id !== employeeId);
  }

  // Bulk employee selection
  selectAllEmployees(): void {
    this.selectedEmployees = [...this.allEmployees];
  }

  clearAllEmployees(): void {
    this.selectedEmployees = [];
  }

  selectByDepartment(department: string): void {
    const deptEmployees = this.allEmployees.filter(emp => emp.department === department);
    deptEmployees.forEach(emp => {
      if (!this.selectedEmployees.find(selected => selected.id === emp.id)) {
        this.selectedEmployees.push(emp);
      }
    });
  }

  // Get unique departments for bulk selection
  getUniqueDepartments(): string[] {
    const departments = [...new Set(this.allEmployees.map(emp => emp.department))];
    return departments.sort();
  }

  // Form submission
  onSubmit(): void {
    if (this.trainingForm.valid && this.selectedEmployees.length > 0) {
      this.saveTrainingSession();
    } else {
      this.markFormGroupTouched();
      if (this.selectedEmployees.length === 0) {
        this.showMessage('Please select at least one attendee', 'error');
      }
    }
  }

  private saveTrainingSession(): void {
    this.isSaving = true;
    
    const formValue = this.trainingForm.value;
    const request: CreateTrainingSessionRequest = {
      title: formValue.title,
      description: formValue.description,
      purpose: formValue.purpose,
      date: formValue.date,
      startTime: formValue.startTime,
      endTime: formValue.endTime,
      location: formValue.location,
      facilitatorName: formValue.facilitatorName,
      expectedAttendeeIds: this.selectedEmployees.map(emp => Number(emp.id))  // Ensure all IDs are numbers
    };

    console.log('Saving session with data:', request);
    console.log('Selected employees:', this.selectedEmployees);
    console.log('Expected attendee IDs:', request.expectedAttendeeIds);

    if (this.isEditMode && this.sessionId) {
      // Update existing session - use camelCase format that backend expects
      const updateData = {
        title: formValue.title,
        description: formValue.description,
        purpose: formValue.purpose,
        date: formValue.date,
        startTime: formValue.startTime,  // Backend expects camelCase
        endTime: formValue.endTime,      // Backend expects camelCase
        location: formValue.location,
        facilitatorName: formValue.facilitatorName,  // Backend expects camelCase
        expectedAttendeeIds: this.selectedEmployees.map(emp => Number(emp.id))  // Ensure all IDs are numbers
      };
      
      console.log('Updating session with camelCase data:', updateData);
      this.trainingService.updateTrainingSession(this.sessionId, updateData).subscribe({
        next: (rawSession) => {
          // Map the response to proper format
          const session = this.mapTrainingSessionData(rawSession);
          this.createdSession = session;
          this.showMessage(`Training session "${session.title}" updated successfully!`, 'success');
          this.isSaving = false;
          
          // Navigate back to sessions list
          setTimeout(() => {
            this.router.navigate(['/training/manage']);
          }, 2000);
        },
        error: (error) => {
          console.error('Error updating training session:', error);
          this.showMessage('Error updating training session. Please try again.', 'error');
          this.isSaving = false;
        }
      });
    } else {
      // Create new session
      this.trainingService.createTrainingSession(request).subscribe({
        next: (rawSession) => {
          // Map the response to proper format
          const session = this.mapTrainingSessionData(rawSession);
          this.createdSession = session;
          this.showMessage(`Training session "${session.title}" created successfully!`, 'success');
          this.isSaving = false;
          
          // Optional: Auto-navigate after success
          setTimeout(() => {
            this.router.navigate(['/training/live']);
          }, 2000);
        },
        error: (error) => {
          console.error('Error creating training session:', error);
          this.showMessage('Error creating training session. Please try again.', 'error');
          this.isSaving = false;
        }
      });
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.trainingForm.controls).forEach(key => {
      const control = this.trainingForm.get(key);
      control?.markAsTouched();
    });
  }

  private showMessage(text: string, type: 'success' | 'error'): void {
    this.messageText = text;
    this.showSuccessMessage = type === 'success';
    this.showErrorMessage = type === 'error';
    
    // Auto-hide error messages after 5 seconds
    if (type === 'error') {
      setTimeout(() => {
        this.showErrorMessage = false;
      }, 5000);
    }
  }

  // Utility methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.trainingForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.trainingForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} is too short`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      title: 'Training Title',
      description: 'Description',
      purpose: 'Purpose',
      date: 'Date',
      startTime: 'Start Time',
      endTime: 'End Time',
      location: 'Location',
      facilitatorName: 'Facilitator Name'
    };
    return labels[fieldName] || fieldName;
  }

  // Navigation
  goToSessions(): void {
    this.router.navigate(['/training/live']);
  }

  goToSignOff(): void {
    if (this.createdSession) {
      this.router.navigate(['/training/sign-off', this.createdSession.id]);
    }
  }

  // Helper for duration calculation
  calculateDuration(): string {
    const startTime = this.trainingForm.get('startTime')?.value;
    const endTime = this.trainingForm.get('endTime')?.value;
    
    if (startTime && endTime) {
      return this.trainingService.calculateDuration(startTime, endTime);
    }
    return '';
  }

  // Template methods
  loadTemplates(): void {
    this.templateService.getActiveTemplates().subscribe({
      next: (templates) => {
        this.availableTemplates = templates;
      },
      error: (error) => {
        console.error('Error loading templates:', error);
      }
    });

    this.templateService.getCategories().subscribe({
      next: (categories) => {
        this.templateCategories = categories;
      },
      error: (error) => {
        console.error('Error loading template categories:', error);
      }
    });
  }

  loadAndUseTemplate(templateId: number): void {
    this.templateService.getTemplate(templateId).subscribe({
      next: (template) => {
        this.useTemplate(template);
      },
      error: (error) => {
        console.error('Error loading template:', error);
      }
    });
  }

  useTemplate(template: TrainingTemplate): void {
    this.selectedTemplate = template;
    
    // Pre-fill form with template data
    this.trainingForm.patchValue({
      title: template.titleTemplate || template.name,
      description: template.descriptionTemplate || '',
      purpose: template.purposeTemplate || '',
      location: template.defaultLocation || ''
    });

    // Set duration if provided
    if (template.defaultDurationMinutes) {
      // Calculate end time based on start time and duration
      const startTime = this.trainingForm.get('startTime')?.value;
      if (startTime) {
        const endTime = this.addMinutesToTime(startTime, template.defaultDurationMinutes);
        this.trainingForm.patchValue({ endTime });
      }
    }

    console.log('Using template:', template.name);
  }

  private addMinutesToTime(timeString: string, minutes: number): string {
    const [hours, mins] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins, 0, 0);
    date.setMinutes(date.getMinutes() + minutes);
    
    const newHours = date.getHours().toString().padStart(2, '0');
    const newMins = date.getMinutes().toString().padStart(2, '0');
    return `${newHours}:${newMins}`;
  }

  startFromScratch(): void {
    this.selectedTemplate = null;
    // Form is already initialized, just clear any template-filled data if needed
    console.log('Starting from scratch');
  }

  goToTemplates(): void {
    this.router.navigate(['/training/templates']);
  }

  getCategoryColor(categoryName: string): string {
    const category = this.templateCategories.find(c => c.name === categoryName);
    return category?.color || '#6c757d';
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }

  // Template helper methods
  getEventTargetValue(event: any): string {
    return event.target?.value || '';
  }

  isEmployeeSelected(employeeId: number): boolean {
    return this.selectedEmployees.some(emp => emp.id === employeeId);
  }
}