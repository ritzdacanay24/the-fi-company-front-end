
import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { ReportsComponent } from './reports.component';
import { WipReportComponent } from './wip-report/wip-report.component';
import { TransitLocationValueReportComponent } from './transit-location-value-report/transit-location-value-report.component';
import { FgValueReportComponent } from './fg-value-report/fg-value-report.component';
import { JxValueReportComponent } from './jx-value-report/jx-value-report.component';
import { LasVegasRawMaterialReportComponent } from './las-vegas-raw-material-report/las-vegas-raw-material-report.component';
import { SafetyStockReportComponent } from './safety-stock-report/safety-stock-report.component';
import { ShippedOrdersReportComponent } from './shipped-orders-report/shipped-orders-report.component';
import { RevenueByCustomerComponent } from './revenue-by-customer/revenue-by-customer.component';
import { DailyReportComponent } from './daily-report/daily-report.component';
import { NegativeLocationReportComponent } from './negative-location-report/negative-location-report.component';
import { EmptyLocationReportComponent } from './empty-location-report/empty-location-report.component';
import { InventoryReportComponent } from './inventory-report/inventory-report.component';
import { OneSkuLocationReportComponent } from './one-sku-location-report/one-sku-location-report.component';
import { ItemConsolidationReportComponent } from './item-consolidation-report/item-consolidation-report.component';
import { RevenueComponent } from './revenue/revenue.component';
import { WorkOrderVarianceReport } from './work-order-variance-report/work-order-variance-report.component';
import { OtdReportComponent } from './otd-report/otd-report.component';
import { ReasonCodeReportComponent } from './reason-code-report/reason-code-report.component';

const routes: Routes = [
  {
    path: '',
    component: ReportsComponent,
    children: [
      {
        path: '',
        redirectTo: 'wip-report',
        pathMatch: 'full'
      },
      {
        path: 'inventory-report',
        component: InventoryReportComponent
      },
      {
        path: 'daily-report',
        component: DailyReportComponent
      },
      {
        path: 'revenue-by-customer',
        component: RevenueByCustomerComponent
      },
      {
        path: 'wip-report',
        component: WipReportComponent
      },
      {
        path: 'transit-location-value-report',
        component: TransitLocationValueReportComponent
      },
      {
        path: 'fg-value-report',
        component: FgValueReportComponent
      },
      {
        path: 'jx-value-report',
        component: JxValueReportComponent
      },
      {
        path: 'las-vegas-raw-material-report',
        component: LasVegasRawMaterialReportComponent
      },
      {
        path: 'safety-stock-report',
        component: SafetyStockReportComponent
      },
      {
        path: 'shipped-orders-report',
        component: ShippedOrdersReportComponent
      },
      {
        path: 'negative-location-report',
        component: NegativeLocationReportComponent
      },
      {
        path: 'empty-location-report',
        component: EmptyLocationReportComponent
      },
      {
        path: 'one-sku-location-report',
        component: OneSkuLocationReportComponent
      },
      {
        path: 'item-consolidation-report',
        component: ItemConsolidationReportComponent
      },
      {
        path: 'revenue',
        component: RevenueComponent
      },
      {
        path: 'work-order-variance-report',
        component: WorkOrderVarianceReport
      },
      {
        path: 'otd-report',
        component: OtdReportComponent
      },
      {
        path: 'reason-code-report',
        component: ReasonCodeReportComponent
      },
    ]
  },
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule]
})
export class ReportsRoutingModule { }
