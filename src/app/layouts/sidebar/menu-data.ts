import { MenuItem } from "./menu.model";

export const MENU_DATA: MenuItem[] = [
    {
        id: 1,
        label: "Menu",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 2,
        label: "Field Service",
        icon: "las la-tools",
        isCollapsed: true,
        hideCheckBox: true,
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
                icon: "las la-briefcase",
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
                icon: "las la-ticket-alt",
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
                icon: "las la-route",
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
            {
                id: 4,
                label: "Report",
                isCollapsed: true,
                subItems: [
                    {
                        label: "Jobs By Location",
                        link: "/dashboard/field-service/reports/jobs-by-location",
                        description: "Field Service Jobs by location report",
                    },
                    {
                        label: "Platform Avg",
                        link: "/dashboard/field-service/reports/platform-avg",
                        description: "Field Service Platform avg report",
                    },
                    {
                        label: "Expense Report",
                        link: "/dashboard/field-service/reports/expense-report",
                        description: "Field Service expense report",
                    },
                    {
                        label: "Service Report",
                        link: "/dashboard/field-service/reports/service-report",
                        description: "Field Service service report",
                    },
                    {
                        label: "Customer Report",
                        link: "/dashboard/field-service/reports/customer-report",
                        description: "Field Service Customer Report",
                    },
                    {
                        label: "Invoice Report",
                        link: "/dashboard/field-service/reports/invoice-report",
                        description: "Field Service Invoice Report",
                    },
                    {
                        label: "Job By User",
                        link: "/dashboard/field-service/reports/job-by-user-report",
                        description: "Field Service Jobs By User Report",
                    },
                    {
                        label: "Contractor Vs Tech",
                        link: "/dashboard/field-service/reports/contractor-vs-tech-report",
                        description: "Field Service Contract Vs Tech Report",
                    },
                    {
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
                hideCheckBox: true,
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
        hideCheckBox: true,
        subItems: [
            {
                label: "Org Chart",
                link: "/dashboard/operations/org-chart/org-chart-view",
                description: "Org Chart",
                badge: {
                    variant: "badge bg-success",
                    text: "New",
                },
                accessRequired: false,
            },
            {
                label: "Labels",
                link: "/dashboard/operations/labels/list",
                description: "Labels",
                accessRequired: false,
            },
            {
                label: "Order Lookup",
                link: "/dashboard/operations/order-lookup",
                description: "Order Lookup",
                accessRequired: false,
            },
            {
                label: "Part Lookup",
                link: "/dashboard/operations/part-lookup",
                description: "Part Lookup",
                accessRequired: false,
            },
            {
                label: "WO Lookup",
                link: "/dashboard/operations/wo-lookup",
                description: "WO Lookup",
                accessRequired: false,
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
                        label: "Cables",
                        link: "/dashboard/operations/master-scheduling/cables",
                        description: "Cables",
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
                        accessRequired: false,
                    },
                    {
                        label: "Create Material Request",
                        link: "/dashboard/operations/material-request/create",
                        description: "Material Request Create",
                        accessRequired: false,
                    },
                    {
                        label: "Edit Material Request",
                        link: "/dashboard/operations/material-request/edit",
                        description: "Material Request Edit",
                        accessRequired: false,
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
                        accessRequired: false,
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
                ],
            },
            {
                label: "Graphics",
                isCollapsed: true,
                hideCheckBox: true,
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
                accessRequired: false,
            },
        ],
    },
    {
        id: 6, // New ID
        label: "Safety",
        icon: "las la-shield-alt",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Safety Incidents",
                description: "Safety Incident List",
                link: "/dashboard/operations/forms/safety-incident",
                accessRequired: false,
                activatedRoutes: "/dashboard/operations/forms/safety-incident/*"
            },
            {
                label: "Inspections",
                isCollapsed: true,
                subItems: [
                    {
                        label: "Vehicle Inspections",
                        link: "/dashboard/operations/forms/vehicle-inspection",
                        activatedRoutes: "/dashboard/operations/forms/vehicle-inspection/*"
                    },
                    {
                        label: "Forklift Inspection",
                        link: "/dashboard/operations/forms/forklift-inspection",
                        activatedRoutes: "/dashboard/operations/forms/forklift-inspection/*"
                    },
                ],
            },
            {
                label: "Training",
                link: "/dashboard/safety/training",
            },
        ],
    },
    {
        id: 4,
        label: "Quality",
        icon: "las la-tools",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Dashboard",
                link: "/dashboard/quality/overview/summary",
                description: "Quality overview",
            },
            {
                label: "Returns Management",
                link: "/dashboard/quality/rma/list",
                description: "Manage Product Returns and Authorizations",
                icon: "las la-undo-alt",
                activatedRoutes: "/dashboard/quality/rma/*"
            },
            {
                label: "Corrective Actions",
                link: "/dashboard/quality/car/list",
                description: "Manage and Track Corrective Action Requests",
                icon: "las la-check-circle",
                activatedRoutes: "/dashboard/quality/car/*"
            },
            {
                label: "Material Disposition",
                link: "/dashboard/quality/mrb",
                description: "Review and Manage Non-Conforming Materials",
                icon: "las la-clipboard-check",
                activatedRoutes: "/dashboard/quality/mrb/*"
            },
            {
                label: "Quality Issues",
                link: "/dashboard/quality/qir",
                description: "Review and Submit Quality Issue Reports",
                icon: "las la-exclamation-triangle",
                activatedRoutes: "/dashboard/quality/qir/*"
            },
        ],
    },
    {
        id: 7,
        label: "Shipping Request",
        icon: "las la-shipping-fast",
        link: "/dashboard/operations/forms/shipping-request",
        description: "Shipping List",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/dashboard/operations/forms/shipping-request/*"
    },
    // Insert UL Label as requested (top-level)

    // Consolidated Serial Numbers Section
    {
        id: 8,
        label: "Serial Numbers",
        icon: "las la-barcode",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Generate Serial Numbers",
                link: "/dashboard/quality/serial-number-report",
                description: "View and manage quality serial numbers",
            },
            {
                label: "IGT Serial Control",
                link: "/dashboard/quality/igt",
                description: "View and manage IGT serial numbers",
                activatedRoutes: "/dashboard/quality/igt/*"
            },
            {
                label: "AGS Serial Control",
                link: "/dashboard/quality/ags-serial",
                activatedRoutes: "/dashboard/quality/ags-serial/*"
            },
            {
                label: "SG Asset Control",
                link: "/dashboard/quality/sg-asset/",
                activatedRoutes: "/dashboard/quality/sg-asset/*"
            },
            {
                label: "UL Labels",
                link: "/dashboard/ul-management/labels-report",
                accessRequired: false,
                activatedRoutes: "/dashboard/ul-management/*"
            },
        ],
    },

    {
        id: 5,
        label: "Admin",
        icon: "las la-user-shield",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "User Management",
                icon: "las la-users",
                isCollapsed: true,
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
                icon: "las la-envelope",
                isCollapsed: true,
                subItems: [
                    {
                        label: "List ENA",
                        link: "/dashboard/maintenance/email-notification/list",
                        description: "List Email Notifications",
                    },
                    {
                        label: "Create ENA",
                        link: "/dashboard/maintenance/email-notification/create",
                        description: "Create Email Notifications",
                    },
                    {
                        label: "Edit ENA",
                        link: "/dashboard/maintenance/email-notification/edit",
                        description: "Edit Email Notifications",
                    },
                ],
            },
            {
                label: "System Tools",
                icon: "las la-tools",
                isCollapsed: true,
                subItems: [
                    {
                        label: "Scheduled Jobs",
                        link: "/dashboard/maintenance/scheduled-jobs",
                        description: "Scheduled Jobs",
                    },
                    {
                        label: "Query Builder",
                        link: "/dashboard/admin/query",
                        description: "Query",
                    },
                ],
            },
            {
                label: "Digital Assets",
                icon: "las la-signature",
                isCollapsed: true,
                subItems: [
                    {
                        label: "Signatures",
                        link: "/dashboard/maintenance/signatures",
                        description: "Signatures",
                    },
                ],
            },
        ],
    },
];

// Function to recursively sort menu items by ID, then by label
function sortMenuItems(items: MenuItem[]): MenuItem[] {
    return items
        .sort((a, b) => {
            // Menu title always stays at top
            if (a.isTitle && a.label === "Menu") return -1;
            if (b.isTitle && b.label === "Menu") return 1;

            // Admin section always goes to the bottom
            if (a.label === "Admin" && a.id === 5) return 1;
            if (b.label === "Admin" && b.id === 5) return -1;

            // For all other items with IDs, sort by ID
            if (a.id !== undefined && b.id !== undefined) {
                return a.id - b.id;
            }

            // If only one has ID, prioritize it
            if (a.id !== undefined) return -1;
            if (b.id !== undefined) return 1;

            // If neither has ID, sort by label
            return (a.label || '').localeCompare(b.label || '');
        })
        .map(item => ({
            ...item,
            subItems: item.subItems ? sortMenuItems(item.subItems) : item.subItems
        }));
}

// Export sorted menu
export const MENU: MenuItem[] = sortMenuItems(MENU_DATA);
