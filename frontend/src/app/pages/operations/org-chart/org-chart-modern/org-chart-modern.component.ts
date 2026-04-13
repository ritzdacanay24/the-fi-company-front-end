import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { OrgChart } from 'd3-org-chart';
import { UserService } from '@app/core/api/field-service/user.service';
import { UserModalService } from '@app/pages/maintenance/user/user-modal/user-modal.component';
import { UserSearchV1Component } from '@app/shared/components/user-search-v1/user-search-v1.component';
import moment from 'moment';
import * as d3 from 'd3';

@Component({
  standalone: true,
  imports: [SharedModule, UserSearchV1Component],
  selector: 'app-org-chart-modern',
  templateUrl: './org-chart-modern.component.html',
  styleUrls: ['./org-chart-modern.component.scss']
})
export class OrgChartModernComponent implements OnInit, AfterViewInit {

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private userModalService: UserModalService
  ) {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.searchQuery = params['username'];
      this.userId = params['userId'];
      this.selectedUserId = params['user_edit'];
    });
  }

  @ViewChild('chartContainer') chartContainer: ElementRef;
  
  // Chart instance and data
  chart: any;
  originalData: any[] = [];
  employees: any[] = [];
  
  // Component state
  isLoading = false;
  error: string | null = null;
  searchQuery: string | null = null;
  userId: number | null = null;
  selectedUserId: number | null = null;
  
  // Chart settings
  compactMode = false;
  showImages = true;

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.chart = new OrgChart();
    // The chart container will be available after data loads and *ngIf condition is met
    // Chart initialization will happen in loadData() after isLoading becomes false
  }

  async loadData(): Promise<void> {
    try {
      this.isLoading = true;
      this.error = null;

      // Use the same service call as the original component
      let data: any = await this.userService.getOrgchart({
        active: 1,
        isEmployee: 1,
      });

      if (!data || !Array.isArray(data) || data.length === 0) {
        this.error = 'No organization chart data available.';
        this.isLoading = false;
        return;
      }

      this.processData(data);
      
    } catch (error) {
      console.error('Error loading org chart:', error);
      this.error = 'Failed to load organization chart. Please try again.';
    } finally {
      this.isLoading = false;
      
      // Initialize chart after loading is complete and DOM is updated
      if (!this.error && this.employees && this.employees.length > 0) {
        // Use setTimeout to ensure the *ngIf condition has updated the DOM
        setTimeout(() => {
          this.initializeChart();
        }, 50);
      }
    }
  }

  private processData(rawData: any[]): void {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      console.warn('Invalid or empty data provided to processData');
      this.employees = [];
      this.originalData = [];
      return;
    }

    // Fix data structure issues (orphan nodes, multiple roots)
    const data = this.fixDataStructure(rawData);

    if (!data || data.length === 0) {
      console.warn('No valid data after structure fixing');
      this.employees = [];
      this.originalData = [];
      return;
    }

    // Sort alphabetically
    data.sort((a, b) => {
      const nameA = `${a.first || ''} ${a.last || ''}`.trim();
      const nameB = `${b.first || ''} ${b.last || ''}`.trim();
      return nameA.localeCompare(nameB);
    });

    // Transform data for org chart
    this.employees = data.map(emp => ({
      id: emp.id,
      name: `${emp.first || ''} ${emp.last || ''}`.trim() || 'No Name',
      first: emp.first || '',
      last: emp.last || '',
      title: emp.title || '',
      parentId: emp.parentId,
      imageUrl: emp.image || 'assets/images/default-user.png',
      hire_date: emp.hire_date,
      access: emp.access,
      active: emp.active,
      employeeType: emp.employeeType,
      orgChartPlaceHolder: emp.orgChartPlaceHolder,
      showImage: emp.showImage !== false, // Default to true
      openPosition: emp.openPosition,
      org_chart_expand: emp.org_chart_expand,
      bgColor: this.getEmployeeColor(emp.hire_date),
      hire_date_color: emp.openPosition ? 'red' : this.getEmployeeColor(emp.hire_date)
    }));

    this.originalData = structuredClone(this.employees);
  }

  private initializeChart(): void {
    if (!this.chartContainer?.nativeElement) {
      console.warn('Chart container not available, retrying...');
      // Retry after a short delay to allow DOM to render
      setTimeout(() => {
        if (this.chartContainer?.nativeElement) {
          this.initializeChart();
        } else {
          console.error('Chart container still not available after retry');
        }
      }, 200);
      return;
    }

    if (!this.employees || this.employees.length === 0) {
      console.warn('No employee data available for chart initialization');
      return;
    }

    try {
      this.chart
        .container(this.chartContainer.nativeElement)
        .data(this.employees)
        .onNodeClick(this.onNodeClick.bind(this))
        .nodeContent(this.getNodeContent.bind(this))
        .nodeWidth((d) => (d?.data?.id === -1) ? 280 : 320)
        .nodeHeight((d) => {
          if (!d || !d.data) return 160;
          if (d.data.id === -1) return 100;
          if (d.data.orgChartPlaceHolder) return 140;
          return this.showImages ? 200 : 160;
        })
        .childrenMargin(() => 50)
        .compactMarginBetween(() => 30)
        .compactMarginPair(() => 30)
        .compact(this.compactMode)
        .buttonContent(this.getButtonContent.bind(this))
        .linkUpdate(this.updateLinks.bind(this))
        .nodeUpdate(this.updateNodes.bind(this))
        .render()
        .fit();

      // Apply initial expansions
      this.expandInitialNodes();
    } catch (error) {
      console.error('Error initializing chart:', error);
      this.error = 'Failed to initialize organization chart. Please try refreshing.';
    }
  }

  private getNodeContent(d: any): string {
    // Validate input data
    if (!d || !d.data) {
      console.warn('getNodeContent called with invalid data:', d);
      return '<div class="card"><div class="card-body">Invalid Node Data</div></div>';
    }
    
    // Handle virtual root node
    if (d.data.id === -1) {
      return `
        <div class="card bg-primary text-white shadow-sm" style="height:100px;position:relative;cursor:default;">
          <div class="card-body text-center d-flex align-items-center justify-content-center">
            <div>
              <div style="font-size:18px;font-weight:bold">${d.data.name || 'Organization'}</div>
              <div style="font-size:14px" class="fst-italic">Organization Structure</div>
            </div>
          </div>
        </div>
      `;
    }

    const height = d.data.orgChartPlaceHolder ? 140 : (this.showImages ? 200 : 160);
    const imageSection = this.showImages && d.data.showImage ? this.getImageSection(d) : '';
    const textTopPadding = this.showImages && d.data.showImage ? 65 : 15;

    return `
      <div class="card shadow-sm border-0" style="height:${height}px;position:relative;overflow:visible;">
        ${imageSection}
        
        <!-- Header with color coding -->
        <div class="card-header border-0" style="background-color:${d.data.hire_date_color}; height: 8px; padding: 0;">
        </div>
        
        <!-- Body -->
        <div class="card-body text-center p-3" style="padding-top:${textTopPadding}px !important;">
          <div class="employee-name mb-2" style="font-size:16px;font-weight:600;color:#212529;line-height:1.2;">
            ${d.data.orgChartPlaceHolder ? d.data.first : d.data.name}
          </div>
          <div class="employee-title mb-2" style="font-size:14px;color:#6c757d;font-style:italic;line-height:1.2;">
            ${d.data.title || 'No title specified'}
          </div>
          ${this.getEmployeeBadges(d)}
        </div>
        
        <!-- Footer with counts -->
        <div class="card-footer bg-light py-2 px-3 border-0" style="font-size:12px;">
          <div class="d-flex justify-content-between align-items-center">
            <span class="text-muted">
              <i class="mdi mdi-account-group" style="color:${d.data.hire_date_color}"></i>
              Manages: ${d.data._directSubordinates || 0}
            </span>
            <span class="text-muted">
              <i class="mdi mdi-account-supervisor" style="color:${d.data.hire_date_color}"></i>
              Oversees: ${d.data._totalSubordinates || 0}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  private getImageSection(d: any): string {
    if (!this.showImages || !d.data.showImage) return '';
    
    const imageSize = 140;
    const borderSize = 4;
    const leftOffset = (d.width / 2) - (imageSize / 2);
    
    return `
      <div style="position:absolute;top:-${imageSize/2 + 10}px;left:${leftOffset}px;z-index:10;">
        <div class="bg-white shadow rounded-circle p-2" style="width:${imageSize + borderSize}px;height:${imageSize + borderSize}px;border:3px solid ${d.data.hire_date_color};">
          <img 
            src="${d.data.imageUrl}" 
            class="rounded-circle object-fit-cover" 
            style="width:${imageSize}px;height:${imageSize}px;"
            onerror="this.src='assets/images/default-user.png'"
            alt="${d.data.name}">
        </div>
      </div>
    `;
  }

  private getEmployeeBadges(d: any): string {
    let badges = '';
    
    // Employment type badge
    if (d.data.employeeType) {
      const badgeClass = this.getEmployeeTypeBadge(d.data.employeeType);
      const badgeText = this.getEmployeeTypeText(d.data.employeeType);
      badges += `<span class="badge ${badgeClass} me-1">${badgeText}</span>`;
    }
    
    // Status badges
    if (d.data.openPosition) {
      badges += `<span class="badge bg-warning text-dark me-1">Open Position</span>`;
    } else if (d.data.active === 0) {
      badges += `<span class="badge bg-secondary me-1">Inactive</span>`;
    }
    
    return badges ? `<div class="mt-2">${badges}</div>` : '';
  }

  private getButtonContent({ node }: any): string {
    if (!node || !node.data || node.data.id === -1 || !node.data._directSubordinates) {
      return '';
    }
    
    return `
      <div class="btn btn-sm shadow-sm" 
           style="background-color:${node.data.hire_date_color || '#6c757d'};color:white;border:none;font-size:12px;">
        <i class="mdi ${node.children ? 'mdi-chevron-up' : 'mdi-chevron-down'} me-1"></i>
        ${node.data._directSubordinates}
      </div>
    `;
  }

  private updateLinks(d: any, i: any, arr: any): void {
    if (!d || !d.data) {
      console.warn('updateLinks called with invalid data:', d);
      return;
    }
    
    d3.select(this)
      .attr('stroke', (d: any) => d?.data?._upToTheRootHighlighted ? '#0d6efd' : '#dee2e6')
      .attr('stroke-width', (d: any) => d?.data?._upToTheRootHighlighted ? 3 : 2);

    if (d.data._upToTheRootHighlighted) {
      d3.select(this).raise();
    }
  }

  private updateNodes(d: any, i: any, arr: any): void {
    if (!d || !d.data) {
      console.warn('updateNodes called with invalid data:', d);
      return;
    }
    
    d3.select(this)
      .select('.node-rect')
      .attr('stroke', (d: any) => {
        if (d?.data?._highlighted || d?.data?._upToTheRootHighlighted) return '#0d6efd';
        return 'none';
      })
      .attr('stroke-width', (d: any) => {
        if (d?.data?._highlighted || d?.data?._upToTheRootHighlighted) return 3;
        return 0;
      });
  }

  private onNodeClick = (d: any): void => {
    if (!d || !d.data) {
      console.warn('onNodeClick called with invalid data:', d);
      return;
    }
    
    if (d.data.id === -1) return; // Skip virtual root

    // Update URL params
    this.router.navigate(['.'], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: 'merge',
      queryParams: { user_edit: d.data.id }
    });

    // Highlight selected node
    this.clearHighlighting();
    d.data._highlighted = true;
    this.selectedUserId = d.data.id;
    this.chart.render();

    // Open user modal
    const modalRef = this.userModalService.open(d.data.id);
    
    // Listen for image upload success events
    modalRef.componentInstance.imageUpdated.subscribe((event: {userId: string, imageUrl: string}) => {
      this.handleImageUpdate(event.userId, event.imageUrl);
    });
    
    modalRef.result.then(
      (updatedData: any) => {
        this.handleUserUpdate(d, updatedData);
      },
      () => {
        // Modal dismissed - clear highlighting
        this.clearHighlighting();
        this.chart.render();
      }
    );
  };

  private handleUserUpdate(nodeData: any, updatedData: any): void {
    // Update node data
    Object.assign(nodeData.data, {
      ...updatedData,
      name: `${updatedData.first || ''} ${updatedData.last || ''}`.trim(),
      imageUrl: updatedData.image || 'assets/images/default-user.png',
      bgColor: this.getEmployeeColor(updatedData.hire_date),
      hire_date_color: updatedData.openPosition ? 'red' : this.getEmployeeColor(updatedData.hire_date)
    });

    // Update chart data
    const chartData = this.chart.getChartState().data;
    const updatedChartData = chartData.map((item: any) => 
      item.id === nodeData.data.id ? { ...item, ...nodeData.data } : item
    );

    // Re-render chart
    if (nodeData.data.parentId !== updatedData.parentId) {
      this.chart.data(updatedChartData).setCentered(nodeData.data.id).render();
    } else {
      this.chart.data(updatedChartData).render();
    }

    // Remove node if deactivated
    if (updatedData.access === 100 || updatedData.active === 0) {
      this.chart.removeNode(nodeData.data.id).render();
    }
  }

  // Public methods for UI controls
  toggleCompactMode(): void {
    if (!this.chart || !this.chart.data()) {
      console.warn('Chart not initialized or no data available');
      return;
    }
    try {
      this.compactMode = !this.compactMode;
      this.chart.compact(this.compactMode).render().fit();
    } catch (error) {
      console.error('Error toggling compact mode:', error);
    }
  }

  toggleImages(): void {
    if (!this.chart || !this.chart.data()) {
      console.warn('Chart not initialized or no data available');
      return;
    }
    try {
      this.showImages = !this.showImages;
      this.chart
        .nodeHeight((d: any) => {
          if (!d || !d.data) return 160;
          if (d.data.id === -1) return 100;
          if (d.data.orgChartPlaceHolder) return 140;
          return this.showImages ? 200 : 160;
        })
        .render()
        .fit();
    } catch (error) {
      console.error('Error toggling images:', error);
    }
  }

  expandAll(): void {
    if (!this.chart) {
      console.warn('Chart not initialized');
      return;
    }
    const data = this.chart.data();
    if (!data || !Array.isArray(data)) {
      console.warn('No chart data available');
      return;
    }
    try {
      data.forEach((d: any) => {
        d._expanded = true;
        this.chart.setExpanded(d.id, true);
      });
      this.chart.render();
    } catch (error) {
      console.error('Error expanding all nodes:', error);
    }
  }

  collapseAll(): void {
    if (!this.chart) {
      console.warn('Chart not initialized');
      return;
    }
    const data = this.chart.data();
    if (!data || !Array.isArray(data)) {
      console.warn('No chart data available');
      return;
    }
    try {
      data.forEach((d: any) => {
        d._expanded = false;
        this.chart.setExpanded(d.id, false);
      });
      this.chart.render();
    } catch (error) {
      console.error('Error collapsing all nodes:', error);
    }
  }

  centerOnNode(nodeId: number): void {
    if (!this.chart || !this.chart.data()) {
      console.warn('Chart not initialized or no data available');
      return;
    }
    try {
      this.chart.setCentered(nodeId).render();
    } catch (error) {
      console.error('Error centering on node:', error);
    }
  }

  refreshData(): void {
    this.loadData();
  }

  // Search functionality
  onSearch(searchEvent: any): void {
    const searchTerm = searchEvent?.username || '';
    const userId = searchEvent?.id;

    this.router.navigate(['.'], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: 'merge',
      queryParams: {
        username: searchTerm,
        userId: userId
      }
    });

    if (userId) {
      this.filterToUser(userId);
    } else {
      this.showAllUsers();
    }
  }

  private filterToUser(userId: number): void {
    if (!this.chart || !this.originalData || this.originalData.length === 0) {
      console.warn('Chart not initialized or no original data available');
      return;
    }
    try {
      // Implementation for filtering to specific user and their hierarchy
      const filteredData = this.getSubtreeData(userId);
      if (filteredData && filteredData.length > 0) {
        this.chart.data(filteredData).render().fit();
      } else {
        console.warn('No data found for user:', userId);
      }
    } catch (error) {
      console.error('Error filtering to user:', error);
    }
  }

  private showAllUsers(): void {
    if (!this.chart || !this.originalData || this.originalData.length === 0) {
      console.warn('Chart not initialized or no original data available');
      return;
    }
    try {
      this.chart.data(structuredClone(this.originalData)).render().fit();
      this.expandInitialNodes();
    } catch (error) {
      console.error('Error showing all users:', error);
    }
  }

  private getSubtreeData(rootUserId: number): any[] {
    if (!this.originalData || !Array.isArray(this.originalData)) {
      console.warn('No original data available for subtree filtering');
      return [];
    }
    // Get all children of the specified user
    const allChildren = this.getAllChildren(this.originalData, rootUserId);
    allChildren.push(rootUserId);

    return this.originalData.filter(emp => allChildren.includes(emp.id));
  }

  private getAllChildren(data: any[], parentId: number): number[] {
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.reduce((children, emp) => {
      if (emp && emp.parentId === parentId) {
        children.push(emp.id, ...this.getAllChildren(data, emp.id));
      }
      return children;
    }, []);
  }

  private expandInitialNodes(): void {
    if (!this.chart) {
      console.warn('Chart not initialized for expanding initial nodes');
      return;
    }
    const data = this.chart.data();
    if (!data || !Array.isArray(data)) {
      console.warn('No chart data available for expanding initial nodes');
      return;
    }
    try {
      data.forEach((d: any) => {
        if (d && d.org_chart_expand === 1) {
          d._expanded = true;
          this.chart.setExpanded(d.id, true);
        }
      });
      this.chart.render();
    } catch (error) {
      console.error('Error expanding initial nodes:', error);
    }
  }

  private clearHighlighting(): void {
    if (this.chart && this.chart.clearHighlighting) {
      this.chart.clearHighlighting();
    }
  }

  // Helper methods
  private getEmployeeColor(hireDate: string): string {
    if (!hireDate) return '#6c757d';

    const now = moment();
    const hire = moment(hireDate);
    const monthsDiff = now.diff(hire, 'months');

    if (monthsDiff < 1) return '#ff6b35';      // Orange - New hire
    if (monthsDiff < 6) return '#00c3ff';      // Light blue - Recent hire  
    if (monthsDiff < 12) return '#4b0082';     // Purple - Medium tenure
    return '#002d62';                          // Dark blue - Long tenure
  }

  private getEmployeeTypeBadge(employeeType: string): string {
    switch (employeeType) {
      case 'FT': return 'bg-success';
      case 'PT': return 'bg-warning';
      case 'CT': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  private getEmployeeTypeText(employeeType: string): string {
    switch (employeeType) {
      case 'FT': return 'Full Time';
      case 'PT': return 'Part Time';
      case 'CT': return 'Contract';
      default: return 'Unknown';
    }
  }

  private fixDataStructure(data: any[]): any[] {
    // Fix orphan nodes
    const nodeIds = new Set(data.map(node => node.id));
    data = data.map(node => {
      if (node.parentId && !nodeIds.has(node.parentId)) {
        console.warn(`Orphan node detected: ${node.first} ${node.last} (ID: ${node.id})`);
        return { ...node, parentId: null };
      }
      return node;
    });

    // Handle multiple roots by creating virtual root
    const rootNodes = data.filter(node => 
      node.parentId === null || 
      node.parentId === undefined || 
      node.parentId === 0 ||
      node.parentId === ""
    );

    if (rootNodes.length > 1) {
      const virtualRoot = {
        id: -1,
        first: "Organization",
        last: "",
        name: "Organization",
        title: "Root",
        parentId: null,
        image: "assets/images/organization-icon.png",
        orgChartPlaceHolder: true,
        showImage: false,
        openPosition: false,
        org_chart_expand: 1,
        access: null,
        active: 1,
        isEmployee: 1,
        hire_date: null
      };

      data = data.map(node => {
        if (rootNodes.some(root => root.id === node.id)) {
          return { ...node, parentId: -1 };
        }
        return node;
      });

      data = [virtualRoot, ...data];
    }

    return data;
  }

  handleImageUpdate(userId: string, imageUrl: string) {
    // Update the local data with the new image URL
    const userIdNum = parseInt(userId);
    const userNode = this.originalData.find(user => user.id === userIdNum);
    
    if (userNode) {
      // Add cache-busting parameter to force browser to reload image
      const cacheBustUrl = imageUrl + '?t=' + new Date().getTime();
      
      // Update the user's image in the local data
      userNode.image = cacheBustUrl;
      userNode.imageUrl = cacheBustUrl;
      
      // Also update any existing chart data
      if (this.chart) {
        const chartData = this.chart.data();
        if (chartData && Array.isArray(chartData)) {
          const chartNode = chartData.find((node: any) => node.id === userIdNum);
          if (chartNode) {
            chartNode.image = cacheBustUrl;
            chartNode.imageUrl = cacheBustUrl;
          }
        }
      }
      
      // Force refresh the chart to show the new image
      console.log('Updating user image in modern org chart:', userId, cacheBustUrl);
      
      // Re-render the chart with updated data instead of fetching from API
      if (this.chart) {
        this.chart.render();
      }
    }
  }
}