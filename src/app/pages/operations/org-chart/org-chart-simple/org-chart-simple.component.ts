import { Component, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { UserService } from '@app/core/api/field-service/user.service';
import moment from 'moment';

interface Employee {
  id: number;
  first: string;
  last: string;
  name: string;
  title?: string;
  parentId?: number | null;
  imageUrl?: string;
  hire_date?: string;
  access?: number;
  active?: number;
  employeeType?: string;
  subordinates?: Employee[];
  isExpanded?: boolean;
  isHighlighted?: boolean;
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-org-chart-simple',
  templateUrl: './org-chart-simple.component.html',
  styleUrls: ['./org-chart-simple.component.scss']
})
export class OrgChartSimpleComponent implements OnInit {

  constructor(private userService: UserService) {}

  // Component State
  employees: Employee[] = [];
  rootEmployees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  isLoading = false;
  error: string | null = null;
  searchTerm = '';
  compactMode = false;
  selectedEmployee: Employee | null = null;

  ngOnInit(): void {
    this.loadOrgChart();
  }

  async loadOrgChart(): Promise<void> {
    try {
      this.isLoading = true;
      this.error = null;

      // Use the existing service call from your current component
      const data: any = await this.userService.getOrgchart({
        active: 1,
        isEmployee: 1,
      });

      this.processEmployeeData(data);
      this.buildHierarchy();
      
    } catch (error) {
      console.error('Error loading org chart:', error);
      this.error = 'Failed to load organization chart. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  private processEmployeeData(data: any[]): void {
    this.employees = data.map(emp => ({
      id: emp.id,
      first: emp.first || '',
      last: emp.last || '',
      name: `${emp.first || ''} ${emp.last || ''}`.trim() || 'No Name',
      title: emp.title,
      parentId: emp.parentId,
      imageUrl: emp.image,
      hire_date: emp.hire_date,
      access: emp.access,
      active: emp.active,
      employeeType: emp.employeeType,
      subordinates: [],
      isExpanded: false,
      isHighlighted: false
    }));

    this.filteredEmployees = [...this.employees];
  }

  private buildHierarchy(): void {
    // Create a map for quick lookup
    const employeeMap = new Map<number, Employee>();
    this.employees.forEach(emp => {
      employeeMap.set(emp.id, emp);
      emp.subordinates = []; // Reset subordinates
    });

    // Build parent-child relationships
    const roots: Employee[] = [];
    
    this.employees.forEach(emp => {
      if (emp.parentId && employeeMap.has(emp.parentId)) {
        // Has a parent - add to parent's subordinates
        const parent = employeeMap.get(emp.parentId)!;
        parent.subordinates!.push(emp);
      } else {
        // No parent or parent not found - it's a root
        roots.push(emp);
      }
    });

    // Sort subordinates by name
    this.employees.forEach(emp => {
      if (emp.subordinates) {
        emp.subordinates.sort((a, b) => a.name.localeCompare(b.name));
      }
    });

    this.rootEmployees = roots.sort((a, b) => a.name.localeCompare(b.name));
  }

  // UI Event Handlers
  toggleExpand(employee: Employee): void {
    employee.isExpanded = !employee.isExpanded;
  }

  expandAll(): void {
    this.setExpandedState(this.rootEmployees, true);
  }

  collapseAll(): void {
    this.setExpandedState(this.rootEmployees, false);
  }

  private setExpandedState(employees: Employee[], expanded: boolean): void {
    employees.forEach(emp => {
      emp.isExpanded = expanded;
      if (emp.subordinates && emp.subordinates.length > 0) {
        this.setExpandedState(emp.subordinates, expanded);
      }
    });
  }

  selectEmployee(employee: Employee): void {
    // Clear previous selections
    this.clearHighlights(this.rootEmployees);
    
    // Highlight selected employee
    employee.isHighlighted = true;
    this.selectedEmployee = employee;

    // You can add modal or side panel logic here
    console.log('Selected employee:', employee);
  }

  private clearHighlights(employees: Employee[]): void {
    employees.forEach(emp => {
      emp.isHighlighted = false;
      if (emp.subordinates && emp.subordinates.length > 0) {
        this.clearHighlights(emp.subordinates);
      }
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.clearSearch();
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.highlightSearchResults(this.rootEmployees, term);
  }

  private highlightSearchResults(employees: Employee[], term: string): boolean {
    let hasMatch = false;

    employees.forEach(emp => {
      const matches = emp.name.toLowerCase().includes(term) || 
                     (emp.title && emp.title.toLowerCase().includes(term));
      
      emp.isHighlighted = matches;
      
      if (matches) {
        hasMatch = true;
        // Expand path to this employee
        this.expandPathToEmployee(emp);
      }

      // Recursively search subordinates
      if (emp.subordinates && emp.subordinates.length > 0) {
        const childHasMatch = this.highlightSearchResults(emp.subordinates, term);
        if (childHasMatch) {
          emp.isExpanded = true;
          hasMatch = true;
        }
      }
    });

    return hasMatch;
  }

  private expandPathToEmployee(employee: Employee): void {
    // Find path from root to this employee and expand all nodes in path
    const path = this.findPathToEmployee(this.rootEmployees, employee.id);
    path.forEach(emp => emp.isExpanded = true);
  }

  private findPathToEmployee(employees: Employee[], targetId: number, path: Employee[] = []): Employee[] {
    for (const emp of employees) {
      const currentPath = [...path, emp];
      
      if (emp.id === targetId) {
        return currentPath;
      }
      
      if (emp.subordinates && emp.subordinates.length > 0) {
        const found = this.findPathToEmployee(emp.subordinates, targetId, currentPath);
        if (found.length > 0) {
          return found;
        }
      }
    }
    return [];
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.clearHighlights(this.rootEmployees);
  }

  toggleCompactMode(): void {
    // Compact mode styling will be handled in CSS
  }

  refreshData(): void {
    this.loadOrgChart();
  }

  // Helper Functions
  getEmployeeColor(employee: Employee): string {
    if (!employee.hire_date) return '#6c757d';

    const now = moment();
    const hireDate = moment(employee.hire_date);
    const monthsDiff = now.diff(hireDate, 'months');

    if (monthsDiff < 1) return '#ff6b35'; // Orange - New hire
    if (monthsDiff < 6) return '#00c3ff'; // Light blue - Recent hire
    if (monthsDiff < 12) return '#4b0082'; // Purple - Medium tenure
    return '#002d62'; // Dark blue - Long tenure
  }

  getStatusClass(employee: Employee): string {
    if (employee.active === 0) return 'status-inactive';
    if (employee.access === 100) return 'status-restricted';
    return 'status-active';
  }

  getEmployeeTypeBadge(employee: Employee): string {
    switch (employee.employeeType) {
      case 'FT': return 'bg-success';
      case 'PT': return 'bg-warning';
      case 'CT': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  getEmployeeTypeText(employee: Employee): string {
    switch (employee.employeeType) {
      case 'FT': return 'Full Time';
      case 'PT': return 'Part Time';
      case 'CT': return 'Contract';
      default: return 'Unknown';
    }
  }

  getHireDateText(hireDate: string): string {
    const now = moment();
    const hire = moment(hireDate);
    const duration = moment.duration(now.diff(hire));
    const years = duration.years();
    const months = duration.months();

    if (years > 0) {
      return `${years}y ${months}m`;
    }
    return `${months}m`;
  }

  trackByEmployeeId(index: number, employee: Employee): number {
    return employee.id;
  }
}