import { Component, OnInit } from '@angular/core';
import { DailyReportHistoryService } from './daily-report-history.service';
import { Router } from '@angular/router';
import moment from 'moment';
import { SharedModule } from '@app/shared/shared.module';
import { currency } from 'src/assets/js/util';
import { LogisiticsDailyReportService } from '@app/core/api/operations/logisitics/daily-report.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { DailyReportModalService } from '../daily-report/daily-report-modal/daily-report-modal.component';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-daily-report-history',
  templateUrl: './daily-report-history.component.html',
  styleUrls: ['./daily-report-history.component.scss']
})
export class DailyReportHistoryComponent implements OnInit {
  
  data: any;
  logistics: any;
  
  selectedDate: string = moment().format('YYYY-MM-DD');
  displayedDate: string = '';
  displayedDateAsOf: string = '';
  
  displayedColumns: any = [];
  
  hiddenColumns = [];
  sortedColumns = [];
  myCopiedData: any;
  
  isLoading = false;

  constructor(
    private reportHistoryService: DailyReportHistoryService,
    private logisiticsDailyReportService: LogisiticsDailyReportService,
    private authenticationService: AuthenticationService,
    private dailyReportModalService: DailyReportModalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReportForDate(this.selectedDate);
  }

  openConfig(): void {
    let modalRef = this.dailyReportModalService.open(this.displayedColumns)
    modalRef.result.then((result: any) => {
      if (result == 'reset') {
        this.displayedColumns = this.myCopiedData
      } else {
        this.displayedColumns = result
      }
    }, () => { });
  }

  async getDailyReportConfi(): Promise<void> {
    try {
      let data: any = await this.logisiticsDailyReportService.getDailyReportConfig(this.authenticationService.currentUserValue.id);
      if (data && data?.hidden_column) {
        this.hiddenColumns = JSON.parse(data?.hidden_column)
      }
      this.sortedColumns = data.sort_column ? JSON.parse(data.sort_column) : null;
    } catch (err) {
      console.error('Error getting report config:', err);
    }
  }

  loadReportForDate(date: string): void {
    this.selectedDate = date;
    this.isLoading = true;
    this.reportHistoryService.getDailyReportHistory({
      startDate: date,
      endDate: date,
      page: 1,
      limit: 1
    }).subscribe(
      async (response: any) => {
        try {
          if (response.success && response.data && response.data.length > 0) {
            const reportData = response.data[0];
            this.data = reportData.data;
            this.displayedDate = moment(reportData.createdDate).format('YYYY-MM-DD');
            this.displayedDateAsOf = moment(reportData.createdDate).format('YYYY-MM-DD HH:mm:ss');
            
            // Get logistics data
            this.logistics = await this.logisiticsDailyReportService.getDailyReport();
            
            await this.getDailyReportConfi();
            
            this.buildDisplayedColumns();
          } else {
            console.warn('No report found for date:', date);
            this.data = null;
            this.logistics = null;
            this.displayedColumns = [];
          }
        } catch (err) {
          console.error('Error processing report:', err);
        } finally {
          this.isLoading = false;
        }
      },
      (error) => {
        console.error('Error loading report:', error);
        this.isLoading = false;
      }
    );
  }

  private buildDisplayedColumns(): void {
    this.displayedColumns = [
      {
        id: 1,
        seq: 1,
        isVisible: true,
        titleInfo: {
          title: "Open sales order $",
          subtitle: "Calculated based on Overdue & Due Today lines"
        },
        valueInfo: {
          title: currency(this.data?.shipping_open_overdue_and_due_today_value),
          subtitle: `(${this.data?.shipping_open_overdue_and_due_today_lines} total open lines)`
        }
      },
      {
        id: 2,
        seq: 2,
        isVisible: true,
        titleInfo: {
          title: `Lines shipped today $ (${this.displayedDate})`,
          subtitle: ""
        },
        valueInfo: {
          title: currency(this.data?.shipping_total_shipped_value),
          subtitle: `(${this.data?.total_shipped_today_lines} total lines shipped today)`
        }
      },
      {
        id: 3,
        seq: 3,
        isVisible: true,
        titleInfo: {
          title: `% Shipping OTD (${this.displayedDate})`,
          subtitle: "(Lines shipped before or on performance date  / Total lines shipped today)"
        },
        valueInfo: {
          title: this.data?.on_time_delivery_today_percent?.toFixed(2) + '%',
          subtitle: `(${this.data?.on_time_delivery_today} of ${this.data?.total_lines_due_today} total lines)`,
        }
      },
      {
        id: 4,
        seq: 4,
        isVisible: true,
        titleInfo: {
          title: `% Production Orders OTD (${this.displayedDate})`,
          subtitle: "Based on routing 20"
        },
        valueInfo: {
          title: this.data?.production?.production_routing_20?.due?.due_total > 0 ? ((this.data?.production?.production_routing_20?.due?.due_completed_today / this.data?.production?.production_routing_20?.due?.due_total) * 100)?.toFixed(2) : 0,
          subtitle: `${this.data?.production?.production_routing_20?.due?.due_completed_today} of ${this.data?.production?.production_routing_20?.due?.due_total} work orders`,
        }
      },
      {
        id: 5,
        seq: 5,
        isVisible: true,
        titleInfo: {
          title: `Ready to Ship, this period`,
          subtitle: ''
        },
        valueInfo: {
          title: currency(this.logistics?.openBalanceCurrentMonth),
          subtitle: ''
        }
      },
      {
        id: 6,
        seq: 6,
        isVisible: true,
        titleInfo: {
          title: `Open Lines Current Week`,
          subtitle: ''
        },
        valueInfo: {
          title: this.logistics?.openLinesForCurrentWeek?.VALUE,
          subtitle: ''
        }
      },
      {
        id: 7,
        seq: 7,
        isVisible: true,
        titleInfo: {
          title: `Open Lines Today`,
          subtitle: ''
        },
        valueInfo: {
          title: this.logistics?.openLinesToday?.VALUE,
          subtitle: ''
        }
      },
      {
        id: 8,
        seq: 8,
        isVisible: true,
        titleInfo: {
          title: `Op 10 Completed Today`,
          subtitle: ''
        },
        valueInfo: {
          title: this.logistics?.ops10RoutingCompleted?.VALUE,
          subtitle: ''
        }
      },
      {
        id: 9,
        seq: 9,
        isVisible: true,
        titleInfo: {
          title: `OP 20 due and overdue`,
          subtitle: ''
        },
        valueInfo: {
          title: this.data?.production?.production_routing_20?.due?.total_overdue_orders + this.data?.production?.production_routing_20?.due?.due_open,
          subtitle: ''
        }
      },
      {
        id: 10,
        seq: 10,
        isVisible: true,
        titleInfo: {
          title: `Future Open Revenue, Current Month`,
          subtitle: `${this.logistics?.futuerOpenRevenueCurrentMonth?.dateFrom} - ${this.logistics?.futuerOpenRevenueCurrentMonth?.dateTo}`,
        },
        valueInfo: {
          title: currency(this.logistics?.futuerOpenRevenueCurrentMonth?.value),
          subtitle: ''
        }
      },
      {
        id: 11,
        seq: 11,
        isVisible: true,
        titleInfo: {
          title: `Next 3 months`,
          subtitle: ''
        },
        valueInfo: {
          title: currency(this.data?.getThreeMonthsRevenue?.value),
          subtitle: ''
        }
      },
      {
        id: 12,
        seq: 12,
        isVisible: true,
        isTable: true,
        titleInfo: {
          title: `% Shipping OTD (${this.displayedDate}) DETAILS`,
          subtitle: ''
        },
        valueInfo: {
          title: currency(this.data?.getThreeMonthsRevenue?.value),
          subtitle: ''
        }
      },
      {
        id: 13,
        seq: 13,
        isVisible: true,
        titleInfo: {
          title: `Total Inventory $`,
          subtitle: 'Total value in inventory'
        },
        valueInfo: {
          title: currency(this.data?.inventory_value),
          subtitle: ''
        }
      },
      {
        id: 14,
        seq: 14,
        isVisible: true,
        titleInfo: {
          title: `FG Inventory $`,
          subtitle: ''
        },
        valueInfo: {
          title: currency(this.data?.fgLV?.total),
          subtitle: ''
        }
      },
      {
        id: 15,
        seq: 15,
        isVisible: true,
        titleInfo: {
          title: `JIAXING Inventory $`,
          subtitle: ''
        },
        valueInfo: {
          title: currency(this.data?.jx01?.total),
          subtitle: ''
        }
      },
      {
        id: 16,
        seq: 16,
        isVisible: true,
        titleInfo: {
          title: `TRANSIT Inventory $`,
          subtitle: ''
        },
        valueInfo: {
          title: currency(this.data?.transit_total_ext_cost),
          subtitle: ''
        }
      },
      {
        id: 17,
        seq: 17,
        isVisible: true,
        titleInfo: {
          title: `Safety Stock $`,
          subtitle: ''
        },
        valueInfo: {
          title: currency(this.data?.ss?.total),
          subtitle: ''
        }
      },
      {
        id: 18,
        seq: 18,
        isVisible: true,
        titleInfo: {
          title: `REJECT Inventory $`,
          subtitle: ''
        },
        valueInfo: {
          title: currency(this.data?.reject_total_ext_cost),
          subtitle: ''
        }
      },
      {
        id: 19,
        seq: 19,
        isVisible: true,
        titleInfo: {
          title: `WIP $`,
          subtitle: ''
        },
        valueInfo: {
          title: currency(this.data?.wip),
          subtitle: ''
        }
      },
      {
        id: 20,
        seq: 20,
        isVisible: true,
        titleInfo: {
          title: `Inventory Turns`,
          subtitle: ''
        },
      },
      {
        id: 21,
        seq: 21,
        isVisible: true,
        titleInfo: {
          title: `Late Reason Codes (Today)`,
          subtitle: ''
        },
      },
    ];

    const myArray = this.displayedColumns;
    const myClonedArray = [];
    myArray.forEach(val => myClonedArray.push(Object.assign({}, val)));
    this.myCopiedData = myClonedArray;

    if (this.sortedColumns) {
      for (let i = 0; i < this.displayedColumns.length; i++) {
        for (const [key, value] of Object.entries(this.sortedColumns)) {
          if (key == this.displayedColumns[i].id) {
            this.displayedColumns[i].seq = value;
          }
        }
      }
    }

    this.displayedColumns.sort((a, b) => {
      return a.seq - b.seq;
    });

    for (let i = 0; i < this.displayedColumns.length; i++) {
      if (this.hiddenColumns.indexOf(this.displayedColumns[i].id) >= 0) {
        this.displayedColumns[i].isVisible = false;
      }
    }
  }

}
