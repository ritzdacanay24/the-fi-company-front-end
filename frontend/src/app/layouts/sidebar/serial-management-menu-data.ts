import { MenuItem } from "./menu.model";

export const SERIAL_MANAGEMENT_MENU: MenuItem[] = [
    {
        id: 1,
        label: "Serial Management",
        isTitle: true,
        hideCheckBox: true,
    },
    // Overview
    {
        id: 2,
        label: "Dashboard",
        link: "/serial-management/dashboard",
        icon: "mdi mdi-view-dashboard-outline",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/dashboard"
    },
    // UL Management
    {
        id: 10,
        label: "UL Management",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 11,
        label: "Labels Inventory",
        link: "/serial-management/ul-labels",
        icon: "mdi mdi-certificate",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/ul-labels*"
    },
    {
        id: 13,
        label: "UL Audit Sign-Off",
        link: "/serial-management/ul-audit-signoff",
        icon: "mdi mdi-clipboard-check-outline",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/ul-audit-signoff*"
    },
    {
        id: 14,
        label: "UL Audit History",
        link: "/serial-management/ul-audit-history",
        icon: "mdi mdi-history",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/ul-audit-history*"
    },
    {
        id: 15,
        label: "Upload UL Labels",
        link: "/serial-management/ul-upload",
        icon: "mdi mdi-upload",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/ul-upload*"
    },
    // IGT
    {
        id: 20,
        label: "IGT",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 21,
        label: "IGT Inventory",
        link: "/serial-management/igt-inventory",
        icon: "mdi mdi-chip",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/igt-inventory*"
    },
    {
        id: 23,
        label: "Upload IGT Serials",
        link: "/serial-management/igt-upload",
        icon: "mdi mdi-upload",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/igt-upload*"
    },
    // AGS / SG Asset
    {
        id: 30,
        label: "AGS / SG Asset",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 31,
        label: "AGS Serial Control",
        link: "/serial-management/ags-serial",
        icon: "las la-barcode",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/ags-serial*"
    },
    {
        id: 32,
        label: "SG Asset Control",
        link: "/serial-management/sg-asset",
        icon: "las la-boxes",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/sg-asset*"
    },
    // EyeFi Serials
    {
        id: 40,
        label: "EyeFi Serials",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 41,
        label: "EyeFi Inventory",
        link: "/serial-management/eyefi-serials",
        icon: "las la-microchip",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/eyefi-serials"
    },
    {
        id: 43,
        label: "Upload EyeFi Serials",
        link: "/serial-management/eyefi-serials/upload",
        icon: "mdi mdi-upload",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/eyefi-serials/upload*"
    },
    // Unique Label Generator
    {
        id: 50,
        label: "Unique Label Generator",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 51,
        label: "Generate Labels",
        link: "/serial-management/ul-generator/create",
        icon: "mdi mdi-label-outline",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/ul-generator/create*"
    },
    {
        id: 52,
        label: "History",
        link: "/serial-management/ul-generator/history",
        icon: "mdi mdi-history",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/ul-generator/history*"
    },
    {
        id: 53,
        label: "Reports",
        link: "/serial-management/ul-generator/reports",
        icon: "mdi mdi-chart-bar",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/ul-generator/reports*"
    },
    {
        id: 54,
        label: "Admin",
        link: "/serial-management/ul-generator/admin",
        icon: "mdi mdi-shield-account-outline",
        hideCheckBox: true,
        activatedRoutes: "/serial-management/ul-generator/admin*"
    },
    // Serial Assignments
    {
        id: 60,
        label: "Serial Assignments",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 61,
        label: "Serial Assignments",
        link: "/serial-assignments",
        icon: "las la-clipboard-list",
        hideCheckBox: true,
        activatedRoutes: "/serial-assignments*"
    },
];
