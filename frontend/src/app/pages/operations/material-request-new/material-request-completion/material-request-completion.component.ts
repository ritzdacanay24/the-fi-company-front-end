import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';
import moment from 'moment';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-material-request-completion',
  templateUrl: './material-request-completion.component.html',
  styleUrls: ['./material-request-completion.component.scss']
})
export class MaterialRequestCompletionComponent implements OnInit {
  
  requestId: string;
  requestData: any;
  isLoading = false;
  
  // Completion metrics
  completionMetrics = {
    totalItems: 0,
    pickedItems: 0,
    shortageItems: 0,
    completionTime: '',
    pickingDuration: '',
    accuracy: 100
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: MaterialRequestService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.requestId = params['id'];
      if (this.requestId) {
        this.loadCompletedRequest();
      }
    });
  }

  async loadCompletedRequest() {
    try {
      this.isLoading = true;
      
      this.requestData = await this.api.getById(parseInt(this.requestId));
      this.calculateCompletionMetrics();
      
    } catch (error) {
      console.error('Error loading completed request:', error);
    } finally {
      this.isLoading = false;
    }
  }

  calculateCompletionMetrics() {
    if (!this.requestData?.details) return;
    
    const totalItems = this.requestData.details.length;
    const pickedItems = this.requestData.details.filter((item: any) => 
      (item.qtyPicked || 0) > 0
    ).length;
    
    const shortageItems = this.requestData.details.filter((item: any) => 
      (item.qtyPicked || 0) < (item.qty || 0)
    ).length;
    
    // Calculate picking duration
    let pickingDuration = '';
    if (this.requestData.printedDate && this.requestData.pickedCompletedDate) {
      const startTime = moment(this.requestData.printedDate);
      const endTime = moment(this.requestData.pickedCompletedDate);
      const duration = moment.duration(endTime.diff(startTime));
      
      const hours = Math.floor(duration.asHours());
      const minutes = duration.minutes();
      
      if (hours > 0) {
        pickingDuration = `${hours}h ${minutes}m`;
      } else {
        pickingDuration = `${minutes}m`;
      }
    }
    
    // Calculate accuracy (percentage of items picked without shortage)
    const accuracy = totalItems > 0 ? ((totalItems - shortageItems) / totalItems) * 100 : 100;
    
    this.completionMetrics = {
      totalItems,
      pickedItems,
      shortageItems,
      completionTime: this.requestData.pickedCompletedDate,
      pickingDuration,
      accuracy: Math.round(accuracy)
    };
  }

  getAccuracyClass(): string {
    if (this.completionMetrics.accuracy >= 95) return 'text-success';
    if (this.completionMetrics.accuracy >= 80) return 'text-warning';
    return 'text-danger';
  }

  getAccuracyIcon(): string {
    if (this.completionMetrics.accuracy >= 95) return 'ri-star-fill';
    if (this.completionMetrics.accuracy >= 80) return 'ri-thumb-up-line';
    return 'ri-error-warning-line';
  }

  getPriorityClass(priority: string): string {
    const priorityClasses = {
      'Critical': 'bg-danger',
      'High': 'bg-warning',
      'Medium': 'bg-primary',
      'Low': 'bg-secondary'
    };
    return priorityClasses[priority] || 'bg-secondary';
  }

  goToList() {
    this.router.navigate(['/operations/material-request/list']);
  }

  createNewRequest() {
    this.router.navigate(['/operations/material-request/workflow']);
  }

  viewDetails() {
    this.router.navigate(['/operations/material-request/edit'], {
      queryParams: { id: this.requestId }
    });
  }

  printReport() {
    window.print();
  }
}
