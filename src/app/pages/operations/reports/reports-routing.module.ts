
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
import { ShippedOrdersReportV1Component } from './shipped-orders-report-no-chart/shipped-orders-report.component';

const routes: Routes = [
  {
    path: '',
    component: ReportsComponent,
    children: [
      {
        path: '',
        title: "WIP Report",
        redirectTo: 'wip-report',
        pathMatch: 'full'
      },
      {
        title: "Inventory Report",
        path: 'inventory-report',
        component: InventoryReportComponent
      },
      {
        title: "Daily Report",
        path: 'daily-report',
        component: DailyReportComponent
      },
      {
        title: "Revenue By Customer Report",
        path: 'revenue-by-customer',
        component: RevenueByCustomerComponent
      },
      {
        title: "WIP Report",
        path: 'wip-report',
        component: WipReportComponent
      },
      {
        title: "Transit Location Report",
        path: 'transit-location-value-report',
        component: TransitLocationValueReportComponent
      },
      {
        title: "FG Report",
        path: 'fg-value-report',
        component: FgValueReportComponent
      },
      {
        title: "JX Report",
        path: 'jx-value-report',
        component: JxValueReportComponent
      },
      {
        title: "Las Vegas Raw Material Report",
        path: 'las-vegas-raw-material-report',
        component: LasVegasRawMaterialReportComponent
      },
      {
        title: "Safety Stock Report",
        path: 'safety-stock-report',
        component: SafetyStockReportComponent
      },
      {
        title: "Shipped Orders Report",
        path: 'shipped-orders-report',
        component: ShippedOrdersReportComponent
      },
      {
        title: "Shipped Orders Report V1",
        path: 'shipped-orders-report-v1',
        component: ShippedOrdersReportV1Component
      },
      {
        title: "Negative Location Report",
        path: 'negative-location-report',
        component: NegativeLocationReportComponent
      },
      {
        title: "Empty Location Report",
        path: 'empty-location-report',
        component: EmptyLocationReportComponent
      },
      {
        title: "One Sku Location Report",
        path: 'one-sku-location-report',
        component: OneSkuLocationReportComponent
      },
      {
        title: "Item Consolidation Report",
        path: 'item-consolidation-report',
        component: ItemConsolidationReportComponent
      },
      {
        title: "Revenue Report",
        path: 'revenue',
        component: RevenueComponent
      },
      {
        title: "Work Order Variance Report",
        path: 'work-order-variance-report',
        component: WorkOrderVarianceReport
      },
      {
        title: "OTD Report",
        path: 'otd-report',
        component: OtdReportComponent
      },
      {
        title: "Reason Code Report",
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
