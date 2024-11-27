import { KeyValue } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { RevenueService } from "@app/core/api/operations/report/revenue.service";
import { SharedModule } from "@app/shared/shared.module";
import moment from "moment";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-revenue-by-customer",
  templateUrl: "./revenue-by-customer.component.html",
  styleUrls: [],
})
export class RevenueByCustomerComponent implements OnInit {
  constructor(private revenueService: RevenueService) {}

  ngOnInit() {
    this.getData();
  }

   currentWeek = moment().isoWeek()
        currentYear =  moment().isoWeekYear()

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.revenueService.getFutureRevenueByCustomer();
      this.data.sort((a, b) => {
        if (a.Customer < b.Customer) {
          return -1;
        } else if (a.Customer > b.Customer) {
          return 1;
        } else {
          return 0;
        }
      });
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  convert(value) {
    let e = value.split("-");
    if (e?.length == 2) {
      return moment()
        .month(e[0] - 1)
        .format("MMM") + '-' + e[1];
    } else return value;
  }

  isLoading = false;
  data: any;
  test: any;
  chart2: any;

  data1: any;
  d: any;
  isLoadingSubData = false;

  total = 0;
  getTotal(col) {
    this.total = 0;
    this.data.forEach((row, value) => {
      return this.getSumCol(row[col]);
    });
    return this.total;
  }

  getSumCol(score) {
    this.total += score;
  }

  getWeekDates(year, month) {
    // month in moment is 0 based, so 9 is actually october, subtract 1 to compensate
    // array is 'year', 'month', 'day', etc
    var startDate = moment([year, month - 1]);

    // Clone the value before .endOf()
    var endDate = moment(startDate).endOf("month");

    // make sure to call toDate() for plain JavaScript date type
    return {
      start: startDate.format("YYYY-MM-DD"),
      end: endDate.format("YYYY-MM-DD"),
    };
  }

  loopThroughWeeks(startDate, endDate) {
    let currentDate = moment(startDate);
    const end = moment(endDate);

    let data = [];
    while (currentDate <= end) {
      const weekStart = currentDate.clone().startOf("isoWeek").day(1);
      const weekEnd = currentDate.clone().startOf("isoWeek").day(7);

      currentDate.add(1, "week"); // Move to the next week
      data.push({
        start: weekStart.format("YYYY-MM-DD"),
        end: weekEnd.format("YYYY-MM-DD"),
        weekNumber: weekStart.isoWeek(),
        yearNumber: weekStart.isoWeekYear(),
        value: 0,
      });
    }

    return data;
  }

  originalOrder = (
    a: KeyValue<number, string>,
    b: KeyValue<number, string>
  ): number => {

    return 0;
  };

  sumSub(value) {
    let total = 0;
    return value.reduce((a, b) => {
      return (total += b.value);
    }, 0);
  }

  async getData1(d) {
    const explodedArray = d.split("-");

    let year = explodedArray[1];
    let month = explodedArray[0];

    let { start, end } = this.getWeekDates(year, month);

    var startweeknumber = moment(start).isoWeek();
    var startyearNumber = moment(start).isoWeekYear();

    let weekStart = moment()
      .isoWeekYear(startyearNumber)
      .isoWeek(startweeknumber)
      .startOf("isoWeek")
      .day(1)
      .format("YYYY-MM-DD");

    var weeknumber = moment(end).isoWeek();
    var yearNumber = moment(end).isoWeekYear();

    let weekEnd = moment()
      .isoWeekYear(yearNumber)
      .isoWeek(weeknumber)
      .startOf("isoWeek")
      .day(7)
      .format("YYYY-MM-DD");

    let eee = this.loopThroughWeeks(weekStart, weekEnd);

    try {
      this.isLoadingSubData = true;
      this.data1 = [];
      this.d = d;
      this.data1 = await this.revenueService.getFutureRevenueByCustomerByWeekly(
        start,
        end,
        weekStart,
        weekEnd
      );

      const uniqueNames: any = [
        ...new Set(this.data1.results.map((user) => user.SO_CUST)),
      ];

      for (let i = 0; i < eee.length; i++) {
        eee[i].value = 0;
        for (let ii = 0; ii < this.data1.results.length; ii++) {
          const dateToCheck = moment(this.data1.results[ii].DATE1);

          const startDate = moment(eee[i].start);
          const endDate = moment(eee[i].end);

          const isBetween = dateToCheck.isBetween(
            startDate,
            endDate,
            "day",
            "[)"
          );

          if (isBetween) {
            eee[i].value += this.data1.results[ii].TOTAL;
          }
        }
      }

      this.chart2 = eee;

      let test = {};
      for (let i = 0; i < uniqueNames.length; i++) {
        test[uniqueNames[i]] = [];
        for (let f = 0; f < eee.length; f++) {
          test[uniqueNames[i]].push({
            start: eee[f].start,
            end: eee[f].end,
            weekNumber: eee[f].weekNumber,
            yearNumber: eee[f].yearNumber,
            value: 0,
          });
        }
      }

      for (var key in test) {
        if (test.hasOwnProperty(key)) {
          for (let f = 0; f < test[key].length; f++) {
            for (let ii = 0; ii < this.data1.results.length; ii++) {
              const dateToCheck = moment(this.data1.results[ii].DATE1);

              const startDate = moment(test[key][f].start);
              const endDate = moment(test[key][f].end);

              const isBetween = dateToCheck.isBetween(
                startDate,
                endDate,
                "day",
                "[)"
              );

              if (isBetween && key == this.data1.results[ii].SO_CUST) {
                test[key][f].value += this.data1.results[ii].TOTAL;
              }
            }
          }
        }
      }

      this.test = test;

      this.isLoadingSubData = false;
    } catch (err) {
      this.isLoadingSubData = false;
    }
  }
}
