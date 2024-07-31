import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { OrgChartModule } from "../org-chart.module";

import { Component, OnInit, Input, ViewChild, ElementRef } from "@angular/core";
import { OrgChart } from "d3-org-chart";
import { UserService } from "@app/core/api/field-service/user.service";
import { UserModalService } from "@app/pages/maintenance/user/user-modal/user-modal.component";

@Component({
  standalone: true,
  imports: [SharedModule, OrgChartModule],
  selector: "app-org-chart-view",
  templateUrl: "./org-chart-view.component.html",
  styleUrls: [],
})
export class OrgChartViewComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private userService: UserService,
    private userModalService: UserModalService
  ) {}

  @ViewChild("chartContainer") chartContainer: ElementRef;
  @Input() data: any[];
  chart;

  ngAfterViewInit() {
    this.chart = new OrgChart();
  }

  orgChart;

  query = "";
  filterChart() {
    // Get input value
    const value = this.query;

    // Clear previous higlighting
    this.chart.clearHighlighting();

    // Get chart nodes
    const data = this.chart.data();

    // Mark all previously expanded nodes for collapse
    if (value != "") {
      data.forEach((d) => (d._expanded = false));

      // Loop over data and check if input value matches any name
      data.forEach((d) => {
        if (value != "" && d.name.toLowerCase().includes(value.toLowerCase())) {
          // If matches, mark node as highlighted
          d._highlighted = true;
          d._expanded = true;
        }
      });
    } else {
      data.forEach((d) => (d._expanded = true));
    }

    // Update data and rerender graph
    this.chart.data(data).render().fit();
  }

  async getData() {
    let data = await this.userService.find({ active: 1, isEmployee: 1 });
    data.sort((a, b) => {
      let username = a.first + " " + a.last;
      let username1 = b.first + " " + b.last;
      return username.localeCompare(username1);
    });

    let e = [];
    //#85144b
    for (let i = 0; i < data.length; i++) {
      let bgColor = "#3AB6E3";
      if (data[i].employeeType == 1) {
        bgColor = "#85144b";
      } else if (data[i].employeeType == 2) {
        bgColor = "orange";
      } else if (data[i].employeeType == 3) {
        bgColor = "#662d91";
      } else if (data[i].employeeType == 4) {
        bgColor = "#17B169";
      } else if (data[i].employeeType == 5) {
        bgColor = "black";
      }
      e.push({
        id: data[i].id,
        bgColor: bgColor,
        name: data[i].first + " " + data[i].last,
        parentId: data[i].parentId,
        title: data[i].title || "No Title",
        imageUrl: data[i].image || "assets/images/default-user.png",
      });
    }

    this.chart
      .container(this.chartContainer?.nativeElement)
      .data(e)
      .nodeWidth((d) => 250)
      .initialZoom(0.7)
      .nodeHeight((d) => 190)
      .childrenMargin((d) => 75)
      .compactMarginBetween((d) => 30)
      .compactMarginPair((d) => 80)
      .expandAll()
      .onNodeClick((d, i, arr, state) => {
        const modalRef: any = this.userModalService.open(d.data.id);
        modalRef.result.then(
          (data: any) => {
            console.log(data, 'afasdf')
            this.getData();
          },
          () => {}
        );
      })
      .nodeContent(function (d, i, arr, state) {
        return `

        <div style="padding-top:00px;height:${d.height}px">
        <div class="card bg-light"  style="height:${
          d.height
        }px;position:relative;background-color:none;margin-left:1px;border-radius:10px;overflow:visible">

        <div class="bg-light" style="padding:0px;position:absolute;top:-14px;margin-left:${
          d.width / 2 - 30
        }px;border-radius:100px;width:60px;height:60px;" >

        <img class="object-fit-cover border border-1" src=" ${
          d.data.imageUrl
        }" style="border-radius:100px;width:60px;height:60px;" />
        </div>

        <div class="card-header rounded-top py-3 text-end" style="background-color:${
          d.data.bgColor
        }">
                
          </div>
          <div class="card-body text-center">
            <p class="text-end">${d.data.id}</p>
            <div style="font-size:17px;font-weight:bold;margin-top:10px"> ${
              d.data.name
            } </div>
            <div style="font-size:15px;margin-top:4px" class="fst-italic"> ${
              d.data.title
            } </div>
          </div>
          <div class="card-footer bg-light py-2 d-flex justify-content-between">
          <div> Manages:  ${d.data._directSubordinates} 👤</div>
          <div> Oversees:  ${d.data._totalSubordinates} 👤</div>
          </div>
        </div>
        </div>
                    
                `;
      })
      .render();
  }

  ngOnInit() {
    this.getData();
  }
}
