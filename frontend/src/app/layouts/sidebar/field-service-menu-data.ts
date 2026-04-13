import { MenuItem } from "./menu.model";

export const FIELD_SERVICE_MENU_DATA: MenuItem[] = [
    {
        id: 1,
        label: "Field Service",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 7,
        label: "All Tickets",
        icon: "las la-list",
        link: "/field-service/ticket/list",
        description: "Complete ticket listing",
        hideCheckBox: true,
        activatedRoutes: "/field-service/ticket/*",
    },
    {
        id: 2,
        label: "Overview",
        icon: "las la-tachometer-alt",
        link: "/field-service/overview/summary",
        description: "Field Service Dashboard",
        hideCheckBox: true,
    },
    {
        id: 9,
        label: "Parts Inventory",
        icon: "las la-box",
        link: "/field-service/parts-order/list",
        description: "Parts ordering system",
        hideCheckBox: true,
        activatedRoutes: "/field-service/parts-order/*",
    },
    {
        id: 4,
        label: "Schedule",
        icon: "las la-calendar",
        link: "/field-service/scheduling/calendar",
        description: "Job scheduling calendar",
        hideCheckBox: true,
    },
    {
        id: 6,
        label: "Service Jobs",
        icon: "las la-briefcase",
        link: "/field-service/jobs/list",
        description: "Job management",
        hideCheckBox: true,
        activatedRoutes: [
            "/field-service/jobs/*",
            "/jobs/job-open-invoice"
        ],
    },
    {
        id: 3,
        label: "Map Dashboard",
        icon: "las la-map",
        link: "/field-service/map",
        description: "Geographic job locations",
        hideCheckBox: true,
        activatedRoutes: [
            "/field-service/map",
            "/field-service/map"
        ],
    },
    {
        id: 10,
        label: "Service Requests",
        icon: "las la-clipboard-list",
        link: "/field-service/request/list",
        description: "Customer service requests",
        hideCheckBox: true,
        activatedRoutes: "/field-service/request/*",
    },
    {
        id: 5,
        label: "Tech Calendar",
        icon: "las la-user-clock",
        link: "/field-service/scheduling/tech-schedule",
        description: "Technician calendar view",
        hideCheckBox: true,
    },
    {
        id: 71,
        label: "Ticket Search",
        icon: "las la-search",
        link: "/field-service/ticket/overview",
        description: "Search and filter tickets",
        hideCheckBox: true,
        activatedRoutes: "/field-service/ticket/*",
    },
    {
        id: 8,
        label: "Trip Management",
        icon: "las la-route",
        link: "/field-service/trip-details/list",
        description: "Service trip tracking",
        hideCheckBox: true,
        activatedRoutes: "/field-service/trip-details/*",
    },
    {
        id: 11,
        label: "Reports",
        icon: "las la-chart-bar",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Jobs by Location",
                link: "/field-service/reports/jobs-by-location",
                description: "Geographic job distribution",
            },
            {
                label: "Platform Performance",
                link: "/field-service/reports/platform-avg",
                description: "Platform efficiency metrics",
            },
            {
                label: "Expense Summary",
                link: "/field-service/reports/expense-report",
                description: "Service cost analysis",
            },
            {
                label: "Service Performance",
                link: "/field-service/reports/service-report",
                description: "Service quality metrics",
            },
            {
                label: "Customer Analytics",
                link: "/field-service/reports/customer-report",
                description: "Customer satisfaction data",
            },
            {
                label: "Invoice Tracking",
                link: "/field-service/reports/invoice-report",
                description: "Billing and invoices",
            },
            {
                label: "Technician Performance",
                link: "/field-service/reports/job-by-user-report",
                description: "Individual tech metrics",
            },
            {
                label: "Resource Comparison",
                link: "/field-service/reports/contractor-vs-tech-report",
                description: "Contractor vs employee analysis",
            },
            {
                label: "Ticket Activity",
                link: "/field-service/reports/ticket-event-report",
                description: "Ticket workflow tracking",
            },
        ],
    },
    {
        id: 12,
        label: "Configuration",
        icon: "las la-cog",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Job Statuses",
                link: "/field-service/maintenance/job-status/list",
                description: "Job status definitions",
            },
            {
                label: "Service Categories",
                link: "/field-service/maintenance/service-type/list",
                description: "Service type setup",
            },
            {
                label: "Property Database",
                link: "/field-service/maintenance/property/list",
                description: "Property records",
            },
            {
                label: "License Management",
                link: "/field-service/maintenance/license/list",
                description: "Technician licenses",
            },
            {
                label: "Expense Categories",
                link: "/field-service/maintenance/receipt-category/list",
                description: "Receipt classification",
            },
            {
                label: "Event Types",
                link: "/field-service/maintenance/ticket-event/list",
                description: "Ticket event categories",
            },
            {
                label: "Customer Database",
                link: "/field-service/maintenance/customer/list",
                description: "Customer information",
            },
            {
                label: "Platform Setup",
                link: "/field-service/maintenance/platform/list",
                description: "Platform definitions",
            },
            {
                label: "Billing Codes",
                link: "/field-service/maintenance/non-billable-code/list",
                description: "Non-billable code setup",
            },
        ],
    },
];

// Function to recursively sort menu items by ID
function sortFieldServiceMenuItems(items: MenuItem[]): MenuItem[] {
    return items
        .sort((a, b) => {
            // Title always stays at top
            if (a.isTitle && a.label === "Field Service") return -1;
            if (b.isTitle && b.label === "Field Service") return 1;

            // Settings section always goes to the bottom
            if (a.label === "Settings" && a.id === 12) return 1;
            if (b.label === "Settings" && b.id === 12) return -1;

            // For all other items, sort by ID
            if (a.id !== undefined && b.id !== undefined) {
                return a.id - b.id;
            }

            return (a.label || '').localeCompare(b.label || '');
        })
        .map(item => ({
            ...item,
            subItems: item.subItems ? sortFieldServiceMenuItems(item.subItems) : item.subItems
        }));
}

// Export sorted Field Service menu
export const FIELD_SERVICE_MENU: MenuItem[] = sortFieldServiceMenuItems(FIELD_SERVICE_MENU_DATA);
