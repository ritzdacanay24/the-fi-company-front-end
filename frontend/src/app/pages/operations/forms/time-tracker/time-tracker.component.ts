import { Component, inject, TemplateRef, OnInit, OnDestroy } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { AuthenticationService } from "@app/core/services/auth.service";
import { NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import moment from "moment";
import { TimeTrackerService } from "@app/core/api/time-tracker/time-tracker.service";
import { TimeTrackerDetailService } from "@app/core/api/time-tracker-detail/time-tracker-detail.service";
import { TimeTrackerMockService } from "./time-tracker-mock.service";
import { time_now } from "src/assets/js/util/time-now";

export interface Project {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface ActivityTemplate {
  category: string;
  activities: string[];
  icon: string;
  color: string;
}

export interface TimeEntry {
  id?: number;
  title: string;
  start_time: string;
  end_time: string;
  project_id?: number;
  category?: string;
  tags?: string;
  notes?: string;
  time_tracker_id: number;
  created_by: number;
  created_date: string;
  productivity_score?: number; // Added for template compatibility
}

export interface WorkSession {
  id?: number;
  title: string;
  project_id?: number;
  total_time?: number;
  status: 'active' | 'completed' | 'paused';
  created_by: number;
  created_by_name: string;
  created_date: string;
  completed_date?: string;
  entries?: TimeEntry[];
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-time-tracker",
  templateUrl: "./time-tracker.component.html",
  styleUrls: ["./time-tracker.component.scss"],
})
export class TimeTrackerComponent implements OnInit, OnDestroy {
  private offcanvasService = inject(NgbOffcanvas);
  offcanvas = this.offcanvasService;

  // Configuration flag - set to true to use mock data
  private useMockData = true;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private timeTrackerService: TimeTrackerService,
    private timeTrackerDetailService: TimeTrackerDetailService,
    private mockService: TimeTrackerMockService
  ) {}

  // Component State - matching HTML template
  id = 0;
  data: WorkSession | null = null;
  times: TimeEntry[] = [];
  isLoading = false;

  // Form Data - matching HTML template
  name = "";
  selectedProject: Project | null = null;
  entryTitle = "";
  start_time = "";  // Using underscore to match HTML template
  end_time = "";    // Using underscore to match HTML template
  startTime = "";   // Keep camelCase version for compatibility
  endTime = "";     // Keep camelCase version for compatibility
  selectedCategory = "";
  tags: string[] = [];
  currentTag = "";
  notes = "";

  // Additional properties needed by template
  completed: any[] = [];
  currentTip = ""; // Stable tip that doesn't change during lifecycle
  cachedQuickTemplates: ActivityTemplate[] = []; // Cached templates
  cachedEntryTrend: number = 0; // Cached trend calculation
  cachedAverageTime = ""; // Cached average time
  cachedSessionStartTime = ""; // Cached session start time

  // Edit Mode - matching HTML template
  edit_id: number | null = null;
  isEditMode = false;

  // Timer State
  isTimerRunning = false;
  timerStartTime: Date | null = null;
  currentTime = new Date();
  timerInterval: any;

  ngOnInit(): void {
    // Initialize stable values
    this.currentTip = this.productivityTips[Math.floor(Math.random() * this.productivityTips.length)];
    this.cachedQuickTemplates = this.activityTemplates;
    
    // Load projects data
    if (this.useMockData) {
      this.projects = this.mockService.getProjects();
    }
    
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = +params["id"] || 0;
      if (this.id) {
        this.loadSession();
      }
    });

    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  projects: Project[] = [
    { id: 1, name: 'Development', color: '#28a745', description: 'Software development and coding' },
    { id: 2, name: 'Customer Service', color: '#007bff', description: 'Customer support and relations' },
    { id: 3, name: 'Operations', color: '#ffc107', description: 'Daily operations and maintenance' },
    { id: 4, name: 'Training', color: '#6f42c1', description: 'Learning and skill development' },
    { id: 5, name: 'Administration', color: '#fd7e14', description: 'Administrative tasks and paperwork' },
    { id: 6, name: 'Logistics', color: '#20c997', description: 'Shipping, delivery, and coordination' },
    { id: 7, name: 'Meetings', color: '#dc3545', description: 'Team meetings and collaboration' },
    { id: 8, name: 'Research', color: '#6c757d', description: 'Research and analysis work' }
  ];

  activityTemplates: ActivityTemplate[] = [
    {
      category: 'Development',
      icon: 'mdi-code-tags',
      color: '#28a745',
      activities: [
        'Feature Development', 'Bug Fixing', 'Code Review', 'Testing & QA',
        'Documentation', 'Architecture Planning', 'Debugging', 'Refactoring'
      ]
    },
    {
      category: 'Customer Service',
      icon: 'mdi-headset',
      color: '#007bff',
      activities: [
        'Customer Support', 'Phone Calls', 'Email Support', 'Live Chat',
        'Complaint Resolution', 'Follow-up Calls', 'Customer Training'
      ]
    },
    {
      category: 'Operations',
      icon: 'mdi-cog',
      color: '#ffc107',
      activities: [
        'System Maintenance', 'Data Entry', 'Quality Control', 'Process Improvement',
        'Inventory Management', 'Equipment Check', 'Routine Tasks'
      ]
    },
    {
      category: 'Meetings',
      icon: 'mdi-account-group',
      color: '#dc3545',
      activities: [
        'Team Meeting', 'Client Call', 'Planning Session', 'Stand-up Meeting',
        'Review Meeting', 'Training Session', 'One-on-One', 'Conference Call'
      ]
    },
    {
      category: 'Administrative',
      icon: 'mdi-file-document',
      color: '#fd7e14',
      activities: [
        'Email Processing', 'Report Writing', 'Data Analysis', 'Planning',
        'Scheduling', 'Filing', 'Invoice Processing', 'Documentation'
      ]
    },
    {
      category: 'Logistics',
      icon: 'mdi-truck',
      color: '#20c997',
      activities: [
        'Delivery', 'Pickup', 'Route Planning', 'Inventory Check',
        'Package Sorting', 'Vehicle Inspection', 'Driving', 'Loading/Unloading'
      ]
    }
  ];

  commonTags = [
    'urgent', 'routine', 'priority', 'research', 'documentation',
    'client-work', 'internal', 'learning', 'planning', 'review',
    'follow-up', 'troubleshooting', 'training', 'optimization'
  ];

  productivityTips = [
    "🎯 Set clear goals for each work session",
    "⏰ Use time blocks to focus on specific tasks",
    "📝 Keep detailed notes for better tracking",
    "🔄 Take regular breaks to maintain productivity",
    "📊 Review your time patterns weekly"
  ];

  async onCreate(): Promise<void> {
    if (!this.name.trim()) {
      this.toastrService.error('Please enter a session title');
      return;
    }

    this.isLoading = true;
    try {
      const sessionData: Partial<WorkSession> = {
        title: this.name,
        project_id: this.selectedProject?.id,
        status: 'active',
        created_by: this.authenticationService.currentUserValue?.id || 1,
        created_by_name: this.authenticationService.currentUserValue?.full_name || 'Test User',
        created_date: time_now()
      };

      const result = this.useMockData 
        ? await this.mockService.create(sessionData)
        : await this.timeTrackerService.create(sessionData);
      this.id = result.insertId;

      // Update browser URL without navigation to show the session ID
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { id: this.id },
        replaceUrl: true
      });

      this.toastrService.success('Work session created successfully!');
      await this.loadSession();
    } catch (error) {
      this.toastrService.error('Failed to create session');
      console.error('Session creation error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadSession(): Promise<void> {
    if (!this.id) return;

    this.isLoading = true;
    try {
      this.data = this.useMockData 
        ? await this.mockService.getById(this.id)
        : await this.timeTrackerService.getById(this.id);
      if (!this.data) {
        this.toastrService.error('Session not found');
        this.goBack();
        return;
      }

      await this.loadTimeEntries();
    } catch (error) {
      this.toastrService.error('Failed to load session');
      console.error('Session load error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadTimeEntries(): Promise<void> {
    try {
      this.times = this.useMockData 
        ? await this.mockService.find({ time_tracker_id: this.id })
        : await this.timeTrackerDetailService.find({ time_tracker_id: this.id });
      // Update cached values when data changes
      this.updateCachedValues();
    } catch (error) {
      console.error('Failed to load time entries:', error);
    }
  }

  private updateCachedValues(): void {
    // Update cached calculations to prevent change detection issues
    this.cachedEntryTrend = this.calculateEntryTrend();
    this.cachedAverageTime = this.calculateAverageTimePerEntry();
    if (this.data) {
      this.cachedSessionStartTime = moment(this.data.created_date).format('h:mm A');
    }
  }

  private calculateEntryTrend(): number {
    if (this.times.length < 2) return 0;
    
    const recentEntries = this.times.slice(-5);
    const olderEntries = this.times.slice(-10, -5);
    
    if (olderEntries.length === 0) return 0;
    
    const recentAvg = recentEntries.reduce((sum, entry) => {
      const duration = moment(entry.end_time).diff(moment(entry.start_time), 'minutes');
      return sum + duration;
    }, 0) / recentEntries.length;
    
    const olderAvg = olderEntries.reduce((sum, entry) => {
      const duration = moment(entry.end_time).diff(moment(entry.start_time), 'minutes');
      return sum + duration;
    }, 0) / olderEntries.length;
    
    return ((recentAvg - olderAvg) / olderAvg) * 100;
  }

  private calculateAverageTimePerEntry(): string {
    if (!this.times.length) return '0m';
    
    const totalMinutes = this.times.reduce((total, entry) => {
      const start = moment(entry.start_time);
      const end = moment(entry.end_time);
      if (start.isValid() && end.isValid()) {
        return total + end.diff(start, 'minutes');
      }
      return total;
    }, 0);
    
    const avgMinutes = Math.round(totalMinutes / this.times.length);
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }

  goBack(): void {
    this.router.navigate(["/operations/forms/time-tracker-list"]);
  }

  async onDeleteMain(): Promise<void> {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      this.useMockData 
        ? await this.mockService.delete(this.id)
        : await this.timeTrackerService.delete(this.id);
      this.toastrService.success('Session deleted');
      this.goBack();
    } catch (error) {
      this.toastrService.error('Failed to delete session');
    }
  }

  async finish(): Promise<void> {
    if (!this.data) return;

    try {
      this.useMockData 
        ? await this.mockService.update(this.id, {
            status: 'completed',
            completed_date: time_now()
          })
        : await this.timeTrackerService.update(this.id, {
            status: 'completed',
            completed_date: time_now()
          });

      this.data.status = 'completed';
      this.data.completed_date = time_now();
      this.toastrService.success('Session completed!');
    } catch (error) {
      this.toastrService.error('Failed to complete session');
    }
  }

  startTimer(): void {
    if (!this.name.trim()) {
      this.toastrService.error('Please enter what you\'re working on');
      return;
    }

    // Set entryTitle to match the name for consistency
    this.entryTitle = this.name;
    
    this.isTimerRunning = true;
    this.timerStartTime = new Date();
    this.startTime = moment(this.timerStartTime).format("YYYY-MM-DDTHH:mm");
    this.start_time = this.startTime; // Sync underscore version
    this.toastrService.success('Timer started!');
  }

  stopTimer(): void {
    if (!this.isTimerRunning || !this.timerStartTime) return;

    this.isTimerRunning = false;
    this.endTime = moment().format("YYYY-MM-DDTHH:mm");
    this.end_time = this.endTime; // Sync underscore version
    this.saveTimeEntry();
  }

  openBottom(content: TemplateRef<any>, entry?: TimeEntry): void {
    this.resetForm();
    
    if (entry) {
      this.isEditMode = true;
      this.edit_id = entry.id || null;
      this.entryTitle = entry.title;
      this.startTime = moment(entry.start_time).format("YYYY-MM-DDTHH:mm");
      this.start_time = this.startTime; // Sync underscore version
      this.endTime = moment(entry.end_time).format("YYYY-MM-DDTHH:mm");
      this.end_time = this.endTime; // Sync underscore version
      this.selectedCategory = entry.category || '';
      this.tags = entry.tags ? entry.tags.split(',').filter(t => t.trim()) : [];
      this.notes = entry.notes || '';
    } else {
      this.isEditMode = false;
      this.startTime = moment().format("YYYY-MM-DDTHH:mm");
      this.start_time = this.startTime; // Sync underscore version
    }

    this.offcanvasService.open(content, {
      ariaLabelledBy: "time-entry-modal",
      position: "end",
      backdrop: true,
      keyboard: true
    });
  }

  edit(content: TemplateRef<any>, entry: TimeEntry): void {
    this.openBottom(content, entry);
  }

  async saveTimeEntry(): Promise<void> {
    console.log('saveTimeEntry called');
    console.log('validateTimeEntry result:', this.validateTimeEntry());
    
    if (!this.validateTimeEntry()) return;

    try {
      const entryData: Partial<TimeEntry> = {
        title: this.entryTitle,
        start_time: moment(this.startTime).format("YYYY-MM-DD HH:mm"),
        end_time: moment(this.endTime).format("YYYY-MM-DD HH:mm"),
        time_tracker_id: this.id,
        category: this.selectedCategory,
        tags: this.tags.join(','),
        notes: this.notes,
        created_by: this.authenticationService.currentUserValue?.id || 1,
        created_date: time_now()
      };

      console.log('Entry data:', entryData);

      if (this.isEditMode && this.edit_id) {
        this.useMockData 
          ? await this.mockService.updateTimeEntry(this.edit_id, entryData)
          : await this.timeTrackerDetailService.update(this.edit_id, entryData);
        this.toastrService.success('Time entry updated!');
      } else {
        console.log('Creating new entry...');
        this.useMockData 
          ? await this.mockService.createTimeEntry(entryData)
          : await this.timeTrackerDetailService.create(entryData);
        this.toastrService.success('Time entry saved!');
      }

      await this.loadTimeEntries();
      
      // Only dismiss offcanvas if we're in edit mode (modal was opened)
      if (this.isEditMode) {
        this.offcanvasService.dismiss();
      }
      
      this.resetForm();
    } catch (error) {
      this.toastrService.error('Failed to save time entry');
      console.error('Save entry error:', error);
    }
  }

  private validateTimeEntry(): boolean {
    console.log('Validating entry:');
    console.log('- entryTitle:', this.entryTitle);
    console.log('- startTime:', this.startTime);
    console.log('- endTime:', this.endTime);
    
    if (!this.entryTitle.trim()) {
      console.log('Validation failed: no title');
      this.toastrService.error('Please enter a description');
      return false;
    }

    if (!this.startTime || !this.endTime) {
      console.log('Validation failed: missing times');
      this.toastrService.error('Please set start and end times');
      return false;
    }

    if (moment(this.endTime).isBefore(moment(this.startTime))) {
      console.log('Validation failed: end before start');
      this.toastrService.error('End time must be after start time');
      return false;
    }

    console.log('Validation passed');
    return true;
  }

  selectTemplate(activity: string): void {
    this.entryTitle = activity;
  }

  addTag(tag: string): void {
    if (tag && !this.tags.includes(tag.toLowerCase())) {
      this.tags.push(tag.toLowerCase());
      this.currentTag = '';
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag);
  }

  resetForm(): void {
    this.entryTitle = "";
    this.startTime = "";
    this.start_time = ""; // Clear underscore version
    this.endTime = "";
    this.end_time = ""; // Clear underscore version
    this.selectedCategory = "";
    this.tags = [];
    this.currentTag = "";
    this.notes = "";
    this.edit_id = null;
    this.isEditMode = false;
    
    // Don't reset timer state when called from saveTimeEntry
    // Timer state should only be reset when manually stopping/starting
    // this.isTimerRunning = false;
    // this.timerStartTime = null;
  }

  getCurrentTime(): string {
    return moment().format('h:mm A');
  }

  getElapsedTime(): string {
    if (!this.isTimerRunning || !this.timerStartTime) return '00:00';
    
    const duration = moment.duration(moment().diff(moment(this.timerStartTime)));
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    const seconds = duration.seconds();
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getEntryDuration(entry: TimeEntry): string {
    const start = moment(entry.start_time);
    const end = moment(entry.end_time);
    
    if (!start.isValid() || !end.isValid()) return '0m';
    
    const duration = moment.duration(end.diff(start));
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }

  getTotalSessionTime(): string {
    if (!this.times.length) return '0m';
    
    let totalMinutes = 0;
    this.times.forEach(entry => {
      const start = moment(entry.start_time);
      const end = moment(entry.end_time);
      if (start.isValid() && end.isValid()) {
        totalMinutes += end.diff(start, 'minutes');
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }

  getProjectById(id: number): Project | undefined {
    return this.projects.find(p => p.id === id);
  }

  getTotalTime(startTime: string, endTime: string): string {
    return this.getEntryDuration({ start_time: startTime, end_time: endTime } as TimeEntry);
  }

  // ==================== MISSING METHODS FOR HTML TEMPLATE ====================

  getRandomTip(): string {
    return this.currentTip; // Return stable tip instead of random
  }

  getQuickTemplates(): ActivityTemplate[] {
    return this.cachedQuickTemplates; // Return cached templates
  }

  onTaskInputChange(event: any): void {
    this.entryTitle = event.target.value;
  }

  clearInput(): void {
    this.entryTitle = "";
  }

  addCommonTag(tag: string): void {
    this.addTag(tag);
  }

  async start(): Promise<void> {
    // If no session exists, create one first
    if (!this.id) {
      await this.onCreate();
    }
    
    // Then start the timer
    this.startTimer();
  }

  getEstimatedTime(): string {
    if (!this.name) return '';
    
    const task = this.name.toLowerCase();
    
    // Development work
    if (task.includes('coding') || task.includes('development')) return '2-4 hours';
    if (task.includes('debugging') || task.includes('troubleshoot')) return '1-3 hours';
    if (task.includes('testing') || task.includes('qa')) return '30min-2 hours';
    if (task.includes('documentation') || task.includes('docs')) return '1-2 hours';
    if (task.includes('code review')) return '30min-1 hour';
    
    // Meetings and communication
    if (task.includes('meeting') || task.includes('call')) return '30min-1 hour';
    if (task.includes('email') || task.includes('communication')) return '15-30 min';
    if (task.includes('stand-up') || task.includes('standup')) return '15 min';
    
    // Operations and support
    if (task.includes('support') || task.includes('help')) return '15min-1 hour';
    if (task.includes('training') || task.includes('learn')) return '1-4 hours';
    if (task.includes('maintenance') || task.includes('check')) return '30min-2 hours';
    
    // Administrative
    if (task.includes('admin') || task.includes('filing')) return '30min-1 hour';
    if (task.includes('planning') || task.includes('organize')) return '1-2 hours';
    if (task.includes('report') || task.includes('analysis')) return '2-4 hours';
    
    // Logistics
    if (task.includes('driving') || task.includes('travel')) return '30min-2 hours';
    if (task.includes('pickup') || task.includes('delivery')) return '15-45 min';
    if (task.includes('inventory') || task.includes('sorting')) return '1-3 hours';
    
    return '30min-1 hour'; // Default estimate
  }

  startFocusedWork(): void {
    this.entryTitle = "Focused Work Session";
    this.startTimer();
  }

  startQuickTask(): void {
    this.entryTitle = "Quick Task";
    this.startTimer();
  }

  viewAllSessions(): void {
    this.router.navigate(["/operations/forms/time-tracker-list"]);
  }

  viewSession(session: any): void {
    this.router.navigate(["/operations/forms/time-tracker"], {
      queryParams: { id: session.id }
    });
  }

  getSessionTotalTime(session: any): string {
    if (!session.times || !session.times.length) return '0m';
    
    let totalMinutes = 0;
    session.times.forEach((entry: any) => {
      const start = moment(entry.start_time);
      const end = moment(entry.end_time);
      if (start.isValid() && end.isValid()) {
        totalMinutes += end.diff(start, 'minutes');
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }

  getProductivityScore(session?: any): number {
    const entries = session ? session.times : this.times;
    if (!entries || !entries.length) return 0;
    
    const totalMinutes = entries.reduce((total: number, entry: any) => {
      const start = moment(entry.start_time);
      const end = moment(entry.end_time);
      if (start.isValid() && end.isValid()) {
        return total + end.diff(start, 'minutes');
      }
      return total;
    }, 0);
    
    const averageSessionLength = totalMinutes / entries.length;
    
    if (averageSessionLength >= 90) return 95;
    if (averageSessionLength >= 60) return 85;
    if (averageSessionLength >= 30) return 75;
    if (averageSessionLength >= 15) return 65;
    return 50;
  }

  getEntryTrend(): number {
    return this.cachedEntryTrend; // Return cached value
  }

  getAverageTimePerEntry(): string {
    return this.cachedAverageTime; // Return cached value
  }

  getSessionStartTime(): string {
    return this.cachedSessionStartTime; // Return cached value
  }

  onDelete(): void {
    if (!this.edit_id || !confirm('Delete this time entry?')) return;

    const deletePromise = this.useMockData 
      ? this.mockService.deleteTimeEntry(this.edit_id)
      : this.timeTrackerDetailService.delete(this.edit_id);
      
    deletePromise.then(() => {
      this.toastrService.success('Time entry deleted');
      this.loadTimeEntries();
      this.offcanvasService.dismiss();
    }).catch(() => {
      this.toastrService.error('Failed to delete entry');
    });
  }
}