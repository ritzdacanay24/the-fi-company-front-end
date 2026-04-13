import { KeyValue } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RevenueService } from "@app/core/api/operations/report/revenue.service";
import { SharedModule } from "@app/shared/shared.module";
import moment from "moment";

@Component({
  standalone: true,
  imports: [SharedModule, FormsModule],
  selector: "app-revenue-by-customer",
  templateUrl: "./revenue-by-customer.component.html",
  styleUrls: ['./revenue-by-customer.component.scss'],
})
export class RevenueByCustomerComponent implements OnInit {
  constructor(private revenueService: RevenueService) { }

  ngOnInit() {
    this.getData();
  }

  currentWeek = moment().isoWeek()
  currentYear = moment().isoWeekYear()

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.revenueService.getFutureRevenueByCustomer(
        this.excludeTariffFees);
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

  convert(value: any): string {
    if (!value) return '';
    
    let e = value.toString().split("-");
    if (e?.length == 2) {
      return moment()
        .month(Number(e[0]) - 1)
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
  getTotal(col: string): number {
    this.total = 0;
    if (!this.data || !col) return 0;
    
    this.data.forEach((row: any) => {
      const value = row[col];
      if (typeof value === 'number') {
        this.total += value;
      } else if (typeof value === 'string' && !isNaN(Number(value))) {
        this.total += Number(value);
      }
    });
    return this.total;
  }

  getSumCol(score: any): void {
    if (typeof score === 'number') {
      this.total += score;
    } else if (typeof score === 'string' && !isNaN(Number(score))) {
      this.total += Number(score);
    }
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

  // sumSub(value) {
  //   let total = 0;
  //   return value.reduce((a, b) => {
  //     return (total += b.value);
  //   }, 0);
  // }

  // Updated calculation methods for new field names
  sumSub(array) {
    // Keeping for backward compatibility, maps to total
    let result = 0;
    for (let i = 0; i < array.length; i++) {
      result += Number(array[i].total || array[i].value || 0);
    }
    return result;
  }

  sumSubTotal(array) {
    let result = 0;
    for (let i = 0; i < array.length; i++) {
      result += Number(array[i].total || 0);
    }
    return result;
  }

  sumSubRevenueAfterTariff(array) {
    let result = 0;
    for (let i = 0; i < array.length; i++) {
      result += Number(array[i].revenue_after_tariff || 0);
    }
    return result;
  }

  sumSubTariffAmount(array) {
    let result = 0;
    for (let i = 0; i < array.length; i++) {
      result += Number(array[i].tariff_amount || 0);
    }
    return result;
  }

  sumSubNetRevenue(array) {
    let result = 0;
    for (let i = 0; i < array.length; i++) {
      result += Number(array[i].net_revenue || 0);
    }
    return result;
  }

  // Legacy methods for backward compatibility
  sumSubTariffMultiplier(array) {
    // Map to revenue_after_tariff for backward compatibility
    return this.sumSubRevenueAfterTariff(array);
  }

  sumSubTariffOnly(array) {
    // Map to tariff_amount for backward compatibility
    return this.sumSubTariffAmount(array);
  }


  // Add method to handle filter changes
  onFilterChange() {
    this.getData();
  }


  // Add new property for tariff fee exclusion
  excludeTariffFees = false;

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
        weekEnd,
        this.excludeTariffFees
      );

      const uniqueNames: any = [
        ...new Set(this.data1.results.map((user) => user.SO_CUST)),
      ];

      for (let i = 0; i < eee.length; i++) {
        eee[i].total = 0;
        eee[i].revenue_after_tariff = 0;
        eee[i].tariff_amount = 0;
        eee[i].net_revenue = 0;
        
        for (let ii = 0; ii < this.data1.results.length; ii++) {
          const dateToCheck = moment(this.data1.results[ii].DATE1);
          const startDate = moment(eee[i].start);
          const endDate = moment(eee[i].end);
          const isBetween = dateToCheck.isBetween(startDate, endDate, "day", "[)");

          if (isBetween) {
            eee[i].total += this.data1.results[ii].TOTAL;
            eee[i].revenue_after_tariff += this.data1.results[ii].REVENUE_AFTER_TARIFF;
            eee[i].tariff_amount += this.data1.results[ii].TARIFF_AMOUNT;
            eee[i].net_revenue += this.data1.results[ii].NET_REVENUE;
          }
        }
        
        // Keep legacy field for backward compatibility
        eee[i].value = eee[i].total;
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
            total: 0,
            revenue_after_tariff: 0,
            tariff_amount: 0,
            net_revenue: 0,
            // Legacy fields for backward compatibility
            value: 0,
            balance_with_tariff_multiplier: 0,
            balance_tariff_products_only: 0,
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
                test[key][f].total += this.data1.results[ii].TOTAL;
                test[key][f].revenue_after_tariff += this.data1.results[ii].REVENUE_AFTER_TARIFF;
                test[key][f].tariff_amount += this.data1.results[ii].TARIFF_AMOUNT;
                test[key][f].net_revenue += this.data1.results[ii].NET_REVENUE;
                
                // Keep legacy fields for backward compatibility
                test[key][f].value = test[key][f].total;
                test[key][f].balance_with_tariff_multiplier = test[key][f].revenue_after_tariff;
                test[key][f].balance_tariff_products_only = test[key][f].tariff_amount;
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

  // Updated customer classifications with detailed logic descriptions
  private tariffMultiplierCustomers = ['AMEGAM', 'ZITRO', 'ECLIPSE']; // 9% tariff deduction
  private tariffProductsOnlyCustomers = ['INTGAM', 'BLUBERI', 'BALTEC', 'EVIGAM', 'SONNY']; // TARIFF product handling

  isTariffMultiplierCustomer(customerCode: string): boolean {
    return this.tariffMultiplierCustomers.includes(customerCode?.toUpperCase());
  }

  isTariffProductsOnlyCustomer(customerCode: string): boolean {
    return this.tariffProductsOnlyCustomers.includes(customerCode?.toUpperCase());
  }

  // New method to get detailed calculation logic description
  getCalculationLogic(customerCode: string): string {
    if (this.isTariffMultiplierCustomer(customerCode)) {
      return `9.0x Tariff Multiplier: Revenue includes an additional 9% tariff deduction applied to the base amount. This affects both Total Revenue and Tariff Amount calculations.`;
    } else if (this.isTariffProductsOnlyCustomer(customerCode)) {
      return `Tariff Products Only: Only TARIFF category products are included in revenue calculations. Standard products are excluded from this customer's revenue totals.`;
    } else {
      return `Standard Calculation: All product categories are included with standard tariff handling. No special multipliers or product restrictions applied.`;
    }
  }

  // New method to get calculation formula for display
  getCalculationFormula(customerCode: string): string {
    if (this.isTariffMultiplierCustomer(customerCode)) {
      return `Total Revenue = Base Amount × 1.091 | Tariff Amount = -(Total Revenue × 0.09) | Net Revenue = Total Revenue - Tariff Amount`;
    } else if (this.isTariffProductsOnlyCustomer(customerCode)) {
      return `Total Revenue = TARIFF Products Only | Tariff Amount = -Standard Rate | Net Revenue = Total Revenue - Tariff Amount`;
    } else {
      return `Total Revenue = All Products | Tariff Amount = -Standard Rate | Net Revenue = Total Revenue - Tariff Amount`;
    }
  }
}
