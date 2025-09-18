import { act } from "@ngrx/effects";
import { MenuItem } from "./menu.model";

export const MENU_DATA: MenuItem[] = [
    // {
    //     id: 1,
    //     label: "Menu",
    //     isTitle: true,
    //     hideCheckBox: true,
    // },
    // {
    //     id: 2,
    //     label: "Quick Actions",
    //     icon: "las la-bolt",
    //     isCollapsed: true,
    //     hideCheckBox: true,
    //     subItems: [
    //         {
    //             label: "Labels",
    //             link: "/operations/labels/list",
    //             description: "Label Printing & Management",
    //             icon: "las la-tags",
    //             accessRequired: false,
    //         },
    //         {
    //             label: "Shipping Schedule",
    //             link: "/operations/master-scheduling/shipping",
    //             description: "View Shipping Schedule",
    //             icon: "las la-shipping-fast",
    //             accessRequired: false,
    //         },
    //         {
    //             label: "Create Material Request",
    //             link: "/operations/material-request/create",
    //             description: "Quick Material Request",
    //             icon: "las la-plus-circle",
    //             accessRequired: false,
    //         },
    //         {
    //             label: "Report Quality Issue",
    //             link: "/quality/qir/create",
    //             description: "Quick Quality Issue Report",
    //             icon: "las la-exclamation-triangle",
    //             accessRequired: false,
    //             activatedRoutes: "/quality/qir/*"
    //         },
    //     ],
    // },
    {
        id: 3,
        label: "Lookups & Search",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 4,
        label: "Universal Search",
        link: "/operations/universal-lookup",
        description: "Search Orders, Parts, Work Orders & BOM",
        icon: "las la-search",
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
    // {
    //     id: 801,
    //     label: "Shipping Analytics",
    //     link: "/operations/shipping-analytics",
    //     description: "Shipping Performance Analytics & Insights",
    //     icon: "las la-chart-area",
    //     hideCheckBox: true,
    // },
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
    // {
    //     id: 13,
    //     label: "Cable Production",
    //     link: "/operations/master-scheduling/cables",
    //     description: "Cable Production Schedule",
    //     icon: "las la-plug",
    //     hideCheckBox: true,
    // },
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
        label: "Time Sessions",
        link: "/operations/forms/time-tracker",
        description: "View all time tracking sessions",
        icon: "las la-history",
        accessRequired: false,
        activatedRoutes: "/operations/forms/time-tracker/*"
    },
    {
        id: 23,
        label: "Labels",
        link: "/operations/labels/list",
        description: "Label Printing & Management",
        icon: "las la-tags",
        hideCheckBox: true,
        accessRequired: false,
    },
    {
        id: 24,
        label: "Operations & Production",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 25,
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
        id: 26,
        label: "Placards",
        link: "/operations/forms/placard/list",
        description: "Work Order Documentation",
        icon: "las la-clipboard",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/operations/forms/placard/*"
    },
    {
        id: 27,
        label: "Shipping Request",
        icon: "las la-shipping-fast",
        link: "/operations/forms/shipping-request",
        description: "Shipping Management",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/operations/forms/shipping-request/*"
    },
    {
        id: 28,
        label: "Materials & Inventory",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 29,
        label: "IGT Transfers",
        link: "/operations/forms/igt-transfer/list",
        description: "IGT Asset Transfer Management",
        icon: "las la-exchange-alt",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/operations/forms/igt-transfer/*"
    },
    {
        id: 30,
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
        id: 31,
        label: "Reports & Analytics",
        link: "/operations/reports",
        description: "Comprehensive reporting suite for operations insights",
        icon: "las la-chart-line",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/operations/reports/*"
    },
    {
        id: 32,
        label: "Quality & Compliance",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 33,
        label: "Training Management",
        icon: "las la-graduation-cap",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Live Sessions",
                link: "/training/live",
                description: "Join Training & Badge Sign-Off",
                icon: "las la-broadcast-tower",
                accessRequired: false,
                activatedRoutes: "/training/*"
            },
            {
                label: "Manage Sessions",
                link: "/training/setup",
                description: "Create & Edit Training Sessions",
                icon: "las la-cog",
                accessRequired: false,
                activatedRoutes: "/training/*"
            },
            {
                label: "All Sessions",
                link: "/training/manage",
                description: "View & Manage All Training Sessions",
                icon: "las la-list",
                accessRequired: false,
                activatedRoutes: "/training/*"
            }
        ],
    },
    {
        id: 34,
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
            // {
            //     label: "Safety Training",
            //     link: "/safety/training",
            //     description: "Safety Training Programs",
            //     icon: "las la-graduation-cap",
            //     accessRequired: false,
            //     activatedRoutes: "/safety/training/*"
            // },
        ],
    },
    {
        id: 35,
        label: "Quality",
        icon: "las la-tools",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
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
            {
                label: "Inspection Checklists",
                link: "/inspection/dashboard",
                description: "Inspection Checklist Management",
                icon: "las la-clipboard-list",
                activatedRoutes: "/inspection/*"
            },
        ],
    },
    {
        id: 35,
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
