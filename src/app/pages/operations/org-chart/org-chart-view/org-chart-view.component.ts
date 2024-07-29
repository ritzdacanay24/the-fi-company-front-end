import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { OrgChartModule } from "../org-chart.module";

import { Component, OnInit, Input, ViewChild, ElementRef } from "@angular/core";
import { OrgChart } from "d3-org-chart";
import * as d3 from "d3";
import { UserService } from "@app/core/api/field-service/user.service";

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
    private userService: UserService
  ) {}

  @ViewChild("chartContainer") chartContainer: ElementRef;
  @Input() data: any[];
  chart;

  ngAfterViewInit() {
    this.chart = new OrgChart();
  }

  getNestedChildren(arr, parent?) {
    var out = [];
    for (var i in arr) {
      if (arr[i].parentId == parent) {
        var childs = this.getNestedChildren(arr, arr[i].id);

        if (childs.length) {
          arr[i].childs = childs;
        }
        out.push(arr[i]);
      }
    }
    return out;
  }

  orgChart;

  async getData() {
    let data = await this.userService.find({ active: 1, isEmployee: 1 });

    let e = [];
    for (let i = 0; i < data.length; i++) {
      e.push({
        id: data[i].id,
        name: data[i].first + " " + data[i].last,
        parentId: data[i].parentId,
        title: data[i].title,
        imageUrl:
          data[i].image ||
          "https://dashboard.eye-fi.com/attachments/images/employees/default-user.png",
      });
    }

    this.chart
      .container(this.chartContainer?.nativeElement)
      .data(e)
      .nodeWidth((d) => 250)
      .initialZoom(0.7)
      .nodeHeight((d) => 175)
      .childrenMargin((d) => 40)
      .compactMarginBetween((d) => 15)
      .compactMarginPair((d) => 80)
      .expandAll()
      .nodeContent(function (d, i, arr, state) {
        console.log(d.data, "fff");
        return `
                    <div style="padding-top:30px;background-color:none;margin-left:1px;height:${
                      d.height
                    }px;border-radius:5px;overflow:visible">
                            <div style="height:${
                              d.height - 32
                            }px;padding-top:0px;background-color:white;border:1px solid lightgray;">
    
                            <img src=" ${
                              d.data.imageUrl
                            }" style="margin-top:-30px;margin-left:${d.width / 2 - 30}px;border-radius:100px;width:60px;height:60px;" />
    
                            <div style="margin-right:10px;margin-top:15px;float:right" class="text-dark">${
                              d.data.id
                            }</div>
    
                            <div style="margin-top:-30px;background-color:#3AB6E3;height:10px;width:${
                              d.width - 2
                            }px;border-radius:1px"></div>
    
                            <div style="padding:20px; padding-top:35px;text-align:center">
                                <div style="color:#111672;font-size:16px;font-weight:bold"> ${
                                  d.data.name
                                } </div>
                                <div style="color:#404040;font-size:16px;margin-top:4px"> ${
                                  d.data.title
                                } </div>
                            </div>
                            <div style="display:flex;justify-content:space-between;padding-left:15px;padding-right:15px;">
                            <div class="text-dark"> Manages:  ${
                              d.data._directSubordinates
                            } 👤</div>
                            <div  class="text-dark"> Oversees: ${
                              d.data._totalSubordinates
                            } 👤</div>
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
