import { MenuItem } from "./menu.model";

export const ADMIN_MENU: MenuItem[] = [
    {
        id: 1,
        label: "Administration",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 2,
        label: "User Management",
        link: "/maintenance/user/list",
        description: "Manage System Users",
        icon: "las la-users",
        hideCheckBox: true,
        accessRequired: true,
        activatedRoutes: "/maintenance/user/*"
    },
    {
        id: 3,
        label: "Email Notifications",
        link: "/maintenance/email-notification/list",
        description: "Configure Email Alerts",
        icon: "las la-envelope",
        hideCheckBox: true,
        accessRequired: true,
        activatedRoutes: "/maintenance/email-notification/*"
    },
    {
        id: 4,
        label: "Scheduled Jobs",
        link: "/maintenance/scheduled-jobs",
        description: "System Background Tasks",
        icon: "las la-clock",
        hideCheckBox: true,
        accessRequired: true,
        activatedRoutes: "/maintenance/scheduled-jobs/*"
    },
    {
        id: 5,
        label: "Query Builder",
        link: "/admin/query",
        description: "Database Query Tool",
        icon: "las la-database",
        hideCheckBox: true,
        accessRequired: true,
    },
    {
        id: 6,
        label: "Quick Actions",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 7,
        label: "Create User",
        link: "/maintenance/user/create",
        description: "Add New User",
        icon: "las la-user-plus",
        hideCheckBox: true,
        accessRequired: true,
        activatedRoutes: "/maintenance/user/*"
    },
    {
        id: 8,
        label: "Create Email Alert",
        link: "/maintenance/email-notification/create",
        description: "Setup New Email Notification",
        icon: "las la-envelope-open-text",
        hideCheckBox: true,
        accessRequired: true,
        activatedRoutes: "/maintenance/email-notification/*"
    },
    {
        id: 9,
        label: "System Overview",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 10,
        label: "Dashboard",
        link: "/admin/dashboard",
        description: "Administrative Dashboard",
        icon: "las la-tachometer-alt",
        hideCheckBox: true,
        accessRequired: true,
    },
    {
        id: 11,
        label: "System Settings",
        link: "/admin/settings",
        description: "System Configuration",
        icon: "las la-cogs",
        hideCheckBox: true,
        accessRequired: true,
    },
];