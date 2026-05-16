import { MenuItem } from "./menu.model";

export const INSPECTION_MENU: MenuItem[] = [
    {
        id: 1,
        label: "Inspection Checklist",
        isTitle: true,
        hideCheckBox: true,
    },
    {
        id: 2,
        label: "Performance Dashboard",
        link: "/inspection-checklist/dashboard",
        description: "Manager and supervisor productivity insights",
        icon: "las la-chart-pie",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/inspection-checklist/dashboard*"
    },
    {
        id: 3,
        label: "Start Inspection",
        link: "/inspection-checklist/management",
        description: "Start and manage inspection instances",
        icon: "las la-play-circle",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/inspection-checklist/management*"
    },
    {
        id: 4,
        badgeId: "inspectionChecklistExecutionInProgress",
        label: "Execution",
        link: "/inspection-checklist/execution",
        description: "Execute active inspection checklists",
        icon: "las la-clipboard-check",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/inspection-checklist/execution*"
    },
    {
        id: 5,
        label: "Reports",
        link: "/inspection-checklist/reports",
        description: "Inspection checklist reports and history",
        icon: "las la-chart-line",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/inspection-checklist/reports*"
    },
    {
        id: 6,
        label: "Template Manager",
        link: "/inspection-checklist/template-manager",
        description: "Manage checklist templates",
        icon: "las la-folder-open",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/inspection-checklist/template-manager*"
    },
    {
        id: 7,
        badgeId: "inspectionChecklistTemplatesDraft",
        label: "Template Editor",
        link: "/inspection-checklist/template-editor",
        description: "Edit checklist templates",
        icon: "las la-edit",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/inspection-checklist/template-editor*"
    },
    {
        id: 8,
        label: "Audit",
        link: "/inspection-checklist/audit",
        description: "Checklist audit and verification",
        icon: "las la-search",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/inspection-checklist/audit*"
    }
];
