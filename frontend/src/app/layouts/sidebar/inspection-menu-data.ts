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
        label: "Start Inspection",
        link: "/inspection-checklist/management",
        description: "Start and manage inspection instances",
        icon: "las la-play-circle",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/inspection-checklist/management*"
    },
    {
        id: 3,
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
        id: 4,
        label: "Reports",
        link: "/inspection-checklist/reports",
        description: "Inspection checklist reports and history",
        icon: "las la-chart-line",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/inspection-checklist/reports*"
    },
    {
        id: 5,
        label: "Template Manager",
        link: "/inspection-checklist/template-manager",
        description: "Manage checklist templates",
        icon: "las la-folder-open",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/inspection-checklist/template-manager*"
    },
    {
        id: 6,
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
        id: 7,
        label: "Audit",
        link: "/inspection-checklist/audit",
        description: "Checklist audit and verification",
        icon: "las la-search",
        hideCheckBox: true,
        accessRequired: false,
        activatedRoutes: "/inspection-checklist/audit*"
    }
];
