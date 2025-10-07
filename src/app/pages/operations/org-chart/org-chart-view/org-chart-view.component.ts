import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { OrgChartModule } from "../org-chart.module";

import { Component, OnInit, AfterViewInit, Input, ViewChild, ElementRef } from "@angular/core";
import { OrgChart } from "d3-org-chart";
import { UserService } from "@app/core/api/field-service/user.service";
import { UserModalService } from "@app/pages/maintenance/user/user-modal/user-modal.component";
import { accessRight } from "@app/pages/maintenance/user/user-constant";

import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import moment from "moment";
import * as d3 from "d3";

@Component({
  standalone: true,
  imports: [SharedModule, OrgChartModule, UserSearchV1Component],
  selector: "app-org-chart-view",
  templateUrl: "./org-chart-view.component.html",
  styleUrls: [],
})
export class OrgChartViewComponent implements OnInit, AfterViewInit {
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    private userService: UserService,
    private userModalService: UserModalService
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
  chart: any; // Add proper typing for the chart
  
  // Layout toggle properties
  isHorizontalLayout = false; // Default to vertical
  layoutIcon = 'mdi-view-sequential'; // Default icon for vertical layout

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

    // CLEAN SIMPLE CARDS - AVOIDING DROPDOWN OVERLAP
    return `
      <div style="width:${d.width}px;height:${d.height}px;background:white;border:1px solid #ddd;border-radius:8px;position:relative;text-align:center;padding:6px 4px 25px 4px;">
        <div style="position:absolute;top:3px;right:5px;font-size:9px;color:#999;">#${d.data.id}</div>
        <div style="margin-top:4px;">
          <img src="${d.data.imageUrl}" style="width:40px;height:40px;border-radius:50%;border:2px solid #eee;display:block;margin:0 auto;" />
        </div>
        <div style="font-size:11px;font-weight:bold;color:#333;margin-top:5px;line-height:1.1;padding:0 2px;">
          ${d.data.first} ${d.data.last}
        </div>
        <div style="font-size:9px;color:#666;margin-top:2px;line-height:1.0;padding:0 2px;margin-bottom:5px;">
          ${d.data.title || ""}
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
    this.chart.render();

    const modalRef: any = this.userModalService.open(d.data.id);
    modalRef.result.then(
      (data: any) => {
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
        // Modal cancelled - do nothing
      }
    );
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
          hire_date_color: data[i].openPosition
            ? "red"
            : this.checkHireColor(data[i].hire_date),
          org_chart_expand: data[i].org_chart_expand,
        });
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
}
