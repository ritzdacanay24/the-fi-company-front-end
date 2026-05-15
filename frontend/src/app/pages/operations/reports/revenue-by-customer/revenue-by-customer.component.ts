import { KeyValue } from "@angular/common";
import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgbModal, NgbModalRef } from "@ng-bootstrap/ng-bootstrap";
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
  constructor(
    private revenueService: RevenueService,
    private modalService: NgbModal,
  ) { }

  @ViewChild('auditBreakdownModal', { static: true })
  auditBreakdownModal?: TemplateRef<unknown>;

  private readonly compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  private readonly fullCurrencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
  auditRowsByCustomer: Record<string, any[]> = {};
  auditRowsForRange: any[] = [];
  periodAuditRowsCache: Record<string, any[]> = {};
  selectedAuditRows: any[] = [];
  selectedAuditCustomer: string | null = null;
  selectedAuditPeriodLabel = '';
  selectedAuditScopeLabel = '';
  isAuditModalLoading = false;
  auditModalLoadError = '';
  private auditModalRef: NgbModalRef | null = null;

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

  formatCompactCurrency(value: unknown): string {
    const numericValue = this.toNumericValue(value);
    return this.compactCurrencyFormatter.format(numericValue);
  }

  formatFullCurrency(value: unknown): string {
    const numericValue = this.toNumericValue(value);
    return this.fullCurrencyFormatter.format(numericValue);
  }

  private toNumericValue(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[$,]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
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
    a: KeyValue<string, any>,
    b: KeyValue<string, any>
  ): number => {
    const leftKey = String(a.key);
    const rightKey = String(b.key);

    if (leftKey === rightKey) {
      return 0;
    }

    if (leftKey === "Customer") {
      return -1;
    }
    if (rightKey === "Customer") {
      return 1;
    }

    if (leftKey === "Grand Total") {
      return 1;
    }
    if (rightKey === "Grand Total") {
      return -1;
    }

    const leftPeriod = this.getPeriodSortValue(leftKey);
    const rightPeriod = this.getPeriodSortValue(rightKey);

    if (leftPeriod !== null && rightPeriod !== null) {
      return leftPeriod - rightPeriod;
    }
    if (leftPeriod !== null) {
      return -1;
    }
    if (rightPeriod !== null) {
      return 1;
    }

    return leftKey.localeCompare(rightKey);
  };

  private getPeriodSortValue(key: string): number | null {
    const period = this.parsePeriodKey(key);
    if (!period) {
      return null;
    }
    const { month, year } = period;
    return year * 100 + month;
  }

  isPeriodColumn(key: string): boolean {
    return this.parsePeriodKey(String(key)) !== null;
  }

  private parsePeriodKey(key: string): { month: number; year: number } | null {
    if (!key) {
      return null;
    }

    const numericMatch = key.match(/^(\d{1,2})-(\d{4})$/);
    if (numericMatch) {
      const month = Number(numericMatch[1]);
      const year = Number(numericMatch[2]);

      if (Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year)) {
        return { month, year };
      }
    }

    const namedMatch = key.match(/^([A-Za-z]{3})-(\d{4})$/);
    if (namedMatch) {
      const monthMoment = moment(namedMatch[1], 'MMM', true);
      const year = Number(namedMatch[2]);

      if (monthMoment.isValid() && Number.isInteger(year)) {
        return { month: monthMoment.month() + 1, year };
      }
    }

    return null;
  }

  canOpenAuditFromCell(columnKey: string, row: any): boolean {
    const key = String(columnKey || '');

    if (this.isPeriodColumn(key)) {
      return true;
    }

    if (key === 'Customer') {
      return false;
    }

    if (key === 'Grand Total') {
      return !this.isTotalRevenueRow(row, -1);
    }

    return false;
  }

  getMatrixCellTitle(columnKey: string, row: any): string | null {
    const key = String(columnKey || '');
    if (this.isPeriodColumn(key)) {
      return 'Open weekly breakdown';
    }
    if (this.canOpenAuditFromCell(key, row)) {
      return 'Open audit breakdown';
    }
    return null;
  }

  async onMatrixCellClick(columnKey: string, row: any, rowIndex: number): Promise<void> {
    const key = String(columnKey || '');

    if (this.isPeriodColumn(key)) {
      await this.getData1(key);
      return;
    }

    if (!this.canOpenAuditFromCell(key, row)) {
      return;
    }

    await this.triggerAuditFromCell(key, row, rowIndex);
  }

  async triggerAuditFromCell(columnKey: string, row: any, rowIndex: number): Promise<void> {
    const key = String(columnKey || '');

    if (key === 'Grand Total') {
      await this.openCustomerGrandTotalAudit(row);
      return;
    }

    if (!this.isPeriodColumn(key)) {
      return;
    }

    await this.openAuditBreakdown(key, row, rowIndex);
  }

  private resolveAuditPeriodKey(): string | null {
    if (this.d && this.isPeriodColumn(String(this.d))) {
      return String(this.d);
    }

    if (!Array.isArray(this.data) || this.data.length === 0 || !this.data[0]) {
      return null;
    }

    for (const key of Object.keys(this.data[0])) {
      if (this.isPeriodColumn(key)) {
        return key;
      }
    }

    return null;
  }

  private isTotalRevenueRow(row: any, _rowIndex: number): boolean {
    const customer = String(row?.Customer || '').toUpperCase();

    return customer === 'TOTAL REVENUE' || customer === 'TOTAL';
  }

  private getAvailablePeriodKeys(): string[] {
    if (!Array.isArray(this.data) || this.data.length === 0 || !this.data[0]) {
      return [];
    }

    return Object.keys(this.data[0])
      .filter((key) => this.isPeriodColumn(key))
      .sort((a, b) => {
        const left = this.getPeriodSortValue(a) ?? 0;
        const right = this.getPeriodSortValue(b) ?? 0;
        return left - right;
      });
  }

  private buildPeriodBounds(periodKey: string): {
    start: string;
    end: string;
    weekStart: string;
    weekEnd: string;
  } | null {
    const period = this.parsePeriodKey(String(periodKey));
    if (!period) {
      return null;
    }

    const { start, end } = this.getWeekDates(period.year, period.month);
    const startWeekNumber = moment(start).isoWeek();
    const startYearNumber = moment(start).isoWeekYear();
    const endWeekNumber = moment(end).isoWeek();
    const endYearNumber = moment(end).isoWeekYear();

    const weekStart = moment()
      .isoWeekYear(startYearNumber)
      .isoWeek(startWeekNumber)
      .startOf('isoWeek')
      .day(1)
      .format('YYYY-MM-DD');

    const weekEnd = moment()
      .isoWeekYear(endYearNumber)
      .isoWeek(endWeekNumber)
      .startOf('isoWeek')
      .day(7)
      .format('YYYY-MM-DD');

    return {
      start,
      end,
      weekStart,
      weekEnd,
    };
  }

  private async loadAuditRowsForPeriod(periodKey: string): Promise<any[]> {
    const cached = this.periodAuditRowsCache[periodKey];
    if (cached) {
      return cached;
    }

    const bounds = this.buildPeriodBounds(periodKey);
    if (!bounds) {
      return [];
    }

    const response = await this.revenueService.getFutureRevenueByCustomerByWeekly(
      bounds.start,
      bounds.end,
      bounds.weekStart,
      bounds.weekEnd,
      this.excludeTariffFees,
    );

    const rows = this.buildAuditRowsForRange(response?.results || []);
    this.periodAuditRowsCache[periodKey] = rows;
    return rows;
  }

  private async openCustomerGrandTotalAudit(row: any): Promise<void> {
    const customer = String(row?.Customer || '').toUpperCase();
    if (!customer || customer === 'TOTAL REVENUE' || customer === 'TOTAL') {
      return;
    }

    const periodKeys = this.getAvailablePeriodKeys();
    if (periodKeys.length === 0 || !this.auditBreakdownModal) {
      return;
    }

    this.selectedAuditCustomer = customer;
    this.selectedAuditScopeLabel = customer;
    this.selectedAuditPeriodLabel = 'All Periods';
    this.selectedAuditRows = [];
    this.auditModalLoadError = '';
    this.isAuditModalLoading = true;
    this.ensureAuditModalOpen();

    const allRows: any[] = [];

    try {
      for (const periodKey of periodKeys) {
        const periodRows = await this.loadAuditRowsForPeriod(periodKey);
        for (const periodRow of periodRows) {
          if (String(periodRow.customer || '').toUpperCase() === customer) {
            allRows.push(periodRow);
          }
        }
      }

      allRows.sort((a, b) => {
        const leftDate = moment(a.performanceDate).valueOf();
        const rightDate = moment(b.performanceDate).valueOf();

        if (leftDate !== rightDate) {
          return leftDate - rightDate;
        }

        if (a.salesOrder !== b.salesOrder) {
          return String(a.salesOrder).localeCompare(String(b.salesOrder));
        }

        return this.toNumber(a.line) - this.toNumber(b.line);
      });

      this.selectedAuditRows = allRows;
    } catch (err) {
      this.selectedAuditRows = [];
      this.auditModalLoadError = 'Unable to load audit rows for this customer selection.';
    } finally {
      this.isAuditModalLoading = false;
    }
  }

  private ensureAuditModalOpen(): void {
    if (!this.auditBreakdownModal || this.auditModalRef) {
      return;
    }

    this.auditModalRef = this.modalService.open(this.auditBreakdownModal, {
      size: 'xl',
      scrollable: true,
      centered: true,
    });

    this.auditModalRef.result.finally(() => {
      this.auditModalRef = null;
      this.isAuditModalLoading = false;
      this.auditModalLoadError = '';
    });
  }

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
    const period = this.parsePeriodKey(String(d));
    if (!period) {
      return;
    }

    const year = period.year;
    const month = period.month;

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

      this.auditRowsByCustomer = this.buildCustomerAuditRows(this.data1?.results || []);
      this.auditRowsForRange = this.buildAuditRowsForRange(this.data1?.results || []);

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
      this.auditRowsByCustomer = {};
      this.auditRowsForRange = [];
      this.isLoadingSubData = false;
    }
  }

  async openAuditBreakdown(periodKey: string, row: any, rowIndex: number, forceAllRows = false): Promise<void> {
    if (!periodKey || !this.auditBreakdownModal) {
      return;
    }

    const normalizedPeriodKey = this.isPeriodColumn(periodKey)
      ? String(periodKey)
      : null;

    if (!normalizedPeriodKey) {
      return;
    }

    const customer = String(row?.Customer || '').toUpperCase();
    const isTotalRevenueRow = this.isTotalRevenueRow(row, rowIndex);

    this.selectedAuditPeriodLabel = this.convert(normalizedPeriodKey);
    this.selectedAuditRows = [];
    this.auditModalLoadError = '';
    this.isAuditModalLoading = true;

    if (isTotalRevenueRow || forceAllRows) {
      this.selectedAuditCustomer = null;
      this.selectedAuditScopeLabel = 'Total Revenue';
    } else {
      this.selectedAuditCustomer = customer;
      this.selectedAuditScopeLabel = customer;
    }

    this.ensureAuditModalOpen();

    try {
      const periodRows = await this.loadAuditRowsForPeriod(normalizedPeriodKey);

      if (isTotalRevenueRow || forceAllRows) {
        this.selectedAuditRows = periodRows;
      } else {
        this.selectedAuditRows = periodRows.filter(
          (auditRow) => String(auditRow.customer || '').toUpperCase() === customer,
        );
      }
    } catch (err) {
      this.selectedAuditRows = [];
      this.auditModalLoadError = 'Unable to load audit rows for this period.';
    } finally {
      this.isAuditModalLoading = false;
    }
  }

  async openPeriodTotalAudit(periodKey: string): Promise<void> {
    await this.openAuditBreakdown(periodKey, { Customer: 'TOTAL REVENUE' }, -1, true);
  }

  private toNumber(value: any): number {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : 0;
  }

  private buildCustomerAuditRows(rows: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    for (const row of rows || []) {
      const customer = String(row.SO_CUST || '').toUpperCase();
      if (!customer) {
        continue;
      }

      const qtyOrdered = this.toNumber(row.SOD_QTY_ORD);
      const qtyShipped = this.toNumber(row.SOD_QTY_SHIP);
      const openBalanceQty = this.toNumber(
        row.OPEN_BALANCE_QTY !== undefined ? row.OPEN_BALANCE_QTY : qtyOrdered - qtyShipped,
      );
      const unitPrice = this.toNumber(row.SOD_PRICE);
      const openBalanceAmount = this.toNumber(
        row.OPEN_BALANCE_AMOUNT !== undefined
          ? row.OPEN_BALANCE_AMOUNT
          : row.TOTAL !== undefined
            ? row.TOTAL
            : unitPrice * openBalanceQty,
      );

      if (!grouped[customer]) {
        grouped[customer] = [];
      }

      grouped[customer].push({
        customer,
        performanceDate: row.DATE1,
        salesOrder: row.SO_NBR,
        line: this.toNumber(row.SOD_LINE),
        part: row.SOD_PART,
        productLine: row.SOD_PRODLINE,
        qtyOrdered,
        qtyShipped,
        openBalanceQty,
        unitPrice,
        openBalanceAmount,
        tariffAmount: this.toNumber(row.TARIFF_AMOUNT),
        netRevenue: this.toNumber(row.NET_REVENUE),
      });
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => {
        const leftDate = moment(a.performanceDate).valueOf();
        const rightDate = moment(b.performanceDate).valueOf();

        if (leftDate !== rightDate) {
          return leftDate - rightDate;
        }

        if (a.salesOrder !== b.salesOrder) {
          return String(a.salesOrder).localeCompare(String(b.salesOrder));
        }

        return this.toNumber(a.line) - this.toNumber(b.line);
      });
    }

    return grouped;
  }

  getCustomerAuditRows(customerCode: string): any[] {
    return this.auditRowsByCustomer[String(customerCode || '').toUpperCase()] || [];
  }

  private buildAuditRowsForRange(rows: any[]): any[] {
    const allRows: any[] = [];

    for (const row of rows || []) {
      const customer = String(row.SO_CUST || '').toUpperCase();
      if (!customer) {
        continue;
      }

      const qtyOrdered = this.toNumber(row.SOD_QTY_ORD);
      const qtyShipped = this.toNumber(row.SOD_QTY_SHIP);
      const openBalanceQty = this.toNumber(
        row.OPEN_BALANCE_QTY !== undefined ? row.OPEN_BALANCE_QTY : qtyOrdered - qtyShipped,
      );
      const unitPrice = this.toNumber(row.SOD_PRICE);
      const openBalanceAmount = this.toNumber(
        row.OPEN_BALANCE_AMOUNT !== undefined
          ? row.OPEN_BALANCE_AMOUNT
          : row.TOTAL !== undefined
            ? row.TOTAL
            : unitPrice * openBalanceQty,
      );

      allRows.push({
        customer,
        performanceDate: row.DATE1,
        salesOrder: row.SO_NBR,
        line: this.toNumber(row.SOD_LINE),
        part: row.SOD_PART,
        productLine: row.SOD_PRODLINE,
        qtyOrdered,
        qtyShipped,
        openBalanceQty,
        unitPrice,
        openBalanceAmount,
        tariffAmount: this.toNumber(row.TARIFF_AMOUNT),
        netRevenue: this.toNumber(row.NET_REVENUE),
      });
    }

    allRows.sort((a, b) => {
      const leftDate = moment(a.performanceDate).valueOf();
      const rightDate = moment(b.performanceDate).valueOf();

      if (leftDate !== rightDate) {
        return leftDate - rightDate;
      }

      if (a.customer !== b.customer) {
        return String(a.customer).localeCompare(String(b.customer));
      }

      if (a.salesOrder !== b.salesOrder) {
        return String(a.salesOrder).localeCompare(String(b.salesOrder));
      }

      return this.toNumber(a.line) - this.toNumber(b.line);
    });

    return allRows;
  }

  sumAuditRows(rows: any[], key: string): number {
    let total = 0;
    for (const row of rows || []) {
      total += this.toNumber(row?.[key]);
    }
    return total;
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
