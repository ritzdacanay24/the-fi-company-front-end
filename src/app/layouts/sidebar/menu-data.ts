import { act } from "@ngrx/effects";
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
        label: "Quick Actions",
        icon: "las la-bolt",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Labels",
                link: "/operations/labels/list",
                description: "Label Printing & Management",
                icon: "las la-tags",
                accessRequired: false,
            },
            {
                label: "Shipping Schedule",
                link: "/operations/master-scheduling/shipping",
                description: "View Shipping Schedule",
                icon: "las la-shipping-fast",
                accessRequired: false,
            },
            {
                label: "Create Material Request",
                link: "/operations/material-request/create",
                description: "Quick Material Request",
                icon: "las la-plus-circle",
                accessRequired: false,
            },
            {
                label: "Report Quality Issue",
                link: "/quality/qir/create",
                description: "Quick Quality Issue Report",
                icon: "las la-exclamation-triangle",
                accessRequired: false,
                activatedRoutes: "/quality/qir/*"
            },
        ],
    },
    {
        id: 3,
        label: "Lookups & Search",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 4,
        label: "Order Lookup",
        link: "/operations/order-lookup",
        description: "Search Orders",
        icon: "las la-search",
        hideCheckBox: true,
        accessRequired: false,
    },
    {
        id: 5,
        label: "Part Lookup",
        link: "/operations/part-lookup",
        description: "Search Parts",
        icon: "las la-search-plus",
        hideCheckBox: true,
        accessRequired: false,
    },
    {
        id: 6,
        label: "WO Lookup",
        link: "/operations/wo-lookup",
        description: "Work Order Search",
        icon: "las la-clipboard-list",
        hideCheckBox: true,
        accessRequired: false,
    },
    {
        id: 6.1,
        label: "BOM Structure",
        link: "/operations/bom/view",
        description: "Bill of Materials Inquiry",
        icon: "las la-sitemap",
        hideCheckBox: true,
        accessRequired: false,
    },
    {
        id: 7,
        label: "Production & Scheduling",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 8,
        label: "Shipping Schedule",
        link: "/operations/master-scheduling/shipping",
        description: "Shipping Schedule",
        icon: "las la-shipping-fast",
        hideCheckBox: true,
    },
    {
        id: 9,
        label: "Master Production",
        link: "/operations/master-scheduling/all-routing",
        description: "Production Planning",
        icon: "las la-industry",
        hideCheckBox: true,
    },
    {
        id: 10,
        label: "Pick & Stage",
        link: "/operations/master-scheduling/picking-routing",
        description: "Pick & Stage Schedule",
        icon: "las la-hand-paper",
        hideCheckBox: true,
    },
    {
        id: 11,
        label: "Production Schedule",
        link: "/operations/master-scheduling/production-routing",
        description: "Production Schedule",
        icon: "las la-cogs",
        hideCheckBox: true,
    },
    {
        id: 12,
        label: "Final/Test QC",
        link: "/operations/master-scheduling/qc-routing",
        description: "Quality Control Schedule",
        icon: "las la-check-circle",
        hideCheckBox: true,
    },
    {
        id: 13,
        label: "Cable Production",
        link: "/operations/master-scheduling/cables",
        description: "Cable Production Schedule",
        icon: "las la-plug",
        hideCheckBox: true,
    },
    {
        id: 14,
        label: "Logistics",
        link: "/operations/logistics/calendar",
        description: "Logistics & Scheduling Calendar",
        icon: "las la-calendar-alt",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/operations/logistics/*"
    },
    {
        id: 15,
        label: "Procurement",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 16,
        label: "Material Requests",
        icon: "las la-clipboard-list",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Active Requests",
                link: "/operations/material-request/list",
                description: "Material Request Management",
                accessRequired: false,
                activatedRoutes: "/operations/material-request/*"
            },
            {
                label: "Create Request",
                link: "/operations/material-request/create",
                description: "New Material Request",
                accessRequired: false,
            },
            {
                label: "Validation Queue",
                link: "/operations/material-request/validate-list",
                description: "Requests Awaiting Validation",
            },
            {
                label: "Picking Queue",
                link: "/operations/material-request/picking",
                description: "Ready for Picking",
            },
        ],
    },
    {
        id: 17,
        label: "RFQ Management",
        link: "/operations/forms/rfq/list",
        description: "Request for Quote Management",
        icon: "las la-handshake",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/operations/forms/rfq/*"
    },
    {
        id: 18,
        label: "Organization & Resources",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 19,
        label: "Org Chart",
        link: "/operations/org-chart/org-chart-view",
        description: "Organization Chart",
        icon: "las la-sitemap",
        badge: {
            variant: "badge bg-success",
            text: "New",
        },
        hideCheckBox: true,
        accessRequired: false,
    },
    {
        id: 20,
        label: "Vehicle Management",
        link: "/operations/forms/vehicle/list",
        description: "Company Vehicle Records",
        icon: "las la-car",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/operations/forms/vehicle/*"
    },
    {
        id: 21,
        label: "Tools & Utilities",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 22,
        label: "Labels",
        link: "/operations/labels/list",
        description: "Label Printing & Management",
        icon: "las la-tags",
        hideCheckBox: true,
        accessRequired: false,
    },
    {
        id: 23,
        label: "Operations & Production",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 24,
        label: "Graphics & BOM",
        icon: "las la-image",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Graphics List",
                link: "/operations/graphics/list",
                description: "Graphics management",
                accessRequired: false,
                activatedRoutes: "/operations/graphics/*"
            },
            {
                label: "Graphics Production",
                link: "/operations/graphics/production",
                description: "Graphics production tracking",
            },
            {
                label: "Graphics Demand",
                link: "/operations/graphics/demand",
                description: "Graphics demand analysis",
            },
            {
                label: "BOM Management",
                link: "/operations/graphics/bom/list",
                description: "Bill of Materials",
                accessRequired: false,
                activatedRoutes: "/operations/graphics/bom/*"
            },
        ],
    },
    {
        id: 25,
        label: "Placards",
        link: "/operations/forms/placard/list",
        description: "Work Order Documentation",
        icon: "las la-clipboard",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/operations/forms/placard/*"
    },
    {
        id: 26,
        label: "Shipping Request",
        icon: "las la-shipping-fast",
        link: "/operations/forms/shipping-request",
        description: "Shipping Management",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/operations/forms/shipping-request/*"
    },
    {
        id: 27,
        label: "Materials & Inventory",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 28,
        label: "IGT Transfers",
        link: "/operations/forms/igt-transfer/list",
        description: "IGT Asset Transfer Management",
        icon: "las la-exchange-alt",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/operations/forms/igt-transfer/*"
    },
    {
        id: 29,
        label: "Inventory & Materials",
        icon: "las la-boxes",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Shortages",
                link: "/operations/shortages/list",
                description: "Material Shortages",
                accessRequired: false,
                activatedRoutes: "/operations/shortages/*"
            },
            {
                label: "Physical Count",
                link: "/operations/physical-inventory/tags",
                description: "Inventory Counting",
                accessRequired: false,
                activatedRoutes: "/operations/physical-inventory/*"
            },
        ],
    },
    {
        id: 30,
        label: "Reports & Analytics",
        icon: "las la-chart-line",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Daily Report",
                link: "/operations/reports/daily-report",
                description: "Daily Operations Report",
                icon: "las la-calendar-day",
            },
            {
                label: "Revenue Reports",
                link: "/operations/reports/revenue",
                description: "Revenue Analysis",
                icon: "las la-dollar-sign",
            },
            {
                label: "Revenue by Customer",
                link: "/operations/reports/revenue-by-customer",
                description: "Customer Revenue Analysis",
                icon: "las la-users",
            },
            {
                label: "OTD Report",
                link: "/operations/reports/otd-report",
                description: "On-Time Delivery Performance",
                icon: "las la-shipping-fast",
                badge: {
                    variant: "badge bg-success",
                    text: "New",
                },
            },
            {
                label: "WIP Report",
                link: "/operations/reports/wip-report",
                description: "Work in Progress",
                icon: "las la-cogs",
            },
            {
                label: "Shipped Orders",
                link: "/operations/reports/shipped-orders-report",
                description: "Shipped Orders Analysis",
                icon: "las la-truck",
                accessRequired: false,
            },
            {
                label: "Shipped Orders (Table)",
                link: "/reports/shipped-orders-report-v1",
                description: "Shipped Orders - Table View",
                icon: "las la-table",
                accessRequired: false,
            },
            {
                label: "WO Variance Report",
                link: "/operations/reports/work-order-variance-report",
                description: "Work Order Variance Analysis",
                icon: "las la-chart-bar",
            },
            {
                label: "Inventory Reports",
                icon: "las la-boxes",
                isCollapsed: true,
                subItems: [
                    {
                        label: "Transit Location",
                        link: "/operations/reports/transit-location-value-report",
                        description: "Transit location report",
                    },
                    {
                        label: "Finished Goods",
                        link: "/operations/reports/fg-value-report",
                        description: "Finished goods report",
                    },
                    {
                        label: "JX Report",
                        link: "/operations/reports/jx-value-report",
                        description: "JX report",
                    },
                    {
                        label: "LV Raw Material",
                        link: "/operations/reports/las-vegas-raw-material-report",
                        description: "Las vegas raw material report",
                    },
                    {
                        label: "Safety Stock",
                        link: "/operations/reports/safety-stock-report",
                        description: "Safety stock report",
                    },
                    {
                        label: "Negative Locations",
                        link: "/operations/reports/negative-location-report",
                        description: "Negative location report",
                    },
                    {
                        label: "Empty Locations",
                        link: "/operations/reports/empty-location-report",
                        description: "Empty location report",
                    },
                    {
                        label: "Inventory Summary",
                        link: "/operations/reports/inventory-report",
                        description: "Inventory report",
                    },
                    {
                        label: "One SKU Locations",
                        link: "/operations/reports/one-sku-location-report",
                        description: "One sku location report",
                    },
                    {
                        label: "Item Consolidation",
                        link: "/operations/reports/item-consolidation-report",
                        description: "Item consolidation report",
                    },
                ],
            },
        ],
    },
    {
        id: 31,
        label: "Quality & Compliance",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 32,
        label: "Safety",
        icon: "las la-shield-alt",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Safety Incidents",
                description: "Report and Track Safety Incidents",
                link: "/operations/forms/safety-incident",
                icon: "las la-exclamation-triangle",
                accessRequired: false,
                activatedRoutes: "/operations/forms/safety-incident/*"
            },
            {
                label: "Vehicle Inspections",
                link: "/operations/forms/vehicle-inspection",
                description: "Vehicle Safety Inspections",
                icon: "las la-car",
                activatedRoutes: "/operations/forms/vehicle-inspection/*"
            },
            {
                label: "Forklift Inspections",
                link: "/operations/forms/forklift-inspection",
                description: "Forklift Safety Inspections",
                icon: "las la-truck-loading",
                activatedRoutes: "/operations/forms/forklift-inspection/*"
            },
            {
                label: "Safety Training",
                link: "/safety/training",
                description: "Safety Training Programs",
                icon: "las la-graduation-cap",
                accessRequired: false,
                activatedRoutes: "/safety/training/*"
            },
        ],
    },
    {
        id: 33,
        label: "Quality",
        icon: "las la-tools",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Dashboard",
                link: "/quality/overview/summary",
                description: "Quality Overview",
                icon: "las la-tachometer-alt",
            },
            {
                label: "Returns (RMA)",
                link: "/quality/rma/list",
                description: "Product Returns & Authorizations",
                icon: "las la-undo-alt",
                activatedRoutes: "/quality/rma/*"
            },
            {
                label: "Corrective Actions",
                link: "/quality/car/list",
                description: "Track Corrective Action Requests",
                icon: "las la-check-circle",
                activatedRoutes: "/quality/car/*"
            },
            {
                label: "Material Review",
                link: "/quality/mrb",
                description: "Non-Conforming Materials",
                icon: "las la-clipboard-check",
                activatedRoutes: "/quality/mrb/*"
            },
            {
                label: "Quality Issues",
                link: "/quality/qir",
                description: "Issue Reports & Tracking",
                icon: "las la-exclamation-triangle",
                activatedRoutes: "/quality/qir/*"
            },
        ],
    },
    {
        id: 34,
        label: "Serial Numbers",
        icon: "las la-barcode",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Generate Serial Numbers",
                link: "/quality/serial-number-report",
                description: "View and manage quality serial numbers",
                accessRequired: false,
                activatedRoutes: "/quality/serial-number-report/*"
            },
            {
                label: "IGT Serial Control",
                link: "/quality/igt",
                description: "View and manage IGT serial numbers",
                activatedRoutes: "/quality/igt/*"
            },
            {
                label: "AGS Serial Control",
                link: "/quality/ags-serial",
                activatedRoutes: "/quality/ags-serial/*"
            },
            {
                label: "SG Asset Control",
                link: "/quality/sg-asset/list",
                activatedRoutes: "/quality/sg-asset/*"
            },
            {
                label: "UL Labels",
                link: "/ul-management/labels-report",
                accessRequired: false,
                activatedRoutes: "/ul-management/*"
            },
        ],
    },
    {
        id: 35,
        label: "Admin",
        icon: "las la-user-shield",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "User Management",
                link: "/maintenance/user/list",
                description: "Manage System Users",
                icon: "las la-users",
                accessRequired: true,
                activatedRoutes: "/maintenance/user/*"
            },
            {
                label: "Email Notifications",
                link: "/maintenance/email-notification/list",
                description: "Configure Email Alerts",
                icon: "las la-envelope",
                accessRequired: true,
                activatedRoutes: "/maintenance/email-notification/*"
            },
            {
                label: "Scheduled Jobs",
                link: "/maintenance/scheduled-jobs",
                description: "System Background Tasks",
                icon: "las la-clock",
                accessRequired: true,
                activatedRoutes: "/maintenance/scheduled-jobs/*"
            },
            {
                label: "Query Builder",
                link: "/admin/query",
                description: "Database Query Tool",
                icon: "las la-database",
                accessRequired: true,
            },
            {
                label: "Advanced Settings",
                icon: "las la-cogs",
                isCollapsed: true,
                subItems: [
                    {
                        label: "Create User",
                        link: "/maintenance/user/create",
                        description: "Add New User",
                        accessRequired: true,
                        activatedRoutes: "/maintenance/user/*"
                    },
                    {
                        label: "Create Email Alert",
                        link: "/maintenance/email-notification/create",
                        description: "Setup New Email Notification",    
                        accessRequired: true,
                        activatedRoutes: "/maintenance/email-notification/*"
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
            if (a.label === "Admin" && a.id === 35) return 1;
            if (b.label === "Admin" && b.id === 35) return -1;

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
