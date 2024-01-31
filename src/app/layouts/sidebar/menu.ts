import { MenuItem } from './menu.model';

export const MENU: MenuItem[] = [
  {
    id: 1,
    label: 'MENUITEMS.MENU.TEXT',
    isTitle: true
  },
  {
    id: 3,
    label: 'MENUITEMS.OPERATIONS.TEXT',
    icon: 'las la-tachometer-alt',
    isCollapsed: true,
    subItems: [
      {
        label: 'MENUITEMS.OPERATIONS.MASTER_SCHEDULING.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.MASTER_SCHEDULING.SHIPPING',
            link: '/operations/master-scheduling/shipping',
          },
          {
            label: 'MENUITEMS.OPERATIONS.MASTER_SCHEDULING.MASTER_PRODUCTION',
            link: '/operations/master-scheduling/master-production',
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.SHIPPING_REQUEST.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.SHIPPING_REQUEST.LIST',
            link: '/operations/forms/shipping-request/list',
          },
          {
            label: 'MENUITEMS.OPERATIONS.SHIPPING_REQUEST.CREATE',
            link: '/operations/forms/shipping-request/create',
          },
          {
            label: 'MENUITEMS.OPERATIONS.SHIPPING_REQUEST.EDIT',
            link: '/operations/forms/shipping-request/edit',
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.RFQ.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.RFQ.LIST',
            link: '/operations/forms/rfq/list',
          },
          {
            label: 'MENUITEMS.OPERATIONS.RFQ.CREATE',
            link: '/operations/forms/rfq/create',
          },
          {
            label: 'MENUITEMS.OPERATIONS.RFQ.EDIT',
            link: '/operations/forms/rfq/edit',
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.VEHICLE.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.VEHICLE.LIST',
            link: '/operations/forms/vehicle/list',
          },
          {
            label: 'MENUITEMS.OPERATIONS.VEHICLE.CREATE',
            link: '/operations/forms/vehicle/create',
          },
          {
            label: 'MENUITEMS.OPERATIONS.VEHICLE.EDIT',
            link: '/operations/forms/vehicle/edit',
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.PLACARD.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.PLACARD.LIST',
            link: '/operations/forms/placard/list',
          },
          {
            label: 'MENUITEMS.OPERATIONS.PLACARD.CREATE',
            link: '/operations/forms/placard/create',
          },
          {
            label: 'MENUITEMS.OPERATIONS.PLACARD.EDIT',
            link: '/operations/forms/placard/edit',
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.IGT_TRANSFER.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.IGT_TRANSFER.LIST',
            link: '/operations/forms/igt-transfer/list',
          },
          {
            label: 'MENUITEMS.OPERATIONS.IGT_TRANSFER.CREATE',
            link: '/operations/forms/igt-transfer/create',
          },
          {
            label: 'MENUITEMS.OPERATIONS.IGT_TRANSFER.EDIT',
            link: '/operations/forms/igt-transfer/edit',
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.SHORTAGES.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.SHORTAGES.LIST',
            link: '/operations/shortages/list',
          },
          {
            label: 'MENUITEMS.OPERATIONS.SHORTAGES.CREATE',
            link: '/operations/shortages/create',
          },
          {
            label: 'MENUITEMS.OPERATIONS.SHORTAGES.EDIT',
            link: '/operations/shortages/edit',
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.MATERIAL_REQUEST.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.MATERIAL_REQUEST.LIST',
            link: '/operations/material-request/list',
          },
          {
            label: 'MENUITEMS.OPERATIONS.MATERIAL_REQUEST.CREATE',
            link: '/operations/material-request/create',
          },
          {
            label: 'MENUITEMS.OPERATIONS.MATERIAL_REQUEST.EDIT',
            link: '/operations/material-request/edit',
          },
          {
            label: 'MENUITEMS.OPERATIONS.MATERIAL_REQUEST.VALIDATE',
            link: '/operations/material-request/validate-list',
          },
          {
            label: 'MENUITEMS.OPERATIONS.MATERIAL_REQUEST.PICKING',
            link: '/operations/material-request/picking',
          }
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.REPORTS.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.DAILY_REPORT',
            link: '/operations/reports/daily-report',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.REVENUE',
            link: '/operations/reports/revenue',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.REVENUE_BY_CUSTOMER',
            link: '/operations/reports/revenue-by-customer',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.WIP_REPORT',
            link: '/operations/reports/wip-report',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.TRANSIT_LOCATION_VALUE_REPORT',
            link: '/operations/reports/transit-location-value-report',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.FG_VALUE_REPORT',
            link: '/operations/reports/fg-value-report',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.JX_VALUE_REPORT',
            link: '/operations/reports/jx-value-report',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.LV_RAW_MATERIAL',
            link: '/operations/reports/las-vegas-raw-material-report',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.SAFETY_STOCK_REPORT',
            link: '/operations/reports/safety-stock-report',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.SHIPPED_ORDERS',
            link: '/operations/reports/shipped-orders-report',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.NEGATIVE_LOCATION_REPORT',
            link: '/operations/reports/negative-location-report',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.EMPTY_LOCATION_REPORT',
            link: '/operations/reports/empty-location-report',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.INVENTORY_REPORT',
            link: '/operations/reports/inventory-report',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.ONE_SKU_LOCATION_REPORT',
            link: '/operations/reports/one-sku-location-report',
          },
          {
            label: 'MENUITEMS.OPERATIONS.REPORTS.ITEM_CONSOLIDATION_REPORT',
            link: '/operations/reports/item-consolidation-report',
          },
        ]
      },
      {
        label: 'MENUITEMS.OPERATIONS.GRAPHICS.NAME',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.OPERATIONS.GRAPHICS.LIST',
            link: '/operations/graphics/list',
          },
          {
            label: 'MENUITEMS.OPERATIONS.GRAPHICS.EDIT',
            link: '/operations/graphics/edit',
          },
          {
            label: 'MENUITEMS.OPERATIONS.GRAPHICS.PRODUCTION',
            link: '/operations/graphics/production',
          },
          {
            label: 'MENUITEMS.OPERATIONS.GRAPHICS.DEMAND',
            link: '/operations/graphics/demand',
          },
          {
            label: 'MENUITEMS.OPERATIONS.GRAPHICS.BOM.NAME',
            isCollapsed: true,
            subItems: [
              {
                label: 'MENUITEMS.OPERATIONS.GRAPHICS.BOM.LIST',
                link: '/operations/graphics/bom/list',
              },
              {
                label: 'MENUITEMS.OPERATIONS.GRAPHICS.BOM.CREATE',
                link: '/operations/graphics/bom/create',
              },
              {
                label: 'MENUITEMS.OPERATIONS.GRAPHICS.BOM.EDIT',
                link: '/operations/graphics/bom/edit',
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
    icon: 'las la-tachometer-alt',
    isCollapsed: true,
    subItems: [
      {
        label: 'MENUITEMS.QUALITY.OVERVIEW',
        link: '/quality/overview/summary',
      },
      {
        label: 'MENUITEMS.QUALITY.RMA.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.QUALITY.RMA.LIST',
            link: '/quality/rma/list',
          },
          {
            label: 'MENUITEMS.QUALITY.RMA.CREATE',
            link: '/quality/rma/create',
          },
          {
            label: 'MENUITEMS.QUALITY.RMA.EDIT',
            link: '/quality/rma/edit',
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
            link: '/quality/sg-asset/list',
          },
          {
            label: 'MENUITEMS.QUALITY.SGASSET.CREATE',
            link: '/quality/sg-asset/create',
          },
          {
            label: 'MENUITEMS.QUALITY.SGASSET.EDIT',
            link: '/quality/sg-asset/edit',
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
            link: '/quality/ags-serial/list',
          },
          {
            label: 'MENUITEMS.QUALITY.AGSSERIAL.CREATE',
            link: '/quality/ags-serial/create',
          },
          {
            label: 'MENUITEMS.QUALITY.AGSSERIAL.EDIT',
            link: '/quality/ags-serial/edit',
          },
        ]
      },
      {
        label: 'MENUITEMS.QUALITY.MRB.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.QUALITY.MRB.LIST',
            link: '/quality/mrb/list',
          },
          {
            label: 'MENUITEMS.QUALITY.MRB.CREATE',
            link: '/quality/mrb/create',
          },
          {
            label: 'MENUITEMS.QUALITY.MRB.EDIT',
            link: '/quality/mrb/edit',
          },
        ]
      },
      {
        label: 'MENUITEMS.QUALITY.NCR.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.QUALITY.NCR.LIST',
            link: '/quality/ncr/list',
          },
          {
            label: 'MENUITEMS.QUALITY.NCR.CREATE',
            link: '/quality/ncr/create',
          },
          {
            label: 'MENUITEMS.QUALITY.NCR.OVERVIEW',
            link: '/quality/ncr/overview',
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
            link: '/quality/qir/list',
          },
          {
            label: 'MENUITEMS.QUALITY.QIR.CREATE',
            link: '/quality/qir/create',
          },
          {
            label: 'MENUITEMS.QUALITY.QIR.EDIT',
            link: '/quality/qir/edit',
          },
          {
            label: 'MENUITEMS.QUALITY.QIR.SETTINGS.NAME',
            subItems: [
              {
                label: 'MENUITEMS.QUALITY.QIR.SETTINGS.LIST',
                link: '/quality/qir/settings/list',
              },
              {
                label: 'MENUITEMS.QUALITY.QIR.SETTINGS.CREATE',
                link: '/quality/qir/settings/create',
              },
              {
                label: 'MENUITEMS.QUALITY.QIR.SETTINGS.EDIT',
                link: '/quality/qir/settings/edit',
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
        link: '/field-service/overview/summary',
      },
      {
        label: 'MENUITEMS.FIELDSERVICE.JOB.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.FIELDSERVICE.JOB.LIST',
            link: '/field-service/jobs/list',
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.JOB.CREATE',
            link: '/field-service/jobs/create',
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.JOB.OVERVIEW',
            link: '/field-service/jobs/overview',
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.JOB.OPEN_INVOICES',
            link: '/field-service/jobs/job-open-invoice',
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
            link: '/field-service/ticket/list',
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.TICKET.OVERVIEW',
            link: '/field-service/ticket/overview',
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
            link: '/field-service/request/list',
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.REQUEST.CREATE',
            link: '/field-service/request/create',
          },
          {
            label: 'MENUITEMS.FIELDSERVICE.REQUEST.EDIT',
            link: '/field-service/request/edit',
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
            link: '/field-service/reports/jobs-by-location',
            parentId: 4
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.PLATFORMAVG',
            link: '/field-service/reports/platform-avg',
            parentId: 4
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.EXPENSEREPORT',
            link: '/field-service/reports/expense-report',
            parentId: 4
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.SERVICEREPORT',
            link: '/field-service/reports/service-report',
            parentId: 4
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.CUSTOMEREPORT',
            link: '/field-service/reports/customer-report',
            parentId: 4
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.INVOICEREPORT',
            link: '/field-service/reports/invoice-report',
            parentId: 4
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.JOBBYUSERREPORT',
            link: '/field-service/reports/job-by-user-report',
            parentId: 4
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.CONTRACTORVSTECH',
            link: '/field-service/reports/contractor-vs-tech-report',
            parentId: 4
          },
          {
            id: 6,
            label: 'MENUITEMS.FIELDSERVICE.REPORTS.TICKETEVENTREPORT',
            link: '/field-service/reports/ticket-event-report',
            parentId: 4
          },
        ]
      },
      {
        label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.NAME',
        icon: 'las la-tachometer-alt',
        isCollapsed: true,
        subItems: [
          {
            label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.JOB_STATUS.NAME',
            icon: 'las la-tachometer-alt',
            isCollapsed: true,
            subItems: [
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.JOB_STATUS.LIST',
                link: '/field-service/maintenance/job-status/list',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.JOB_STATUS.CREATE',
                link: '/field-service/maintenance/job-status/create',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.JOB_STATUS.EDIT',
                link: '/field-service/maintenance/job-status/edit',
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
                link: '/field-service/maintenance/service-type/list',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.SERVICE_TYPE.CREATE',
                link: '/field-service/maintenance/service-type/create',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.SERVICE_TYPE.EDIT',
                link: '/field-service/maintenance/service-type/edit',
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
                link: '/field-service/maintenance/property/list',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.PROPERTY.CREATE',
                link: '/field-service/maintenance/property/create',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.PROPERTY.EDIT',
                link: '/field-service/maintenance/property/edit',
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
                link: '/field-service/maintenance/receipt-category/list',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.RECEIPT_CATEGORY.CREATE',
                link: '/field-service/maintenance/receipt-category/create',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.RECEIPT_CATEGORY.EDIT',
                link: '/field-service/maintenance/receipt-category/edit',
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
                link: '/field-service/maintenance/ticket-event/list',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.TICKET_EVENT.CREATE',
                link: '/field-service/maintenance/ticket-event/create',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.TICKET_EVENT.EDIT',
                link: '/field-service/maintenance/ticket-event/edit',
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
                link: '/field-service/maintenance/customer/list',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.CUSTOMER.CREATE',
                link: '/field-service/maintenance/customer/create',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.CUSTOMER.EDIT',
                link: '/field-service/maintenance/customer/edit',
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
                link: '/field-service/maintenance/platform/list',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.PLATFORM.CREATE',
                link: '/field-service/maintenance/platform/create',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.PLATFORM.EDIT',
                link: '/field-service/maintenance/platform/edit',
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
                link: '/field-service/maintenance/non-billable-code/list',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.NON_BILLABLE_CODES.CREATE',
                link: '/field-service/maintenance/non-billable-code/create',
              },
              {
                label: 'MENUITEMS.FIELDSERVICE.MAINTENANCE.NON_BILLABLE_CODES.EDIT',
                link: '/field-service/maintenance/non-billable-code/edit',
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
    icon: 'las la-tachometer-alt',
    isCollapsed: true,
    subItems: [
      {
        label: 'MENUITEMS.MAINTENANCE.USERS',
        link: '/maintenance/user/list',
      },
      {
        label: 'MENUITEMS.MAINTENANCE.CREATE',
        link: '/maintenance/user/create',
      },
      {
        label: 'MENUITEMS.MAINTENANCE.EDIT',
        link: '/maintenance/user/edit',
      }
    ]
  },
  {
    id: 3,
    label: 'MENUITEMS.ADMIN.NAME',
    icon: 'las la-tachometer-alt',
    isCollapsed: true,
    subItems: [
      {
        label: 'MENUITEMS.ADMIN.QUERY',
        link: '/admin/query',
      }
    ]
  },
];
