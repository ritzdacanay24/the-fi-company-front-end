import { MenuItem } from './menu.model';

export const MENU: MenuItem[] = [
  {
    id: 1,
    label: 'MENUITEMS.MENU.TEXT',
    isTitle: true
  },
  // {
  //   id: 3,
  //   label: 'MENUITEMS.DASHBOARD.TEXT',
  //   icon: 'las la-tachometer-alt',
  //   link: '/dashboard',
  // },
  {
    id: 3,
    label: 'MENUITEMS.OPERATIONS.TEXT',
    icon: 'las la-bookmark',
    isCollapsed: true,
    subItems: [
      {
        label: 'MENUITEMS.OPERATIONS.LABELS',
        link: '/dashboard/operations/labels/list',
        description: "Labels"
      },
      {
        label: 'MENUITEMS.OPERATIONS.LOGISTICS.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.LOGISTICS.CALENDAR',
            link: '/dashboard/operations/logistics/calendar',
            description: "Logistics Calendar"
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.MASTER_SCHEDULING.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.MASTER_SCHEDULING.SHIPPING',
            link: '/dashboard/operations/master-scheduling/shipping',
            description: "Shipping"
          },
          {
            label: 'MENUITEMS.OPERATIONS.MASTER_SCHEDULING.ALL_ROUTING',
            link: '/dashboard/operations/master-scheduling/all-routing',
            description: "Master scheduling"
          },
          {
            label: 'MENUITEMS.OPERATIONS.MASTER_SCHEDULING.PICKING_ROUTING',
            link: '/dashboard/operations/master-scheduling/picking-routing',
            description: "Picking"
          },
          {
            label: 'MENUITEMS.OPERATIONS.MASTER_SCHEDULING.PRODUCTION_ROUTING',
            link: '/dashboard/operations/master-scheduling/production-routing',
            description: "Production"
          },
          {
            label: 'MENUITEMS.OPERATIONS.MASTER_SCHEDULING.QC_ROUTING',
            link: '/dashboard/operations/master-scheduling/qc-routing',
            description: "QC"
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.SHIPPING_REQUEST.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.SHIPPING_REQUEST.LIST',
            link: '/dashboard/operations/forms/shipping-request/list',
            description: "Shipping List"
          },
          {
            label: 'MENUITEMS.OPERATIONS.SHIPPING_REQUEST.CREATE',
            link: '/dashboard/operations/forms/shipping-request/create',
            description: "Shipping Request Create"
          },
          {
            label: 'MENUITEMS.OPERATIONS.SHIPPING_REQUEST.EDIT',
            link: '/dashboard/operations/forms/shipping-request/edit',
            description: "Shipping Request Edit"
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.RFQ.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.RFQ.LIST',
            link: '/dashboard/operations/forms/rfq/list',
            description: "RFQ Request"
          },
          {
            label: 'MENUITEMS.OPERATIONS.RFQ.CREATE',
            link: '/dashboard/operations/forms/rfq/create',
            description: "RFQ Create"
          },
          {
            label: 'MENUITEMS.OPERATIONS.RFQ.EDIT',
            link: '/dashboard/operations/forms/rfq/edit',
            description: "RFQ Edit"
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.VEHICLE.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.VEHICLE.LIST',
            link: '/dashboard/operations/forms/vehicle/list',
            description: "Vehicle List"
          },
          {
            label: 'MENUITEMS.OPERATIONS.VEHICLE.CREATE',
            link: '/dashboard/operations/forms/vehicle/create',
            description: "Vehicle Create"
          },
          {
            label: 'MENUITEMS.OPERATIONS.VEHICLE.EDIT',
            link: '/dashboard/operations/forms/vehicle/edit',
            description: "Vehicle Edit"
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.PLACARD.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.PLACARD.LIST',
            link: '/dashboard/operations/forms/placard/list',
            description: "Placard List"
          },
          {
            label: 'MENUITEMS.OPERATIONS.PLACARD.CREATE',
            link: '/dashboard/operations/forms/placard/create',
            description: "Placard Create"
          },
          {
            label: 'MENUITEMS.OPERATIONS.PLACARD.EDIT',
            link: '/dashboard/operations/forms/placard/edit',
            description: "Placard Edit"
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.IGT_TRANSFER.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.IGT_TRANSFER.LIST',
            link: '/dashboard/operations/forms/igt-transfer/list',
            description: "IGT Transfer"
          },
          {
            label: 'MENUITEMS.OPERATIONS.IGT_TRANSFER.CREATE',
            link: '/dashboard/operations/forms/igt-transfer/create',
            description: "IGT Transfer Create"
          },
          {
            label: 'MENUITEMS.OPERATIONS.IGT_TRANSFER.EDIT',
            link: '/dashboard/operations/forms/igt-transfer/edit',
            description: "IGT Transfer Edit"
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.SHORTAGES.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.SHORTAGES.LIST',
            link: '/dashboard/operations/shortages/list',
            description: "Shortage List"
          },
          {
            label: 'MENUITEMS.OPERATIONS.SHORTAGES.CREATE',
            link: '/dashboard/operations/shortages/create',
            description: "Shortage Create"
          },
          {
            label: 'MENUITEMS.OPERATIONS.SHORTAGES.EDIT',
            link: '/dashboard/operations/shortages/edit',
            description: "Shortage Edit"
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.MATERIAL_REQUEST.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.MATERIAL_REQUEST.LIST',
            link: '/dashboard/operations/material-request/list',
            description: "Material Request List"
          },
          {
            label: 'MENUITEMS.OPERATIONS.MATERIAL_REQUEST.CREATE',
            link: '/dashboard/operations/material-request/create',
            description: "Material Request Create"
          },
          {
            label: 'MENUITEMS.OPERATIONS.MATERIAL_REQUEST.EDIT',
            link: '/dashboard/operations/material-request/edit',
            description: "Material Request Edit"
          },
          {
            label: 'MENUITEMS.OPERATIONS.MATERIAL_REQUEST.VALIDATE',
            link: '/dashboard/operations/material-request/validate-list',
            description: "Material Request Validate"
          },
          {
            label: 'MENUITEMS.OPERATIONS.MATERIAL_REQUEST.PICKING',
            link: '/dashboard/operations/material-request/picking',
            description: "Material Request Picking"
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.REPORTS.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.DAILY_REPORT',
            link: '/dashboard/operations/reports/daily-report',
            description: "Daily Report"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.REVENUE',
            link: '/dashboard/operations/reports/revenue',
            description: "Revenue"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.REVENUE_BY_CUSTOMER',
            link: '/dashboard/operations/reports/revenue-by-customer',
            description: "Revenue by customer"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.WIP_REPORT',
            link: '/dashboard/operations/reports/wip-report',
            description: "WIP Report"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.TRANSIT_LOCATION_VALUE_REPORT',
            link: '/dashboard/operations/reports/transit-location-value-report',
            description: "Transit location report"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.FG_VALUE_REPORT',
            link: '/dashboard/operations/reports/fg-value-report',
            description: "Finished goods report"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.JX_VALUE_REPORT',
            link: '/dashboard/operations/reports/jx-value-report',
            description: "JX report"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.LV_RAW_MATERIAL',
            link: '/dashboard/operations/reports/las-vegas-raw-material-report',
            description: "Las vegas raw material report"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.SAFETY_STOCK_REPORT',
            link: '/dashboard/operations/reports/safety-stock-report',
            description: "Safety stock report"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.SHIPPED_ORDERS',
            link: '/dashboard/operations/reports/shipped-orders-report',
            description: "Shipped orders report"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.NEGATIVE_LOCATION_REPORT',
            link: '/dashboard/operations/reports/negative-location-report',
            description: "Negative location report"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.EMPTY_LOCATION_REPORT',
            link: '/dashboard/operations/reports/empty-location-report',
            description: "Empty location report"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.INVENTORY_REPORT',
            link: '/dashboard/operations/reports/inventory-report',
            description: "Inventory report"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.ONE_SKU_LOCATION_REPORT',
            link: '/dashboard/operations/reports/one-sku-location-report',
            description: "One sku location report"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.ITEM_CONSOLIDATION_REPORT',
            link: '/dashboard/operations/reports/item-consolidation-report',
            description: "Item consolidation report"
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.WORK_ORDER_VARIANCE',
            link: '/dashboard/operations/reports/work-order-variance-report',
            description: "Work Order Variance Report"
          },
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.GRAPHICS.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.GRAPHICS.LIST',
            link: '/dashboard/operations/graphics/list',
            description: "Graphics list"
          },
          {
            label: 'MENUITEMS.OPERATIONS.GRAPHICS.EDIT',
            link: '/dashboard/operations/graphics/edit',
            description: "Graphics edit"
          },
          {
            label: 'MENUITEMS.OPERATIONS.GRAPHICS.PRODUCTION',
            link: '/dashboard/operations/graphics/production',
            description: "Graphics production"
          },
          {
            label: 'MENUITEMS.OPERATIONS.GRAPHICS.DEMAND',
            link: '/dashboard/operations/graphics/demand',
            description: "Graphics demand"
          },
          {
            label: 'MENUITEMS.OPERATIONS.GRAPHICS.BOM.NAME',
            isCollapsed: true,
            subItems: [
              {
                label: 'MENUITEMS.OPERATIONS.GRAPHICS.BOM.LIST',
                link: '/dashboard/operations/graphics/bom/list',
                description: "Graphics bom list"
              },
              {
                label: 'MENUITEMS.OPERATIONS.GRAPHICS.BOM.CREATE',
                link: '/dashboard/operations/graphics/bom/create',
                description: "Graphics bom create"
              },
              {
                label: 'MENUITEMS.OPERATIONS.GRAPHICS.BOM.EDIT',
                link: '/dashboard/operations/graphics/bom/edit',
                description: "Graphics bom edit"
              },
            ]
          }
        ]
      },
    ]
  },

  {
    id: 3,
    label: 'MENUITEMS.QUALITY.TEXT',
    icon: 'las la-tools',
    isCollapsed: true,
    subItems: [
      {
        label: 'MENUITEMS.QUALITY.OVERVIEW',
        link: '/dashboard/quality/overview/summary',
        description: "Quality overview"
      },
      {
        label: 'MENUITEMS.QUALITY.RMA.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.QUALITY.RMA.LIST',
            link: '/dashboard/quality/rma/list',
            description: "RMA list"
          },
          {
            label: 'MENUITEMS.QUALITY.RMA.CREATE',
            link: '/dashboard/quality/rma/create',
            description: "RMA create"
          },
          {
            label: 'MENUITEMS.QUALITY.RMA.EDIT',
            link: '/dashboard/quality/rma/edit',
            description: "RMA edit"
          },
        ]
      },
      {
        label: 'MENUITEMS.QUALITY.SGASSET.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.QUALITY.SGASSET.LIST',
            link: '/dashboard/quality/sg-asset/list',
            description: "SG Asset list"
          },
          {
            label: 'MENUITEMS.QUALITY.SGASSET.CREATE',
            link: '/dashboard/quality/sg-asset/create',
            description: "SG Asset create"
          },
          {
            label: 'MENUITEMS.QUALITY.SGASSET.EDIT',
            link: '/dashboard/quality/sg-asset/edit',
            description: "SG Asset edit"
          },
        ]
      },
      {
        label: 'MENUITEMS.QUALITY.AGSSERIAL.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.QUALITY.AGSSERIAL.LIST',
            link: '/dashboard/quality/ags-serial/list',
            description: "AGS serial list"
          },
          {
            label: 'MENUITEMS.QUALITY.AGSSERIAL.CREATE',
            link: '/dashboard/quality/ags-serial/create',
            description: "AGS serial create"
          },
          {
            label: 'MENUITEMS.QUALITY.AGSSERIAL.EDIT',
            link: '/dashboard/quality/ags-serial/edit',
            description: "AGS serial edit"
          },
        ]
      },
      // {
      //   label: 'MENUITEMS.QUALITY.MRB.NAME',
      //   icon: 'las la-tachometer-alt',
      //   isCollapsed: true,
      //   subItems: [
      //     {
      //       label: 'MENUITEMS.QUALITY.MRB.LIST',
      //       link: '/quality/mrb/list',
      //     },
      //     {
      //       label: 'MENUITEMS.QUALITY.MRB.CREATE',
      //       link: '/quality/mrb/create',
      //     },
      //     {
      //       label: 'MENUITEMS.QUALITY.MRB.EDIT',
      //       link: '/quality/mrb/edit',
      //     },
      //   ]
      // },
      {
        label: 'MENUITEMS.QUALITY.NCR.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.QUALITY.NCR.LIST',
            link: '/dashboard/quality/ncr/list',
            description: "NCR list"
          },
          {
            label: 'MENUITEMS.QUALITY.NCR.CREATE',
            link: '/dashboard/quality/ncr/create',
            description: "NCR create"
          },
          {
            label: 'MENUITEMS.QUALITY.NCR.OVERVIEW',
            link: '/dashboard/quality/ncr/overview',
            description: "NCR overview"
          },
        ]
      },
      {
        label: 'MENUITEMS.QUALITY.QIR.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.QUALITY.QIR.LIST',
            link: '/dashboard/quality/qir/list',
            description: "QIR list"
          },
          {
            label: 'MENUITEMS.QUALITY.QIR.CREATE',
            link: '/dashboard/quality/qir/create',
            description: "QIR create"
          },
          {
            label: 'MENUITEMS.QUALITY.QIR.EDIT',
            link: '/dashboard/quality/qir/edit',
            description: "QIR edit"
          },
          {
            label: 'MENUITEMS.QUALITY.QIR.SETTINGS.NAME',
            subItems: [
              {
                label: 'MENUITEMS.QUALITY.QIR.SETTINGS.LIST',
                link: '/dashboard/quality/qir/settings/list',
                description: "QIR settings list"
              },
              {
                label: 'MENUITEMS.QUALITY.QIR.SETTINGS.CREATE',
                link: '/dashboard/quality/qir/settings/create',
                description: "QIR settings create"
              },
              {
                label: 'MENUITEMS.QUALITY.QIR.SETTINGS.EDIT',
                link: '/dashboard/quality/qir/settings/edit',
                description: "QIR settings edit"
              },
            ]
          },
        ]
      },
    ]
  },
  {
    id: 3,
    label: 'MENUITEMS.FIELDSERVICE.TEXT',
    icon: 'las la-tachometer-alt',
    isCollapsed: true,
    subItems: [
      {
        label: 'MENUITEMS.FIELDSERVICE.OVERVIEW',
        link: '/dashboard/field-service/overview/summary',
        description: "Field Service Overview"
      },
      {
        label: 'MENUITEMS.FIELDSERVICE.SCHEDULING.CALENDAR',
        link: '/dashboard/field-service/scheduling/calendar',
        description: "Field Service Calendar"
      },
      {
        label: 'MENUITEMS.FIELDSERVICE.SCHEDULING.TECHSCHEDULE',
        link: '/dashboard/field-service/scheduling/tech-schedule',
        description: "Field Service Tech Schedule"
      },
      {
        label: 'MENUITEMS.FIELDSERVICE.JOB.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.FIELDSERVICE.JOB.LIST',
            link: '/dashboard/field-service/jobs/list',
            description: "Field Service Job List"
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.JOB.CREATE',
            link: '/dashboard/field-service/jobs/create',
            description: "Field Service Job Create"
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.JOB.EDIT',
            link: '/dashboard/field-service/jobs/edit',
            description: "Field Service Job Edit"
          },
          // {
          //   label: 'MENUITEMS.FIELDSERVICE.JOB.OVERVIEW',
          //   link: '/dashboard/field-service/jobs/overview',
          // },
          {
            label: 'MENUITEMS.FIELDSERVICE.JOB.OPEN_INVOICES',
            link: '/dashboard/field-service/jobs/job-open-invoice',
            description: "Field Service Open Invoices"
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.JOB.BILLING',
            link: '/dashboard/field-service/jobs/billing',
            description: "Field Service Billing"
          },
        ]
      },
      {
        label: 'MENUITEMS.FIELDSERVICE.TICKET.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.FIELDSERVICE.TICKET.LIST',
            link: '/dashboard/field-service/ticket/list',
            description: "Field Service Tickets"
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.TICKET.OVERVIEW',
            link: '/dashboard/field-service/ticket/overview',
            description: "Field Service Tickets Edit"
          },
        ]
      },
      {
        label: 'MENUITEMS.FIELDSERVICE.REQUEST.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.FIELDSERVICE.REQUEST.LIST',
            link: '/dashboard/field-service/request/list',
            description: "Field Service Request List"
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.REQUEST.CREATE',
            link: '/dashboard/field-service/request/create',
            description: "Field Service Request Create"
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.REQUEST.EDIT',
            link: '/dashboard/field-service/request/edit',
            description: "Field Service Request Edit"
          },
        ]
      },
      {
        id: 4,
        label: 'MENUITEMS.FIELDSERVICE.REPORTS.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.JOBSBYLOCATION',
            link: '/dashboard/field-service/reports/jobs-by-location',
            description: "Field Service Jobs by location report"
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.PLATFORMAVG',
            link: '/dashboard/field-service/reports/platform-avg',
            description: "Field Service Platform avg report"
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.EXPENSEREPORT',
            link: '/dashboard/field-service/reports/expense-report',
            description: "Field Service expense report"
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.SERVICEREPORT',
            link: '/dashboard/field-service/reports/service-report',
            description: "Field Service service report"
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.CUSTOMEREPORT',
            link: '/dashboard/field-service/reports/customer-report',
            description: "Field Service Customer Report"
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.INVOICEREPORT',
            link: '/dashboard/field-service/reports/invoice-report',
            description: "Field Service Invoice Report"
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.JOBBYUSERREPORT',
            link: '/dashboard/field-service/reports/job-by-user-report',
            description: "Field Service Jobs By User Report"
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.CONTRACTORVSTECH',
            link: '/dashboard/field-service/reports/contractor-vs-tech-report',
            description: "Field Service Contract Vs Tech Report"
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.TICKETEVENTREPORT',
            link: '/dashboard/field-service/reports/ticket-event-report',
            description: "Field Service Ticket Report"
          },
        ]
      },
      {
        label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.NAME',
        icon: 'las la-cog',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.JOB_STATUS.NAME',
            icon: 'las la-tachometer-alt',
            isCollapsed: true,
            subItems: [
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.JOB_STATUS.LIST',
                link: '/dashboard/field-service/maintenance/job-status/list',
                description: "Field Service Status List"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.JOB_STATUS.CREATE',
                link: '/dashboard/field-service/maintenance/job-status/create',
                description: "Field Service Status Create"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.JOB_STATUS.EDIT',
                link: '/dashboard/field-service/maintenance/job-status/edit',
                description: "Field Service Status Edit"
              },
            ]
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.SERVICE_TYPE.NAME',
            icon: 'las la-tachometer-alt',
            isCollapsed: true,
            subItems: [
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.SERVICE_TYPE.LIST',
                link: '/dashboard/field-service/maintenance/service-type/list',
                description: "Field Service Service Type List"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.SERVICE_TYPE.CREATE',
                link: '/dashboard/field-service/maintenance/service-type/create',
                description: "Field Service Service Type Create"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.SERVICE_TYPE.EDIT',
                link: '/dashboard/field-service/maintenance/service-type/edit',
                description: "Field Service Service Type Edit"
              },
            ]
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.PROPERTY.NAME',
            icon: 'las la-tachometer-alt',
            isCollapsed: true,
            subItems: [
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.PROPERTY.LIST',
                link: '/dashboard/field-service/maintenance/property/list',
                description: "Field Service Property Edit"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.PROPERTY.CREATE',
                link: '/dashboard/field-service/maintenance/property/create',
                description: "Field Service Property Create"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.PROPERTY.EDIT',
                link: '/dashboard/field-service/maintenance/property/edit',
                description: "Field Service Property Edit"
              },
            ]
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.RECEIPT_CATEGORY.NAME',
            icon: 'las la-tachometer-alt',
            isCollapsed: true,
            subItems: [
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.RECEIPT_CATEGORY.LIST',
                link: '/dashboard/field-service/maintenance/receipt-category/list',
                description: "Field Service Receipt Category List"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.RECEIPT_CATEGORY.CREATE',
                link: '/dashboard/field-service/maintenance/receipt-category/create',
                description: "Field Service Receipt Category Create"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.RECEIPT_CATEGORY.EDIT',
                link: '/dashboard/field-service/maintenance/receipt-category/edit',
                description: "Field Service Receipt Category Edit"
              },
            ]
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.TICKET_EVENT.NAME',
            icon: 'las la-tachometer-alt',
            isCollapsed: true,
            subItems: [
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.TICKET_EVENT.LIST',
                link: '/dashboard/field-service/maintenance/ticket-event/list',
                description: "Field Service Ticket Event List"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.TICKET_EVENT.CREATE',
                link: '/dashboard/field-service/maintenance/ticket-event/create',
                description: "Field Service Ticket Event Create"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.TICKET_EVENT.EDIT',
                link: '/dashboard/field-service/maintenance/ticket-event/edit',
                description: "Field Service Ticket Event Edit"
              },
            ]
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.CUSTOMER.NAME',
            icon: 'las la-tachometer-alt',
            isCollapsed: true,
            subItems: [
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.CUSTOMER.LIST',
                link: '/dashboard/field-service/maintenance/customer/list',
                description: "Field Service customer list"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.CUSTOMER.CREATE',
                link: '/dashboard/field-service/maintenance/customer/create',
                description: "Field Service customer create"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.CUSTOMER.EDIT',
                link: '/dashboard/field-service/maintenance/customer/edit',
                description: "Field Service customer edit"
              },
            ]
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.PLATFORM.NAME',
            icon: 'las la-tachometer-alt',
            isCollapsed: true,
            subItems: [
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.PLATFORM.LIST',
                link: '/dashboard/field-service/maintenance/platform/list',
                description: "Field Service platform list"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.PLATFORM.CREATE',
                link: '/dashboard/field-service/maintenance/platform/create',
                description: "Field Service platform create"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.PLATFORM.EDIT',
                link: '/dashboard/field-service/maintenance/platform/edit',
                description: "Field Service platform edit"
              },
            ]
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.NON_BILLABLE_CODES.NAME',
            icon: 'las la-tachometer-alt',
            isCollapsed: true,
            subItems: [
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.NON_BILLABLE_CODES.LIST',
                link: '/dashboard/field-service/maintenance/non-billable-code/list',
                description: "Field Service billable code list"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.NON_BILLABLE_CODES.CREATE',
                link: '/dashboard/field-service/maintenance/non-billable-code/create',
                description: "Field Service billable code create"
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.NON_BILLABLE_CODES.EDIT',
                link: '/dashboard/field-service/maintenance/non-billable-code/edit',
                description: "Field Service billable code edit"
              },
            ]
          },
        ]
      },
    ]
  },
  {
    id: 3,
    label: 'MENUITEMS.MAINTENANCE.NAME',
    icon: 'las la-cog',
    isCollapsed: true,
    subItems: [
      {
        label: 'MENUITEMS.MAINTENANCE.USERS',
        link: '/dashboard/maintenance/user/list',
        description: "Users"
      },
      {
        label: 'MENUITEMS.MAINTENANCE.CREATE',
        link: '/dashboard/maintenance/user/create',
        description: "User Create"
      },
      {
        label: 'MENUITEMS.MAINTENANCE.EDIT',
        link: '/dashboard/maintenance/user/edit',
        description: "User Edit"
      }
    ]
  },
  {
    id: 3,
    label: 'MENUITEMS.ADMIN.NAME',
    icon: 'las la-lock',
    isCollapsed: true,
    subItems: [
      {
        label: 'MENUITEMS.ADMIN.QUERY',
        link: '/dashboard/admin/query',
        description: "Query"
      }
    ]
  },
];

