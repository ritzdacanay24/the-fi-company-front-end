import { MenuItem } from "./menu.model";

export const FIELD_SERVICE_MENU_DATA: MenuItem[] = [
    {
        id: 1,
        label: "Field Service",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 2,
        label: "Dashboard",
        icon: "las la-tachometer-alt",
        link: "/field-service/overview/summary",
        description: "Field Service Overview",
        hideCheckBox: true,
    },
    {
        id: 3,
        label: "Map View",
        icon: "las la-map",
        link: "/field-service/map",
        description: "Field Service Map",
        hideCheckBox: true,
    },
    {
        id: 4,
        label: "Calendar",
        icon: "las la-calendar",
        link: "/field-service/scheduling/calendar",
        description: "Field Service Calendar",
        hideCheckBox: true,
    },
    {
        id: 5,
        label: "Tech Schedule",
        icon: "las la-user-clock",
        link: "/field-service/scheduling/tech-schedule",
        description: "Technician Scheduling",
        hideCheckBox: true,
    },
    {
        id: 6,
        label: "Jobs",
        icon: "las la-briefcase",
        link: "/field-service/jobs/list",
        description: "Service Jobs",
        hideCheckBox: true,
        activatedRoutes: "/field-service/jobs/*",
    },
    {
        id: 7,
        label: "Tickets",
        icon: "las la-ticket-alt",
        link: "/field-service/ticket/list", 
        description: "Service Tickets",
        hideCheckBox: true,
        activatedRoutes: "/field-service/ticket/*",
    },
    {
        id: 8,
        label: "Trip Details",
        icon: "las la-route",
        link: "/field-service/trip-details/list",
        description: "Trip Management",
        hideCheckBox: true,
        activatedRoutes: "/field-service/trip-details/*",
    },
    {
        id: 9,
        label: "Parts Orders",
        icon: "las la-box",
        link: "/field-service/parts-order/list",
        description: "Parts Ordering",
        hideCheckBox: true,
        activatedRoutes: "/field-service/parts-order/*",
    },
    {
        id: 10,
        label: "Requests",
        icon: "las la-clipboard-list",
        link: "/field-service/request/list",
        description: "Service Requests",
        hideCheckBox: true,
        activatedRoutes: "/field-service/request/*",
    },
    {
        id: 11,
        label: "Reports",
        icon: "las la-chart-bar",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Jobs By Location",
                link: "/field-service/reports/jobs-by-location",
                description: "Jobs by location analysis",
            },
            {
                label: "Platform Average",
                link: "/field-service/reports/platform-avg",
                description: "Platform performance metrics",
            },
            {
                label: "Expense Report",
                link: "/field-service/reports/expense-report",
                description: "Field service expenses",
            },
            {
                label: "Service Report",
                link: "/field-service/reports/service-report",
                description: "Service performance",
            },
            {
                label: "Customer Report",
                link: "/field-service/reports/customer-report",
                description: "Customer service metrics",
            },
            {
                label: "Invoice Report",
                link: "/field-service/reports/invoice-report",
                description: "Invoice tracking",
            },
            {
                label: "Jobs By Technician",
                link: "/field-service/reports/job-by-user-report",
                description: "Technician performance",
            },
            {
                label: "Contractor vs Tech",
                link: "/field-service/reports/contractor-vs-tech-report",
                description: "Resource comparison",
            },
            {
                label: "Ticket Events",
                link: "/field-service/reports/ticket-event-report",
                description: "Ticket event tracking",
            },
        ],
    },
    {
        id: 12,
        label: "Settings",
        icon: "las la-cog",
        isCollapsed: true,
        hideCheckBox: true,
        subItems: [
            {
                label: "Job Status",
                link: "/field-service/maintenance/job-status/list",
                description: "Manage job statuses",
            },
            {
                label: "Service Types",
                link: "/field-service/maintenance/service-type/list",
                description: "Service type configuration",
            },
            {
                label: "Properties",
                link: "/field-service/maintenance/property/list",
                description: "Property management",
            },
            {
                label: "Licenses",
                link: "/field-service/maintenance/license/list",
                description: "License management",
            },
            {
                label: "Receipt Categories",
                link: "/field-service/maintenance/receipt-category/list",
                description: "Receipt categorization",
            },
            {
                label: "Ticket Events",
                link: "/field-service/maintenance/ticket-event/list",
                description: "Ticket event types",
            },
            {
                label: "Customers",
                link: "/field-service/maintenance/customer/list",
                description: "Customer management",
            },
            {
                label: "Platforms",
                link: "/field-service/maintenance/platform/list",
                description: "Platform configuration",
            },
            {
                label: "Non-Billable Codes",
                link: "/field-service/maintenance/non-billable-code/list",
                description: "Non-billable code management",
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
