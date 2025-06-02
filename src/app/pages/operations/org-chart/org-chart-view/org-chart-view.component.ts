import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { OrgChartModule } from "../org-chart.module";

import { Component, OnInit, Input, ViewChild, ElementRef } from "@angular/core";
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
export class OrgChartViewComponent implements OnInit {
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
  chart;

  clearMark() {
    this.chart.clearHighlighting();
    this.currentView = null;
    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        user_edit: null,
      },
    });
  }

  ngAfterViewInit() {
    this.chart = new OrgChart();
  }

  expandImmediate() {
    const data = this.chart.data();

    // Mark all previously expanded nodes for collapse
    data.forEach((d) => (d._expanded = false));
    let parent;
    // Loop over data and check if input value matches any name
    data.forEach((d) => {
      // if (d._directSubordinates == 1 || d.org_chart_expand == 1) {
      if (d.org_chart_expand == 1) {
        d._expanded = true;
        this.chart.setExpanded(d.id, true).render();
      }
    });
  }

  addNode() {
    const modalRef: any = this.userModalService.open(null);
    modalRef.result.then(
      (data: any) => {
        data = {
          ...data,
          name: data.first + " " + data.last || "",
          imageUrl: data.image || "assets/images/default-user.png",
          bgColor: this.bgColor(data),
        };

        this.chart.addNode(data).setCentered(data.id).render();

        const d = this.chart.data();

        this.originalData = structuredClone(d);
        //this.getData(data.id);
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
    // Get input value
    const value = id;

    // Clear previous higlighting
    this.chart.clearHighlighting();

    // Get chart nodes
    if (Number(value) == 0) {
      this.chart.data(structuredClone(this.originalData)).render().fit();
    } else {
      let data = this.viewOnlyTree(Number(value) == 0 ? null : Number(value));
      this.chart.data(data).render().fit();
    }

    // // Mark all previously expanded nodes for collapse
    // if (value != "") {
    //   data.forEach((d) => (d._expanded = false));

    //   // Loop over data and check if input value matches any name
    //   data.forEach((d) => {
    //     if (value != "" && d.name.toLowerCase().includes(value.toLowerCase())) {
    //       // If matches, mark node as highlighted
    //       d._highlighted = true;
    //       d._expanded = true;
    //     }
    //   });
    // } else {
    //   data.forEach((d) => (d._expanded = true));
    // }

    // Update data and rerender graph
  }

  defaultExpand() {
    const data = this.chart.data();

    // Mark all previously expanded nodes for collapse
    //data.forEach((d) => (d._expanded = false));

    let parent;
    // Loop over data and check if input value matches any name
    data.forEach((d) => {
      if (d._directSubordinates == 1 || d.org_chart_expand == 1) {
        parent = d.id;
        // If matches, mark node as highlighted
        d._expanded = true;
        this.chart.setExpanded(d.id, true).render();
      }
    });

    // Update data and rerender graph
    //this.chart.data(data).render().fit();
  }
  isMoreThan6MonthsAgo = (dateString: string) => {
    if (!dateString) return "#3AB6E3";
    const now = moment();

    const inputDate = moment(dateString);
    const oneMonthAgo = moment().subtract(1, 'months');
    const sixMonthsAgo = moment().subtract(6, 'months');
    const twelveMonthsAgo = moment().subtract(12, 'months');

    if (inputDate.isBefore(oneMonthAgo)) {
      //after 1 months
      return 'orange';
    } else if (inputDate.isBefore(sixMonthsAgo)) {
      //after 6 months
      return "rgb(0, 195, 255)";
    } else if (inputDate.isBefore(twelveMonthsAgo)) {
      //after 11 months
      return "#4B0082";
    } else if (inputDate.isSameOrAfter(twelveMonthsAgo)) {
      //after 
      return "#002D62";
    }

    return "#3AB6E3";
  }
  currentView;
  onNodeClick = (d) => {
    // Prevent clicking on virtual root node
    if (d.data.id === -1) {
      return;
    }

    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        user_edit: d.data.id,
      },
    });

    this.chart.clearHighlighting();
    //hightlight card on click
    d.data._highlighted = true;

    this.currentView = d.data.id;

    this.chart.render();

    const modalRef: any = this.userModalService.open(d.data.id);
    modalRef.result.then(
      (data: any) => {
        let attrs = this.chart.getChartState();

        d.data = {
          ...d.data,
          ...data,
          name:
            data.first + " " + !data.last ||
              data.last == undefined ||
              data.last == "null"
              ? ""
              : data.last,
          imageUrl: data.image || "assets/images/default-user.png",
          bgColor: this.bgColor(data),
          hire_date_color: this.bgColor(data)
        };
        //7/1/2018
        let dd = attrs.data.map((e) => {
          return d.data.id == e.id
            ? {
              ...e.data,
              ...d.data,
            }
            : e;
        });

        if (d.data.parentId != data.parentId) {
          this.chart.data(dd).setCentered(d.data.id).render();
        } else {
          this.chart.data(dd).render();
        }

        if (data.access == 100 || data.active == 0)
          this.chart.removeNode(d.data.id).render();

        //this.getData(d.data.id);
      },
      () => { }
    );
  };
  bgColor(data) {

    return this.isMoreThan6MonthsAgo(data.hire_date)
    // for (let ii = 0; ii < accessRight.length; ii++) {
    //   if (accessRight[ii].value == data.employeeType) {
    //     return accessRight[ii].bgColor;
    //   }
    // }

    return "#3AB6E3";
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
  async getData(id?) {
    let data: any = await this.userService.getOrgchart({
      active: 1,
      isEmployee: 1,
    });

    // Fix multiple roots and orphan nodes immediately after API call
    data = this.fixDataStructure(data);

    data.sort((a, b) => {
      let username = a.first + " " + a.last;
      let username1 = b.first + " " + b.last;
      return username.localeCompare(username1);
    });

    let e = [];
    
    for (let i = 0; i < data.length; i++) {
      data[i].bgColor = this.bgColor(data[i]);

      e.push({
        id: data[i].id,
        bgColor: data[i].bgColor,
        name:
          data[i].first + " " + !data[i].last ||
            data[i].last == undefined ||
            data[i].last == "null"
            ? ""
            : data[i].last,
        first: data[i].first,
        last:
          !data[i].last || data[i].last == undefined || data[i].last == "null"
            ? ""
            : data[i].last,
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

    // Remove the previous fixes since we handled it at API level
    // e = this.findAndFixOrphanNodes(e);
    // e = this.handleMultipleRoots(e);

    if (!id) {
      this.chart
        .container(this.chartContainer?.nativeElement)
        .data(e)
        .onNodeClick(this.onNodeClick)
        .nodeContent(function (d, i, arr, state) {
          // Handle virtual root node differently
          if (d.data.id === -1) {
            return `
              <div class="card bg-secondary text-white" style="height:100px;position:relative;cursor:default;">
                <div class="card-body text-center d-flex align-items-center justify-content-center">
                  <div>
                    <div style="font-size:18px;font-weight:bold">${d.data.name || d.data.first}</div>
                    <div style="font-size:14px" class="fst-italic">Organization Structure</div>
                  </div>
                </div>
              </div>
            `;
          }

          let height = !d.data.orgChartPlaceHolder ? d.height : 130;
          let textTop = !d.data.orgChartPlaceHolder ? 60 : 5;

          let image = `${d.data.showImage
            ? `<div class="bg-light shadow" style="padding:0px;position:absolute;top:-61px;margin-left:${d.width / 2 - 75
            }px;border-radius:100px;width:154px;height:154px;border:2px solid ${d.data.hire_date_color
            }"" >
          
              <img class="object-fit-cover border border-1" 
              src=" ${d.data.imageUrl
            }" style="border-radius:100px;width:150px;height:150px;border:2px solid ${d.data.hire_date_color
            }" />
              </div>`
            : ""
            }`;

          return `
              <div class="card bg-light" style="height:${height}px;position:relative;overflow:visible">
                ${image}
                ${!d.data.orgChartPlaceHolder
              ? `<div class="card-header  border-0 shadow rounded-top text-end" style="background-color:${d.data.hire_date_color}">
                </div>`
              : `<div class="card-header bg-light  border-0 border border-light"></div>`
            }
                
            
                <div class="card-body text-center" style="padding-top:${textTop}px;">
                  <div style="font-size:17px;font-weight:bold;margin-top:10px"> 
                    ${d.data.orgChartPlaceHolder
              ? d.data.first
              : d.data.first + " " + d.data.last
            } 
                  </div>
                  <div style="font-size:15px;margin-top:4px" class="fst-italic"> 
                    ${d.data.title || "<br/>"}
                  </div>
        
                </div>
                <div class="card-footer bg-light py-2 d-flex justify-content-between">
                  <div> Manages: 
                    ${d.data._directSubordinates} 
                    <span class="mdi mdi-account" style="color:${d.data.hire_date_color
            }"></span>
                  </div>
                  <div> Oversees: 
                  ${d.data._totalSubordinates} 
                  <span class="mdi mdi-account" style="color:${d.data.hire_date_color
            }"></span>
                </div>
              </div>
            `;
        })
        .nodeWidth((d) => d.data.id === -1 ? 250 : 300)
        .nodeHeight((d) => {
          if (d.data.id === -1) return 100;
          if (d.data.orgChartPlaceHolder) return 135;
          return 190;
        })
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
          // Don't show expand/collapse button for virtual root
          if (node.data.id === -1) {
            return '';
          }
          
          return `<div style="px;color:#fff;border-radius:5px;padding:4px;font-size:15px;margin:auto auto;background-color:${node.data.hire_date_color
            };border: 1px solid #E4E2E9;white-space:nowrap"> <span style="font-size:15px">${node.children
              ? `<i class="mdi mdi-chevron-up"></i>`
              : `<i class="mdi mdi-chevron-down"></i>`
            }</span> ${node.data._directSubordinates}  </div>`;
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
      .nodeWidth((d) => 300)
      .childrenMargin((d) => {
        if (d.data.orgChartPlaceHolder) return 190;
        return 190;
      })
      .nodeHeight((d) => {
        if (d.data.orgChartPlaceHolder) return 135;
        return 190;
      })
      .compactMarginBetween((d) => 100)
      .compactMarginPair((d) => 80)
      .compact(true)
      .render()
  }

  ngOnInit() {
    this.getData();
  }

  fixDataStructure(data: any[]): any[] {
    console.log('Original data length:', data.length);
    console.log('Sample data:', data.slice(0, 3));

    // Step 1: Fix orphan nodes (nodes with invalid parentId)
    const nodeIds = new Set(data.map(node => node.id));
    console.log('All node IDs:', Array.from(nodeIds));
    
    data = data.map(node => {
      if (node.parentId && !nodeIds.has(node.parentId)) {
        console.warn(`Orphan node detected: ${node.first} ${node.last} (ID: ${node.id}) has invalid parentId: ${node.parentId}`);
        return { ...node, parentId: null };
      }
      return node;
    });

    // Step 2: Handle multiple roots
    const rootNodes = data.filter(node => 
      node.parentId === null || 
      node.parentId === undefined || 
      node.parentId === 0 ||
      node.parentId === ""
    );

    console.log(`Found ${rootNodes.length} root nodes:`, rootNodes.map(n => `${n.first} ${n.last} (ID: ${n.id})`));

    if (rootNodes.length > 1) {
      console.log('Multiple roots detected, creating virtual root...');
      
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
