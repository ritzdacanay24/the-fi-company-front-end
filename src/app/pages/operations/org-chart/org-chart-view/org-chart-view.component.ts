import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { OrgChartModule } from "../org-chart.module";

import { Component, OnInit, AfterViewInit, OnDestroy, Input, ViewChild, ElementRef } from "@angular/core";
import { OrgChart } from "d3-org-chart";
import { UserService } from "@app/core/api/field-service/user.service";
import { UserModalService } from "@app/pages/maintenance/user/user-modal/user-modal.component";
import { accessRight } from "@app/pages/maintenance/user/user-constant";

import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { DepartmentModalComponent } from "../department-modal/department-modal.component";
import { DepartmentService, Department } from "../services/department.service";
import { NgbDropdownModule } from "@ng-bootstrap/ng-bootstrap";
import { FormsModule } from "@angular/forms";
import moment from "moment";
import * as d3 from "d3";

@Component({
  standalone: true,
  imports: [SharedModule, OrgChartModule, UserSearchV1Component, DepartmentModalComponent, NgbDropdownModule, FormsModule],
  selector: "app-org-chart-view",
  templateUrl: "./org-chart-view.component.html",
  styleUrls: [],
  styles: [`
    .dropdown-menu {
      min-width: 300px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 1050;
    }
    
    .dropdown-item {
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #f8f9fa;
    }
    
    .dropdown-item:last-child {
      border-bottom: none;
    }
    
    .dropdown-item:hover {
      background-color: #f8f9fa;
    }
    
    .dropdown-header {
      font-size: 0.875rem;
      font-weight: 600;
      color: #6c757d;
      background-color: #e9ecef;
    }
    
    .fw-semibold {
      font-weight: 600;
    }

  `]
})
export class OrgChartViewComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    private userService: UserService,
    private userModalService: UserModalService,
    private departmentService: DepartmentService
  ) {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.query = params["username"];
      this.userId = params["userId"];
      this.user_edit = params["user_edit"];
    });
  }

  userId;
  user_edit;

  @ViewChild("chartContainer") chartContainer: ElementRef;
  @Input() data: any[];
  @Input() readOnly: boolean = false; // New input to control read-only mode
  chart: any; // Add proper typing for the chart
  
  // Layout toggle properties
  isHorizontalLayout = false; // Default to vertical
  layoutIcon = 'mdi-view-sequential'; // Default icon for vertical layout

  // Department management properties
  departments: Department[] = [];
  showDepartmentModal = false;
  currentDepartment: Department | null = null;

  // User assignment properties
  selectedUser: any = null;
  selectedUserId: any = null;
  selectedDepartmentId: any = null;

  clearMark() {
    if (this.chart && this.chart.clearHighlighting) {
      this.chart.clearHighlighting();
    }
    this.currentView = null;
    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        user_edit: null,
      },
    });
  }

  toggleLayout() {
    this.isHorizontalLayout = !this.isHorizontalLayout;
    this.layoutIcon = this.isHorizontalLayout ? 'mdi-view-parallel' : 'mdi-view-sequential';
    
    if (this.chart) {
      // Update the chart layout and re-render
      this.updateChartLayout();
    }
  }

  getNodeContent(d, i, arr, state) {
    const color = '#FFFFFF';
    const imageDiffVert = 25 + 2;
    
    // Handle virtual root node
    if (d.data.id === -1) {
      return `
        <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
          <div style="font-family: 'Inter', sans-serif;background-color:#6c757d;margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border: 1px solid #E4E2E9;display:flex;align-items:center;justify-content:center;">
            <div style="color:white;text-align:center;">
              <div style="font-size:15px;font-weight:bold">${d.data.name || d.data.first}</div>
              <div style="font-size:10px">Organization Structure</div>
            </div>
          </div>
        </div>
      `;
    }

    // Handle "Unassigned" section node - MATCHING REGULAR CARD DESIGN
    if (d.data.id === -2) {
      return `
        <div style="width:${d.width}px;height:${d.height}px;background:#ffc107;border:1px solid #ddd;border-radius:8px;position:relative;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center;padding:6px 4px 25px 4px;">
          <div style="position:absolute;top:3px;right:5px;font-size:9px;color:#666;">#${d.data.id}</div>
          <div style="margin-top:4px;">
            <div style="width:40px;height:40px;border-radius:50%;border:2px solid #eee;display:block;margin:0 auto;background:#fff;display:flex;align-items:center;justify-content:center;">
              <i style="font-size:20px;color:#ffc107;">⚠️</i>
            </div>
          </div>
          <div style="font-size:11px;font-weight:bold;color:#000;margin-top:5px;line-height:1.1;padding:0 2px;">
            ${d.data.name || d.data.first}
          </div>
          <div style="font-size:9px;color:#666;margin-top:2px;line-height:1.0;padding:0 2px;margin-bottom:5px;">
            ${d.data.title || ""}
          </div>
        </div>
      `;
    }

    // Determine if this is a department placeholder or regular user
    const isDepartment = d.data.type === 3 && d.data.orgChartPlaceHolder === 1;
    
    // CLEAN SIMPLE CARDS
    return `
      <div 
        style="width:${d.width}px;height:${d.height}px;background:${isDepartment ? '#e3f2fd' : 'white'};border:1px solid ${isDepartment ? '#2196f3' : '#ddd'};border-radius:8px;position:relative;text-align:center;padding:6px 4px 25px 4px;">
        <div style="position:absolute;top:3px;right:5px;font-size:9px;color:#999;">#${d.data.id}</div>
        ${isDepartment ? 
          `<div style="margin-top:4px;">
            <div style="width:40px;height:40px;border-radius:50%;border:2px solid #2196f3;display:block;margin:0 auto;background:#ffffff;display:flex;align-items:center;justify-content:center;font-size:20px;">
              🏢
            </div>
          </div>` :
          `<div style="margin-top:4px;">
            <img src="${d.data.imageUrl}" style="width:40px;height:40px;border-radius:50%;border:2px solid #eee;display:block;margin:0 auto;" />
          </div>`
        }
        <div style="font-size:11px;font-weight:bold;color:#333;margin-top:5px;line-height:1.1;padding:0 2px;">
          ${isDepartment ? (d.data.org_chart_department || d.data.department || d.data.first) : `${d.data.first} ${d.data.last}`}
        </div>
        <div style="font-size:9px;color:#666;margin-top:2px;line-height:1.0;padding:0 2px;margin-bottom:5px;">
          ${isDepartment ? 'Department' : (d.data.title || "")}
        </div>

      </div>
    `;
  }

  updateChartLayout(): void {
    if (!this.chart) return;

    // Force update nodeContent to ensure it's using our custom function
    this.chart.nodeContent(this.getNodeContent.bind(this));

    if (this.isHorizontalLayout) {
      // Horizontal layout - using 'left' like in the example
      this.chart.layout('left').render().fit();
    } else {
      // Vertical layout - using 'top' like in the example
      this.chart.layout('top').render().fit();
    }
  }

  ngAfterViewInit() {
    this.chart = new OrgChart();
  }

  expandImmediate() {
    if (!this.chart) {
      console.warn('Chart not initialized yet');
      return;
    }
    
    const data = this.chart.data();
    if (!data || !Array.isArray(data)) {
      console.warn('Chart data not available');
      return;
    }

    // Mark all previously expanded nodes for collapse
    data.forEach((d) => (d._expanded = false));
    
    // Loop over data and check if input value matches any name
    data.forEach((d) => {
      if (d.org_chart_expand === 1) {
        d._expanded = true;
        this.chart.setExpanded(d.id, true).render();
      }
    });
  }

  addNode() {
    const modalRef: any = this.userModalService.open(null);
    modalRef.result.then(
      (data: any) => {
        const newNodeData = {
          ...data,
          name: data.first + " " + data.last || "",
          imageUrl: data.image || "assets/images/default-user.png",
          bgColor: this.bgColor(data),
        };

        // Add to original data
        this.originalData.push(newNodeData);
        
        // Add to chart and render
        this.chart.addNode(newNodeData).setCentered(newNodeData.id).render();
      },
      () => { }
    );
  }

  orgChart;

  query = null;

  notifyParent($event) {
    this.query = $event?.username;

    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        username: $event?.username,
        userId: $event?.id,
      },
    });

    this.filterChart($event?.id || null);

    if (!$event?.id) {
      this.expandImmediate();
    }
  }

  filterChart(id) {
    if (!this.chart) {
      console.warn('Chart not initialized yet');
      return;
    }

    // Get input value
    const value = id;

    // Clear previous highlighting
    this.chart.clearHighlighting();

    // Get chart nodes
    if (!value || Number(value) === 0) {
      this.chart.data(structuredClone(this.originalData)).render().fit();
    } else {
      let data = this.viewOnlyTree(Number(value) === 0 ? null : Number(value));
      this.chart.data(data).render().fit();
    }
  }

  defaultExpand() {
    if (!this.chart) {
      console.warn('Chart not initialized yet');
      return;
    }
    
    const data = this.chart.data();
    if (!data || !Array.isArray(data)) {
      console.warn('Chart data not available');
      return;
    }

    // Loop over data and check if input value matches any name
    data.forEach((d) => {
      if (d._directSubordinates === 1 || d.org_chart_expand === 1) {
        // If matches, mark node as highlighted
        d._expanded = true;
        this.chart.setExpanded(d.id, true).render();
      }
    });
  }
  isMoreThan6MonthsAgo = (dateString: string) => {
    if (!dateString) return "gray"; // No hire date set
    
    const inputDate = moment(dateString);
    if (!inputDate.isValid()) {
      return "gray"; // Invalid date
    }

    const now = moment();
    const oneMonthAgo = moment().subtract(1, 'months');
    const sixMonthsAgo = moment().subtract(6, 'months');
    const twelveMonthsAgo = moment().subtract(12, 'months');

    if (inputDate.isAfter(oneMonthAgo)) {
      // Less than 1 month - New Position
      return 'orange';
    } else if (inputDate.isAfter(sixMonthsAgo)) {
      // 1-6 months - Less than 6 months
      return "rgb(0, 195, 255)";
    } else if (inputDate.isAfter(twelveMonthsAgo)) {
      // 6-12 months - Less than 12 months
      return "#4B0082";
    } else {
      // More than 12 months - 12+ months
      return "#002D62";
    }
  }
  currentView;
  onNodeClick = (d) => {
    // Prevent clicking on virtual root node
    if (d.data.id === -1) {
      return;
    }

    // Prevent clicking on "Unassigned" section node
    if (d.data.id === -2) {
      return;
    }

    // If in read-only mode, only highlight the node, don't open modal
    if (this.readOnly) {
      this.chart.clearHighlighting();
      d.data._highlighted = true;
      this.currentView = d.data.id;
      
      try {
        this.chart.render();
      } catch (error) {
        console.error('Error rendering chart after node click:', error);
      }
      return;
    }

    // Don't set the user_edit query parameter to avoid triggering reopening
    // this.router.navigate([`.`], {
    //   relativeTo: this.activatedRoute,
    //   queryParamsHandling: "merge",
    //   queryParams: {
    //     user_edit: d.data.id,
    //   },
    // });

    this.chart.clearHighlighting();
    d.data._highlighted = true;
    this.currentView = d.data.id;
    
    try {
      this.chart.render();
    } catch (error) {
      console.error('Error rendering chart after node click:', error);
      if (error.message && error.message.includes('missing:')) {
        const missingId = error.message.split('missing:')[1].trim();
        console.error(`Missing node ID: ${missingId}. This usually means a user references a parent that doesn't exist in the dataset.`);
        alert(`Chart data integrity issue: Missing user ID ${missingId}. Please contact support.`);
      } else {
        alert('Chart rendering error. Please refresh the page.');
      }
    }

    const modalRef: any = this.userModalService.open(d.data.id);
    
    // Listen for image upload success events
    modalRef.componentInstance.imageUpdated.subscribe((event: {userId: string, imageUrl: string}) => {
      console.log('Org Chart received imageUpdated event:', event);
      this.handleImageUpdate(event.userId, event.imageUrl);
    });
    
    modalRef.result.then(
      (data: any) => {
        console.log(data, 'data from modal');
        // Update node data first
        const updatedNodeData = {
          ...d.data,
          ...data,
          name: (data.first || "") + " " + (data.last || ""),
          imageUrl: data.image || "assets/images/default-user.png",
          bgColor: this.bgColor(data),
          hire_date_color: this.bgColor(data)
        };
        
        // Update the original data array
        this.originalData = this.originalData.map((e) => {
          return d.data.id == e.id ? { ...e, ...data } : e;
        });

        // Handle removal cases first
        if (data.access == 100 || data.active == 0) {
          this.chart.removeNode(d.data.id).render();
          this.currentView = null;
          return;
        }

        // Get current chart data and update it
        let chartData = this.chart.data().map((node) => {
          if (node.id == d.data.id) {
            return { ...node, ...updatedNodeData };
          }
          return node;
        });

        // Apply the updated data
        this.chart.data(chartData);
        
        // Handle position changes
        if (d.data.parentId != data.parentId) {
          this.chart.setCentered(d.data.id);
        }
        
        // Render the chart with updated data
        this.chart.render();
        
        // Re-apply highlighting to the updated node
        setTimeout(() => {
          const updatedNode = this.chart.data().find(n => n.id === d.data.id);
          if (updatedNode) {
            updatedNode._highlighted = true;
            this.chart.render();
          }
        }, 100);
      },
      () => {
        console.log('modal dismissed');
        // Modal cancelled - do nothing
      }
    );
  };

  onNodeDrop = (draggedNode, targetNode) => {
    // Prevent dropping on virtual root or unassigned nodes
    if (targetNode.data.id === -1 || targetNode.data.id === -2) {
      console.log('Cannot drop on virtual nodes');
      return false;
    }

    // Prevent dropping on self
    if (draggedNode.data.id === targetNode.data.id) {
      console.log('Cannot drop node on itself');
      return false;
    }

    // Check if target is a department placeholder or regular user
    const isDepartmentTarget = targetNode.data.type === 3 && targetNode.data.orgChartPlaceHolder === 1;
    const isUserTarget = targetNode.data.type !== 3 && !targetNode.data.orgChartPlaceHolder;

    if (!isDepartmentTarget && !isUserTarget) {
      console.log('Can only drop on departments or users');
      return false;
    }

    // Get department name based on target type
    let departmentName = '';
    let departmentId = null;

    if (isDepartmentTarget) {
      // Target is a department placeholder
      departmentName = targetNode.data.org_chart_department || targetNode.data.department || targetNode.data.first;
      departmentId = targetNode.data.id;
    } else if (isUserTarget) {
      // Target is a user - assign to their department
      departmentName = targetNode.data.org_chart_department || targetNode.data.department;
      // Find the department placeholder for this department
      const deptPlaceholder = this.originalData.find(d => 
        d.type === 3 && d.orgChartPlaceHolder === 1 && 
        (d.org_chart_department === departmentName || d.department === departmentName)
      );
      departmentId = deptPlaceholder?.id;
    }

    if (!departmentName || !departmentId) {
      console.log('Could not determine target department');
      return false;
    }

    // Show confirmation dialog
    const confirmation = confirm(`Assign ${draggedNode.data.first} ${draggedNode.data.last} to department "${departmentName}"?`);
    if (!confirmation) {
      return false;
    }

    // Call the assignment API
    this.departmentService.assignUser({
      user_id: draggedNode.data.id,
      department_id: departmentId
    }).subscribe({
      next: (response) => {
        if (response.success) {
          // Update the dragged node's department in originalData
          const nodeIndex = this.originalData.findIndex(d => d.id === draggedNode.data.id);
          if (nodeIndex !== -1) {
            this.originalData[nodeIndex] = {
              ...this.originalData[nodeIndex],
              department: departmentName,
              org_chart_department: departmentName
            };
          }

          // Update the chart node
          draggedNode.data.department = departmentName;
          draggedNode.data.org_chart_department = departmentName;

          // Refresh the chart to show updated department assignment
          this.chart.render();

          console.log(`Successfully assigned ${draggedNode.data.first} ${draggedNode.data.last} to ${departmentName}`);
          
          // Show success message
          alert(`✓ ${draggedNode.data.first} ${draggedNode.data.last} has been assigned to ${departmentName}`);
        } else {
          alert(`Error: ${(response as any).error || 'Assignment failed'}`);
        }
      },
      error: (error) => {
        console.error('Error assigning user to department:', error);
        alert('Error assigning user to department');
      }
    });

    return true; // Allow the drop
  };

  bgColor(data) {
    if (!data) {
      return "#002D62"; // Default color for missing data
    }
    
    return this.isMoreThan6MonthsAgo(data.hire_date);
    // for (let ii = 0; ii < accessRight.length; ii++) {
    //   if (accessRight[ii].value == data.employeeType) {
    //     return accessRight[ii].bgColor;
    //   }
    // }

    // return "#3AB6E3"; // This is unreachable code but keeping for reference
  }

  locations = ["All", "Seattle", "Las Vegas"];

  getChildren = (array, idToFind) => {
    return array.reduce((r, { id, parentId }) => {
      if (parentId === idToFind) {
        r.push(id, ...this.getChildren(array, id));
      }
      return r;
    }, []);
  };

  findParent(id) {
    let ddd = structuredClone(this.originalData);
    for (let i = 0; i < ddd.length; i++) {
      if (id == ddd[i].id) {
        return ddd[i];
      }
    }
  }

  viewOnlyTree(userIdSearch = null) {
    let ddd = structuredClone(this.originalData);
    let allParentsAndChilds = this.getChildren(ddd, userIdSearch);

    allParentsAndChilds.push(userIdSearch);

    let data = [];
    for (let i = 0; i < ddd.length; i++) {
      if (ddd[i].parentId == null && userIdSearch != null) {
        ddd[i].parentId = -1;
      }
      if (userIdSearch == ddd[i].id) {
        if (ddd[i].orgChartPlaceHolder) {
          let parentId = this.findParent(ddd[i].parentId);
          parentId.parentId = null;
          data.push(parentId);
        } else {
          ddd[i].parentId = null;
        }
      }
    }
    this.chart.data(data).compact(false).render();

    let alot = false;
    for (let i = 0; i < ddd.length; i++) {
      if (allParentsAndChilds.includes(ddd[i]?.id)) {
        ddd[i]._expanded = true;
        if (ddd[i]._directSubordinates > 5) {
          alot = true;
        }
        data.push(ddd[i]);
      }
    }

    if (alot) this.chart.data(data).compact(true).render();

    return data;
  }

  checkHireColor(yourMoment) {
    if (!yourMoment) {
      return "gray";
    }

    let A = moment();
    let B = moment(yourMoment);
    let months = A.diff(B, "months");

    if (months > 12) {
      return "#002D62";
    } else if (months > 6) {
      return "#4B0082";
    } else if (months >= 1) {
      return "rgb(0, 195, 255)";
    } else {
      return "orange";
    }
  }

  shouldShowItem = (item: any, value = true): any => {
    // if (value) {
    //   item?.forEach((d) => {
    //     d?._children?.forEach((e) => {
    //       e.data._expanded = true;
    //       this.chart.setExpanded(e.data.id, true).render();

    //       if (e._children) {
    //         this.shouldShowItem(e._children, false);
    //       }
    //     });
    //   });
    // } else {
    //   // item.forEach((d) => {
    //   //   d.data._expanded = true;
    //   //   this.chart.setExpanded(d.data.id, true).render();
    //   //   if (d._children) {
    //   //     this.shouldShowItem(d._children, false);
    //   //   }
    //   // });
    // }
    // // Logic to display the item here based on result
  };

  async hasSubordinates(id?) {
    return await this.userService.hasSubordinates(id);
  }

  handleMultipleRoots(data: any[]): any[] {
    // Find all root nodes (nodes without parents)
    const rootNodes = data.filter(node => 
      node.parentId === null || 
      node.parentId === undefined || 
      node.parentId === 0
    );

    // If there's only one root, return data as is
    if (rootNodes.length <= 1) {
      return data;
    }

    // Create a virtual root node
    const virtualRoot = {
      id: -1,
      name: "Organization",
      title: "Root",
      parentId: null,
      bgColor: "#f8f9fa",
      imageUrl: "assets/images/organization-icon.png",
      orgChartPlaceHolder: true,
      showImage: false,
      openPosition: false,
      hire_date_color: "#6c757d",
      org_chart_expand: 1,
      first: "Organization",
      last: "",
      access: null
    };

    // Update all root nodes to point to the virtual root
    const updatedData = data.map(node => {
      if (rootNodes.some(root => root.id === node.id)) {
        return { ...node, parentId: -1 };
      }
      return node;
    });

    // Add the virtual root to the beginning of the array
    return [virtualRoot, ...updatedData];
  }

  findAndFixOrphanNodes(data: any[]): any[] {
    const nodeIds = new Set(data.map(node => node.id));
    
    return data.map(node => {
      // If parentId exists but parent node doesn't exist in data, make it a root
      if (node.parentId && !nodeIds.has(node.parentId)) {
        console.warn(`Orphan node detected: ${node.name} (ID: ${node.id}) has invalid parentId: ${node.parentId}`);
        return { ...node, parentId: null };
      }
      return node;
    });
  }

  originalData;
  
  // Simplified state management - just track basic state
  private currentZoom = 1;
  private currentPan = { x: 0, y: 0 };

  // Methods for leadership insights
  getNewHires(): number {
    if (!this.originalData) return 0;
    return this.originalData.filter(emp => {
      if (!emp.hire_date) return false;
      const hireDate = moment(emp.hire_date);
      const oneMonthAgo = moment().subtract(1, 'months');
      return hireDate.isAfter(oneMonthAgo);
    }).length;
  }

  getOpenPositions(): number {
    if (!this.originalData) return 0;
    return this.originalData.filter(emp => emp.openPosition).length;
  }

  getEstablishedEmployees(): number {
    if (!this.originalData) return 0;
    return this.originalData.filter(emp => {
      if (!emp.hire_date) return false;
      const hireDate = moment(emp.hire_date);
      const sixMonthsAgo = moment().subtract(6, 'months');
      return hireDate.isBefore(sixMonthsAgo);
    }).length;
  }

  getPendingData(): number {
    if (!this.originalData) return 0;
    return this.originalData.filter(emp => !emp.hire_date).length;
  }
  async getData(id?) {
    try {
      // Use original user-based org chart (simple and working)
      let data: any = await this.userService.getOrgchart({
        active: 1,
        isEmployee: 1,
      });

      data = this.fixDataStructure(data);

      data.sort((a, b) => {
        let username = (a.first || "") + " " + (a.last || "");
        let username1 = (b.first || "") + " " + (b.last || "");
        return username.localeCompare(username1);
      });

      let e = [];
      
      for (let i = 0; i < data.length; i++) {
        data[i].bgColor = this.bgColor(data[i]);

        // Add cache-busting to image URLs to prevent browser caching issues
        let imageUrl = data[i].image || "assets/images/default-user.png";
        if (data[i].image && !data[i].image.startsWith("assets/")) {
          imageUrl = data[i].image + "?t=" + new Date().getTime();
        }

        e.push({
          id: data[i].id,
          bgColor: data[i].bgColor,
          name: (data[i].first || "") + " " + (data[i].last || ""),
          first: data[i].first || "",
          last: data[i].last || "",
          access: data[i].access,
          parentId: data[i].parentId,
          title: data[i].title || "",
          imageUrl: imageUrl,
          orgChartPlaceHolder: data[i].orgChartPlaceHolder,
          showImage: data[i].showImage,
          openPosition: data[i].openPosition,
          hire_date_color: data[i].openPosition
            ? "red"
            : this.checkHireColor(data[i].hire_date),
          org_chart_expand: data[i].org_chart_expand,
        });
      }

      // Validate data integrity - check for missing parent references
      const allIds = new Set(e.map(node => node.id));
      const invalidNodes = [];
      
      e.forEach(node => {
        if (node.parentId && !allIds.has(node.parentId)) {
          invalidNodes.push(node);
          console.warn(`Node ${node.id} (${node.name}) references missing parent ${node.parentId}. Setting parentId to null.`);
          node.parentId = null; // Fix the invalid reference
        }
      });
      
      if (invalidNodes.length > 0) {
        console.warn(`Fixed ${invalidNodes.length} invalid parent references:`, invalidNodes.map(n => `${n.id}->${n.parentId}`));
      }

      if (!id) {
        this.chart
          .container(this.chartContainer?.nativeElement)
          .data(e)
          .onNodeClick(this.onNodeClick)
          .nodeContent(this.getNodeContent.bind(this))

          .nodeHeight((d) => {
            if (d.data.id === -1 || d.data.id === -2) return 90;
            if (d.data.orgChartPlaceHolder) return 90;
            return 90;
          })
          .nodeWidth((d) => {
            if (d.data.id === -1 || d.data.id === -2) return 180;
            if (d.data.orgChartPlaceHolder) return 180;
            return 180;
          })
          .childrenMargin((d) => 50)
          .compactMarginBetween((d) => 35)
          .compactMarginPair((d) => 30)
          .compact(false)
          .onExpandOrCollapse((d) => {
            let children = d.children;

            this.shouldShowItem(children);
            // children.forEach((d) => {
            //   // d?._children?.forEach((e) => {
            //   //   e.data._expanded = true;
            //   //   this.chart.setExpanded(e.data.id, true).render();
            //   // });
            // });
          })
          .buttonContent(({ node, state }) => {
            // Don't show expand/collapse button for virtual root only
            if (node.data.id === -1) {
              return '';
            }
            
            return `<div style="color:#fff;border-radius:3px;padding:2px 6px;font-size:10px;margin:auto auto;background-color:${node.data.hire_date_color
              };border: 1px solid #E4E2E9;white-space:nowrap;min-width:25px;"> <span style="font-size:10px">${node.children
                ? `<i class="mdi mdi-chevron-up"></i>`
                : `<i class="mdi mdi-chevron-down"></i>`
              }</span> ${node.data._directSubordinates} </div>`;
          })

          .linkUpdate(function (d, i, arr) {
            d3.select(this)
              .attr("stroke", (d) =>
                d.data._upToTheRootHighlighted ? "#318CE7" : "#2CAAE5"
              )
              .attr("stroke-width", (d) =>
                d.data._upToTheRootHighlighted ? 10 : 2
              );

            if (d.data._upToTheRootHighlighted) {
              d3.select(this).raise();
            }
          })
          .nodeUpdate(function (d, i, arr) {
            d3.select(this)
              .select(".node-rect")
              .attr("stroke", (d) =>
                d.data._highlighted || d.data._upToTheRootHighlighted
                  ? "#318CE7"
                  : "none"
              )
              .attr(
                "stroke-width",
                d.data._highlighted || d.data._upToTheRootHighlighted ? 20 : 2
              );
          })
          .render()
          .fit();


      } else {
        this.chart.data(e).setCentered(id).render();
      }
      // .expandAll()
      // this.defaultExpand();

      let d = this.chart.data();
      this.originalData = structuredClone(d);
      this.expandImmediate();

      if (this.query) {
        this.filterChart(this.userId);
      }

      // if (this.user_edit) {
      //   this.currentView = this.user_edit;
      //   this.chart
      //     .data(e)
      //     .setHighlighted(this.user_edit)
      //     .setCentered(this.user_edit)
      //     .render();
      // }

      this.compact()

    } catch (error) {
      console.error('Error loading org chart data:', error);
    }
  }

  horizontal() {
    this.chart
      .childrenMargin((d) => {
        if (d.data.orgChartPlaceHolder) return 190;
        return 190;
      })
      .nodeHeight((d) => {
        if (d.data.orgChartPlaceHolder) return 135;
        return 190;
      })
      .compact(false)
      .setCentered()
      .render()
      .fit();
  }

  compact() {
    this.chart
      .nodeWidth((d) => 180)
      .childrenMargin((d) => 40)
      .nodeHeight((d) => 90)
      .compactMarginBetween((d) => 25)
      .compactMarginPair((d) => 20)
      .compact(true)
      .render()
  }

  ngOnInit() {
    this.getData();
    this.loadDepartments();
  }

  fixDataStructure(data: any[]): any[] {
    console.log('Original data length:', data.length);
    console.log('Sample data:', data.slice(0, 3));

    // Step 1: Find the CEO FIRST (before we modify anything)
    const ceo = data.find(node => 
      !node.parentId || 
      node.parentId === null || 
      node.parentId === undefined || 
      node.parentId === 0 ||
      node.parentId === ""
    );
    console.log('CEO identified:', ceo ? `${ceo.first} ${ceo.last} (ID: ${ceo.id})` : 'No CEO found');

    // Step 2: Identify orphan nodes and collect them
    const nodeIds = new Set(data.map(node => node.id));
    console.log('All node IDs:', Array.from(nodeIds));
    
    const orphanNodes = [];
    console.log('Processing nodes for orphans...');
    
    data = data.map(node => {
      if (node.parentId && !nodeIds.has(node.parentId)) {
        console.warn(`Orphan node detected: ${node.first} ${node.last} (ID: ${node.id}) has invalid parentId: ${node.parentId}`);
        orphanNodes.push(node);
        // Assign orphaned nodes to a special "Unassigned" parent that we'll create
        return { ...node, parentId: -2 };
      }
      return node;
    });

    console.log(`Total orphan nodes found: ${orphanNodes.length}`);

    // Step 3: If we have orphaned nodes, create ONE "Unassigned" section under the CEO
    if (orphanNodes.length > 0) {
      // Check if unassigned section already exists
      const existingUnassigned = data.find(node => node.id === -2);
      
      if (!existingUnassigned) {
        console.log(`Creating "Unassigned" section for ${orphanNodes.length} orphaned employees`);

        const unassignedSection = {
          id: -2,
          first: "Unassigned",
          last: "Employees",
          name: "Unassigned Employees",
          title: "No Current Manager",
          parentId: ceo ? ceo.id : null, // Put under CEO if found, otherwise root
          image: "assets/images/unassigned-icon.png",
          orgChartPlaceHolder: true,
          showImage: false,
          openPosition: false,
          org_chart_expand: 1,
          access: null,
          active: 1,
          isEmployee: 0, // Not a real employee
          hire_date: null,
          bgColor: "#ffc107" // Warning yellow color
        };

        // Add the unassigned section to the data
        data.push(unassignedSection);
        console.log(`Added "Unassigned" section under ${ceo ? `${ceo.first} ${ceo.last}` : 'root'} for orphaned employees:`, orphanNodes.map(n => `${n.first} ${n.last}`));
      } else {
        console.log(`"Unassigned" section already exists, using existing one for ${orphanNodes.length} orphaned employees`);
      }
    }

    // Step 4: Handle multiple roots (including the "Unassigned" section if created)
    const rootNodes = data.filter(node => 
      node.parentId === null || 
      node.parentId === undefined || 
      node.parentId === 0 ||
      node.parentId === ""
    );

    console.log(`Found ${rootNodes.length} root nodes:`, rootNodes.map(n => `${n.first} ${n.last} (ID: ${n.id})`));

    if (rootNodes.length > 1) {
      console.log('Multiple roots detected (including CEO and/or Unassigned section), creating virtual root...');
      
      // Create a virtual root node
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
        hire_date: null,
        bgColor: "#f8f9fa"
      };

      // Update all root nodes to point to the virtual root
      data = data.map(node => {
        if (rootNodes.some(root => root.id === node.id)) {
          console.log(`Connecting root node ${node.first} ${node.last} (ID: ${node.id}) to virtual root`);
          return { ...node, parentId: -1 };
        }
        return node;
      });

      // Add the virtual root to the beginning of the array
      data = [virtualRoot, ...data];
      console.log('Virtual root added. New data length:', data.length);
    } else if (rootNodes.length === 0) {
      console.error('No root nodes found! This will cause issues.');
    } else {
      console.log('Single root node found:', rootNodes[0].first, rootNodes[0].last);
    }

    return data;
  }

  // Department Management Methods
  loadDepartments() {
    console.log('Loading departments...');
    this.departmentService.getDepartments().subscribe({
      next: (response) => {
        console.log('Departments response:', response);
        if (response.success) {
          this.departments = response.data;
          console.log('Loaded departments:', this.departments);
        } else {
          console.error('Failed to load departments:', response);
        }
      },
      error: (error) => {
        console.error('Error loading departments:', error);
      }
    });
  }

  openDepartmentModal(department: Department | null = null) {
    this.currentDepartment = department;
    this.showDepartmentModal = true;
  }

  openShareModal() {
    import('../org-chart-share-modal/org-chart-share-modal.component').then(m => {
      const modalRef = this.userModalService.modalService.open(m.OrgChartShareModalComponent, {
        size: 'lg',
        backdrop: 'static'
      });
    });
  }

  closeDepartmentModal() {
    this.showDepartmentModal = false;
    this.currentDepartment = null;
  }

  onDepartmentSaved() {
    this.loadDepartments();
    // Refresh the org chart data while preserving expansion state
    this.getDataWithStatePreservation();
  }

  onDepartmentDeleted() {
    this.loadDepartments();
    // Refresh the org chart data while preserving expansion state
    this.getDataWithStatePreservation();
  }

  // User assignment methods
  onUserSelected(user: any) {
    console.log('User selected:', user);
    this.selectedUser = user;
    this.selectedUserId = user ? user.id : null;
  }

  assignUserToDepartment() {
    try {
      console.log('assignUserToDepartment called');
      console.log('selectedUser:', this.selectedUser);
      console.log('selectedDepartmentId:', this.selectedDepartmentId);
      
      if (!this.selectedUser || !this.selectedDepartmentId) {
        alert('Please select both a user and a department');
        return;
      }

      const assignment = {
        user_id: this.selectedUser.id,
        department_id: this.selectedDepartmentId,
        action: 'assign'
      };

      console.log('Making assignment request:', assignment);

      this.departmentService.assignUser(assignment).subscribe({
        next: (response) => {
          console.log('Assignment response:', response);
          if (response && response.success) {
            alert('User assigned to department successfully!');
            // Reset selections
            this.selectedUser = null;
            this.selectedUserId = null;
            this.selectedDepartmentId = null;
            // Refresh data while preserving expansion state
            this.getDataWithStatePreservation();
            this.loadDepartments();
          } else {
            const errorMessage = response?.message || 'Unknown error occurred';
            console.error('Assignment failed:', errorMessage);
            alert('Error: ' + errorMessage);
          }
        },
        error: (error) => {
          console.error('Error assigning user:', error);
          alert('Error assigning user to department: ' + (error?.message || error || 'Unknown error'));
        }
      });
    } catch (error) {
      console.error('Exception in assignUserToDepartment:', error);
      alert('An unexpected error occurred: ' + (error?.message || error || 'Unknown error'));
    }
  }

  /**
   * Build org chart data from department structure
   */
  buildOrgChartData(orgData: any) {
    const chartData = [];
    
    // Add departments as nodes
    if (orgData.departments && orgData.departments.length > 0) {
      orgData.departments.forEach(dept => {
        chartData.push({
          id: `dept_${dept.id}`,
          name: dept.department_name,
          first: dept.department_name,
          last: '',
          title: 'Department',
          parentId: null, // Simplified - no department hierarchy
          imageUrl: 'assets/images/department-icon.png',
          isDepartment: true,
          bgColor: '#e3f2fd',
          access: null,
          orgChartPlaceHolder: false,
          showImage: true,
          openPosition: false,
          org_chart_expand: false
        });
      });
    }
    
    // Add users as nodes under their departments
    if (orgData.users && orgData.users.length > 0) {
      orgData.users.forEach(user => {
        chartData.push({
          id: user.user_id,
          name: user.display_name,
          first: user.display_name.split(' ')[0] || '',
          last: user.display_name.split(' ').slice(1).join(' ') || '',
          title: 'Employee',
          parentId: user.department_id ? `dept_${user.department_id}` : null,
          imageUrl: 'assets/images/default-user.png',
          isDepartment: false,
          bgColor: '#ffffff',
          access: null,
          orgChartPlaceHolder: false,
          showImage: true,
          openPosition: false,
          org_chart_expand: false
        });
      });
    }
    
    // If no departments exist, add a placeholder message
    if (chartData.length === 0) {
      chartData.push({
        id: -1,
        name: 'No Departments Created',
        first: 'No Departments',
        last: 'Created',
        title: 'Create your first department to get started',
        parentId: null,
        imageUrl: 'assets/images/department-icon.png',
        isDepartment: true,
        bgColor: '#f5f5f5',
        access: null,
        orgChartPlaceHolder: true,
        showImage: true,
        openPosition: false,
        org_chart_expand: false
      });
    }
    
    return chartData;
  }

  /**
   * Fallback to original user-based org chart if departments aren't available
   */
  async getOriginalUserData() {
    try {
      console.log('Loading original user-based org chart...');
      
      let data: any = await this.userService.getOrgchart({
        active: 1,
        isEmployee: 1,
      });

      data = this.fixDataStructure(data);

      data.sort((a, b) => {
        let username = (a.first || "") + " " + (a.last || "");
        let username1 = (b.first || "") + " " + (b.last || "");
        return username.localeCompare(username1);
      });

      let e = [];
      
      for (let i = 0; i < data.length; i++) {
        data[i].bgColor = this.bgColor(data[i]);

        e.push({
          id: data[i].id,
          bgColor: data[i].bgColor,
          name: (data[i].first || "") + " " + (data[i].last || ""),
          first: data[i].first || "",
          last: data[i].last || "",
          access: data[i].access,
          parentId: data[i].parentId,
          title: data[i].title || "",
          imageUrl: data[i].image || "assets/images/default-user.png",
          orgChartPlaceHolder: data[i].orgChartPlaceHolder,
          showImage: data[i].showImage,
          openPosition: data[i].openPosition,
          isDepartment: false,
          hire_date_color: data[i].openPosition
            ? "red"
            : this.checkHireColor(data[i].hire_date),
          org_chart_expand: data[i].org_chart_expand,
        });
      }

      // Continue with chart rendering...
      this.renderChart(e);

    } catch (error) {
      console.error('Error loading original user data:', error);
    }
  }

  /**
   * Render the org chart with the provided data
   */
  renderChart(chartData: any[]) {
    if (!this.chart || !this.chartContainer) {
      console.error('Chart or container not initialized');
      return;
    }

    this.chart
      .container(this.chartContainer?.nativeElement)
      .data(chartData)
      .onNodeClick(this.onNodeClick)
      .nodeContent(this.getNodeContent.bind(this))
      .nodeHeight((d) => {
        if (d.data.id === -1 || d.data.id === -2) return 90;
        if (d.data.orgChartPlaceHolder) return 90;
        return 90;
      })
      .nodeWidth((d) => {
        if (d.data.id === -1 || d.data.id === -2) return 180;
        if (d.data.orgChartPlaceHolder) return 180;
        return 180;
      })
      .childrenMargin((d) => 50)
      .compactMarginBetween((d) => 35)
      .compactMarginPair((d) => 30)
      .compact(false)
      .render()
      .fit();

    console.log('Chart rendered with data:', chartData);
    
    // Add drag and drop listeners after render
    setTimeout(() => {
      this.addDragAndDropListeners();
    }, 100);
  }

  private addDragAndDropListeners() {
    const container = this.chart.container();
    if (!container) return;

    // Remove existing listeners first
    container.selectAll('[data-node-id]').on('dragstart', null).on('dragover', null).on('drop', null);

    // Add dragstart listeners to draggable nodes
    container.selectAll('[data-can-drag="true"]')
      .on('dragstart', (event: DragEvent, d: any) => {
        const element = event.target as HTMLElement;
        const nodeId = element.getAttribute('data-node-id');
        if (nodeId && event.dataTransfer) {
          event.dataTransfer.setData('text/plain', nodeId);
          event.dataTransfer.effectAllowed = 'move';
          
          // Add visual feedback
          element.style.opacity = '0.5';
          
          console.log('Drag started for user:', nodeId);
        }
      })
      .on('dragend', (event: DragEvent) => {
        // Reset visual feedback
        const element = event.target as HTMLElement;
        element.style.opacity = '1';
      });

    // Add drop listeners to drop zones
    container.selectAll('[data-can-drop="true"]')
      .on('dragover', (event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        // Visual feedback for drop zone
        const target = event.currentTarget as HTMLElement;
        target.style.backgroundColor = '#e8f5e8';
        target.style.borderColor = '#4caf50';
      })
      .on('dragleave', (event: DragEvent) => {
        // Remove visual feedback
        const target = event.currentTarget as HTMLElement;
        const isDepartment = target.getAttribute('data-is-department') === 'true';
        target.style.backgroundColor = isDepartment ? '#e3f2fd' : 'white';
        target.style.borderColor = isDepartment ? '#2196f3' : '#ddd';
      })
      .on('drop', (event: DragEvent, d: any) => {
        event.preventDefault();
        
        const draggedNodeId = event.dataTransfer?.getData('text/plain');
        const element = event.currentTarget as HTMLElement;
        const targetNodeId = element.getAttribute('data-node-id');
        const isDepartment = element.getAttribute('data-is-department') === 'true';
        
        // Reset visual feedback
        element.style.backgroundColor = isDepartment ? '#e3f2fd' : 'white';
        element.style.borderColor = isDepartment ? '#2196f3' : '#ddd';
        
        if (draggedNodeId && targetNodeId && draggedNodeId !== targetNodeId) {
          console.log('Dropped user', draggedNodeId, 'on target', targetNodeId, 'isDepartment:', isDepartment);
          
          // Call the existing onNodeDrop logic
          this.handleNodeDrop(parseInt(draggedNodeId), parseInt(targetNodeId), isDepartment);
        }
      });
  }

  private handleNodeDrop(draggedUserId: number, targetNodeId: number, isDepartment: boolean) {
    // Find the dragged user and target in the original data
    const draggedUser = this.originalData.find(user => user.id === draggedUserId);
    const targetNode = this.originalData.find(user => user.id === targetNodeId);
    
    if (!draggedUser) {
      console.error('Dragged user not found:', draggedUserId);
      return;
    }
    
    if (!targetNode) {
      console.error('Target node not found:', targetNodeId);
      return;
    }
    
    let departmentId: number;
    
    if (isDepartment) {
      // Target is a department placeholder - assign user to this department
      departmentId = targetNodeId;
    } else {
      // Target is a regular user - assign dragged user to target's department
      if (!targetNode.department_id) {
        console.error('Target user has no department assigned');
        return;
      }
      departmentId = targetNode.department_id;
    }
    
    // Show confirmation dialog
    const departmentName = isDepartment ? 
      (targetNode.org_chart_department || targetNode.department || targetNode.first) :
      this.originalData.find(d => d.id === departmentId)?.org_chart_department || 'Unknown Department';
      
    if (!confirm(`Assign ${draggedUser.first} ${draggedUser.last} to ${departmentName}?`)) {
      return;
    }
    
    console.log(`Assigning user ${draggedUserId} to department ${departmentId}`);
    
    // Call the department service to assign the user
    this.departmentService.assignUser({ user_id: draggedUserId, department_id: departmentId }).subscribe({
      next: (response) => {
        console.log('User assigned successfully:', response);
        
        // Update local data
        if (draggedUser) {
          draggedUser.department_id = departmentId;
          draggedUser.parentId = departmentId;
        }
        
        // Refresh the chart while preserving expansion state
        this.getDataWithStatePreservation();
      },
      error: (error) => {
        console.error('Failed to assign user:', error);
        alert('Failed to assign user. Please try again.');
      }
    });
  }



  // Method to preserve expansion state and refresh chart data
  async getDataWithStatePreservation() {
    console.log('Refreshing chart data while preserving expansion state');
    
    try {
      // Capture current expansion state
      const expansionState = new Map();
      if (this.chart) {
        try {
          const currentData = this.chart.data();
          if (currentData && Array.isArray(currentData)) {
            currentData.forEach((node: any) => {
              if (node._expanded !== undefined) {
                expansionState.set(node.id, node._expanded);
              }
            });
          }
          console.log('Preserved expansion state for', expansionState.size, 'nodes');
        } catch (expansionError) {
          console.error('Error capturing expansion state:', expansionError);
        }
      }
      
      // Reload the data
      await this.getData();
      
      // Validate data integrity after loading
      this.validateAndFixDataIntegrity();
      
      // Restore expansion state after data is loaded
      if (this.chart && expansionState.size > 0) {
        setTimeout(() => {
          try {
            expansionState.forEach((expanded, nodeId) => {
              if (expanded) {
                this.chart.setExpanded(nodeId, true);
              }
            });
            this.chart.render();
            console.log('Restored expansion state for', expansionState.size, 'nodes');
          } catch (restoreError) {
            console.error('Error restoring expansion state:', restoreError);
          }
        }, 100); // Small delay to ensure data is loaded
      }
    } catch (error) {
      console.error('Error in getDataWithStatePreservation:', error);
      // Fallback to regular getData if state preservation fails
      try {
        await this.getData();
      } catch (fallbackError) {
        console.error('Error in fallback getData:', fallbackError);
        alert('Error refreshing chart data. Please try refreshing the page.');
      }
    }
  }

  handleImageUpdate(userId: string, imageUrl: string) {
    console.log('handleImageUpdate called with:', userId, imageUrl);
    
    // Update the local data with the new image URL
    const userIdNum = parseInt(userId);
    const userNode = this.originalData.find(user => user.id === userIdNum);
    
    console.log('Found user node:', userNode);
    
    if (userNode) {
      // Add cache-busting parameter to force browser to reload image
      const cacheBustUrl = imageUrl + '?t=' + new Date().getTime();
      
      console.log('Cache bust URL:', cacheBustUrl);
      
      // Update the user's image in the local data
      userNode.imageUrl = cacheBustUrl;
      
      // Try to update the image directly in the DOM without full re-render
      if (this.chart) {
        console.log('Attempting direct DOM image update');
        
        // Update the chart data first
        const currentData = this.chart.data();
        if (currentData && Array.isArray(currentData)) {
          const chartNode = currentData.find((node: any) => node.id === userIdNum);
          if (chartNode) {
            chartNode.imageUrl = cacheBustUrl;
          }
        }
        
        // Try to find and update the image element directly
        try {
          // Look for the image in the SVG DOM
          const svgContainer = this.chartContainer?.nativeElement?.querySelector('svg');
          if (svgContainer) {
            const images = svgContainer.querySelectorAll('img');
            let imageUpdated = false;
            
            images.forEach((img: HTMLImageElement) => {
              const currentSrc = img.src;
              // Check if this image belongs to our user (contains the base URL)
              if (currentSrc && currentSrc.includes(imageUrl.split('?')[0])) {
                console.log('Found matching image, updating src:', currentSrc, '->', cacheBustUrl);
                img.src = cacheBustUrl;
                imageUpdated = true;
              }
            });
            
            if (imageUpdated) {
              console.log('Successfully updated image via direct DOM manipulation');
              return; // Exit early, no need to re-render
            }
          }
        } catch (error) {
          console.log('Direct DOM update failed:', error);
        }
        
        // Fallback: Force a minimal re-render only if direct update failed
        console.log('Fallback: updating chart data and re-rendering');
        
        try {
          // Validate data integrity before rendering
          this.validateAndFixDataIntegrity();
          this.chart.data(this.originalData).render();
        } catch (error) {
          console.error('Error in chart re-render after image update:', error);
          if (error.message && error.message.includes('missing:')) {
            const missingId = error.message.split('missing:')[1].trim();
            console.error(`Missing node ID during image update: ${missingId}`);
            // Try to reload data to fix integrity issues
            this.getDataWithStatePreservation();
          }
        }
      }
    } else {
      console.log('User node not found for ID:', userIdNum);
    }
  }

  // Validate and fix data integrity issues
  validateAndFixDataIntegrity() {
    if (!this.originalData || !Array.isArray(this.originalData)) {
      console.warn('No data to validate');
      return;
    }

    // Check for missing parent references
    const allIds = new Set(this.originalData.map(node => node.id));
    const invalidNodes = [];
    
    this.originalData.forEach(node => {
      if (node.parentId && !allIds.has(node.parentId)) {
        invalidNodes.push(node);
        console.warn(`Node ${node.id} (${node.name}) references missing parent ${node.parentId}. Setting parentId to null.`);
        node.parentId = null; // Fix the invalid reference
      }
    });
    
    if (invalidNodes.length > 0) {
      console.warn(`Fixed ${invalidNodes.length} invalid parent references:`, invalidNodes.map(n => `${n.id}->${n.parentId}`));
    }
  }

  ngOnDestroy() {
    // Component cleanup
  }
}
