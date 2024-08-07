import { MenuItem } from "./menu.model";

export const MENU: MenuItem[] = [
  {
    id: 1,
    label: "Menu",
    isTitle: true,
  },
  {
    id: 3,
    label: "Field Service",
    icon: "las la-tachometer-alt",
    isCollapsed: true,
    subItems: [
      {
        label: "Dashboard",
        link: "/dashboard/field-service/overview/summary",
        description: "Field Service Overview",
      },
      {
        label: "Map",
        link: "/dashboard/field-service/map",
        description: "Field Service Map",
      },
      {
        label: "Calendar",
        link: "/dashboard/field-service/scheduling/calendar",
        description: "Field Service Calendar",
      },
      {
        label: "Tech Schedule",
        link: "/dashboard/field-service/scheduling/tech-schedule",
        description: "Field Service Tech Schedule",
      },
      {
        label: "Jobs",
        icon: "las la-tachometer-alt",
        isCollapsed: true,
        subItems: [
          {
            label: "List Jobs",
            link: "/dashboard/field-service/jobs/list",
            description: "Field Service Job List",
          },
          {
            label: "Create Job",
            link: "/dashboard/field-service/jobs/create",
            description: "Field Service Job Create",
          },
          {
            label: "Edit Job",
            link: "/dashboard/field-service/jobs/edit",
            description: "Field Service Job Edit",
          },
          {
            label: "Invoices",
            link: "/dashboard/field-service/jobs/job-open-invoice",
            description: "Field Service Open Invoices",
          },
          {
            label: "Billing",
            link: "/dashboard/field-service/jobs/billing",
            description: "Field Service Billing",
          },
        ],
      },
      {
        label: "Tickets",
        icon: "las la-tachometer-alt",
        isCollapsed: true,
        subItems: [
          {
            label: "List Tickets",
            link: "/dashboard/field-service/ticket/list",
            description: "Field Service Tickets",
          },
          {
            label: "Ticket Overview",
            link: "/dashboard/field-service/ticket/overview",
            description: "Field Service Tickets Edit",
          },
        ],
      },
      {
        label: "Trip Details",
        icon: "las la-tachometer-alt",
        isCollapsed: true,
        subItems: [
          {
            label: "List Trip Detail",
            link: "/dashboard/field-service/trip-details/list",
          },
          {
            label: "Create Trip Detail",
            link: "/dashboard/field-service/trip-details/create",
          },
          {
            label: "Edit Trip Detail",
            link: "/dashboard/field-service/trip-details/edit",
          },
          {
            label: "Edit Trip Summary",
            link: "/dashboard/field-service/trip-details/edit-summary",
          },
        ],
      },
      {
        label: "Parts Order",
        icon: "las la-tachometer-alt",
        isCollapsed: true,
        subItems: [
          {
            label: "List Parts Order Requests",
            link: "/dashboard/field-service/parts-order/list",
          },
          {
            label: "Create Parts Order",
            link: "/dashboard/field-service/parts-order/create",
          },
          {
            label: "Edit Parts Order",
            link: "/dashboard/field-service/parts-order/edit",
          },
          // {
          //   label: 'SV Orders',
          //   link: '/dashboard/field-service/parts-order/sv-list'
          // },
        ],
      },
      {
        label: "Requests",
        icon: "las la-tachometer-alt",
        isCollapsed: true,
        subItems: [
          {
            label: "List Requests",
            link: "/dashboard/field-service/request/list",
            description: "Field Service Request List",
          },
          {
            label: "Create Request",
            link: "/dashboard/field-service/request/create",
            description: "Field Service Request Create",
          },
          {
            label: "Edit Request",
            link: "/dashboard/field-service/request/edit",
            description: "Field Service Request Edit",
          },
        ],
      },
      // {
      //   label: 'Credit Card Transactions',
      //   icon: 'las la-tachometer-alt',
      //   isCollapsed: true,
      //   subItems: [
      //     {
      //       label: 'List Credit Card Transactions',
      //       link: '/dashboard/field-service/credit-card-transaction/list',
      //       description: "Field Service Credit Card Transactions"
      //     }
      //   ]
      // },
      {
        id: 4,
        label: "Report",
        icon: "las la-tachometer-alt",
        isCollapsed: true,
        subItems: [
          {
            id: 6,
            label: "Jobs By Location",
            link: "/dashboard/field-service/reports/jobs-by-location",
            description: "Field Service Jobs by location report",
          },
          {
            id: 6,
            label: "Platform Avg",
            link: "/dashboard/field-service/reports/platform-avg",
            description: "Field Service Platform avg report",
          },
          {
            id: 6,
            label: "Expense Report",
            link: "/dashboard/field-service/reports/expense-report",
            description: "Field Service expense report",
          },
          {
            id: 6,
            label: "Service Report",
            link: "/dashboard/field-service/reports/service-report",
            description: "Field Service service report",
          },
          {
            id: 6,
            label: "Customer Report",
            link: "/dashboard/field-service/reports/customer-report",
            description: "Field Service Customer Report",
          },
          {
            id: 6,
            label: "Invoice Report",
            link: "/dashboard/field-service/reports/invoice-report",
            description: "Field Service Invoice Report",
          },
          {
            id: 6,
            label: "Job By User",
            link: "/dashboard/field-service/reports/job-by-user-report",
            description: "Field Service Jobs By User Report",
          },
          {
            id: 6,
            label: "Contractor Vs Tech",
            link: "/dashboard/field-service/reports/contractor-vs-tech-report",
            description: "Field Service Contract Vs Tech Report",
          },
          {
            id: 6,
            label: "Ticket Events",
            link: "/dashboard/field-service/reports/ticket-event-report",
            description: "Field Service Ticket Report",
          },
        ],
      },
      {
        label: "Maintenance",
        icon: "las la-cog",
        isCollapsed: true,
        subItems: [
          {
            label: "Job Status",
            icon: "las la-tachometer-alt",
            isCollapsed: true,
            subItems: [
              {
                label: "List Job Status",
                link: "/dashboard/field-service/maintenance/job-status/list",
                description: "Field Service Status List",
              },
              {
                label: "Create Job Status",
                link: "/dashboard/field-service/maintenance/job-status/create",
                description: "Field Service Status Create",
              },
              {
                label: "Edit Job Status",
                link: "/dashboard/field-service/maintenance/job-status/edit",
                description: "Field Service Status Edit",
              },
            ],
          },
          {
            label: "Service Type",
            icon: "las la-tachometer-alt",
            isCollapsed: true,
            subItems: [
              {
                label: "List Service Types",
                link: "/dashboard/field-service/maintenance/service-type/list",
                description: "Field Service Service Type List",
              },
              {
                label: "Create Service Type",
                link: "/dashboard/field-service/maintenance/service-type/create",
                description: "Field Service Service Type Create",
              },
              {
                label: "Edit Service Type",
                link: "/dashboard/field-service/maintenance/service-type/edit",
                description: "Field Service Service Type Edit",
              },
            ],
          },
          {
            label: "Properties",
            icon: "las la-tachometer-alt",
            isCollapsed: true,
            subItems: [
              {
                label: "List Properties",
                link: "/dashboard/field-service/maintenance/property/list",
                description: "Field Service Property Edit",
              },
              {
                label: "Create Property",
                link: "/dashboard/field-service/maintenance/property/create",
                description: "Field Service Property Create",
              },
              {
                label: "Edit Property",
                link: "/dashboard/field-service/maintenance/property/edit",
                description: "Field Service Property Edit",
              },
            ],
          },
          {
            label: "License",
            icon: "las la-tachometer-alt",
            isCollapsed: true,
            subItems: [
              {
                label: "List License",
                link: "/dashboard/field-service/maintenance/license/list",
                description: "Field Service License Edit",
              },
              {
                label: "Create License",
                link: "/dashboard/field-service/maintenance/license/create",
                description: "Field Service License Create",
              },
              {
                label: "Edit License",
                link: "/dashboard/field-service/maintenance/license/edit",
                description: "Field Service License Edit",
              },
            ],
          },
          {
            label: "Receipt Category",
            icon: "las la-tachometer-alt",
            isCollapsed: true,
            subItems: [
              {
                label: "List Receipts",
                link: "/dashboard/field-service/maintenance/receipt-category/list",
                description: "Field Service Receipt Category List",
              },
              {
                label: "Create Receipt",
                link: "/dashboard/field-service/maintenance/receipt-category/create",
                description: "Field Service Receipt Category Create",
              },
              {
                label: "Edit Receipt",
                link: "/dashboard/field-service/maintenance/receipt-category/edit",
                description: "Field Service Receipt Category Edit",
              },
            ],
          },
          {
            label: "Ticket Events",
            icon: "las la-tachometer-alt",
            isCollapsed: true,
            subItems: [
              {
                label: "List Ticket Events",
                link: "/dashboard/field-service/maintenance/ticket-event/list",
                description: "Field Service Ticket Event List",
              },
              {
                label: "Create Ticket Event",
                link: "/dashboard/field-service/maintenance/ticket-event/create",
                description: "Field Service Ticket Event Create",
              },
              {
                label: "Edit Ticket Event",
                link: "/dashboard/field-service/maintenance/ticket-event/edit",
                description: "Field Service Ticket Event Edit",
              },
            ],
          },
          {
            label: "Customers",
            icon: "las la-tachometer-alt",
            isCollapsed: true,
            subItems: [
              {
                label: "List Customers",
                link: "/dashboard/field-service/maintenance/customer/list",
                description: "Field Service customer list",
              },
              {
                label: "Create Customer",
                link: "/dashboard/field-service/maintenance/customer/create",
                description: "Field Service customer create",
              },
              {
                label: "Edit Customer",
                link: "/dashboard/field-service/maintenance/customer/edit",
                description: "Field Service customer edit",
              },
            ],
          },
          {
            label: "Platforms",
            icon: "las la-tachometer-alt",
            isCollapsed: true,
            subItems: [
              {
                label: "List Platforms",
                link: "/dashboard/field-service/maintenance/platform/list",
                description: "Field Service platform list",
              },
              {
                label: "Create Platform",
                link: "/dashboard/field-service/maintenance/platform/create",
                description: "Field Service platform create",
              },
              {
                label: "Edit Platform",
                link: "/dashboard/field-service/maintenance/platform/edit",
                description: "Field Service platform edit",
              },
            ],
          },
          {
            label: "Non-Billable Codes",
            icon: "las la-tachometer-alt",
            isCollapsed: true,
            subItems: [
              {
                label: "List Non-Billable Codes",
                link: "/dashboard/field-service/maintenance/non-billable-code/list",
                description: "Field Service billable code list",
              },
              {
                label: "Create Non-Billable Code",
                link: "/dashboard/field-service/maintenance/non-billable-code/create",
                description: "Field Service billable code create",
              },
              {
                label: "Edit Non-Billable Code",
                link: "/dashboard/field-service/maintenance/non-billable-code/edit",
                description: "Field Service billable code edit",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Operations",
    icon: "las la-bookmark",
    isCollapsed: true,
    subItems: [
      {
        label: "Org Chart",
        link: "/dashboard/operations/org-chart/org-chart-view",
        description: "Org Chart",
        badge: {
          variant: "badge bg-success",
          text: "New",
        },
      },
      {
        label: "Labels",
        link: "/dashboard/operations/labels/list",
        description: "Labels",
      },
      {
        label: "Order Lookup",
        link: "/dashboard/operations/order-lookup",
        description: "Order Lookup",
      },
      {
        label: "Part Lookup",
        link: "/dashboard/operations/part-lookup",
        description: "Part Lookup",
      },
      {
        label: "WO Lookup",
        link: "/dashboard/operations/wo-lookup",
        description: "WO Lookup",
      },
      {
        label: "Logistics",
        isCollapsed: true,
        subItems: [
          {
            label: "Logistics Calendar",
            link: "/dashboard/operations/logistics/calendar",
            description: "Calendar",
          },
        ],
      },
      {
        label: "Master Scheduling",
        isCollapsed: true,
        subItems: [
          {
            label: "Shipping",
            link: "/dashboard/operations/master-scheduling/shipping",
            description: "Shipping",
          },
          {
            label: "Master Production",
            link: "/dashboard/operations/master-scheduling/all-routing",
            description: "Master Production",
          },
          {
            label: "Pick & Stage",
            link: "/dashboard/operations/master-scheduling/picking-routing",
            description: "Pick & Stage",
          },
          {
            label: "Production",
            link: "/dashboard/operations/master-scheduling/production-routing",
            description: "Production",
          },
          {
            label: "Final/Test QC",
            link: "/dashboard/operations/master-scheduling/qc-routing",
            description: "QC",
          },
          {
            label: "Work Order Tracker",
            link: "/dashboard/operations/master-scheduling/work-order-tracker",
            description: "Work Order Tracker",
          },
          {
            label: "List Work Order Tracker",
            link: "/dashboard/operations/master-scheduling/list-work-order-tracker",
            description: "Work Order Tracker List",
          },
          {
            label: "Cables",
            link: "/dashboard/operations/master-scheduling/cables",
            description: "Cables",
          },
        ],
      },
      {
        label: "Shipping Request",
        isCollapsed: true,
        subItems: [
          {
            label: "List Shipping Request",
            link: "/dashboard/operations/forms/shipping-request/list",
            description: "Shipping List",
          },
          {
            label: "Create Shipping Request",
            link: "/dashboard/operations/forms/shipping-request/create",
            description: "Shipping Request Create",
          },
          {
            label: "Edit Shipping Request",
            link: "/dashboard/operations/forms/shipping-request/edit",
            description: "Shipping Request Edit",
          },
        ],
      },
      {
        label: "RFQ",
        isCollapsed: true,
        subItems: [
          {
            label: "List RFQ",
            link: "/dashboard/operations/forms/rfq/list",
            description: "RFQ Request",
          },
          {
            label: "Create RFQ",
            link: "/dashboard/operations/forms/rfq/create",
            description: "RFQ Create",
          },
          {
            label: "Edit RFQ",
            link: "/dashboard/operations/forms/rfq/edit",
            description: "RFQ Edit",
          },
        ],
      },
      {
        label: "Vehicle",
        isCollapsed: true,
        subItems: [
          {
            label: "List Vehicle",
            link: "/dashboard/operations/forms/vehicle/list",
            description: "Vehicle List",
          },
          {
            label: "Create Vehicle",
            link: "/dashboard/operations/forms/vehicle/create",
            description: "Vehicle Create",
          },
          {
            label: "Edit Vehicle",
            link: "/dashboard/operations/forms/vehicle/edit",
            description: "Vehicle Edit",
          },
        ],
      },
      {
        label: "Forklift Inspection",
        isCollapsed: true,
        subItems: [
          {
            label: "List Forklift",
            link: "/dashboard/operations/forms/forklift-inspection/list",
            description: "Forklift List",
          },
          {
            label: "Create Forklift",
            link: "/dashboard/operations/forms/forklift-inspection/create",
            description: "Forklift Create",
          },
          {
            label: "Edit Forklift",
            link: "/dashboard/operations/forms/forklift-inspection/edit",
            description: "Forklift Edit",
          },
        ],
      },
      {
        label: "Placard",
        isCollapsed: true,
        subItems: [
          {
            label: "List Placard",
            link: "/dashboard/operations/forms/placard/list",
            description: "Placard List",
          },
          {
            label: "Create Placard",
            link: "/dashboard/operations/forms/placard/create",
            description: "Placard Create",
          },
          {
            label: "Edit Placard",
            link: "/dashboard/operations/forms/placard/edit",
            description: "Placard Edit",
          },
        ],
      },
      {
        label: "IGT Transfer",
        isCollapsed: true,
        subItems: [
          {
            label: "List IGT Transfers",
            link: "/dashboard/operations/forms/igt-transfer/list",
            description: "IGT Transfer",
          },
          {
            label: "Create IGT Transfer",
            link: "/dashboard/operations/forms/igt-transfer/create",
            description: "IGT Transfer Create",
          },
          {
            label: "Edit IGT Transfer",
            link: "/dashboard/operations/forms/igt-transfer/edit",
            description: "IGT Transfer Edit",
          },
        ],
      },
      {
        label: "Vehicle Inspection",
        isCollapsed: true,
        subItems: [
          {
            label: "List Vehicle Inspections",
            link: "/dashboard/operations/forms/vehicle-inspection/list",
          },
          {
            label: "Create Vehicle Inspection",
            link: "/dashboard/operations/forms/vehicle-inspection/create",
          },
          {
            label: "Edit Vehicle Inspection",
            link: "/dashboard/operations/forms/vehicle-inspection/edit",
          },
        ],
      },
      {
        label: "Shortages",
        isCollapsed: true,
        subItems: [
          {
            label: "List Shortages",
            link: "/dashboard/operations/shortages/list",
            description: "Shortage List",
          },
          {
            label: "Create Shortages",
            link: "/dashboard/operations/shortages/create",
            description: "Shortage Create",
          },
          {
            label: "Edit Shortage",
            link: "/dashboard/operations/shortages/edit",
            description: "Shortage Edit",
          },
        ],
      },
      {
        label: "Material Request",
        isCollapsed: true,
        subItems: [
          {
            label: "List Material Request",
            link: "/dashboard/operations/material-request/list",
            description: "Material Request List",
          },
          {
            label: "Create Material Request",
            link: "/dashboard/operations/material-request/create",
            description: "Material Request Create",
          },
          {
            label: "Edit Material Request",
            link: "/dashboard/operations/material-request/edit",
            description: "Material Request Edit",
          },
          {
            label: "Validate Material Request",
            link: "/dashboard/operations/material-request/validate-list",
            description: "Material Request Validate",
          },
          {
            label: "Material Request Picking",
            link: "/dashboard/operations/material-request/picking",
            description: "Material Request Picking",
          },
        ],
      },
      {
        label: "Safety Incident",
        isCollapsed: true,
        subItems: [
          {
            label: "List Safety Incident",
            link: "/dashboard/operations/forms/safety-incident/list",
            description: "Safety Incident List",
          },
          {
            label: "Create Safety Incident",
            link: "/dashboard/operations/forms/safety-incident/create",
            description: "Safety Incident Create",
          },
          {
            label: "Edit Safety Incident",
            link: "/dashboard/operations/forms/safety-incident/edit",
            description: "Safety Incident Edit",
          },
        ],
      },
      {
        label: "Reports",
        isCollapsed: true,
        subItems: [
          {
            label: "Daily Report",
            link: "/dashboard/operations/reports/daily-report",
            description: "Daily Report",
          },
          {
            label: "Revenue",
            link: "/dashboard/operations/reports/revenue",
            description: "Revenue",
          },
          {
            label: "Revenue by Customer",
            link: "/dashboard/operations/reports/revenue-by-customer",
            description: "Revenue by customer",
          },
          {
            label: "OTD Report",
            link: "/dashboard/operations/reports/otd-report",
            description: "OTD Report",
            badge: {
              variant: "badge bg-success",
              text: "New",
            },
          },
          {
            label: "WIP Report",
            link: "/dashboard/operations/reports/wip-report",
            description: "WIP Report",
          },
          {
            label: "Transit Location Report",
            link: "/dashboard/operations/reports/transit-location-value-report",
            description: "Transit location report",
          },
          {
            label: "Finished Goods Report",
            link: "/dashboard/operations/reports/fg-value-report",
            description: "Finished goods report",
          },
          {
            label: "JX Report",
            link: "/dashboard/operations/reports/jx-value-report",
            description: "JX report",
          },
          {
            label: "LV Raw Material",
            link: "/dashboard/operations/reports/las-vegas-raw-material-report",
            description: "Las vegas raw material report",
          },
          {
            label: "Safety Stock Report",
            link: "/dashboard/operations/reports/safety-stock-report",
            description: "Safety stock report",
          },
          {
            label: "Shipped Orders Report",
            link: "/dashboard/operations/reports/shipped-orders-report",
            description: "Shipped orders report",
          },
          {
            label: "Negative Location Report",
            link: "/dashboard/operations/reports/negative-location-report",
            description: "Negative location report",
          },
          {
            label: "Empty Location Report",
            link: "/dashboard/operations/reports/empty-location-report",
            description: "Empty location report",
          },
          {
            label: "Inventory Report",
            link: "/dashboard/operations/reports/inventory-report",
            description: "Inventory report",
          },
          {
            label: "One Sku Location Report",
            link: "/dashboard/operations/reports/one-sku-location-report",
            description: "One sku location report",
          },
          {
            label: "Item Consolidation Report",
            link: "/dashboard/operations/reports/item-consolidation-report",
            description: "Item consolidation report",
          },
          {
            label: "WO Variance Report",
            link: "/dashboard/operations/reports/work-order-variance-report",
            description: "Work Order Variance Report",
          },
          // {
          //   label: 'Reason Code Report',
          //   link: '/dashboard/operations/reports/reason-code-report',
          //   description: "Reason code"
          // },
        ],
      },
      {
        label: "Graphics",
        isCollapsed: true,
        subItems: [
          {
            label: "List Graphics",
            link: "/dashboard/operations/graphics/list",
            description: "Graphics list",
          },
          {
            label: "Edit Graphics",
            link: "/dashboard/operations/graphics/edit",
            description: "Graphics edit",
          },
          {
            label: "Graphics Production",
            link: "/dashboard/operations/graphics/production",
            description: "Graphics production",
          },
          {
            label: "Graphics Demand",
            link: "/dashboard/operations/graphics/demand",
            description: "Graphics demand",
          },
          {
            label: "BOM",
            isCollapsed: true,
            subItems: [
              {
                label: "List BOM",
                link: "/dashboard/operations/graphics/bom/list",
                description: "Graphics bom list",
              },
              {
                label: "Create BOM",
                link: "/dashboard/operations/graphics/bom/create",
                description: "Graphics bom create",
              },
              {
                label: "Edit BOM",
                link: "/dashboard/operations/graphics/bom/edit",
                description: "Graphics bom edit",
              },
            ],
          },
        ],
      },
      {
        label: "Physical Inventory",
        link: "/dashboard/operations/physical-inventory/tags",
      },
    ],
  },
  {
    id: 3,
    label: "Quality",
    icon: "las la-tools",
    isCollapsed: true,
    subItems: [
      {
        label: "Dashboard",
        link: "/dashboard/quality/overview/summary",
        description: "Quality overview",
      },
      {
        label: "RMA",
        icon: "las la-tachometer-alt",
        isCollapsed: true,
        subItems: [
          {
            label: "List RMA",
            link: "/dashboard/quality/rma/list",
            description: "RMA list",
          },
          {
            label: "Create RMA",
            link: "/dashboard/quality/rma/create",
            description: "RMA create",
          },
          {
            label: "Edit RMA",
            link: "/dashboard/quality/rma/edit",
            description: "RMA edit",
          },
        ],
      },
      {
        label: "SG Asset",
        icon: "las la-tachometer-alt",
        isCollapsed: true,
        subItems: [
          {
            label: "List SG Asset",
            link: "/dashboard/quality/sg-asset/list",
            description: "SG Asset list",
          },
          {
            label: "Create SG Asset",
            link: "/dashboard/quality/sg-asset/create",
            description: "SG Asset create",
          },
          {
            label: "Edit SG Asset",
            link: "/dashboard/quality/sg-asset/edit",
            description: "SG Asset edit",
          },
        ],
      },
      {
        label: "AGS Serial",
        icon: "las la-tachometer-alt",
        isCollapsed: true,
        subItems: [
          {
            label: "List AGS Serial",
            link: "/dashboard/quality/ags-serial/list",
            description: "AGS serial list",
          },
          {
            label: "Create AGS Serial",
            link: "/dashboard/quality/ags-serial/create",
            description: "AGS serial create",
          },
          {
            label: "Edit AGS Serial",
            link: "/dashboard/quality/ags-serial/edit",
            description: "AGS serial edit",
          },
        ],
      },
      {
        label: "CAR",
        icon: "las la-tachometer-alt",
        isCollapsed: true,
        subItems: [
          {
            label: "List CAR",
            link: "/dashboard/quality/car/list",
            description: "CAR list",
          },
          {
            label: "Create CAR",
            link: "/dashboard/quality/car/create",
            description: "CAR create",
          },
          {
            label: "Edit CAR",
            link: "/dashboard/quality/car/overview",
            description: "CAR edit",
          },
        ],
      },
      {
        label: "MRB",
        icon: "las la-tachometer-alt",
        isCollapsed: true,
        subItems: [
          {
            label: "List MRB",
            link: "/dashboard/quality/mrb/list",
            description: "MRB list",
          },
          {
            label: "Create MRB",
            link: "/dashboard/quality/mrb/create",
            description: "MRB create",
          },
          {
            label: "Edit MRB",
            link: "/dashboard/quality/mrb/edit",
            description: "MRB edit",
          },
        ],
      },
      {
        label: "QIR",
        icon: "las la-tachometer-alt",
        isCollapsed: true,
        subItems: [
          {
            label: "List QIR",
            link: "/dashboard/quality/qir/list",
            description: "QIR list",
          },
          {
            label: "Create QIR",
            link: "/dashboard/quality/qir/create",
            description: "QIR create",
          },
          {
            label: "Edit QIR",
            link: "/dashboard/quality/qir/edit",
            description: "QIR edit",
          },
          {
            label: "QIR Settings",
            subItems: [
              {
                label: "List QIR Settings",
                link: "/dashboard/quality/qir/settings/list",
                description: "QIR settings list",
              },
              {
                label: "Create QIR Settings",
                link: "/dashboard/quality/qir/settings/create",
                description: "QIR settings create",
              },
              {
                label: "Edit QIR Settings",
                link: "/dashboard/quality/qir/settings/edit",
                description: "QIR settings edit",
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: 2,
    label: "Admin",
    isTitle: true,
  },
  {
    id: 3,
    label: "Maintenance",
    icon: "las la-cog",
    isCollapsed: true,
    subItems: [
      {
        label: "Users",
        subItems: [
          {
            label: "List Users",
            link: "/dashboard/maintenance/user/list",
            description: "Users",
          },
          {
            label: "Create User",
            link: "/dashboard/maintenance/user/create",
            description: "User Create",
          },
          {
            label: "Edit User",
            link: "/dashboard/maintenance/user/edit",
            description: "User Edit",
          },
        ],
      },
      {
        label: "Email Notifications",
        subItems: [
          {
            label: "List EN",
            link: "/dashboard/maintenance/email-notification/list",
            description: "List Email Notifications",
          },
          {
            label: "Create EN",
            link: "/dashboard/maintenance/email-notification/create",
            description: "Create Email Notifications",
          },
          {
            label: "Edit EN",
            link: "/dashboard/maintenance/email-notification/edit",
            description: "Edit Email Notifications",
          },
        ],
      },
    ],
  },
  {
    label: "Query",
    link: "/dashboard/admin/query",
    description: "Query",
    icon: "lab la-audible",
  },
];
